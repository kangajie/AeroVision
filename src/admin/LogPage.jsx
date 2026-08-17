import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiDelete, apiPost, BASE_URL } from '../api/client';

// ─── Konstanta ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 15;

// Mapping event_type dari backend ke label UI
const EVENT_TYPES = {
  all:           { key: 'all',           label: 'All Logs',      apiValue: null },
  line_crossing: { key: 'line_crossing', label: 'Line Crossing', apiValue: 'line_crossing' },
  overload:      { key: 'overload',      label: 'Overload',      apiValue: 'overload' },
  camera:        { key: 'camera',        label: 'Camera',        apiValue: 'camera' },
  system:        { key: 'system',        label: 'System',        apiValue: 'system' },
};

const TAB_ORDER = ['all', 'overload', 'line_crossing', 'camera', 'system'];

// Warna badge per event_type
const TYPE_STYLE = {
  line_crossing: {
    bg:   'rgba(59,130,246,.12)',
    text: '#3b82f6',
    label: 'Line Crossing',
  },
  overload: {
    bg:   'rgba(239,68,68,.12)',
    text: '#ef4444',
    label: 'Overload',
  },
  camera: {
    bg:   'rgba(168,85,247,.12)',
    text: '#a855f7',
    label: 'Camera',
  },
  system: {
    bg:   'rgba(107,114,128,.12)',
    text: '#6b7280',
    label: 'System',
  },
};

const defaultStyle = { bg: 'rgba(107,114,128,.12)', text: '#6b7280', label: 'Unknown' };

// Icon per tipe
const TypeIcon = ({ type, size = 14 }) => {
  if (type === 'line_crossing') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
  if (type === 'overload') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
  if (type === 'camera') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/>
      <rect x="2" y="6" width="13" height="12" rx="2"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
};

// Label aksi sistem (object_class berisi action name)
const SYSTEM_ACTION_LABEL = {
  config_saved:        'Konfigurasi Disimpan',
  camera_activated:    'Kamera Diaktifkan',
  camera_deactivated:  'Kamera Dinonaktifkan',
  camera_added:        'Kamera Ditambahkan',
  camera_updated:      'Kamera Diperbarui',
  camera_deleted:      'Kamera Dihapus',
  settings_updated:    'Pengaturan Diperbarui',
};

// Format deskripsi event berdasarkan tipe
function formatDescription(row) {
  const type = row.event_type || 'line_crossing';
  if (type === 'line_crossing') {
    const dir = row.direction === 'Masuk' ? '→ Masuk' : '← Keluar';
    return `${row.object_class || 'Objek'} melewati garis  ${dir}`;
  }
  if (type === 'overload') {
    // direction berisi "count=X threshold=Y"
    const match = (row.direction || '').match(/count=(\d+)\s+threshold=(\d+)/);
    if (match) {
      return `${row.object_class || 'Objek'} melebihi batas: ${match[1]} / ${match[2]}`;
    }
    return `${row.object_class || 'Objek'} melebihi batas kapasitas`;
  }
  if (type === 'system' || type === 'camera') {
    // direction berisi detail lengkap dari backend
    return row.direction || SYSTEM_ACTION_LABEL[row.object_class] || row.object_class || '-';
  }
  return row.direction || '-';
}

