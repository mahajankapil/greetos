import { useState, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shirt, Loader2, Lock, CheckCircle } from 'lucide-react';
import { api, apiError } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[28px] border border-[#e5e5e5] bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-black text-[#111111]">Invalid link</h1>
          <p className="mt-2 text-sm text-[#666666]">This reset link is missing or invalid.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-xs font-semibold text-[#888888] hover:text-[#111111]">
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/admin/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[28px] border border-[#e5e5e5] bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <h1 className="mt-4 text-xl font-black text-[#111111]">Password updated</h1>
          <p className="mt-2 text-sm text-[#666666]">You can now sign in with your new password.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-xs font-semibold text-[#888888] hover:text-[#111111]">
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-[#e5e5e5] bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4af37] text-white">
            <Shirt size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-black text-[#111111]">Set new password</h1>
          <p className="mt-1 text-sm text-[#2a2a2a]">Choose a new password for your admin account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">New password</span>
            <div className="mt-1 flex items-center rounded-2xl border border-[#e5e5e5] px-4 focus-within:border-[#d4af37]">
              <Lock size={16} className="mr-2 shrink-0 text-[#999999]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 text-sm outline-none"
                placeholder="min 6 characters"
                autoFocus
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Confirm password</span>
            <div className="mt-1 flex items-center rounded-2xl border border-[#e5e5e5] px-4 focus-within:border-[#d4af37]">
              <Lock size={16} className="mr-2 shrink-0 text-[#999999]" />
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full py-3 text-sm outline-none"
                placeholder="repeat password"
              />
            </div>
          </label>

          {error && <p className="text-sm font-semibold text-[#b33131]">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111111] py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
