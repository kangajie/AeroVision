import React, { useEffect, useState, useRef } from 'react';

const CLASS_COLORS = {
  person: 'var(--color-accent-blue)',
  car: 'var(--color-accent-green)',
  truck: 'var(--color-primary)',
  bus: 'var(--color-accent-purple)',
  motorcycle: 'var(--color-accent-red)'
};

// Animated Number Component
function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setAnimate(false);
      }, 300); // Wait for slide up, then snap new value
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <div className="relative overflow-hidden h-[24px] w-12 flex justify-end items-center">
      <div className={`font-mono-num heading-sm text-[var(--color-ink)] transition-transform duration-300 ${animate ? '-translate-y-[100%]' : 'translate-y-0'}`}>
        {displayValue}
      </div>
      {animate && (
        <div className="absolute top-0 right-0 font-mono-num heading-sm text-[var(--color-ink)] animate-count-up">
          {value}
        </div>
      )}
    </div>
  );
}

function DetectionStat({ className, count, maxCount = 100 }) {
  const color = CLASS_COLORS[className] || 'var(--color-ink)';
  const progress = Math.min((count / maxCount) * 100, 100);
  const isOverload = count >= maxCount;

  return (
    <div className={`border rounded-[var(--radius-md)] px-3 py-2.5 mb-2 shadow-sm transition-all duration-300 relative overflow-hidden ${isOverload ? 'bg-red-50 border-red-400' : 'bg-white border-[var(--color-hairline)] hover:shadow-md'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isOverload ? 'animate-ping bg-red-600' : ''}`} style={{ backgroundColor: isOverload ? undefined : color }}></div>
          <h3 className={`utility-sm font-semibold capitalize m-0 ${isOverload ? 'text-red-700' : 'text-[var(--color-ink)]'}`}>
            {className}
          </h3>
          {isOverload && (
            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse ml-1">
              Overload
            </span>
          )}
        </div>
        <AnimatedNumber value={count} />
      </div>
      
      <div className="w-full h-1 bg-[var(--color-surface-soft)] rounded-full mt-1.5 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${isOverload ? 'bg-red-600' : ''}`}
          style={{ width: `${progress}%`, backgroundColor: isOverload ? undefined : color }}
        ></div>
      </div>
    </div>
  );
}

export default function CounterPanel({ counts, config }) {
  // Use dynamic classes from config, fallback to default if not available
  const activeClasses = config?.active_classes || ['person', 'car', 'truck', 'bus', 'motorcycle'];
  const thresholds = config?.thresholds || {};

  return (
    <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col p-3.5 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] shadow-lg">
      <div className="mb-3 px-1">
        <h2 className="heading-sm text-[var(--color-ink)] mb-0.5 uppercase tracking-wide">Detection Stats</h2>
        <p className="utility-xs text-[var(--color-mute)]">Line-crossing accumulation</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1.5 pb-1">
        {activeClasses.map(cls => (
          <DetectionStat 
            key={cls} 
            className={cls} 
            count={counts[cls] || 0} 
            maxCount={thresholds[cls] || 100}
          />
        ))}
      </div>
    </div>
  );
}