// Format timestamp
function formatTime(ts) {
  if (!ts) return { time: '-', date: '-' };
  const d = new Date(ts);
  return {
    time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}



// ─── Konfigurasi kolom per tab ────────────────────────────────────────────────

const COLUMNS = {
  all: [
    { key: 'time',     label: 'Waktu' },
    { key: 'type',     label: 'Tipe' },
    { key: 'camera',   label: 'Kamera' },
    { key: 'camname',  label: 'Nama Kamera' },
    { key: 'desc',     label: 'Deskripsi' },
    { key: 'action',   label: 'Aksi' },
  ],
  line_crossing: [
    { key: 'time',     label: 'Waktu' },
    { key: 'camera',   label: 'Kamera' },
    { key: 'camname',  label: 'Nama Kamera' },
    { key: 'object',   label: 'Objek' },
    { key: 'direction',label: 'Arah' },
    { key: 'trackid',  label: 'Track ID' },
    { key: 'action',   label: 'Aksi' },
  ],
  overload: [
    { key: 'time',     label: 'Waktu' },
    { key: 'camera',   label: 'Kamera' },
    { key: 'camname',  label: 'Nama Kamera' },
    { key: 'object',   label: 'Objek' },
    { key: 'count',    label: 'Jumlah' },
    { key: 'threshold',label: 'Batas' },
    { key: 'action',   label: 'Aksi' },
  ],
  camera: [
    { key: 'time',     label: 'Waktu' },
    { key: 'aksi',     label: 'Aksi Kamera' },
    { key: 'camera',   label: 'ID Kamera' },
    { key: 'camname',  label: 'Nama Kamera' },
    { key: 'desc',     label: 'Detail' },
    { key: 'action',   label: 'Hapus' },
  ],
  system: [
    { key: 'time',     label: 'Waktu' },
    { key: 'aksi',     label: 'Jenis Perubahan' },
    { key: 'camera',   label: 'Target' },
    { key: 'desc',     label: 'Detail Perubahan' },
    { key: 'action',   label: 'Hapus' },
  ],
};

function getColumns(tab) {
  return COLUMNS[tab] || COLUMNS.all;
}

// Tombol hapus (shared)
const DeleteBtn = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1.5 hover:bg-red-100 rounded-md transition-colors text-[var(--color-mute)] hover:text-red-500"
    title="Hapus log ini"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
);

// Cell waktu (shared)
const TimeCell = ({ ts }) => {
  const { time, date } = formatTime(ts);
  return (
    <td className="px-4 py-3 whitespace-nowrap">
      <div className="body-xs font-semibold text-[var(--color-ink)]">{time}</div>
      <div className="caption-sm text-[var(--color-mute)]">{date}</div>
    </td>
  );
};

// Cell camera ID (shared)
const CameraIdCell = ({ id }) => (
  <td className="px-4 py-3">
    <span className="inline-flex items-center body-xs font-mono text-[var(--color-mute)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-md whitespace-nowrap">
      {id || '-'}
    </span>
  </td>
);

// Cell nama kamera (shared)
const CameraNameCell = ({ row }) => {
  const name = row.camera_name && row.camera_name !== row.camera_id
    ? row.camera_name : (row.camera_id || '-');
  return (
    <td className="px-4 py-3 body-xs font-semibold text-[var(--color-ink)] whitespace-nowrap">
      {name}
    </td>
  );
};

// ─── Row per-tipe ─────────────────────────────────────────────────────────────

