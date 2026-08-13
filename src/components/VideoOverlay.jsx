import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getMjpegUrl } from '../api/client';

const CLASS_COLORS = {
  person:     '#2c84e0', // accent-blue
  bicycle:    '#06b6d4', // cyan
  car:        '#2c8c66', // accent-green
  truck:      '#f7a501', // primary/orange
  bus:        '#7c44a6', // accent-purple
  motorcycle: '#cd4239'  // accent-red
};

const POSTHOG_COLORS = {
  surfaceSoft: '#e5e7e0',
  ink: '#23251d',
  primary: '#f7a501',
  onDark: '#23251d'
};

export default function VideoOverlay({ detections = [], events = [], lineConfig = null, showAlert = false, cameraId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [streamError, setStreamError] = useState(false);

  // Wrap drawOverlay dalam useCallback agar selalu fresh dengan data terbaru
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (lineConfig) {
      const { x1, y1, x2, y2, direction_in_side, color_in, color_out, line_thickness } = lineConfig;
      const absX1 = x1 * canvas.width;
      const absY1 = y1 * canvas.height;
      const absX2 = x2 * canvas.width;
      const absY2 = y2 * canvas.height;
      const lineW = line_thickness || 2;
      const clrIn  = color_in  || '#10b981';
      const clrOut = color_out || '#ef4444';

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(absX1, absY1);
      ctx.lineTo(absX2, absY2);
      ctx.strokeStyle = clrIn;
      ctx.lineWidth = lineW;
      ctx.shadowColor = clrIn + '88';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = clrIn;
      ctx.beginPath();
      ctx.arc(absX1, absY1, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(absX2, absY2, 6, 0, 2 * Math.PI);
      ctx.fill();

      const midX = (absX1 + absX2) / 2;
      const midY = (absY1 + absY2) / 2;
      const dx = absX2 - absX1;
      const dy = absY2 - absY1;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const nx = -dy / length;
        const ny = dx / length;
        const arrowLen = 30;
        const inDirX = direction_in_side === 'A' ? nx : -nx;
        const inDirY = direction_in_side === 'A' ? ny : -ny;
        const outDirX = -inDirX;
        const outDirY = -inDirY;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + inDirX * arrowLen, midY + inDirY * arrowLen);
        ctx.strokeStyle = clrIn;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(midX + inDirX * arrowLen, midY + inDirY * arrowLen, 4, 0, 2 * Math.PI);
        ctx.fillStyle = clrIn;
        ctx.fill();
        ctx.font = '700 12px "IBM Plex Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('IN', midX + inDirX * (arrowLen + 15), midY + inDirY * (arrowLen + 15) + 4);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + outDirX * arrowLen, midY + outDirY * arrowLen);
        ctx.strokeStyle = clrOut;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(midX + outDirX * arrowLen, midY + outDirY * arrowLen, 4, 0, 2 * Math.PI);
        ctx.fillStyle = clrOut;
        ctx.fill();
        ctx.font = '700 12px "IBM Plex Sans"';
        ctx.textAlign = 'center';
        ctx.fillText('OUT', midX + outDirX * (arrowLen + 15), midY + outDirY * (arrowLen + 15) + 4);
        ctx.restore();
      }
    }

    detections.forEach(det => {
      const [relX1, relY1, relX2, relY2] = det.box;
      const x1 = relX1 * canvas.width;
      const y1 = relY1 * canvas.height;
      const x2 = relX2 * canvas.width;
      const y2 = relY2 * canvas.height;
      const className = det.class_name;
      const color = CLASS_COLORS[className] || POSTHOG_COLORS.ink;
      const width = x2 - x1;
      const height = y2 - y1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);

      const label = `${className} ${(det.score * 100).toFixed(0)}%`;
      ctx.font = '700 14px "IBM Plex Sans"';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = POSTHOG_COLORS.surfaceSoft;
      ctx.fillRect(x1, y1 - 24, textWidth + 12, 24);
      ctx.fillStyle = POSTHOG_COLORS.ink;
      ctx.fillText(label, x1 + 6, y1 - 7);
    });
  }, [detections, lineConfig]);

  // Gambar ulang setiap kali data atau config berubah
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Ukuran canvas mengikuti container (responsive) — TANPA stale closure
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width  = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        drawOverlay();
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial size setelah mount
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawOverlay]);

  useEffect(() => {
    setStreamError(false);
  }, [cameraId]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <div ref={containerRef} className={`relative w-full h-full flex flex-1 items-center justify-center rounded-[var(--radius-md)] overflow-hidden border ${showAlert ? 'border-red-600 border-4' : 'border-[var(--color-hairline)] bg-[var(--color-surface-soft)]'}`}>

        {/* MJPEG Stream Background */}
        {!streamError ? (
          <img
            key={cameraId}
            src={cameraId ? getMjpegUrl(cameraId) : ''}
            alt="CCTV Live Stream"
            className="w-full h-full block object-cover"
            onError={() => setStreamError(true)}
            onLoad={() => {
              if (canvasRef.current && containerRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                drawOverlay();
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--color-mute)] gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            <span className="heading-md font-semibold">CCTV Feed Offline</span>
            <span className="body-sm">Make sure the backend is running and the RTSP url is valid.</span>
          </div>
        )}

        {/* Canvas Overlay for Bounding Boxes */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* Massive Flashing Alert Overlay */}
        {showAlert && (
          <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center animate-pulse pointer-events-none z-50 backdrop-blur-[1px]">
            <div className="bg-red-700 p-8 rounded-full shadow-2xl flex flex-col items-center animate-bounce">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h1 className="display-lg text-white m-0 mt-4 tracking-widest font-black uppercase">OVERLOAD</h1>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
