import React, { useState, useEffect } from 'react';
import AdminVideoOverlay from './AdminVideoOverlay';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';

const ALL_CLASSES = ['person', 'bicycle', 'motorcycle', 'car', 'bus', 'truck'];

const TABS = [
  { id: 'line-setup', label: 'Detection & Line Setup' },
  { id: 'cam-mgmt', label: 'Camera Management' },
  { id: 'alert-notif', label: 'Alert & Notification' },
  { id: 'sys-settings', label: 'System Settings' },
];

const CLASS_COLORS = {
  person: 'var(--color-accent-blue)',
  bicycle: 'var(--color-accent-purple)',
  motorcycle: 'var(--color-accent-red)',
  car: 'var(--color-accent-green)',
  bus: 'var(--color-accent-purple)',
  truck: 'var(--color-primary)',
};

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('line-setup');

  // States for DB data
  const [config, setConfig] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [sysSettings, setSysSettings] = useState({ inference_throttle: 1, mjpeg_quality: 75 });
  const [alertSettings, setAlertSettings] = useState({ email: false, sound: true, email_address: '' });

  const [isSaving, setIsSaving] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isTestAlarm, setIsTestAlarm] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCameraId, setResetCameraId] = useState('');

  // Toast helper — auto-dismiss setelah 3 detik
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // Play sound jika test alarm
  useEffect(() => {
    if (isTestAlarm && audioEnabled) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      } catch (e) { console.error('Audio error', e); }
    }
  }, [isTestAlarm, audioEnabled]);

  // Fetch semua data awal
  useEffect(() => {
    const init = async () => {
      try {
        const [cams, settings] = await Promise.allSettled([
          apiGet('/api/cameras'),
          apiGet('/api/settings'),
        ]);
        if (cams.status === 'fulfilled' && cams.value?.length > 0) {
          setCameras(cams.value);
          // Cari kamera yang Online (aktif di backend)
          const activeCam = cams.value.find(c => c.status === 'Online') || cams.value[0];
          setSelectedCamera(activeCam.camera_id);
        }
        if (settings.status === 'fulfilled') {
          const s = settings.value || {};
          if (s.alert_notif) setAlertSettings(prev => ({ ...prev, ...s.alert_notif }));
          if (s.system_perf) setSysSettings(prev => ({ ...prev, ...s.system_perf }));
        }
      } catch (err) {
        console.error('[Config] init error:', err);
      }
    };
    init();
  }, []);

  // Fetch line config saat selectedCamera berubah
  // CATATAN: tidak auto-switch grabber. Hanya load config untuk preview.
  // Switch kamera dilakukan dari tab Camera Management.
  useEffect(() => {
    if (!selectedCamera) return;
    const fetchLineConfig = async () => {
      try {
        const d = await apiGet(`/api/config/${selectedCamera}`);
        if (d) {
          setConfig({
            active_classes: d.active_classes || ['person', 'car', 'truck'],
            thresholds: d.thresholds || { person: 100, car: 50, truck: 20, bus: 10, motorcycle: 20 },
            line_config: {
              x1: d.x1 ?? 0.2, y1: d.y1 ?? 0.5,
              x2: d.x2 ?? 0.8, y2: d.y2 ?? 0.5,
              direction_in_side: d.direction_in_side || 'A',
              color_in: d.color_in || '#10b981',
              color_out: d.color_out || '#ef4444',
              line_thickness: d.line_thickness || 2,
            },
          });
          setAudioEnabled(d.alarm_enabled || false);
        }
      } catch {
        setConfig({
          active_classes: ['person', 'car', 'truck'],
          thresholds: { person: 100, car: 50, truck: 20, bus: 10, motorcycle: 20 },
          line_config: { x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5, direction_in_side: 'A', color_in: '#10b981', color_out: '#ef4444', line_thickness: 2 },
        });
        setAudioEnabled(false);
      }
    };
    fetchLineConfig();
  }, [selectedCamera]);

  // Simpan SEMUA konfigurasi ke backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tasks = [];

      // 1. Line config + detection filter + threshold + alarm
      if (config?.line_config && selectedCamera) {
        tasks.push(
          apiPost(`/api/config/${selectedCamera}`, {
            line_config: config.line_config,
            active_classes: config.active_classes,
            thresholds: config.thresholds,
            alarm_enabled: audioEnabled,
          })
        );
      }

      // 2. Alert & Notification settings
      tasks.push(apiPut('/api/settings/alert_notif', { value: alertSettings }));

      // 3. System Performance settings
      tasks.push(apiPut('/api/settings/system_perf', { value: sysSettings }));

      const results = await Promise.allSettled(tasks);
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        showToast('error', `${failed.length} konfigurasi gagal disimpan.`);
      } else {
        showToast('success', 'Semua konfigurasi berhasil disimpan!');
      }
    } catch (err) {
      showToast('error', `Gagal menyimpan: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCount = async (cameraIdToReset) => {
    try {
      const url = cameraIdToReset ? `/api/events/reset-counts?camera_id=${cameraIdToReset}` : '/api/events/reset-counts';
      await apiPost(url, {});
      showToast('success', cameraIdToReset ? `Counter kamera ${cameraIdToReset} di-reset.` : 'Semua counter berhasil di-reset.');
    } catch {
      showToast('error', 'Gagal reset counter.');
    } finally {
      setShowResetModal(false);
      setResetCameraId('');
    }
  };

  const toggleClass = (cls) => {
    setConfig(prev => ({
      ...prev,
      active_classes: prev.active_classes.includes(cls)
        ? prev.active_classes.filter(c => c !== cls)
        : [...prev.active_classes, cls],
    }));
  };

  const updateThreshold = (cls, value) => {
    setConfig(prev => ({ ...prev, thresholds: { ...prev.thresholds, [cls]: Math.max(1, parseInt(value) || 1) } }));
  };

  const handleLineChange = (newLine) => {
    setConfig(prev => ({ ...prev, line_config: newLine }));
  };

  if (!config) return (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3 text-[var(--color-mute)]">
        <div className="w-8 h-8 border-2 border-[var(--color-hairline)] border-t-[var(--color-primary)] rounded-full animate-spin" />
        <span className="body-sm">Loading Configuration...</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 text-white font-medium ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="display-lg text-[var(--color-ink)] m-0">Configuration</h1>
          <p className="body-sm text-[var(--color-mute)] mt-0.5">Pengaturan sistem, kamera, dan deteksi.</p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onMouseDown={() => setIsTestAlarm(true)}
            onMouseUp={() => setIsTestAlarm(false)}
            onMouseLeave={() => setIsTestAlarm(false)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-accent-red)] bg-white text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red-soft)] rounded-[var(--radius-md)] utility-xs font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Test Alarm
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] utility-xs font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Reset Count
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] utility-xs font-bold shadow-sm transition-colors whitespace-nowrap ${isSaving ? 'opacity-60' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isSaving ? 'Saving...' : 'Save All Configuration'}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-0 border-b border-[var(--color-hairline)] overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 body-xs font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-surface-soft)]'
                  : 'border-transparent text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-x-auto w-full">
          {activeTab === 'line-setup' && (
            <LineSetupTab
              config={config}
              cameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              audioEnabled={audioEnabled}
              setAudioEnabled={setAudioEnabled}
              isTestAlarm={isTestAlarm}
              onLineChange={handleLineChange}
              toggleClass={toggleClass}
              updateThreshold={updateThreshold}
            />
          )}
          {activeTab === 'cam-mgmt' && <CameraManagementTab cameras={cameras} setCameras={setCameras} />}
          {activeTab === 'alert-notif' && <AlertNotifTab settings={alertSettings} setSettings={setAlertSettings} />}
          {activeTab === 'sys-settings' && <SystemSettingsTab settings={sysSettings} setSettings={setSysSettings} onResetAll={async () => {
            if (!window.confirm('Hapus SEMUA data event deteksi? Tindakan tidak bisa dibatalkan!')) return;
            try {
              await apiDelete('/api/events');
              showToast('success', 'Semua data berhasil dihapus.');
            } catch {
              showToast('error', 'Gagal menghapus data.');
            }
          }} />}
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[var(--radius-lg)] p-5 shadow-lg w-full max-w-sm">
            <h3 className="body-lg font-bold text-[var(--color-ink)] mb-2">Reset Counter</h3>
            <p className="body-sm text-[var(--color-mute)] mb-4">Pilih kamera yang ingin di-reset counternya.</p>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <select
                  value={resetCameraId}
                  onChange={e => setResetCameraId(e.target.value)}
                  className="w-full appearance-none bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs font-semibold rounded-[var(--radius-md)] px-3 py-2 outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="">Semua Kamera</option>
                  {cameras.map(c => (
                    <option key={c.camera_id} value={c.camera_id}>{c.name}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-mute)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-[var(--color-hairline)] text-[var(--color-mute)] rounded-[var(--radius-md)] utility-xs font-bold hover:bg-[var(--color-surface-soft)] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleResetCount(resetCameraId)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-[var(--radius-md)] utility-xs font-bold hover:bg-[var(--color-primary-pressed)] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Tab: Detection & Line Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LineSetupTab({ config, cameras, selectedCamera, setSelectedCamera, audioEnabled, setAudioEnabled, isTestAlarm, onLineChange, toggleClass, updateThreshold }) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 min-w-[800px]">
      {/* Left: Video Canvas */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Camera Selector */}
        <div className="flex items-center gap-3">
          <label className="utility-xs text-[var(--color-mute)] whitespace-nowrap">Camera</label>
          <div className="relative">
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
              className="appearance-none bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs font-semibold rounded-[var(--radius-md)] pl-3 pr-8 py-2 outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
            >
              {cameras.map(c => (
                <option key={c.camera_id} value={c.camera_id}>{c.name}</option>
              ))}
              {cameras.length === 0 && <option>No cameras available</option>}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-mute)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <p className="utility-xs text-[var(--color-mute)]">Geser titik untuk mengubah posisi garis IN / OUT.</p>
        </div>

        {/* Video Canvas */}
        <div className="flex-1 w-full rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-hairline)] relative z-0" style={{ minHeight: 280 }}>
          <AdminVideoOverlay
            lineConfig={config.line_config}
            onLineChange={onLineChange}
            showAlert={isTestAlarm}
            cameraId={selectedCamera}
          />
        </div>

        {/* Line Settings Panel */}
        <div className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] p-4">
          <h3 className="utility-xs text-[var(--color-ink)] font-bold mb-3 uppercase tracking-wide">Line Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="utility-xs text-[var(--color-mute)] block mb-1">Mode</label>
              <div className="relative">
                <select className="w-full appearance-none bg-white border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs rounded-[var(--radius-md)] pl-3 pr-8 py-2 outline-none">
                  <option>IN / OUT</option>
                  <option>COUNT ONLY</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-mute)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </div>
            </div>
            <div>
              <label className="utility-xs text-[var(--color-mute)] block mb-1">Line Thickness</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="1" max="10"
                  value={config.line_config.line_thickness || 2}
                  onChange={e => onLineChange({ ...config.line_config, line_thickness: parseInt(e.target.value) })}
                  className="flex-1 min-w-0 w-full accent-[var(--color-primary)]"
                />
                <span className="caption-sm font-bold text-[var(--color-ink)] w-4 flex-shrink-0 text-right">
                  {config.line_config.line_thickness || 2}
                </span>
              </div>
            </div>
            <div>
              <label className="utility-xs text-[var(--color-mute)] block mb-1">Line Color IN</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.line_config.color_in || '#10b981'}
                  onChange={e => onLineChange({ ...config.line_config, color_in: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-[var(--color-hairline)] flex-shrink-0 p-0"
                />
                <span className="caption-sm text-[var(--color-mute)] truncate uppercase">{config.line_config.color_in || '#10b981'}</span>
              </div>
            </div>
            <div>
              <label className="utility-xs text-[var(--color-mute)] block mb-1">Line Color OUT</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.line_config.color_out || '#ef4444'}
                  onChange={e => onLineChange({ ...config.line_config, color_out: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-[var(--color-hairline)] flex-shrink-0 p-0"
                />
                <span className="caption-sm text-[var(--color-mute)] truncate uppercase">{config.line_config.color_out || '#ef4444'}</span>
              </div>
            </div>
          </div>

          {/* Flip direction */}
          <button
            onClick={() => onLineChange({ ...config.line_config, direction_in_side: config.line_config.direction_in_side === 'A' ? 'B' : 'A' })}
            className="mt-3 flex items-center gap-2 px-3 py-2 border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] utility-xs font-semibold transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
            Flip IN / OUT Direction
          </button>
        </div>
      </div>

      {/* Right: Filter Panels */}
      <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-3">
        {/* Detection Filter */}
        <div className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] p-4">
          <h3 className="utility-xs text-[var(--color-ink)] font-bold mb-3 uppercase tracking-wide">Detection Filter</h3>
          <div className="flex flex-col gap-1.5">
            {ALL_CLASSES.map(cls => {
              const isActive = config.active_classes.includes(cls);
              return (
                <label key={cls} className="flex items-center justify-between cursor-pointer group px-2 py-1.5 bg-white hover:bg-[var(--color-hairline-soft)] rounded-[var(--radius-sm)] transition-colors border border-[var(--color-hairline)]" onClick={() => toggleClass(cls)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm flex items-center justify-center border transition-colors ${isActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-white border-gray-300'}`}>
                      {isActive && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className={`utility-xs capitalize select-none ${isActive ? 'text-[var(--color-ink)] font-bold' : 'text-[var(--color-mute)]'}`}>{cls}</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isActive ? (CLASS_COLORS[cls] || 'var(--color-mute)') : 'var(--color-hairline)' }} />
                </label>
              );
            })}
          </div>
        </div>

        {/* Overload Limit */}
        <div className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] p-4">
          <h3 className="utility-xs text-[var(--color-ink)] font-bold mb-3 uppercase tracking-wide">Overload Limit</h3>
          <div className="flex flex-col gap-2">
            {config.active_classes.map(cls => (
              <div key={cls} className="flex items-center justify-between bg-white px-2 py-2 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] gap-2">
                <div className="flex items-center gap-1.5 w-[72px] flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CLASS_COLORS[cls] || 'var(--color-mute)' }} />
                  <span className="utility-xs capitalize text-[var(--color-ink)] font-semibold truncate">{cls}</span>
                </div>
                <input
                  type="range" min="1" max="1000"
                  value={config.thresholds[cls] || 100}
                  onChange={e => updateThreshold(cls, e.target.value)}
                  className="flex-1 min-w-0 w-full accent-[var(--color-primary)] h-1 rounded cursor-pointer"
                />
                <input
                  type="number" min="1" max="1000"
                  value={config.thresholds[cls] || 100}
                  onChange={e => updateThreshold(cls, e.target.value)}
                  className="w-14 flex-shrink-0 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-primary)] utility-xs font-bold text-center rounded px-1 py-0.5 outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            ))}
            {config.active_classes.length === 0 && (
              <p className="text-center text-[var(--color-mute)] utility-xs py-2">Pilih objek di Detection Filter.</p>
            )}
          </div>
        </div>

        {/* Audio Control */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`flex items-center justify-center gap-2 w-full px-3 py-2.5 border rounded-[var(--radius-md)] utility-xs font-bold transition-colors shadow-sm ${audioEnabled ? 'bg-[var(--color-accent-blue-soft)] border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]' : 'bg-white border-[var(--color-hairline)] text-[var(--color-mute)]'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {audioEnabled ? (
              <path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            ) : (
              <path d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6" />
            )}
          </svg>
          {audioEnabled ? 'ALARM ENABLED' : 'ALARM DISABLED'}
        </button>
      </div>
    </div>
  );
}

// --- Tab: Camera Management (Multi-Camera) ---
function CameraManagementTab({ cameras, setCameras }) {
  const [newCam, setNewCam] = useState({ id: '', name: '', url: '' });
  const [editingCam, setEditingCam] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // { camera_id: 'activating'|'deactivating'|'saving' }
  const [adding, setAdding] = useState(false);

  const setLoading = (id, state) => setActionLoading(prev => ({ ...prev, [id]: state }));

  const activeCameras = cameras.filter(c => c.is_active);

  const addCamera = async () => {
    if (!newCam.id || !newCam.name || !newCam.url) return;
    setAdding(true);
    try {
      const data = await apiPost('/api/cameras', {
        camera_id: newCam.id, name: newCam.name, rtsp_url: newCam.url
      });
      setCameras(prev => [...prev, { ...data, is_active: false }]);
      setNewCam({ id: '', name: '', url: '' });
    } catch (err) {
      alert('Gagal menambahkan kamera: ' + err.message);
    } finally { setAdding(false); }
  };

  const toggleActivate = async (cam) => {
    const isActive = cam.is_active;
    const loadKey = isActive ? 'deactivating' : 'activating';
    setLoading(cam.camera_id, loadKey);
    try {
      if (isActive) {
        await apiPost(`/api/cameras/${cam.camera_id}/deactivate`, {});
        setCameras(prev => prev.map(c => c.camera_id === cam.camera_id ? { ...c, is_active: false, status: 'Offline' } : c));
      } else {
        await apiPost(`/api/cameras/${cam.camera_id}/activate`, {});
        setCameras(prev => prev.map(c => c.camera_id === cam.camera_id ? { ...c, is_active: true, status: 'Online' } : c));
      }
    } catch (err) {
      alert(err.message);
    } finally { setLoading(cam.camera_id, null); }
  };

  const saveEdit = async () => {
    if (!editingCam) return;
    setLoading(editingCam.camera_id, 'saving');
    try {
      await apiPut(`/api/cameras/${editingCam.camera_id}`, {
        camera_id: editingCam.camera_id, name: editingCam.name, rtsp_url: editingCam.rtsp_url
      });
      setCameras(prev => prev.map(c => c.camera_id === editingCam.camera_id ? { ...c, name: editingCam.name, rtsp_url: editingCam.rtsp_url } : c));
      setEditingCam(null);
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
    finally { setLoading(editingCam?.camera_id, null); }
  };

  const deleteCamera = async (id) => {
    if (!window.confirm(`Hapus kamera ${id}?`)) return;
    try {
      await apiDelete('/api/cameras/' + id);
      setCameras(prev => prev.filter(c => c.camera_id !== id));
    } catch (err) { alert('Gagal menghapus: ' + err.message); }
  };

  return (
    <div className="flex flex-col gap-4 min-w-[600px]">
      {/* Header info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="body-sm text-[var(--color-ink)] font-semibold m-0">Kamera CCTV — Multi-Camera</p>
          <p className="caption-sm text-[var(--color-mute)] mt-0.5">
            Aktifkan beberapa kamera secara bersamaan (maks. 4 kamera paralel).
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-green-soft)] border border-[var(--color-accent-green)] rounded-full flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
          <span className="caption-xs font-bold text-[var(--color-accent-green)] whitespace-nowrap">
            {activeCameras.length} aktif dari {cameras.length}
          </span>
        </div>
      </div>

      {/* Form tambah kamera */}
      <div className="bg-[var(--color-surface-soft)] p-4 rounded-[var(--radius-md)] border border-[var(--color-hairline)]">
        <p className="utility-xs text-[var(--color-mute)] font-bold uppercase tracking-wide mb-3">Tambah Kamera Baru</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="w-[120px]">
            <label className="caption-sm text-[var(--color-mute)] mb-1 block">Camera ID</label>
            <input type="text" placeholder="cam_03" value={newCam.id}
              onChange={e => setNewCam({ ...newCam, id: e.target.value })}
              className="w-full body-xs px-3 py-2 rounded-md border border-[var(--color-hairline)] bg-white focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="caption-sm text-[var(--color-mute)] mb-1 block">Display Name</label>
            <input type="text" placeholder="CAM 03 - Lobby" value={newCam.name}
              onChange={e => setNewCam({ ...newCam, name: e.target.value })}
              className="w-full body-xs px-3 py-2 rounded-md border border-[var(--color-hairline)] bg-white focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="flex-2 min-w-[220px]">
            <label className="caption-sm text-[var(--color-mute)] mb-1 block">RTSP URL / Device ID</label>
            <input type="text" placeholder="rtsp://admin:pass@192.168.1.10:554/stream or 0" value={newCam.url}
              onChange={e => setNewCam({ ...newCam, url: e.target.value })}
              className="w-full body-xs px-3 py-2 rounded-md border border-[var(--color-hairline)] bg-white focus:outline-none focus:border-[var(--color-primary)]" />
          </div>
          <button onClick={addCamera} disabled={adding || !newCam.id || !newCam.name || !newCam.url}
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-md utility-xs font-bold hover:bg-[var(--color-primary-pressed)] flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50">
            {adding ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Tambah
          </button>
        </div>
      </div>

      {/* Daftar kamera */}
      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--color-mute)] border border-dashed border-[var(--color-hairline)] rounded-[var(--radius-md)]">
          <p className="body-sm m-0">Belum ada kamera. Tambahkan di atas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cameras.map((cam) => (
            <div key={cam.camera_id} className={`flex flex-col gap-2 rounded-[var(--radius-md)] border px-4 py-3 transition-all ${cam.is_active ? 'border-[var(--color-accent-green)] bg-green-50' : 'border-[var(--color-hairline)] bg-[var(--color-surface-soft)]'}`}>
              {editingCam?.camera_id === cam.camera_id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                      <label className="caption-xs text-[var(--color-mute)] mb-1 block">Display Name</label>
                      <input type="text" value={editingCam.name}
                        onChange={e => setEditingCam({ ...editingCam, name: e.target.value })}
                        className="w-full body-xs px-3 py-1.5 rounded border border-[var(--color-primary)] bg-white focus:outline-none" />
                    </div>
                    <div className="flex-2 min-w-[220px]">
                      <label className="caption-xs text-[var(--color-mute)] mb-1 block">RTSP URL</label>
                      <input type="text" value={editingCam.rtsp_url}
                        onChange={e => setEditingCam({ ...editingCam, rtsp_url: e.target.value })}
                        className="w-full body-xs px-3 py-1.5 rounded border border-[var(--color-primary)] bg-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={actionLoading[cam.camera_id] === 'saving'}
                      className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded utility-xs font-bold hover:bg-[var(--color-primary-pressed)] disabled:opacity-60">
                      {actionLoading[cam.camera_id] === 'saving' ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditingCam(null)}
                      className="px-3 py-1.5 border border-[var(--color-hairline)] text-[var(--color-mute)] rounded utility-xs font-bold">
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center ${cam.is_active ? 'bg-[var(--color-accent-green)] text-white' : 'bg-[var(--color-accent-blue-soft)] text-[var(--color-accent-blue)]'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14" /><rect x="2" y="6" width="13" height="12" rx="2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="body-xs font-semibold text-[var(--color-ink)] m-0">{cam.name}</p>
                        <span className="caption-xs text-[var(--color-mute)]">({cam.camera_id})</span>
                        {cam.is_active && (
                          <span className="px-2 py-0.5 rounded-full caption-xs font-bold bg-[var(--color-accent-green)] text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="caption-sm text-[var(--color-mute)] m-0 truncate max-w-[400px]" title={cam.rtsp_url}>{cam.rtsp_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle Aktifkan/Nonaktifkan */}
                    <button
                      onClick={() => toggleActivate(cam)}
                      disabled={!!actionLoading[cam.camera_id]}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded utility-xs font-bold transition-colors disabled:opacity-60 ${cam.is_active
                          ? 'bg-[var(--color-accent-red-soft)] border border-[var(--color-accent-red)] text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)] hover:text-white'
                          : 'bg-[var(--color-accent-green-soft)] border border-[var(--color-accent-green)] text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)] hover:text-white'
                        }`}
                    >
                      {actionLoading[cam.camera_id] && (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {cam.is_active
                        ? (actionLoading[cam.camera_id] === 'deactivating' ? 'Menonaktifkan...' : 'Nonaktifkan')
                        : (actionLoading[cam.camera_id] === 'activating' ? 'Mengaktifkan...' : 'Aktifkan')}
                    </button>
                    <button onClick={() => setEditingCam({ camera_id: cam.camera_id, name: cam.name, rtsp_url: cam.rtsp_url })}
                      className="p-1.5 hover:bg-[var(--color-surface-doc)] rounded transition-colors text-[var(--color-mute)] hover:text-[var(--color-ink)]" title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteCamera(cam.camera_id)}
                      className="p-1.5 hover:bg-[var(--color-accent-red-soft)] hover:text-red-500 rounded transition-colors text-[var(--color-mute)]" title="Hapus">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Alert & Notification ─────────────────────────────────────────────────
function AlertNotifTab({ settings, setSettings }) {
  const toggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateEmail = (email) => {
    setSettings(prev => ({ ...prev, email_address: email }));
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg min-w-[400px]">
      <p className="body-sm text-[var(--color-mute)]">Konfigurasi notifikasi (Data terikat ke tombol Save All Configuration).</p>

      {/* Email Notification */}
      <div className="flex flex-col bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="body-xs font-semibold text-[var(--color-ink)] m-0">Email Notification</p>
            <p className="caption-sm text-[var(--color-mute)] m-0 mt-0.5">Kirim email saat overload atau line crossing</p>
          </div>
          <button
            onClick={() => toggle('email')}
            className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${settings.email ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-hairline)]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {settings.email && (
          <div className="px-4 pb-4 pt-2 border-t border-[var(--color-hairline)]">
            <label className="utility-xs text-[var(--color-ink)] font-bold mb-1.5 block">Alamat Gmail</label>
            <input
              type="email"
              placeholder="user@gmail.com"
              value={settings.email_address || ''}
              onChange={e => updateEmail(e.target.value)}
              className="w-full body-xs px-3 py-2 bg-white rounded-[var(--radius-md)] border border-[var(--color-hairline)] focus:border-[var(--color-primary)] outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Sound Alert */}
      <div className="flex items-center justify-between bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-4 py-3">
        <div>
          <p className="body-xs font-semibold text-[var(--color-ink)] m-0">Sound Alert</p>
          <p className="caption-sm text-[var(--color-mute)] m-0 mt-0.5">Aktifkan bunyi alarm di browser</p>
        </div>
        <button
          onClick={() => toggle('sound')}
          className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${settings.sound ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-hairline)]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.sound ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}

// ——— Tab: System Settings ——————————————————————————————————————————————————————————
function SystemSettingsTab({ settings, setSettings, onResetAll }) {
  const updateVal = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg min-w-[400px]">
      <p className="body-sm text-[var(--color-mute)]">Pengaturan performa sistem. Tekan <strong>Save All Configuration</strong> untuk menyimpan.</p>
      {[
        { key: 'inference_throttle', label: 'Inference Throttle', desc: 'Jalankan YOLO setiap N frame (1 = setiap frame)', min: 1, max: 30 },
        { key: 'mjpeg_quality', label: 'MJPEG Quality', desc: 'Kualitas JPEG stream (1-100, default: 75)', min: 1, max: 100 },
      ].map(({ key, label, desc, min, max }) => (
        <div key={key} className="bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="body-xs font-semibold text-[var(--color-ink)] m-0">{label}</p>
              <p className="caption-sm text-[var(--color-mute)] m-0 mt-0.5">{desc}</p>
            </div>
            <input
              type="number"
              min={min} max={max}
              value={settings[key] ?? (key === 'inference_throttle' ? 1 : 75)}
              onChange={e => updateVal(key, e.target.value)}
              className="w-20 bg-white border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs font-semibold text-center rounded-[var(--radius-md)] px-2 py-1.5 outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>
      ))}
      <div className="bg-[var(--color-accent-red-soft)] border border-[var(--color-accent-red)] rounded-[var(--radius-md)] p-4">
        <p className="body-xs font-bold text-[var(--color-accent-red)] m-0 mb-1">Danger Zone</p>
        <p className="caption-sm text-[var(--color-body)] m-0 mb-3">Hapus semua data event deteksi dari database. Tindakan tidak dapat dibatalkan.</p>
        <button
          onClick={onResetAll}
          className="px-4 py-2 border border-[var(--color-accent-red)] bg-white text-[var(--color-accent-red)] rounded-[var(--radius-md)] utility-xs font-bold hover:bg-[var(--color-accent-red)] hover:text-white transition-colors"
        >
          Hapus Semua Data Event
        </button>
      </div>
    </div>
  );
}