function TableRow({ row, tab, onDismiss }) {
  const type = row.event_type || 'line_crossing';
  const effectiveTab = tab === 'all' ? type : tab;

  // ── Line Crossing ──────────────────────────────────────────────────────────
  if (effectiveTab === 'line_crossing') {
    const isMasuk = row.direction === 'Masuk';
    return (
      <tr className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
        <TimeCell ts={row.timestamp} />
        {tab === 'all' && (
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold"
              style={{ backgroundColor: TYPE_STYLE.line_crossing.bg, color: TYPE_STYLE.line_crossing.text }}>
              <TypeIcon type="line_crossing" size={12} /> Line Crossing
            </span>
          </td>
        )}
        <CameraIdCell id={row.camera_id} />
        <CameraNameCell row={row} />
        {/* Objek */}
        <td className="px-4 py-3">
          <span className="body-xs font-semibold text-[var(--color-ink)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-md capitalize">
            {row.object_class || '-'}
          </span>
        </td>
        {/* Arah */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold ${
            isMasuk
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-orange-50 text-orange-600'
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {isMasuk
                ? <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
                : <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 5 5 12 12 19"/></>
              }
            </svg>
            {row.direction || '-'}
          </span>
        </td>
        {/* Track ID */}
        <td className="px-4 py-3">
          <span className="body-xs font-mono text-[var(--color-mute)]">#{row.track_id ?? '-'}</span>
        </td>
        <td className="px-4 py-3"><DeleteBtn onClick={() => onDismiss(row.id)} /></td>
      </tr>
    );
  }

  // ── Overload ───────────────────────────────────────────────────────────────
  if (effectiveTab === 'overload') {
    const match = (row.direction || '').match(/count=(\d+)\s+threshold=(\d+)/);
    const count = match ? match[1] : '?';
    const threshold = match ? match[2] : '?';
    return (
      <tr className="border-b border-[var(--color-hairline)] bg-red-50/30 hover:bg-red-50/70 transition-colors">
        <TimeCell ts={row.timestamp} />
        {tab === 'all' && (
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold"
              style={{ backgroundColor: TYPE_STYLE.overload.bg, color: TYPE_STYLE.overload.text }}>
              <TypeIcon type="overload" size={12} /> Overload
            </span>
          </td>
        )}
        <CameraIdCell id={row.camera_id} />
        <CameraNameCell row={row} />
        {/* Objek */}
        <td className="px-4 py-3">
          <span className="body-xs font-semibold text-[var(--color-ink)] bg-red-100 text-red-700 px-2 py-0.5 rounded-md capitalize">
            {row.object_class || '-'}
          </span>
        </td>
        {/* Jumlah */}
        <td className="px-4 py-3">
          <span className="font-mono-num font-bold text-red-600 text-sm">{count}</span>
        </td>
        {/* Batas */}
        <td className="px-4 py-3">
          <span className="font-mono-num text-[var(--color-mute)] text-sm">{threshold}</span>
        </td>
        <td className="px-4 py-3"><DeleteBtn onClick={() => onDismiss(row.id)} /></td>
      </tr>
    );
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  if (effectiveTab === 'camera') {
    const action = row.object_class || '';
    const actionLabel = SYSTEM_ACTION_LABEL[action] || action;
    const isActivate = action === 'camera_activated';
    const isDelete = action === 'camera_deleted';
    return (
      <tr className="border-b border-[var(--color-hairline)] hover:bg-purple-50/30 transition-colors">
        <TimeCell ts={row.timestamp} />
        {tab === 'all' && (
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold"
              style={{ backgroundColor: TYPE_STYLE.camera.bg, color: TYPE_STYLE.camera.text }}>
              <TypeIcon type="camera" size={12} /> Camera
            </span>
          </td>
        )}
        {/* Aksi kamera */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold whitespace-nowrap ${
            isActivate ? 'bg-emerald-50 text-emerald-700'
            : isDelete  ? 'bg-red-50 text-red-700'
            : 'bg-blue-50 text-blue-700'
          }`}>
            {actionLabel}
          </span>
        </td>
        <CameraIdCell id={row.camera_id} />
        <CameraNameCell row={row} />
        {/* Detail */}
        <td className="px-4 py-3 body-xs text-[var(--color-body)] max-w-[280px]">
          <span title={row.direction}>{row.direction || '-'}</span>
        </td>
        <td className="px-4 py-3"><DeleteBtn onClick={() => onDismiss(row.id)} /></td>
      </tr>
    );
  }

  // ── System ─────────────────────────────────────────────────────────────────
  if (effectiveTab === 'system') {
    const action = row.object_class || '';
    const actionLabel = SYSTEM_ACTION_LABEL[action] || action;
    const target = row.camera_id === 'system'
      ? <span className="body-xs text-[var(--color-mute)]">Global</span>
      : <span className="inline-flex items-center body-xs font-mono text-[var(--color-mute)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-md">{row.camera_name || row.camera_id || '-'}</span>;

    return (
      <tr className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
        <TimeCell ts={row.timestamp} />
        {tab === 'all' && (
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold"
              style={{ backgroundColor: TYPE_STYLE.system.bg, color: TYPE_STYLE.system.text }}>
              <TypeIcon type="system" size={12} /> System
            </span>
          </td>
        )}
        {/* Jenis perubahan */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold bg-gray-100 text-gray-700 whitespace-nowrap">
            {actionLabel}
          </span>
        </td>
        {/* Target (kamera atau global) */}
        <td className="px-4 py-3">{target}</td>
        {/* Detail */}
        <td className="px-4 py-3 body-xs text-[var(--color-body)] max-w-[360px]">
          <span title={row.direction} className="line-clamp-2">{row.direction || '-'}</span>
        </td>
        <td className="px-4 py-3"><DeleteBtn onClick={() => onDismiss(row.id)} /></td>
      </tr>
    );
  }

  // ── Fallback (All Logs generic) ────────────────────────────────────────────
  const style = TYPE_STYLE[type] || defaultStyle;
  const desc = formatDescription(row);
  return (
    <tr className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-surface-soft)] transition-colors">
      <TimeCell ts={row.timestamp} />
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full caption-xs font-bold"
          style={{ backgroundColor: style.bg, color: style.text }}>
          <TypeIcon type={type} size={12} /> {style.label}
        </span>
      </td>
      <CameraIdCell id={row.camera_id} />
      <CameraNameCell row={row} />
      <td className="px-4 py-3 body-xs text-[var(--color-body)] max-w-[260px]">
        <span title={desc} className="line-clamp-2">{desc}</span>
      </td>
      <td className="px-4 py-3"><DeleteBtn onClick={() => onDismiss(row.id)} /></td>
    </tr>
  );
}


// ─── Komponen LogPage ─────────────────────────────────────────────────────────

export default function LogPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Summary per tipe (dari /api/events/summary)
  const [summary, setSummary] = useState({ total: 0, line_crossing: 0, overload: 0, camera: 0, system: 0 });

  // ── Fetch summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const s = await apiGet('/api/events/summary');
      setSummary(s);
    } catch (e) {
      console.error('[LogPage] Summary error:', e);
    }
  }, []);

  // ── Fetch logs ─────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      const tabConfig = EVENT_TYPES[activeTab];
      if (tabConfig?.apiValue) params.set('event_type', tabConfig.apiValue);

      const result = await apiGet(`/api/events?${params.toString()}`);
      setLogs(result.data || []);
      setTotalCount(result.total || 0);
      setTotalPages(result.total_pages || 1);
    } catch (err) {
      console.error('[LogPage] Fetch error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [fetchLogs, fetchSummary]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTabChange = (key) => { setActiveTab(key); setPage(1); };

  const dismissLog = async (id) => {
    try {
      await apiDelete(`/api/events/${id}`);
      // Hapus dari state lokal dan update summary
      setLogs(prev => prev.filter(r => r.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
      fetchSummary();
    } catch (err) {
      console.error('[LogPage] Delete error:', err);
    }
  };

  const deleteAllLogs = async () => {
    const tabLabel = EVENT_TYPES[activeTab]?.label || 'All';
    const msg = activeTab === 'all'
      ? 'Apakah Anda yakin ingin menghapus SEMUA log secara permanen?'
      : `Hapus semua log kategori "${tabLabel}" secara permanen?`;
    if (!window.confirm(msg)) return;
    try {
      const params = new URLSearchParams();
      if (EVENT_TYPES[activeTab]?.apiValue) params.set('event_type', EVENT_TYPES[activeTab].apiValue);
      await apiDelete(`/api/events?${params.toString()}`);
      setPage(1);
      fetchLogs();
      fetchSummary();
    } catch (err) {
      alert('Gagal menghapus log.');
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const params = new URLSearchParams();
      if (EVENT_TYPES[activeTab]?.apiValue) params.set('event_type', EVENT_TYPES[activeTab].apiValue);
      await apiPost(`/api/events/read-all?${params.toString()}`);
      fetchSummary(); // Refresh jumlah unread agar menjadi 0
      // Kita juga bisa refetch logs jika ingin ada indikator UI per-baris, tapi untuk sekarang summary cukup
    } catch (err) {
      console.error('[LogPage] Mark read error:', err);
      alert('Gagal menandai log sebagai dibaca.');
    }
  };

  const handleDownloadCSV = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert("Anda belum login!");
      return;
    }
    const params = new URLSearchParams({ token });
    const tabConfig = EVENT_TYPES[activeTab];
    if (tabConfig?.apiValue) params.set('event_type', tabConfig.apiValue);
    
    const downloadUrl = `${BASE_URL}/api/events/export?${params.toString()}`;
    window.open(downloadUrl, '_blank');
  };

  // ── Summary cards data ─────────────────────────────────────────────────────
  const summaryCards = [
    { key: 'all',           label: 'Total Log',     count: summary.total,         color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
    { key: 'overload',      label: 'Overload',       count: summary.overload,      color: '#ef4444', bg: 'rgba(239,68,68,.1)'  },
    { key: 'line_crossing', label: 'Line Crossing',  count: summary.line_crossing, color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
    { key: 'system',        label: 'System',         count: summary.system,        color: '#6b7280', bg: 'rgba(107,114,128,.1)' },
  ];

  const startEntry = totalCount === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endEntry   = Math.min(page * ITEMS_PER_PAGE, totalCount);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="display-lg text-[var(--color-ink)] m-0">Log Center</h1>
          <p className="body-sm text-[var(--color-mute)] mt-0.5">
            Riwayat event deteksi — line crossing, overload, dan sistem.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { fetchLogs(); fetchSummary(); }}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--color-hairline)] rounded-[var(--radius-md)] body-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--color-hairline)] rounded-[var(--radius-md)] body-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download CSV
          </button>
          <button
            onClick={markAllAsRead}
            disabled={summary.total === 0 && activeTab === 'all'}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)]/10 border border-transparent rounded-[var(--radius-md)] body-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Tandai Dibaca
          </button>
          <button
            onClick={deleteAllLogs}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-[var(--radius-md)] body-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Hapus {activeTab !== 'all' ? EVENT_TYPES[activeTab]?.label : 'Semua'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(s => (
          <button
            key={s.key}
            onClick={() => handleTabChange(s.key)}
            className={`bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border p-4 shadow-sm text-left transition-all ${
              activeTab === s.key
                ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-hairline)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            <p className="utility-xs text-[var(--color-mute)] mb-1">{s.label}</p>
            <div className="flex items-center justify-between">
              <span className="font-mono-num font-bold text-[var(--color-ink)] text-xl sm:text-[26px] leading-none">{s.count}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
                <TypeIcon type={s.key} size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab + Table Card */}
      <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] shadow-sm overflow-hidden flex flex-col">

        {/* Tab Bar */}
        <div className="flex items-center gap-1 border-b border-[var(--color-hairline)] px-4 pt-3 pb-0 overflow-x-auto">
          {TAB_ORDER.map(key => {
            const tab = EVENT_TYPES[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 border-b-2 body-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-mute)] hover:text-[var(--color-ink)]'
                }`}
              >
                {tab.label}
                {key !== 'all' && summary[key] > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: TYPE_STYLE[key]?.bg, color: TYPE_STYLE[key]?.text }}>
                    {summary[key]} Baru
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full relative min-h-[420px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex justify-center items-center z-10 backdrop-blur-[2px]">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[var(--color-surface-soft)] sticky top-0 z-10">
              <tr>
                {getColumns(activeTab).map(col => (
                  <th key={col.key} className="px-4 py-3 utility-xs text-[var(--color-mute)] font-semibold border-b border-[var(--color-hairline)] whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={getColumns(activeTab).length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-soft)] flex items-center justify-center text-[var(--color-mute)]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <p className="body-sm text-[var(--color-mute)] m-0">Tidak ada log di kategori ini.</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(row => (
                <TableRow key={row.id} row={row} tab={activeTab} onDismiss={dismissLog} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-[var(--color-hairline)] flex items-center justify-between bg-[var(--color-surface-soft)] flex-wrap gap-2">
          <p className="caption-sm text-[var(--color-mute)] m-0">
            {totalCount === 0
              ? 'Tidak ada data'
              : <>Menampilkan <span className="font-bold text-[var(--color-ink)]">{startEntry}–{endEntry}</span> dari <span className="font-bold text-[var(--color-ink)]">{totalCount}</span> entri</>
            }
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-[var(--color-hairline)] bg-white rounded-md utility-xs font-semibold hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>
            <span className="utility-xs text-[var(--color-ink)] font-bold px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-[var(--color-hairline)] bg-white rounded-md utility-xs font-semibold hover:bg-[var(--color-surface-soft)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
