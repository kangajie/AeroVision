import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function Layout({ children, wsConnected }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-canvas)] overflow-hidden">
      <Topbar wsConnected={wsConnected} />
      
      {/* Public Content Area */}
      <main className="flex-1 bg-[var(--color-canvas)] relative flex flex-col overflow-hidden transition-all duration-300 min-h-0">
        
        {/* Giant Floating Ship Background Watermark */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-100 mix-blend-multiply flex justify-center items-center w-full max-w-3xl animate-float" style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)' }}>
          <img src="/ferry_3d.png" alt="Background Ferry" className="w-full object-contain" />
        </div>

        <div className="flex-1 overflow-hidden relative z-10 flex flex-col min-h-0 w-full h-full">
          {children}
        </div>
        
        {/* Footer Poliwangi 2026 */}
        <footer className="w-full bg-[var(--color-surface-card)] text-center py-3 border-t border-[var(--color-hairline)] relative z-20 flex-shrink-0">
          <p className="caption-sm text-[var(--color-mute)] m-0">
            &copy; 2026 Poliwangi CCTV Surveillance. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
