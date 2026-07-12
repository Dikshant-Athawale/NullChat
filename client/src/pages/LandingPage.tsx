import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Lock, Clock, Trash2, Eye, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function LandingPage() {
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/chat');
    } catch {}
  };

  const features = [
    { icon: <Lock size={20} />, title: 'End-to-End Encrypted', desc: 'Signal Protocol — server never sees your messages' },
    { icon: <Clock size={20} />, title: '24h Ephemeral', desc: 'Accounts auto-expire — no digital footprint' },
    { icon: <Trash2 size={20} />, title: 'Self-Destructing', desc: 'Messages vanish on both devices' },
    { icon: <Eye size={20} />, title: 'Burn After Reading', desc: 'Messages delete after being opened once' },
    { icon: <Shield size={20} />, title: 'Zero Knowledge', desc: 'We store encrypted data — we can\'t read it' },
    { icon: <AlertTriangle size={20} />, title: 'No Metadata', desc: 'No IP logs, no device IDs, no location' },
  ];


  if (mode === 'landing') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-0 relative overflow-hidden bg-[var(--color-bg-primary)]">
        {/* Dynamic Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--color-purple-glow),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--color-accent-glow),_transparent_50%)] opacity-30 animate-mesh"></div>
          <div className="hidden sm:block absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--color-accent)] opacity-[0.04] rounded-full blur-[140px] animate-[float_8s_ease-in-out_infinite]"></div>
          <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--color-accent-purple)] opacity-[0.04] rounded-full blur-[120px] animate-[float_10s_ease-in-out_infinite_2s]"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-2xl w-full text-center animate-[slide-up_0.6s_cubic-bezier(0.16,1,0.3,1)]">
          {/* Logo */}
          <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-purple)] flex items-center justify-center shadow-[0_0_30px_var(--color-accent-glow)] relative before:absolute before:inset-0 before:rounded-2xl before:border before:border-white/20 before:pointer-events-none">
              <Shield size={28} className="sm:hidden text-[var(--color-bg-primary)] drop-shadow-md" strokeWidth={2.5} />
              <Shield size={32} className="hidden sm:block text-[var(--color-bg-primary)] drop-shadow-md" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[var(--color-text-primary)] to-[var(--color-text-secondary)]">Null</span>
              <span className="text-gradient-brand">Chat</span>
            </h1>
          </div>

          <p className="text-base sm:text-lg text-[var(--color-text-secondary)] mb-1.5 sm:mb-2 font-light tracking-wide">
            Ephemeral. Encrypted. Gone.
          </p>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-8 sm:mb-10 max-w-sm sm:max-w-md mx-auto leading-relaxed px-2">
            Privacy-focused messaging where you exist only temporarily. No traces. No logs. No compromises.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-14 px-2 sm:px-0">
            <button
              onClick={() => { clearError(); setMode('login'); }}
              className="btn btn-secondary px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base w-full sm:w-auto"
            >
              Login
            </button>
            <button
              onClick={() => { clearError(); setMode('register'); }}
              className="btn btn-primary px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base w-full sm:w-auto group"
            >
              <span className="relative z-10">Create Temporary Account</span>
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="card card-glass p-4 sm:p-5 text-left hover:border-[var(--color-accent)]/40 group hover:-translate-y-1 hover:shadow-[0_8px_30px_-10px_var(--color-accent-glow)] stagger-item"
                style={{ animationDelay: `${150 + i * 80}ms` }}
              >
                <div className="text-[var(--color-text-muted)] mb-2 sm:mb-3 group-hover:text-[var(--color-accent)] transition-all duration-300 transform group-hover:scale-110 origin-left">
                  {f.icon}
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] mb-0.5 sm:mb-1">{f.title}</h3>
                <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // Login / Register Form
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-6 sm:py-0 relative overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--color-purple-glow),_transparent_60%)] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-[slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Back button */}
        <button
          onClick={() => { setMode('landing'); clearError(); setUsername(''); setPassword(''); }}
          className="btn btn-ghost mb-4 sm:mb-6 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] gap-1.5 px-0"
          aria-label="Back to landing page"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Card */}
        <div className="card-solid p-6 sm:p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 mb-4 sm:mb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-purple)] flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)]">
                <Shield size={20} className="sm:hidden text-[var(--color-bg-primary)]" strokeWidth={2.5} />
                <Shield size={24} className="hidden sm:block text-[var(--color-bg-primary)]" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              {mode === 'login' ? 'Welcome Back' : 'Create Temporary Account'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-2 sm:mt-2.5 leading-relaxed">
              {mode === 'login'
                ? 'Enter your credentials to continue'
                : 'Your account will auto-expire in 24 hours'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 sm:mb-6 p-3 sm:p-3.5 rounded-xl bg-[var(--color-red-dim)] border border-red-500/20 text-sm text-red-300 animate-[fade-in_0.3s_ease-out] flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0 text-[var(--color-red)]" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[10px] sm:text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 sm:mb-2 uppercase tracking-wider">
                {mode === 'register' ? 'Temporary Username' : 'Username'}
              </label>
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="input-field"
                minLength={3}
                maxLength={32}
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 sm:mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                id="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-field"
                minLength={6}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              id="btn-submit-auth"
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3.5 sm:py-4 rounded-xl text-sm sm:text-base mt-1 sm:mt-2"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-xs sm:text-sm text-[var(--color-text-muted)] mt-5 sm:mt-7">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
              className="text-[var(--color-text-accent)] hover:underline cursor-pointer font-medium"
            >
              {mode === 'login' ? 'Create one' : 'Login'}
            </button>
          </p>

          {/* Expiry notice */}
          {mode === 'register' && (
            <div className="mt-5 sm:mt-6 p-3 sm:p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-start gap-2">
              <Clock size={14} className="text-[var(--color-amber)] mt-0.5 shrink-0" />
              <p className="text-[11px] sm:text-xs text-amber-200/70 leading-relaxed">
                Your account will automatically expire in 24 hours. All messages, keys, and metadata will be permanently deleted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
