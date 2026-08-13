import React, { useState } from 'react';
import { apiPost } from '../api/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Frontend hanya kirim email/password ke backend API.
      // Backend yang verifikasi via Supabase Auth — frontend tidak tau credential DB.
      const result = await apiPost('/api/auth/login', { email, password });
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('auth_username', result.username || email);
        window.location.href = '/admin/dashboard';
      } else {
        setError('Login gagal. Coba lagi.');
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full flex flex-col md:flex-row bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-hairline)] overflow-hidden shadow-2xl animate-slide-up">

        {/* Left Side - 3D Illustration */}
        <div className="w-full md:w-1/2 bg-[var(--color-canvas)] p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_center,_var(--color-surface-soft)_0%,_transparent_70%)]" />
          <img
            src="/ferry_3d.png"
            alt="3D Ferry Illustration"
            className="relative z-10 w-full max-w-sm animate-float mix-blend-multiply"
          />
          <div className="relative z-10 mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/logo_poliwangi.png" alt="AerOSVision" className="w-12 h-12 object-contain" />
              <span className="utility-xs tracking-widest text-[var(--color-mute)] font-bold">AEROSVISION</span>
            </div>
            <h2 className="heading-lg text-[var(--color-ink)]">CCTV Surveillance</h2>
            <p className="body-sm text-[var(--color-mute)] mt-1">& Analytics System</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"/>
                <circle cx="12" cy="12" r="3" fill="white" stroke="none"/>
                <path d="M12 5v2M12 17v2M5 12h2M17 12h2"/>
              </svg>
            </div>
            <span className="utility-sm text-[var(--color-ink)] tracking-widest font-bold">AEROSVISION</span>
          </div>

          <h1 className="display-lg text-[var(--color-ink)] mb-1">Welcome Back</h1>
          <p className="body-sm text-[var(--color-mute)] mb-8">Silakan masuk ke sistem monitoring.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block utility-xs text-[var(--color-mute)] mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mute)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-[var(--color-surface-doc)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-md rounded-[var(--radius-md)] pl-10 pr-4 py-3 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(247,165,1,0.2)] transition-all"
                  placeholder="Masukkan email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block utility-xs text-[var(--color-mute)] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mute)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-[var(--color-surface-doc)] border border-[var(--color-hairline)] text-[var(--color-ink)] body-md rounded-[var(--radius-md)] pl-10 pr-4 py-3 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(247,165,1,0.2)] transition-all"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-[var(--color-accent-red-soft)] border border-[var(--color-accent-red)] rounded-[var(--radius-md)] animate-fade-in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-red)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="caption-sm text-[var(--color-accent-red)] m-0">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className={`w-full button-primary py-3 mt-2 flex items-center justify-center gap-2 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memeriksa...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-hairline)] text-center">
            <p className="caption-sm text-[var(--color-mute)] m-0">
              Kembali ke{' '}
              <a href="/" className="text-[var(--color-accent-blue)] font-bold hover:underline">
                Public Dashboard
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
