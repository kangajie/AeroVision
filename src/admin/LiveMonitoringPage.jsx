import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, getMjpegUrl } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

// ─── CameraCard dengan live feed + counter ──────────────────────────────────
function LiveCameraCard({ cam, wsState, onClick }) {
  const [imgError, setImgError] = useState(false);
  const isOnline = cam.status === 'Online';

  const totalIn  = wsState?.totals?.in  ?? 0;
  const totalOut = wsState?.totals?.out ?? 0;
  const hasOverload = wsState?.overload ?? false;

  return (
    <div
      className={`bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col ${
        hasOverload
          ? 'border-red-400 ring-2 ring-red-400 ring-opacity-50'
          : isOnline
            ? 'border-[var(--color-accent-green)] border-opacity-40'
            : 'border-[var(--color-hairline)]'
      }`}
      onClick={onClick}
    >
      {/* Video area */}
      <div className="relative bg-gray-900 aspect-video flex items-center justify-center overflow-hidden">
        {isOnline && !imgError ? (
          <img
            src={getMjpegUrl(cam.camera_id)}
            alt={`Feed ${cam.name}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500 w-full h-full">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              {isOnline
                ? <><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/><rect x="2" y="6" width="13" height="12" rx="2"/></>
                : <><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/><rect x="2" y="6" width="13" height="12" rx="2"/><line x1="1" y1="1" x2="23" y2="23"/></>
              }
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {isOnline ? 'Memuat stream...' : 'Kamera Offline'}
            </span>
          </div>
        )}

        {/* Camera ID badge */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          {cam.camera_id}
        </div>

        {/* Status badge */}
        <div
          className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isOnline ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-200'
          }`}
        >
          {isOnline && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {isOnline ? 'LIVE' : 'OFFLINE'}
        </div>

        {/* Overload alert overlay */}
        {hasOverload && (
          <div className="absolute inset-0 bg-red-600 bg-opacity-30 flex items-center justify-center pointer-events-none animate-pulse">
            <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              ⚠ OVERLOAD
            </span>
          </div>
        )}

        {/* LIVE border glow */}
        {isOnline && !hasOverload && (
          <div className="absolute inset-0 ring-2 ring-emerald-400 ring-opacity-30 pointer-events-none rounded-inherit" />
        )}
      </div>

      {/* Info bar */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="body-xs font-semibold text-[var(--color-ink)] m-0 truncate">{cam.name}</p>
          <p className="caption-xs text-[var(--color-mute)] m-0">{cam.camera_id}</p>
        </div>
        {/* Counter IN/OUT dari WebSocket */}
        {isOnline && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 rounded text-[9px] font-bold text-emerald-700">
              ↑{totalIn}
            </span>
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 rounded text-[9px] font-bold text-red-600">
              ↓{totalOut}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Camera Modal (popup detail) ────────────────────────────────────────────
function CameraModal({ cam, wsState, onClose }) {
  const [imgError, setImgError] = useState(false);
  const isOnline = cam.status === 'Online';

  const totalIn    = wsState?.totals?.in  ?? 0;
  const totalOut   = wsState?.totals?.out ?? 0;
  const counts     = wsState?.counts     ?? {};
  const hasOverload = wsState?.overload  ?? false;

  // Kelas yang ada deteksinya
  const activeClasses = Object.entries(counts).filter(([, v]) => v > 0);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-hairline)]">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <h2 className="heading-md text-[var(--color-ink)] m-0">{cam.name}</h2>
              <p className="caption-sm text-[var(--color-mute)] m-0">ID: {cam.camera_id} · {isOnline ? 'LIVE' : 'OFFLINE'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-soft)] rounded-md transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Video feed */}
        <div className="bg-gray-900 aspect-video flex items-center justify-center relative overflow-hidden">
          {isOnline && !imgError ? (
            <img
              key={cam.camera_id}
              src={getMjpegUrl(cam.camera_id)}
              alt={`Live Feed ${cam.camera_id}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/>
                <rect x="2" y="6" width="13" height="12" rx="2"/>
                {!isOnline && <line x1="1" y1="1" x2="23" y2="23"/>}
              </svg>
              <p className="body-sm m-0">
                {isOnline ? 'Memuat stream...' : 'Kamera tidak aktif'}
              </p>
              {isOnline && (
                <p className="caption-sm m-0 text-gray-500">
                  Pastikan backend berjalan dan URL stream dapat diakses.
                </p>
              )}
            </div>
          )}

          {/* Overload overlay */}
          {hasOverload && (
            <div className="absolute inset-0 bg-red-600 bg-opacity-40 flex items-center justify-center animate-pulse pointer-events-none">
              <div className="bg-red-700 px-6 py-3 rounded-full shadow-2xl">
                <span className="text-white font-black text-lg uppercase tracking-widest">OVERLOAD!</span>
              </div>
            </div>
          )}
        </div>

        {/* Info bar bawah */}
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[var(--color-hairline)]">
          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <p className="caption-xs text-[var(--color-mute)] m-0 font-semibold uppercase tracking-wide">Status</p>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold w-fit ${
              isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Masuk */}
          <div className="flex flex-col gap-0.5">
            <p className="caption-xs text-[var(--color-mute)] m-0 font-semibold uppercase tracking-wide">Total Masuk</p>
            <p className="heading-md text-emerald-600 font-mono-num m-0">{totalIn}</p>
          </div>

          {/* Keluar */}
          <div className="flex flex-col gap-0.5">
            <p className="caption-xs text-[var(--color-mute)] m-0 font-semibold uppercase tracking-wide">Total Keluar</p>
            <p className="heading-md text-red-500 font-mono-num m-0">{totalOut}</p>
          </div>

          {/* Terdeteksi sekarang */}
          <div className="flex flex-col gap-0.5">
            <p className="caption-xs text-[var(--color-mute)] m-0 font-semibold uppercase tracking-wide">Terdeteksi Kini</p>
            {activeClasses.length === 0 ? (
              <p className="caption-sm text-[var(--color-mute)] m-0">—</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {activeClasses.map(([cls, cnt]) => (
                  <span key={cls} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold capitalize">
                    {cls}: {cnt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)] body-xs font-semibold hover:bg-[var(--color-hairline)] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Halaman utama ───────────────────────────────────────────────────────────
export default function LiveMonitoringPage() {
  const [cameras, setCameras]       = useState([]);
  const [viewMode, setViewMode]     = useState('grid');
  const [statusFilter, setStatusFilter] = useState('Semua');   // Semua / Online / Offline
  const [search, setSearch]         = useState('');
  const [selectedCam, setSelectedCam] = useState(null);
  const [loading, setLoading]       = useState(true);

  const { isConnected, cameraStates, getCamera } = useWebSocket();

  // ── Fetch daftar kamera (polling 5s) ────────────────────────────────────
  const fetchCameras = useCallback(async () => {
    try {
      const cams = await apiGet('/api/cameras');
      if (cams) setCameras(cams);
    } catch (err) {
      console.error('[LiveMonitoring] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, [fetchCameras]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = cameras.filter(cam => {
    const matchStatus =
      statusFilter === 'Semua' ||
      (statusFilter === 'Online'  && cam.status === 'Online') ||
      (statusFilter === 'Offline' && cam.status !== 'Online');
    const matchSearch =
      !search ||
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      cam.camera_id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const liveCount    = cameras.filter(c => c.status === 'Online').length;
  const offlineCount = cameras.filter(c => c.status !== 'Online').length;
  const overloadCams = cameras.filter(c => getCamera(c.camera_id)?.overload);

  // ── Sync selectedCam dengan data terbaru ─────────────────────────────────
  useEffect(() => {
    if (selectedCam) {
      const updated = cameras.find(c => c.camera_id === selectedCam.camera_id);
      if (updated) setSelectedCam(updated);
    }
  }, [cameras]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex justify-center items-center z-10 backdrop-blur-[1px]">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="display-lg text-[var(--color-ink)] m-0">Live Monitoring</h1>
          <p className="body-sm text-[var(--color-mute)] mt-0.5">
            Pantau semua kamera CCTV secara real-time.
          </p>
        </div>

        {/* Status summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WebSocket indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            isConnected
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
            {isConnected ? 'WebSocket Aktif' : 'Tidak Terhubung'}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="caption-xs font-bold text-emerald-700">{liveCount} Online</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-200">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="caption-xs font-bold text-gray-500">{offlineCount} Offline</span>
          </div>
          {overloadCams.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-full border border-red-300 animate-pulse">
              <span className="caption-xs font-bold text-red-600">⚠ {overloadCams.length} Overload</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-3 shadow-sm flex flex-wrap items-center gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center bg-[var(--color-surface-soft)] p-1 rounded-[var(--radius-md)] border border-[var(--color-hairline)] gap-0.5">
          {['Semua', 'Online', 'Offline'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                statusFilter === f
                  ? 'bg-white shadow-sm text-[var(--color-ink)]'
                  : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]'
              }`}
            >
              {f}
              <span className="ml-1 text-[9px] font-bold opacity-60">
                {f === 'Semua' ? cameras.length : f === 'Online' ? liveCount : offlineCount}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mute)]" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari nama atau ID kamera..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs rounded-[var(--radius-md)] pl-9 pr-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        <div className="flex-1" />

        {/* Refresh button */}
        <button
          onClick={fetchCameras}
          className="p-2 border border-[var(--color-hairline)] bg-white rounded-[var(--radius-md)] text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-sm"
          title="Refresh daftar kamera"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>

        {/* View mode toggle */}
        <div className="flex items-center bg-[var(--color-surface-soft)] p-1 rounded-[var(--radius-md)] border border-[var(--color-hairline)]">
          {[
            { mode: 'grid', icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
            { mode: 'list', icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
          ].map(({ mode, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded transition-all ${viewMode === mode ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--color-mute)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/>
            <rect x="2" y="6" width="13" height="12" rx="2"/>
          </svg>
          <p className="body-sm m-0">
            {cameras.length === 0
              ? 'Belum ada kamera. Tambahkan via Configuration.'
              : 'Tidak ada kamera yang sesuai filter.'}
          </p>
        </div>
      )}

      {/* Camera Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(cam => (
            <LiveCameraCard
              key={cam.camera_id}
              cam={cam}
              wsState={getCamera(cam.camera_id)}
              onClick={() => setSelectedCam(cam)}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--color-surface-soft)]">
              <tr>
                {['Camera ID', 'Nama Kamera', 'Status', 'Masuk (Live)', 'Keluar (Live)', 'Overload', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(cam => {
                const ws = getCamera(cam.camera_id);
                const isOnline = cam.status === 'Online';
                return (
                  <tr key={cam.camera_id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
                    <td className="px-4 py-3 caption-sm font-bold text-[var(--color-ink)] font-mono">{cam.camera_id}</td>
                    <td className="px-4 py-3 body-xs text-[var(--color-ink)] font-semibold">{cam.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold ${
                        isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-num body-xs font-bold text-emerald-600">
                      {isOnline ? ws.totals?.in ?? 0 : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono-num body-xs font-bold text-red-500">
                      {isOnline ? ws.totals?.out ?? 0 : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {ws.overload ? (
                        <span className="caption-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">⚠ YA</span>
                      ) : (
                        <span className="caption-xs text-[var(--color-mute)]">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedCam(cam)}
                        className="utility-xs text-[var(--color-accent-blue)] hover:underline font-semibold"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Camera Detail Modal */}
      {selectedCam && (
        <CameraModal
          cam={selectedCam}
          wsState={getCamera(selectedCam.camera_id)}
          onClose={() => setSelectedCam(null)}
        />
      )}
    </div>
  );
}
