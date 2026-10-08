import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAuth, homePathFor } from '../context/AuthContext';
import { api, apiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const signedIn = await login(email.trim(), password);
      navigate(homePathFor(signedIn.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/admin/forgot-password', { email: email.trim() });
      setMode('sent');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-[#e5e5e5] bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4af37] text-white">
            <Shirt size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-black text-[#111111]">
            {mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Reset password' : 'Check your email'}
          </h1>
          <p className="mt-1 text-sm text-[#2a2a2a]">Old Spice Agro Fresh LLP admin &amp; partner panel</p>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
                placeholder="you@oldspice.pcgnp.co"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
                placeholder="••••••••"
              />
            </label>

            {error && <p className="text-sm font-semibold text-[#b33131]">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111111] py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>

            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); }}
              className="w-full text-center text-xs font-semibold text-[#888888] hover:text-[#111111]"
            >
              Forgot password?
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Your email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
                placeholder="you@oldspice.pcgnp.co"
              />
            </label>

            {error && <p className="text-sm font-semibold text-[#b33131]">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111111] py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Send reset link
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className="flex items-center justify-center gap-1.5 w-full text-center text-xs font-semibold text-[#888888] hover:text-[#111111]"
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </form>
        )}

        {mode === 'sent' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail size={20} className="text-green-600" />
            </div>
            <p className="text-sm text-[#666666]">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setEmail(''); setError(''); }}
              className="text-xs font-semibold text-[#888888] hover:text-[#111111]"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
