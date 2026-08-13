import React from 'react';

const navItems = [
  { id: 'live', label: 'Live View', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1zM4 5h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2z"/></svg>
  )},
  { id: 'config', label: 'Line Config', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  )},
  { id: 'history', label: 'History & Logs', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  )}
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-[240px] bg-[var(--color-canvas)] border-r border-[var(--color-hairline)] flex-shrink-0 hidden lg:flex flex-col">
      <div className="p-4 border-b border-[var(--color-hairline)]">
        <div className="relative">
          <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--color-mute)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Ask Poliwangi AI..." 
            className="w-full bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-xs rounded-[var(--radius-md)] pl-9 pr-3 py-2 outline-none focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all"
          />
        </div>
      </div>
      
      <nav className="p-3 flex-1 overflow-y-auto">
        <div className="utility-xs text-[var(--color-mute)] mb-2 px-3 tracking-widest">Main Menu</div>
        <ul className="space-y-1">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button 
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-left transition-colors ${
                    isActive 
                      ? 'bg-[var(--color-surface-soft)] text-[var(--color-ink)] font-semibold' 
                      : 'text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span className={`${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-mute)]'}`}>
                    {item.icon}
                  </span>
                  <span className="body-xs">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-[var(--color-hairline)]">
        <div className="flex items-center gap-2 text-[var(--color-mute)] body-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span>v1.0.0 (PostHog Theme)</span>
        </div>
      </div>
    </aside>
  );
}
