import React from 'react';

const STATUS_COLORS = {
  LIVE: { dot: '#2c8c66', bg: '#d9eddf', text: '#2c8c66' },
  OFFLINE: { dot: '#cd4239', bg: '#f7d6d3', text: '#cd4239' },
  CONNECTING: { dot: '#f7a501', bg: '#fef3c7', text: '#b45309' },
};

/**
 * CameraCard - displays a camera thumbnail with status badge
 * Props: cam (object with id, name, location, status, thumbnail?)
 */
export default function CameraCard({ cam, onClick, compact }) {
  const { id, name, location, status = 'LIVE', thumbnail } = cam;
  const sc = STATUS_COLORS[status] || STATUS_COLORS.OFFLINE;

  return (
    <div
      className={`bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''} flex flex-col`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative bg-gray-900 aspect-video flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14"/>
              <rect x="2" y="6" width="13" height="12" rx="2"/>
            </svg>
            {status === 'OFFLINE' && <span className="text-xs font-semibold text-gray-500">No Signal</span>}
          </div>
        )}

        {/* Camera ID badge top-left */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          {id}
        </div>

        {/* Status badge top-right */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ backgroundColor: sc.bg, color: sc.text }}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${status === 'LIVE' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: sc.dot }}
          />
          {status}
        </div>

        {/* LIVE pulse overlay for active cameras */}
        {status === 'LIVE' && (
          <div className="absolute inset-0 ring-2 ring-[var(--color-accent-green)] ring-opacity-30 pointer-events-none rounded-inherit" />
        )}
      </div>

      {/* Info */}
      {!compact && (
        <div className="px-3 py-2.5 flex flex-col gap-0.5">
          <p className="body-xs font-semibold text-[var(--color-ink)] m-0 truncate">{name}</p>
          <p className="caption-sm text-[var(--color-mute)] m-0 truncate">{location}</p>
        </div>
      )}
    </div>
  );
}
