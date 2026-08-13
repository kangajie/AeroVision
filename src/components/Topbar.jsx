import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ wsConnected }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-[56px] flex-shrink-0 bg-[var(--color-surface-card)] border-b border-[var(--color-hairline)] flex items-center justify-between px-4 z-50 animate-fade-in relative">
      <div className="flex items-center gap-3">
        {/* Poliwangi Logo */}
        <div className="w-8 h-8 rounded bg-[var(--color-surface-soft)] flex items-center justify-center border border-[var(--color-hairline)] overflow-hidden">
          <img src="/logo_poliwangi.png" alt="Poliwangi Logo" className="w-full h-full object-contain p-0.5" />
        </div>
        <h1 className="heading-sm-mixed text-[var(--color-ink)] m-0">Poliwangi CCTV Surveillance</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="body-xs text-[var(--color-ink)] hidden sm:block">
          {time.toLocaleTimeString()}
        </div>
        
        {/* SYSTEM STATUS Indicator */}
        <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${wsConnected ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green-soft)] text-[var(--color-accent-green)]' : 'border-[var(--color-accent-red)] bg-[var(--color-accent-red-soft)] text-[var(--color-accent-red)]'}`}>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[var(--color-accent-green)] animate-pulse' : 'bg-[var(--color-accent-red)]'}`}></div>
          <span className="utility-xs font-bold">{wsConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
