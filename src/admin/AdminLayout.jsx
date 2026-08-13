import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    id: 'live-monitoring',
    label: 'Live Monitoring',
    path: '/admin/live-monitoring',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.806v6.388a1 1 0 0 1-1.447.894L15 14" />
        <rect x="2" y="6" width="13" height="12" rx="2" />
      </svg>
    )
  },
  {
    id: 'analytics',
    label: 'Analysis',
    path: '/admin/analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    )
  },
  {
    id: 'log',
    label: 'Log',
    path: '/admin/log',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    )
  },
  {
    id: 'configuration',
    label: 'Configuration',
    path: '/admin/configuration',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }
];

export default function AdminLayout() {
  const [isAuth, setIsAuth] = useState(null); // null = masih ngecek
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Cek token login via backend API — backend yang validasi, bukan Supabase frontend
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsAuth(false);
      return;
    }
    apiGet('/api/auth/me')
      .then(() => setIsAuth(true))
      .catch(() => {
        // Token tidak valid / expired → hapus dan redirect ke login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        setIsAuth(false);
      });
  }, []);

  if (isAuth === null && location.pathname !== '/admin/login') {
    // Loading state sementara ngecek auth (bisa diganti dengan spinner/skeleton yang lebih bagus)
    return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-canvas)] text-[var(--color-ink)]">Loading...</div>;
  }

  if (isAuth === false && location.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" replace />;
  }

  if (location.pathname === '/admin/login') {
    return <Outlet />;
  }

  const handleLogout = async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } catch (_) { /* ignore */ }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    window.location.href = '/admin/login';
  };

  // Get current page name for topbar
  const currentNav = navItems.find(item => location.pathname.startsWith(item.path));

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--color-canvas)] overflow-hidden">
      {/* Admin Topbar */}
      <header className="h-[56px] flex-shrink-0 bg-[var(--color-surface-card)] border-b border-[var(--color-hairline)] flex items-center justify-between px-4 z-50 animate-fade-in relative">
        <div className="flex items-center gap-3">
          <button
            className="p-2 text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] rounded-md transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded bg-[var(--color-surface-soft)] flex items-center justify-center border border-[var(--color-hairline)] overflow-hidden">
            <img src="/logo_poliwangi.png" alt="AerosVision Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <h1 className="heading-sm-mixed text-[var(--color-ink)] m-0 hidden sm:block">AerosVision</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Clock */}
          <AdminClock />

          {/* Notification Bell */}
          <button
            onClick={() => navigate('/admin/log')}
            className="relative p-2 text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] rounded-md transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          {/* Admin badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-soft)] rounded-full border border-[var(--color-hairline)]">
            <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="caption-sm font-bold text-[var(--color-ink)] hidden sm:block">Admin</span>
          </div>

          <button
            onClick={handleLogout}
            className="utility-xs text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red-soft)] px-3 py-1.5 rounded-full transition-colors border border-[var(--color-accent-red)]"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Admin Layout */}
      <div className="flex-1 flex overflow-hidden relative items-stretch min-h-0">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-[var(--color-hairline)] flex-shrink-0 flex flex-col absolute lg:relative z-40 h-full transition-all duration-300 ${isSidebarOpen ? 'w-[220px] translate-x-0' : 'w-[220px] -translate-x-full lg:translate-x-0 lg:w-[64px]'
            }`}
        >
          {/* Sidebar Brand */}
          <div className={`flex items-center gap-3 px-4 py-4 border-b border-[var(--color-hairline-soft)] overflow-hidden ${!isSidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="w-8 h-8 flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z" />
                <circle cx="12" cy="12" r="3" fill="white" stroke="none" />
                <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
              </svg>
            </div>
            <span className={`body-sm font-bold text-[var(--color-ink)] uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 lg:hidden'}`}>
              CCTV Admin
            </span>
          </div>

          <nav className="p-2 flex-1 overflow-y-auto">
            <div className={`utility-xs text-[var(--color-mute)] mb-2 tracking-widest mt-3 transition-all duration-300 ${isSidebarOpen ? 'px-3 opacity-100' : 'px-1 text-center opacity-0 lg:opacity-100 text-[10px]'}`}>
              {isSidebarOpen ? 'MAIN MENU' : '•••'}
            </div>
            <ul className="space-y-0.5">
              {navItems.map((item, idx) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <li key={item.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <button
                      onClick={() => {
                        navigate(item.path);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-0 lg:px-0'} py-2.5 rounded-[var(--radius-md)] text-left transition-all duration-150 gap-3 ${isActive
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'text-[var(--color-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]'
                        }`}
                      title={!isSidebarOpen ? item.label : ''}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-[var(--color-mute)]'}`}>
                        {item.icon}
                      </span>
                      <span className={`body-xs font-semibold whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden lg:hidden'}`}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className={`p-3 border-t border-[var(--color-hairline-soft)] ${!isSidebarOpen ? 'lg:flex lg:justify-center' : ''}`}>
            <a
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[var(--color-mute)] hover:text-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue-soft)] transition-colors caption-sm font-semibold ${!isSidebarOpen ? 'lg:justify-center lg:px-0' : ''}`}
              title="Public View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden lg:hidden'}`}>
                Public View
              </span>
            </a>
          </div>
        </aside>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 bg-[var(--color-canvas)] relative flex flex-col overflow-hidden transition-all duration-300 min-h-0">
          {/* Giant Floating Ship Background Watermark */}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-60 mix-blend-multiply flex justify-center items-center w-full max-w-3xl animate-float"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)'
            }}
          >
            <img src="/ferry_3d.png" alt="" className="w-full object-contain" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 relative z-10 flex flex-col min-h-0">
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col animate-slide-up">
              <Outlet />
            </div>
          </div>

          <footer className="w-full bg-[var(--color-surface-card)] text-center py-2.5 border-t border-[var(--color-hairline)] relative z-20 flex-shrink-0">
            <p className="caption-sm text-[var(--color-mute)] m-0">
              &copy; 2026 AerosVision. All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function AdminClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="body-xs text-[var(--color-ink)] hidden sm:block font-mono-num">
      {time.toLocaleTimeString()}
    </div>
  );
}
