import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiGet, getMjpegUrl, getWebSocketUrl } from '../api/client';
import VideoOverlay from '../components/VideoOverlay';

const CLASS_COLORS = {
  person:     { color: 'var(--color-accent-blue)',   label: 'Person' },
  bicycle:    { color: '#06b6d4',                    label: 'Bicycle' },
  car:        { color: 'var(--color-accent-green)',  label: 'Car' },
  truck:      { color: 'var(--color-primary)',       label: 'Truck' },
  bus:        { color: 'var(--color-accent-purple)', label: 'Bus' },
  motorcycle: { color: 'var(--color-accent-red)',    label: 'Motorcycle' },
};

// Grid layout berdasarkan jumlah kamera aktif
function getGridClass(count) {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  return 'grid-cols-2';
}

// ── CameraPanel: satu panel per kamera ───────────────────────────────────────
function CameraPanel({ camera, camState, isFocused, onFocus, lineConfig }) {
  const { counts = {}, totals = { in: 0, out: 0 }, overload = false, alarm = false, detections = [], events = [] } = camState;
  
  return (
    <div
      onClick={onFocus}
      className={`relative flex flex-col rounded-[var(--radius-lg)] overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
        alarm
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
          : overload
          ? 'border-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.3)]'
          : isFocused
          ? 'border-[var(--color-primary)] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
          : 'border-[var(--color-hairline)]'
      } bg-black`}
      style={{ minHeight: 200 }}
    >
      {/* Live badge */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded px-2 py-1 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="caption-xs font-bold text-white tracking-wide truncate max-w-[100px]">
          {camera.name || camera.camera_id}
        </span>
      </div>

      {/* Video Overlay with MJPEG Stream */}
      <div className="flex-1 min-h-[160px] relative">
        <VideoOverlay
          cameraId={camera.camera_id}
          detections={detections}
          events={events}
          lineConfig={lineConfig}
          showAlert={alarm || overload}
        />
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between gap-2 z-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="caption-xs text-white/70 font-mono-num">
            <span className="text-green-400 font-bold">{totals.in}</span> IN
          </span>
          <span className="caption-xs text-white/70 font-mono-num">
            <span className="text-red-400 font-bold">{totals.out}</span> OUT
          </span>
        </div>
        {overload && (
          <span className="caption-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded animate-pulse">
            OVERLOAD
          </span>
        )}
        {!overload && (
          <span className="caption-xs text-white/50 font-mono-num">
            {Object.values(counts).reduce((a, b) => a + b, 0)} obj
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main LiveViewPage ─────────────────────────────────────────────────────────
export default function LiveViewPage() {
  const navigate = useNavigate();
  const { isConnected, cameraStates, aggregate, getCamera } = useWebSocket();

  const [cameras, setCameras] = useState([]);          // semua kamera aktif dari backend
  const [cameraConfigs, setCameraConfigs] = useState({}); // konfigurasi tiap kamera
  const [focusedCamId, setFocusedCamId] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load daftar kamera aktif dari backend
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // Endpoint publik — tidak perlu auth
        const [camsData, configData] = await Promise.allSettled([
          apiGet('/api/cameras/list'),
          apiGet('/api/config/active')
        ]);
        
        // Mulai dengan config dari engine aktif
        let configs = {};
        if (configData.status === 'fulfilled' && configData.value) {
          configs = configData.value;
        }

        if (camsData.status === 'fulfilled' && camsData.value?.length > 0) {
          // Tampilkan HANYA kamera yang benar-benar aktif
          const active = camsData.value.filter(c => c.is_active === true || c.status === 'Online');
          
          setCameras(active);
          
          if (!focusedCamId && active.length > 0) {
            setFocusedCamId(active[0].camera_id);
          } else if (active.length === 0) {
            setFocusedCamId(null);
          }

          // Untuk kamera yang belum ada config dari engine (engine mungkin belum dimulai),
          const missingCamIds = active
            .map(c => c.camera_id)
            .filter(id => !configs[id]);

          if (missingCamIds.length > 0) {
            const fallbacks = await Promise.allSettled(
              missingCamIds.map(id => apiGet(`/api/config/${id}`))
            );
            missingCamIds.forEach((id, idx) => {
              const r = fallbacks[idx];
              if (r.status === 'fulfilled' && r.value) {
                const d = r.value;
                configs[id] = {
                  camera_id: id,
                  alarm_enabled: d.alarm_enabled || false,
                  active_classes: d.active_classes || [],
                  thresholds: d.thresholds || {},
                  line_config: {
                    x1: d.x1 ?? 0.1, y1: d.y1 ?? 0.5,
                    x2: d.x2 ?? 0.9, y2: d.y2 ?? 0.5,
                    direction_in_side: d.direction_in_side || 'A',
                    color_in: d.color_in || '#10b981',
                    color_out: d.color_out || '#ef4444',
                    line_thickness: d.line_thickness || 2,
                  },
                };
              }
            });
          }
        }
        
        setCameraConfigs(configs);
      } catch (err) {
        console.error('[LiveView] Load cameras error:', err);
      }
    };
    fetchCameras();
    const interval = setInterval(fetchCameras, 15000); // refresh tiap 15 detik
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alarm audio: berbunyi jika ada kamera yang alarm=true dari WebSocket
  useEffect(() => {
    if (!aggregate.alarm) return;
    if (!audioEnabled) return;
    const playBeep = () => {
      try {
        const ACtx = window.AudioContext || window.webkitAudioContext;
        if (!ACtx) return;
        const ctx = new ACtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      } catch (e) { console.error('Audio failed', e); }
    };
    playBeep();
    const interval = setInterval(playBeep, 2000);
    return () => clearInterval(interval);
  }, [aggregate.alarm, audioEnabled]);

  // Sinkronkan audioEnabled dengan alarm_enabled dari konfigurasi kamera aktif pertama
  // Hanya set sekali saat configs pertama kali dimuat
  useEffect(() => {
    if (Object.keys(cameraConfigs).length > 0) {
      const firstConfig = Object.values(cameraConfigs)[0];
      if (firstConfig?.alarm_enabled !== undefined) {
        setAudioEnabled(firstConfig.alarm_enabled);
      }
    }
  }, [cameraConfigs]);

  const { totalIn, totalOut, counts: aggCounts } = aggregate;
  const totalDetections = Object.values(aggCounts).reduce((a, b) => a + b, 0);
  const activeAlerts = cameras.filter(c => getCamera(c.camera_id).overload).length;

  // Detail view untuk kamera yang di-fokus
  const focusedCam = cameras.find(c => c.camera_id === focusedCamId);
  const focusedState = focusedCamId ? getCamera(focusedCamId) : {};

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-canvas)] overflow-hidden">
      {/* ── Topbar ── */}
      <header className="h-[56px] flex-shrink-0 bg-[var(--color-surface-card)] border-b border-[var(--color-hairline)] flex items-center justify-between px-4 z-50 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--color-surface-soft)] flex items-center justify-center border border-[var(--color-hairline)] overflow-hidden">
            <img src="/logo_poliwangi.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <h1 className="heading-sm-mixed text-[var(--color-ink)] m-0">AeroVision</h1>
          {/* Camera count badge */}
          {cameras.length > 0 && (
            <span className="caption-xs bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-mute)] px-2 py-0.5 rounded-full font-semibold">
              {cameras.length} kamera aktif
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="body-xs font-mono-num text-[var(--color-ink)] hidden sm:block">{time.toLocaleTimeString()}</span>

          {/* Alarm toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border utility-xs font-bold transition-all ${audioEnabled
              ? 'bg-[var(--color-accent-red-soft)] border-[var(--color-accent-red)] text-[var(--color-accent-red)]'
              : 'bg-[var(--color-surface-soft)] border-[var(--color-hairline)] text-[var(--color-mute)] hover:border-[var(--color-ash)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {audioEnabled
                ? <path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                : <path d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6" />}
            </svg>
            {audioEnabled ? 'ALARM ON' : 'ALARM OFF'}
          </button>

          {/* System Status */}
          <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${isConnected ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green-soft)] text-[var(--color-accent-green)]' : 'border-[var(--color-accent-red)] bg-[var(--color-accent-red-soft)] text-[var(--color-accent-red)]'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-accent-green)] animate-pulse' : 'bg-[var(--color-accent-red)]'}`} />
            <span className="utility-xs font-bold">{isConnected ? '● SYSTEM ONLINE' : '● SYSTEM OFFLINE'}</span>
          </div>

          <button
            onClick={() => navigate('/admin/login')}
            className="utility-xs text-[var(--color-mute)] hover:text-[var(--color-ink)] px-2 py-1.5 rounded hover:bg-[var(--color-surface-soft)] transition-colors hidden sm:flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" /></svg>
            Admin
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* Left: Camera Grid */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0">
          {cameras.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-[var(--color-mute)]">
                <svg className="mx-auto mb-4 opacity-30" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14" />
                  <rect x="2" y="6" width="13" height="12" rx="2" />
                </svg>
                <p className="body-sm">Tidak ada kamera aktif.</p>
                <p className="caption-sm mt-1">Aktifkan kamera di Dashboard Admin → Configuration → Camera Management</p>
              </div>
            </div>
          ) : (
            <div className={`grid ${getGridClass(cameras.length)} gap-3 h-full`} style={{ gridAutoRows: cameras.length === 1 ? '100%' : 'minmax(180px, 1fr)' }}>
              {cameras.map(cam => (
                <CameraPanel
                  key={cam.camera_id}
                  camera={cam}
                  camState={getCamera(cam.camera_id)}
                  isFocused={focusedCamId === cam.camera_id}
                  onFocus={() => setFocusedCamId(cam.camera_id)}
                  lineConfig={cameraConfigs[cam.camera_id]?.line_config}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Stats Panel — detail kamera yang difokus */}
        <div className="w-full lg:w-[260px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--color-hairline)] flex flex-col overflow-y-auto bg-[var(--color-surface-card)]">
          {/* Pilih kamera untuk lihat detail */}
          {cameras.length > 1 && (
            <div className="p-3 border-b border-[var(--color-hairline)]">
              <label className="utility-xs text-[var(--color-mute)] block mb-1">Pilih Kamera</label>
              <select
                value={focusedCamId || ''}
                onChange={e => setFocusedCamId(e.target.value)}
                className="w-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] rounded-[var(--radius-md)] px-3 py-2 body-xs font-semibold outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
              >
                {cameras.map(cam => (
                  <option key={cam.camera_id} value={cam.camera_id}>{cam.name || cam.camera_id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Detail kamera terfokus */}
          {focusedCam && (
            <div className="p-4 border-b border-[var(--color-hairline)] flex flex-col gap-3">
              <div>
                <h3 className="utility-xs font-bold text-[var(--color-ink)] uppercase tracking-wide mb-2">
                  {focusedCam.name || focusedCamId}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'IN', value: focusedState.totals?.in || 0, color: 'var(--color-accent-green)' },
                    { label: 'OUT', value: focusedState.totals?.out || 0, color: 'var(--color-accent-red)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] p-3 text-center">
                      <div className="caption-xs text-[var(--color-mute)] mb-1">{label}</div>
                      <div className="font-mono-num font-bold text-xl" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-class counts */}
              <div className="flex flex-col gap-1.5">
                <h4 className="utility-xs text-[var(--color-mute)] uppercase tracking-wide">Deteksi per Kelas</h4>
                
                {(() => {
                  const activeClasses = cameraConfigs[focusedCamId]?.active_classes || [];
                  if (activeClasses.length === 0) {
                    return (
                      <div className="caption-sm text-[var(--color-mute)] text-center py-2 bg-[var(--color-surface-soft)] rounded-[var(--radius-sm)] border border-dashed border-[var(--color-hairline)]">
                        Kamera belum dikonfigurasi
                      </div>
                    );
                  }

                  return activeClasses.map(cls => {
                    const count = focusedState.counts?.[cls] || 0;
                    const threshold = cameraConfigs[focusedCamId]?.thresholds?.[cls] || 0;
                    const info = CLASS_COLORS[cls];
                    const isOverload = threshold > 0 && count >= threshold;
                    
                    return (
                      <div key={cls} className={`flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-sm)] ${isOverload ? 'bg-red-50 border border-red-200' : 'bg-[var(--color-surface-soft)]'}`}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: info?.color || '#888' }} />
                          <span className={`utility-xs capitalize font-semibold ${isOverload ? 'text-red-700' : 'text-[var(--color-ink)]'}`}>{cls}</span>
                        </div>
                        <span className={`font-mono-num font-bold text-sm ${isOverload ? 'text-red-600' : 'text-[var(--color-ink)]'}`}>
                          {count} {threshold > 0 ? `/ ${threshold}` : ''}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Aggregate semua kamera */}
          <div className="p-4 flex flex-col gap-3">
            <h3 className="utility-xs font-bold text-[var(--color-ink)] uppercase tracking-wide">Semua Kamera</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total IN', value: totalIn, color: 'var(--color-accent-green)' },
                { label: 'Total OUT', value: totalOut, color: 'var(--color-accent-red)' },
                { label: 'Deteksi', value: totalDetections, color: 'var(--color-accent-blue)' },
                { label: 'Alert', value: activeAlerts, color: activeAlerts > 0 ? 'var(--color-accent-red)' : 'var(--color-mute)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] p-3 text-center">
                  <div className="caption-xs text-[var(--color-mute)] mb-1">{label}</div>
                  <div className="font-mono-num font-bold text-xl" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 bg-[var(--color-surface-card)] text-center py-2 border-t border-[var(--color-hairline)] relative z-20">
        <p className="caption-sm text-[var(--color-mute)] m-0">© 2026 AeroVision. All rights reserved.</p>
      </footer>
    </div>
  );
}
