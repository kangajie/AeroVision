import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiGet } from '../api/client';

// ─── Constants ──────────────────────────────────────────────────────────────
const CLASS_COLORS = {
  person: 'var(--color-accent-blue)',
  car: 'var(--color-accent-green)',
  truck: 'var(--color-primary)',
  bus: 'var(--color-accent-purple)',
  motorcycle: 'var(--color-accent-red)',
};

const CLASS_LINES = [
  { key: 'person', color: 'var(--color-accent-blue)', name: 'Person' },
  { key: 'car', color: 'var(--color-accent-green)', name: 'Car' },
  { key: 'truck', color: 'var(--color-primary)', name: 'Truck' },
  { key: 'bus', color: 'var(--color-accent-purple)', name: 'Bus' },
  { key: 'motorcycle', color: 'var(--color-accent-red)', name: 'Motorcycle' },
];

// Custom donut label
const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const navigate = useNavigate();
  const { isConnected, counts, detections, isGlobalOverload, aggregate, cameraStates } = useWebSocket();
  const [trendData, setTrendData]     = useState([]);
  const [inOutData, setInOutData]     = useState([]);
  const [lineCrossingToday, setLineCrossingToday] = useState(0);
  const [cameraStats, setCameraStats] = useState({ online: 0, total: 0 });
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chartRes, inOut, summary, systemStatus, allCams] = await Promise.allSettled([
          apiGet('/api/analytics/chart?filter=Today'),
          apiGet('/api/analytics/inout?filter=Today'),
          apiGet('/api/analytics/summary?filter=Today'),
          apiGet('/api/system/status'),
          apiGet('/api/cameras/list'),
        ]);

        // chart sekarang return { rows, totals } — ambil rows saja untuk grafik
        if (chartRes.status === 'fulfilled') {
          const chartVal = chartRes.value;
          // Support format lama (array) dan baru ({ rows, totals })
          const rows = Array.isArray(chartVal) ? chartVal : (chartVal?.rows || []);
          setTrendData(rows);
        }

        if (inOut.status === 'fulfilled') setInOutData(inOut.value || []);

        if (summary.status === 'fulfilled') {
          // Tampilkan line_crossing today (bukan semua log)
          setLineCrossingToday(summary.value?.total_events_today ?? 0);
        }

        if (systemStatus.status === 'fulfilled') {
          const sys = systemStatus.value;
          const totalCams = allCams.status === 'fulfilled' ? (allCams.value || []).length : sys.active_cameras;
          setCameraStats({ online: sys.active_cameras || 0, total: totalCams });
        } else if (allCams.status === 'fulfilled') {
          const cams = allCams.value || [];
          const online = cams.filter(c => c.is_active).length;
          setCameraStats({ online, total: cams.length });
        }
      } catch (err) {
        console.error('[Dashboard] Fetch error:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Kumpulkan event terbaru dari semua kamera (WebSocket) ─────────────────
  useEffect(() => {
    const allEvents = [];
    for (const [camId, state] of Object.entries(cameraStates)) {
      for (const ev of (state.events || [])) {
        allEvents.push({ ...ev, camera_id: camId });
      }
    }
    // Sort descending by timestamp, ambil 5 terakhir
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setRecentEvents(allEvents.slice(0, 5));
  }, [cameraStates]);

  // ── Pie chart: live detections dari WebSocket aggregate ──────────────────
  const detectionByType = Object.keys(counts).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: counts[key] || 0,
    color: CLASS_COLORS[key] || 'gray'
  })).filter(d => d.value > 0);

  const totalDetections = detectionByType.reduce((a, b) => a + b.value, 0);

  // ── Last event dari recentEvents (paling fresh) ───────────────────────────
  const lastEvent = recentEvents[0] || null;
  const lastEventTime  = lastEvent ? new Date(lastEvent.timestamp).toLocaleTimeString('id-ID') : '--:--:--';
  const lastEventClass = lastEvent?.class || '-';
  const lastEventCam   = lastEvent?.camera_id || '';

  // ── IN/OUT: dari WebSocket (realtime) bukan sum inOutData (historis) ─────
  // WebSocket aggregate memberikan total hari ini secara realtime
  // inOutData dari DB dipakai untuk chart saja
  const totalIn  = aggregate.totalIn  || inOutData.reduce((a, c) => a + (c.IN  || 0), 0);
  const totalOut = aggregate.totalOut || inOutData.reduce((a, c) => a + (c.OUT || 0), 0);

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4">
      {/* Header */}
      <div>
        <h1 className="display-lg text-[var(--color-ink)] m-0">Dashboard Overview</h1>
        <p className="body-sm text-[var(--color-mute)] mt-0.5">Ringkasan kondisi sistem CCTV secara real-time.</p>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cameras Online"
          value={`${cameraStats.online}/${cameraStats.total}`}
          delta={`${cameraStats.total > 0 ? Math.round((cameraStats.online / cameraStats.total) * 100) : 0}% Online`}
          deltaPositive={true}
          badge="View detail"
          iconBg="var(--color-accent-blue-soft)"
          onClick={() => navigate('/admin/live-monitoring')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14" />
              <rect x="2" y="6" width="13" height="12" rx="2" />
            </svg>
          }
        />
        <StatCard
          title="Total Detection (Live)"
          value={totalDetections.toLocaleString()}
          delta="WebSocket Live"
          deltaPositive={true}
          iconBg="var(--color-accent-green-soft)"
          onClick={() => navigate('/admin/analytics')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
        <StatCard
          title="Line Crossing Events"
          value={lineCrossingToday}
          delta="Terekam Hari Ini"
          deltaPositive={true}
          iconBg="var(--color-surface-soft)"
          onClick={() => navigate('/admin/log')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-mute)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />
        <StatCard
          title="System Status"
          value={isConnected ? (isGlobalOverload ? "OVERLOAD" : "ONLINE") : "OFFLINE"}
          badge={isConnected ? (isGlobalOverload ? "Terjadi Penumpukan" : "Terkoneksi") : "Terputus"}
          badgeColor={{ bg: isConnected ? (isGlobalOverload ? 'var(--color-accent-red-soft)' : 'var(--color-accent-green-soft)') : 'var(--color-surface-soft)', text: isConnected ? (isGlobalOverload ? 'var(--color-accent-red)' : 'var(--color-accent-green)') : 'var(--color-mute)' }}
          iconBg={isConnected ? (isGlobalOverload ? 'var(--color-accent-red-soft)' : 'var(--color-accent-green-soft)') : 'var(--color-surface-soft)'}
          onClick={() => navigate('/admin/configuration')}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isConnected ? (isGlobalOverload ? 'var(--color-accent-red)' : 'var(--color-accent-green)') : 'var(--color-mute)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Detection Trend (History) */}
        <div className="lg:col-span-2 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm overflow-hidden">
          <h2 className="heading-sm text-[var(--color-ink)] m-0 mb-4">Detection Trend (History)</h2>
          <div className="w-full overflow-x-auto">
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={180}>
                {trendData.length > 0 ? (
                  <LineChart data={trendData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-hairline)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-mute)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-mute)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-hairline)', fontSize: 12 }} />
                    {CLASS_LINES.map(cl => (
                      <Line key={cl.key} type="monotone" dataKey={cl.key} stroke={cl.color} strokeWidth={2} dot={false} name={cl.name} />
                    ))}
                  </LineChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-[var(--color-mute)] caption-sm">Belum ada riwayat chart harian</div>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {CLASS_LINES.map(cl => (
              <div key={cl.key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cl.color }} />
                <span className="caption-sm text-[var(--color-mute)]">{cl.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detection by Type (Live Donut) */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm">
          <h2 className="heading-sm text-[var(--color-ink)] m-0 mb-4">Live Detections by Type</h2>
          <div className="flex flex-col items-center gap-3">
            {totalDetections > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={detectionByType}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {detectionByType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} (${((v / totalDetections) * 100).toFixed(1)}%)`, n]} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-hairline)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-[160px] flex items-center justify-center text-[var(--color-mute)] caption-sm text-center bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline)]">
                Belum ada arus deteksi saat ini
              </div>
            )}
            <div className="w-full grid grid-cols-1 gap-1 mt-2">
              {detectionByType.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="caption-sm text-[var(--color-body)]">{d.name}</span>
                  </div>
                  <span className="caption-sm font-bold text-[var(--color-ink)]">
                    {totalDetections > 0 ? ((d.value / totalDetections) * 100).toFixed(0) : 0}% ({d.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* IN/OUT Overview */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm">
          <h2 className="heading-sm text-[var(--color-ink)] m-0 mb-4">IN / OUT Overview (Today)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center bg-[var(--color-accent-green-soft)] rounded-[var(--radius-md)] p-4">
              <span className="utility-xs text-[var(--color-accent-green)] font-bold uppercase tracking-widest mb-1">IN</span>
              <span className="font-mono-num text-[var(--color-accent-green)] font-bold" style={{ fontSize: 36 }}>{totalIn}</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-[var(--color-accent-red-soft)] rounded-[var(--radius-md)] p-4">
              <span className="utility-xs text-[var(--color-accent-red)] font-bold uppercase tracking-widest mb-1">OUT</span>
              <span className="font-mono-num text-[var(--color-accent-red)] font-bold" style={{ fontSize: 36 }}>{totalOut}</span>
            </div>
          </div>
        </div>

        {/* IN/OUT Trend */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm overflow-hidden">
          <h2 className="heading-sm text-[var(--color-ink)] m-0 mb-2">IN / OUT Trend (Today)</h2>
          <div className="flex items-center gap-1 mb-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-green)]" /><span className="caption-sm text-[var(--color-mute)]">IN</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-red)]" /><span className="caption-sm text-[var(--color-mute)]">OUT</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-0">
              {inOutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={inOutData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-hairline)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-mute)', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-mute)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-hairline)', fontSize: 12 }} />
                    <Bar dataKey="IN" fill="var(--color-accent-green)" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="OUT" fill="var(--color-accent-red)" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[130px] flex items-center justify-center text-[var(--color-mute)] caption-sm text-center">
                  Belum ada deteksi IN / OUT hari ini
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last Event */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm">
          <h2 className="heading-sm text-[var(--color-ink)] m-0 mb-4">Last Realtime Event</h2>
          <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${lastEvent ? 'bg-[var(--color-accent-green-soft)]' : 'bg-[var(--color-surface-soft)]'}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={lastEvent ? 'var(--color-accent-green)' : 'var(--color-mute)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className={`font-mono-num heading-md ${lastEvent ? 'text-[var(--color-ink)]' : 'text-[var(--color-mute)]'}`}>{lastEventTime}</div>
            <div className="flex items-center gap-1.5">
              {lastEvent ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
                    <span className="body-xs font-semibold text-[var(--color-accent-green)] capitalize">
                      Line Crossing – {lastEventClass}
                    </span>
                  </div>
                  <span className="caption-xs text-[var(--color-mute)] uppercase tracking-wide bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-full">
                    {lastEventCam || 'Kamera'}
                  </span>
                </div>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-mute)]' : 'bg-red-500 animate-pulse'}`} />
                  <span className="body-xs font-semibold text-[var(--color-mute)]">
                    {isConnected ? 'Belum ada deteksi baru...' : 'Menunggu koneksi...'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
