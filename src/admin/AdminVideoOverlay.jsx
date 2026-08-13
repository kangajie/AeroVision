import React, { useRef, useEffect, useState } from 'react';
import { getMjpegUrl } from '../api/client';

const POSTHOG_COLORS = {
  primary: '#f7a501',
  ink: '#23251d'
};

export default function AdminVideoOverlay({ lineConfig, onLineChange, showAlert, cameraId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); // 'pt1' or 'pt2'


  const drawLine = () => {
    const canvas = canvasRef.current;
    if (!canvas || !lineConfig) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { x1, y1, x2, y2, direction_in_side } = lineConfig;
    const absX1 = x1 * canvas.width;
    const absY1 = y1 * canvas.height;
    const absX2 = x2 * canvas.width;
    const absY2 = y2 * canvas.height;

    // Draw Line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(absX1, absY1);
    ctx.lineTo(absX2, absY2);
    ctx.strokeStyle = POSTHOG_COLORS.primary;
    ctx.lineWidth = lineConfig.line_thickness || 3;
    ctx.shadowColor = 'rgba(247,165,1,0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // Draw Draggable Points
    ctx.fillStyle = POSTHOG_COLORS.primary;
    ctx.beginPath();
    ctx.arc(absX1, absY1, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(absX2, absY2, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Draw Direction Arrows (Perpendicular)
    const midX = (absX1 + absX2) / 2;
    const midY = (absY1 + absY2) / 2;
    const dx = absX2 - absX1;
    const dy = absY2 - absY1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
      // Normal vector
      const nx = -dy / length;
      const ny = dx / length;

      const arrowLen = 40;

      // Determine which side is IN based on direction_in_side
      // Side A is normal (nx, ny), Side B is opposite (-nx, -ny)
      const inDirX = direction_in_side === 'A' ? nx : -nx;
      const inDirY = direction_in_side === 'A' ? ny : -ny;

      const outDirX = -inDirX;
      const outDirY = -inDirY;

      const colorIn = lineConfig.color_in || '#10b981';
      const colorOut = lineConfig.color_out || '#ef4444';

      // Draw IN Arrow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + inDirX * arrowLen, midY + inDirY * arrowLen);
      ctx.strokeStyle = colorIn;
      ctx.lineWidth = lineConfig.line_thickness || 3;
      ctx.stroke();
      // Arrow head IN
      ctx.beginPath();
      ctx.arc(midX + inDirX * arrowLen, midY + inDirY * arrowLen, (lineConfig.line_thickness || 3) + 2, 0, 2 * Math.PI);
      ctx.fillStyle = colorIn;
      ctx.fill();
      // IN Text
      ctx.font = '800 14px "IBM Plex Sans"';
      ctx.textAlign = "center";
      ctx.fillText("IN", midX + inDirX * (arrowLen + 15), midY + inDirY * (arrowLen + 15) + 5);
      ctx.restore();

      // Draw OUT Arrow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + outDirX * arrowLen, midY + outDirY * arrowLen);
      ctx.strokeStyle = colorOut;
      ctx.lineWidth = lineConfig.line_thickness || 3;
      ctx.stroke();
      // Arrow head OUT
      ctx.beginPath();
      ctx.arc(midX + outDirX * arrowLen, midY + outDirY * arrowLen, (lineConfig.line_thickness || 3) + 2, 0, 2 * Math.PI);
      ctx.fillStyle = colorOut;
      ctx.fill();
      // OUT Text
      ctx.font = '800 14px "IBM Plex Sans"';
      ctx.textAlign = "center";
      ctx.fillText("OUT", midX + outDirX * (arrowLen + 15), midY + outDirY * (arrowLen + 15) + 5);
      ctx.restore();
    }
  };

  useEffect(() => {
    drawLine();
  }, [lineConfig]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        drawLine();
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 500);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const threshold = 0.05; // 5% of canvas width/height as grab tolerance

    const dist1 = Math.hypot(pos.x - lineConfig.x1, pos.y - lineConfig.y1);
    const dist2 = Math.hypot(pos.x - lineConfig.x2, pos.y - lineConfig.y2);

    if (dist1 < threshold) {
      setIsDragging('pt1');
    } else if (dist2 < threshold) {
      setIsDragging('pt2');
    } else {
      // Start a new line
      setIsDragging('new_line');
      onLineChange({ ...lineConfig, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const pos = getMousePos(e);

    // Clamp to 0-1
    const x = Math.max(0, Math.min(1, pos.x));
    const y = Math.max(0, Math.min(1, pos.y));

    if (isDragging === 'pt1') {
      onLineChange({ ...lineConfig, x1: x, y1: y });
    } else if (isDragging === 'pt2') {
      onLineChange({ ...lineConfig, x2: x, y2: y });
    } else if (isDragging === 'new_line') {
      onLineChange({ ...lineConfig, x2: x, y2: y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const [streamError, setStreamError] = useState(false);

  useEffect(() => {
    setStreamError(false);
  }, [cameraId]);

  return (
    <div ref={containerRef} className="relative w-full h-full aspect-video bg-[var(--color-surface-soft)] overflow-hidden border-t border-[var(--color-hairline)] cursor-crosshair flex items-center justify-center">
      {!streamError ? (
        <img
          key={cameraId}
          src={cameraId ? getMjpegUrl(cameraId) : ''}
          alt="CCTV Feed"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setStreamError(true)}
          onLoad={() => {
            if (canvasRef.current && containerRef.current) {
              canvasRef.current.width = containerRef.current.clientWidth;
              canvasRef.current.height = containerRef.current.clientHeight;
              drawLine();
            }
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-[var(--color-mute)] gap-3 z-0">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          <span className="heading-md font-semibold">CCTV Feed Offline</span>
          <span className="body-sm">Make sure the backend is running and the camera is active.</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
  );
}
