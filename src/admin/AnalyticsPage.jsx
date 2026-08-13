import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { apiGet } from '../api/client';

// ─── Konstanta ─────────────────────────────────────────────────────────────────

const CLASS_LINES = [
  { key: 'person',     color: '#6366f1', name: 'Person'     },
  { key: 'car',        color: '#10b981', name: 'Car'        },
  { key: 'truck',      color: '#f59e0b', name: 'Truck'      },
  { key: 'bus',        color: '#a855f7', name: 'Bus'        },
  { key: 'motorcycle', color: '#ef4444', name: 'Motorcycle' },
];

const TIME_FILTERS = [
  { key: 'Today', label: 'Hari Ini' },
  { key: 'Week',  label: 'Minggu'   },
  { key: 'Month', label: 'Bulan'    },
  { key: 'Year',  label: 'Tahun'    },
];

const CHART_TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid rgba(0,0,0,.08)',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
};

// ─── Sub-komponen ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm animate-pulse">
      <div className="h-3 w-16 bg-[var(--color-surface-soft)] rounded mb-3" />
      <div className="h-7 w-20 bg-[var(--color-surface-soft)] rounded mb-2" />
      <div className="h-4 w-12 bg-[var(--color-surface-soft)] rounded" />
    </div>
  );
}

function EmptyChart({ height = 220 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-mute)]" style={{ height }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span className="caption-sm">Belum ada data untuk rentang waktu ini</span>
    </div>
  );
}

// ─── Tooltip info icon ──────────────────────────────────────────────────────
function InfoTip({ text }) {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
        className="cursor-help flex-shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          style={{ minWidth: 180 }}>
          <span className="block bg-gray-800 text-white text-[10px] leading-tight px-2.5 py-2 rounded-lg shadow-lg">
            {text}
          </span>
          <span className="block w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  );
}

