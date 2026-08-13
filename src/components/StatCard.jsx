import React from 'react';

/**
 * StatCard - reusable metric card with delta badge
 * Props: title, value, delta (e.g. "+13.5%"), deltaPositive, icon, iconBg, suffix, badge, badgeColor
 */
export default function StatCard({ title, value, delta, deltaPositive, icon, iconBg, suffix, badge, badgeColor, onClick }) {
  return (
    <div
      className={`bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-4 shadow-sm flex flex-col gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="utility-xs text-[var(--color-mute)] uppercase tracking-wide mb-1">{title}</p>
          <div className="flex items-end gap-1.5">
            <span className="display-lg text-[var(--color-ink)] leading-none">{value}</span>
            {suffix && <span className="body-xs text-[var(--color-mute)] mb-0.5">{suffix}</span>}
          </div>
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconBg || 'var(--color-surface-soft)' }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {delta !== undefined && delta !== null ? (
          <span className={`caption-xs px-2 py-0.5 rounded-full font-bold ${
            deltaPositive
              ? 'bg-[var(--color-accent-green-soft)] text-[var(--color-accent-green)]'
              : 'bg-[var(--color-accent-red-soft)] text-[var(--color-accent-red)]'
          }`}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </span>
        ) : <span />}
        {badge && (
          <span
            className="caption-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide"
            style={{ backgroundColor: badgeColor?.bg || 'var(--color-surface-soft)', color: badgeColor?.text || 'var(--color-mute)' }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
