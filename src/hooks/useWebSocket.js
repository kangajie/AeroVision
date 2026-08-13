import { useState, useEffect, useCallback } from 'react';
import { getWebSocketUrl } from '../api/client';

// Default config per kamera
const DEFAULT_CONFIG = {
  active_classes: ['person', 'bicycle', 'car', 'truck', 'bus', 'motorcycle'],
  thresholds: { person: 100, bicycle: 50, car: 50, truck: 20, bus: 10, motorcycle: 20 },
  line_config: { x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5, direction_in_side: 'A', color_in: '#10b981', color_out: '#ef4444', line_thickness: 2 }
};

const DEFAULT_COUNTS = { person: 0, bicycle: 0, car: 0, truck: 0, bus: 0, motorcycle: 0 };

/**
 * useWebSocket hook — Multi-Camera
 * 
 * Satu WebSocket channel untuk semua kamera.
 * Setiap message dari backend mengandung field `camera_id`.
 * 
 * Return:
 * - isConnected: boolean
 * - cameraStates: { [camera_id]: { counts, totals, detections, overload, alarm } }
 * - aggregate: { counts, totalIn, totalOut, overload } dari semua kamera
 * - getCamera(camera_id): state untuk kamera tertentu
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  // State per kamera: { [camera_id]: { counts, totals, detections, overload, alarm } }
  const [cameraStates, setCameraStates] = useState({});

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isMounted = true;
    let retries = 0;

    const url = getWebSocketUrl();

    const connect = () => {
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (isMounted) {
          setIsConnected(true);
          retries = 0;
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          const camId = payload.camera_id;

          if (payload.type === 'detection') {
            const now = new Date().toISOString();
            // Update state untuk kamera spesifik
            setCameraStates(prev => {
              const prevCam = prev[camId] || {};
              const newEvents = (payload.events || []).map(e => ({ ...e, timestamp: now }));
              const keptEvents = [...(prevCam.events || []), ...newEvents].slice(-10); // Simpan 10 terakhir

              return {
                ...prev,
                [camId]: {
                  counts: payload.counts || DEFAULT_COUNTS,
                  totals: payload.totals || { in: 0, out: 0 },
                  detections: payload.detections || [],
                  events: keptEvents,
                  overload: payload.overload || false,
                  alarm: payload.alarm || false,
                }
              };
            });
          } else if (payload.type === 'counts_reset' && camId) {
            setCameraStates(prev => ({
              ...prev,
              [camId]: {
                ...(prev[camId] || {}),
                counts: DEFAULT_COUNTS,
                totals: { in: 0, out: 0 },
                overload: false,
                alarm: false,
              }
            }));
          } else if (payload.type === 'counts_reset' && !camId) {
            // Reset semua kamera
            setCameraStates({});
          }
          // config_update: tidak perlu update state WS, config di-fetch dari API
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          const delay = Math.min(1000 * 2 ** retries, 30000);
          retries++;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Helper: ambil state satu kamera
  const getCamera = useCallback((cameraId) => {
    return cameraStates[cameraId] || {
      counts: DEFAULT_COUNTS,
      totals: { in: 0, out: 0 },
      detections: [],
      events: [],
      overload: false,
      alarm: false,
    };
  }, [cameraStates]);

  // Aggregate dari semua kamera
  const aggregate = (() => {
    const counts = { ...DEFAULT_COUNTS };
    let totalIn = 0;
    let totalOut = 0;
    let overload = false;
    let alarm = false;
    let allDetections = [];

    for (const state of Object.values(cameraStates)) {
      for (const cls of Object.keys(counts)) {
        counts[cls] = (counts[cls] || 0) + (state.counts?.[cls] || 0);
      }
      totalIn += state.totals?.in || 0;
      totalOut += state.totals?.out || 0;
      if (state.overload) overload = true;
      if (state.alarm) alarm = true;
      allDetections = [...allDetections, ...(state.detections || [])];
    }

    return { counts, totalIn, totalOut, overload, alarm, detections: allDetections };
  })();

  // === Backward-compatible props (untuk komponen lama yang pakai counts, totals, detections langsung) ===
  const firstCam = Object.values(cameraStates)[0];
  const counts = aggregate.counts;
  const totals = { in: aggregate.totalIn, out: aggregate.totalOut };
  const detections = aggregate.detections;
  const isGlobalOverload = aggregate.overload;

  return {
    isConnected,
    // Multi-camera API
    cameraStates,
    getCamera,
    aggregate,
    // Backward compat API
    counts,
    totals,
    detections,
    isGlobalOverload,
    config: firstCam ? {} : DEFAULT_CONFIG, // config per kamera dari engine, bukan WS
  };
}