// ─── Custom Tooltip untuk chart traffic ───────────────────────────────────────
// Menampilkan nilai per-jam DAN running total kumulatif
function TrafficTooltip({ active, payload, label, allRows, filterKey }) {
  if (!active || !payload || !payload.length) return null;

  // Hitung kumulatif dari jam 0 s/d jam ini
  const cumulative = {};
  if (allRows && allRows.length) {
    let reached = false;
    for (const row of allRows) {
      for (const p of payload) {
        cumulative[p.dataKey] = (cumulative[p.dataKey] || 0) + (row[p.dataKey] || 0);
      }
      if (row.time === label) { reached = true; break; }
    }
    if (!reached) {
      // fallback: sum all
      CLASS_LINES.forEach(cl => { cumulative[cl.key] = 0; });
      allRows.forEach(row => CLASS_LINES.forEach(cl => {
        cumulative[cl.key] = (cumulative[cl.key] || 0) + (row[cl.key] || 0);
      }));
    }
  }

  const isToday = filterKey === 'Today';
  return (
    <div style={{ ...CHART_TOOLTIP_STYLE, padding: '10px 14px', background: '#fff', minWidth: 160 }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 12, color: '#374151' }}>
        {label}
      </p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: '#374151', fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
      {isToday && Object.keys(cumulative).length > 0 && (
        <>
          <div style={{ borderTop: '1px dashed #e5e7eb', margin: '6px 0' }} />
          <p style={{ margin: '0 0 4px', fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>KUMULATIF S/D JAM INI</p>
          {payload.map(p => (
            <div key={`cum-${p.dataKey}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: p.color }}>{p.name}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{cumulative[p.dataKey] || 0}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Komponen utama ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [timeFilter, setTimeFilter]   = useState('Today');
  const [selectedCam, setSelectedCam] = useState('');    // '' = semua kamera
  const [cameras, setCameras]         = useState([]);

  const [trafficData,  setTrafficData]  = useState([]);
  const [inOutData,    setInOutData]    = useState([]);
  const [summaryCards, setSummaryCards] = useState([]);
  const [totalToday,   setTotalToday]   = useState(0);

  const [loading, setLoading] = useState(true);

  // ── Load daftar kamera ─────────────────────────────────────────────────────
  useEffect(() => {
    apiGet('/api/cameras/list').then(list => setCameras(list || [])).catch(() => {});
  }, []);

  // ── Load analytics data ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const camParam = selectedCam ? `&camera_id=${encodeURIComponent(selectedCam)}` : '';
      const base     = `filter=${timeFilter}${camParam}`;

      const [chartRes, inoutRes, summaryRes] = await Promise.allSettled([
        apiGet(`/api/analytics/chart?${base}`),
        apiGet(`/api/analytics/inout?${base}`),
        apiGet(`/api/analytics/summary?${base}`),
      ]);

      // chart sekarang return { rows, totals }
      const chartData   = chartRes.status   === 'fulfilled' ? (chartRes.value   || {}) : {};
      const trafficRows = chartData.rows   || [];
      const chartTotals = chartData.totals || {};   // ← SINGLE SOURCE OF TRUTH

      const inOutRows   = inoutRes.status   === 'fulfilled' ? (inoutRes.value   || []) : [];
      const summaryData = summaryRes.status === 'fulfilled' ?  summaryRes.value        : null;

      setTrafficData(trafficRows);
      setInOutData(inOutRows);
      setTotalToday(summaryData?.total_events_today ?? 0);

      // Summary cards — SELALU dari chartTotals bukan dari summaryData.current
      // Ini menjamin angka di card IDENTIK dengan angka di grafik
      const changes = summaryData?.changes || {};
      const cards = CLASS_LINES.map(c => {
        const val  = chartTotals[c.key] ?? 0;   // ← dari chart, bukan query terpisah
        const pct  = changes[c.key]     ?? 0;
        const isUp = pct >= 0;
        return { label: c.name, value: val, pct, isUp, color: c.color, key: c.key };
      });
      setSummaryCards(cards);
    } catch (err) {
      console.error('[Analytics] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, selectedCam]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const filterLabel = TIME_FILTERS.find(f => f.key === timeFilter)?.label || timeFilter;
  const camLabel    = selectedCam
    ? (cameras.find(c => c.camera_id === selectedCam)?.name || selectedCam)
    : 'Semua Kamera';

  // Apakah ada data sama sekali
  const hasTraffic = trafficData.some(row =>
    CLASS_LINES.some(cl => (row[cl.key] || 0) > 0)
  );
  const hasInOut = inOutData.some(row => (row.IN || 0) + (row.OUT || 0) > 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="display-lg text-[var(--color-ink)] m-0">Analytics</h1>
          <p className="body-sm text-[var(--color-mute)] mt-0.5">
            Analisis histori deteksi dari database — {camLabel}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Pilih kamera */}
          {cameras.length > 0 && (
            <select
              value={selectedCam}
              onChange={e => setSelectedCam(e.target.value)}
              className="px-3 py-1.5 border border-[var(--color-hairline)] bg-white rounded-[var(--radius-md)] body-xs text-[var(--color-ink)] shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">Semua Kamera</option>
              {cameras.map(c => (
                <option key={c.camera_id} value={c.camera_id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Time filter pills */}
          <div className="flex items-center bg-[var(--color-surface-card)] border border-[var(--color-hairline)] p-1 rounded-full shadow-sm">
            {TIME_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTimeFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  timeFilter === f.key
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[var(--color-hairline)] bg-white rounded-[var(--radius-md)] text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={loading ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Panduan Singkat ─── */}
      <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] px-4 py-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="body-xs font-semibold text-blue-800 m-0">Cara membaca halaman ini</p>
          <ul className="caption-sm text-blue-700 m-0 pl-3 flex flex-col gap-0.5" style={{ listStyleType: 'disc' }}>
            <li><strong>Card warna</strong> = jumlah total objek yang melewati garis selama periode yang dipilih (Hari Ini / Minggu / Bulan / Tahun).</li>
            <li><strong>Persentase ↑↓</strong> = perbandingan dengan periode sebelumnya. Misal <strong>1275%</strong> artinya hari ini jauh lebih banyak dari kemarin.</li>
            <li><strong>Tren Traffic</strong> = grafik berapa banyak objek terdeteksi <em>per jam</em> (bukan total). Hover grafik untuk lihat kumulatif.</li>
            <li><strong>IN / OUT</strong> = arah pergerakan objek per jam. Hijau = Masuk, Merah = Keluar.</li>
          </ul>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading
          ? Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : summaryCards.map(s => {
            const tipText = {
              person:     'Jumlah orang yang melewati garis deteksi selama ' + filterLabel.toLowerCase(),
              car:        'Jumlah mobil yang melewati garis deteksi selama ' + filterLabel.toLowerCase(),
              truck:      'Jumlah truk yang melewati garis deteksi selama ' + filterLabel.toLowerCase(),
              bus:        'Jumlah bus yang melewati garis deteksi selama ' + filterLabel.toLowerCase(),
              motorcycle: 'Jumlah motor yang melewati garis deteksi selama ' + filterLabel.toLowerCase(),
            }[s.key] || '';

            // Format keterangan perubahan
            const pctAbs = Math.abs(s.pct);
            let pctLabel = '';
            if (s.pct === 0) pctLabel = 'Sama dengan ' + (timeFilter === 'Today' ? 'kemarin' : 'periode lalu');
            else if (pctAbs >= 100) pctLabel = (s.isUp ? 'Jauh lebih banyak' : 'Jauh lebih sedikit') + ' dari ' + (timeFilter === 'Today' ? 'kemarin' : 'periode lalu');
            else pctLabel = (s.isUp ? 'Lebih banyak' : 'Lebih sedikit') + ' ' + pctAbs + '% dari ' + (timeFilter === 'Today' ? 'kemarin' : 'periode lalu');

            return (
              <div
                key={s.key}
                className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                {/* Color bar top */}
                <div className="w-8 h-1 rounded-full mb-2" style={{ backgroundColor: s.color }} />
                {/* Label objek + info icon */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="utility-xs text-[var(--color-mute)] uppercase tracking-wide m-0">{s.label}</p>
                  <InfoTip text={tipText} />
                </div>
                <p className="caption-xs text-[var(--color-mute)] mb-1.5">Total {filterLabel}</p>
                {/* Angka total */}
                <div className="font-mono-num text-[var(--color-ink)] font-bold mb-2" style={{ fontSize: 26 }}>
                  {s.value.toLocaleString('id-ID')}
                  <span className="font-sans text-xs text-[var(--color-mute)] font-normal ml-1">kali</span>
                </div>
                {/* Delta vs periode lalu */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className={`caption-xs px-2 py-0.5 rounded-full font-bold ${
                      s.isUp
                        ? 'bg-emerald-50 text-emerald-600'
                        : s.pct === 0
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-red-50 text-red-500'
                    }`}>
                      {s.pct === 0 ? '=' : s.isUp ? '+' : '−'}{pctAbs}%
                    </span>
                  </div>
                  <p className="caption-xs text-[var(--color-mute)] m-0" style={{ fontSize: 9, lineHeight: '1.3' }}>
                    {pctLabel}
                  </p>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Total Events Banner */}
      {!loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-card)] border border-[var(--color-hairline)] rounded-[var(--radius-lg)] shadow-sm">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <p className="body-xs font-semibold text-[var(--color-ink)] m-0">
              Total Line Crossing Hari Ini:
              <span className="font-mono-num text-indigo-600 ml-1">{totalToday.toLocaleString('id-ID')}</span> event
            </p>
            <p className="caption-sm text-[var(--color-mute)] m-0">{camLabel} — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Traffic Trends — Area Chart */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="heading-sm text-[var(--color-ink)] m-0">Tren Traffic</h2>
              <p className="caption-sm text-[var(--color-mute)] m-0">{filterLabel} · {camLabel}</p>
            </div>
          </div>
          {/* Keterangan penting: nilai di grafik adalah PER JAM/HARI, bukan total */}
          <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="caption-xs text-amber-700 font-medium">
              Grafik = deteksi <strong>per {timeFilter === 'Today' ? 'jam' : timeFilter === 'Week' ? 'hari' : timeFilter === 'Month' ? 'hari' : 'bulan'}</strong>.
              Card di atas = <strong>total {filterLabel.toLowerCase()}</strong>.
            </span>
          </div>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasTraffic ? (
            <EmptyChart height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trafficData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {CLASS_LINES.map(cl => (
                    <linearGradient key={cl.key} id={`grad-${cl.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={cl.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={cl.color} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.05)" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<TrafficTooltip allRows={trafficData} filterKey={timeFilter} />}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {CLASS_LINES.map(cl => (
                  <Area
                    key={cl.key}
                    type="monotone"
                    dataKey={cl.key}
                    stroke={cl.color}
                    strokeWidth={2}
                    fill={`url(#grad-${cl.key})`}
                    dot={false}
                    name={cl.name}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* IN/OUT Trends — Bar Chart */}
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="heading-sm text-[var(--color-ink)] m-0">IN / OUT</h2>
            <p className="caption-sm text-[var(--color-mute)] m-0">{filterLabel} · {camLabel}</p>
          </div>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasInOut ? (
            <EmptyChart height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={inOutData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.05)" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="IN"  fill="#10b981" radius={[4, 4, 0, 0]} name="Masuk"  maxBarSize={36} />
                <Bar dataKey="OUT" fill="#ef4444" radius={[4, 4, 0, 0]} name="Keluar" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
          <div>
            <h2 className="heading-sm text-[var(--color-ink)] m-0">Detail Tabel</h2>
            <p className="caption-sm text-[var(--color-mute)] m-0">{filterLabel} · {camLabel}</p>
          </div>
          {trafficData.length > 0 && (
            <span className="caption-xs text-[var(--color-mute)]">{trafficData.length} periode</span>
          )}
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trafficData.length === 0 ? (
          <div className="p-10 text-center">
            <p className="body-sm text-[var(--color-mute)] m-0">Tidak ada data untuk rentang waktu ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse" style={{ minWidth: Math.max(600, 80 + trafficData.length * 64) }}>
              <thead className="bg-[var(--color-surface-soft)]">
                <tr>
                  <th className="px-4 py-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] sticky left-0 bg-[var(--color-surface-soft)] whitespace-nowrap">
                    Objek
                  </th>
                  {trafficData.map(row => (
                    <th
                      key={row.time}
                      className="px-3 py-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] text-center whitespace-nowrap"
                    >
                      {row.time}
                    </th>
                  ))}
                  <th className="px-4 py-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] text-center whitespace-nowrap bg-[var(--color-surface-soft)] sticky right-0">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLASS_LINES.map(cl => {
                  const rowTotal = trafficData.reduce((sum, row) => sum + (row[cl.key] || 0), 0);
                  return (
                    <tr key={cl.key} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-soft)]">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />
                          <span className="body-xs font-semibold text-[var(--color-ink)] capitalize">{cl.name}</span>
                        </div>
                      </td>
                      {trafficData.map(row => (
                        <td
                          key={row.time}
                          className={`px-3 py-3 font-mono-num body-xs text-center ${
                            (row[cl.key] || 0) > 0
                              ? 'text-[var(--color-ink)] font-semibold'
                              : 'text-[var(--color-mute)]'
                          }`}
                        >
                          {row[cl.key] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 font-mono-num body-xs text-center font-bold text-[var(--color-ink)] sticky right-0 bg-[var(--color-surface-soft)]">
                        {rowTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr className="bg-[var(--color-surface-soft)] border-t-2 border-[var(--color-hairline)]">
                  <td className="px-4 py-3 sticky left-0 bg-[var(--color-surface-soft)]">
                    <span className="utility-xs font-bold text-[var(--color-ink)]">TOTAL</span>
                  </td>
                  {trafficData.map(row => {
                    const colTotal = CLASS_LINES.reduce((sum, cl) => sum + (row[cl.key] || 0), 0);
                    return (
                      <td key={row.time} className="px-3 py-3 font-mono-num body-xs font-bold text-[var(--color-ink)] text-center">
                        {colTotal}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 font-mono-num body-xs font-bold text-indigo-600 text-center sticky right-0 bg-indigo-50">
                    {trafficData.reduce((grand, row) =>
                      grand + CLASS_LINES.reduce((s, cl) => s + (row[cl.key] || 0), 0), 0
                    ).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
