'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Smartphone, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOtp, verifyOtp, updateProfile } from '@/lib/authApi';

/**
 * Sign in / sign up.
 *
 * There is no password and no separate registration form: entering a code sent
 * to your inbox proves you own the address, and the account is created on the
 * first successful code. One flow, so a returning customer and a new one never
 * have to work out which button they are.
 *
 * A new account is asked for a name afterwards, because an order cannot be
 * delivered without one.
 */

const input: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #dbe2ea',
  fontSize: '15px',
  background: '#fff',
  outline: 'none',
};

const primaryButton: React.CSSProperties = {
  width: '100%',
  background: '#88b950',
  color: '#fff',
  padding: '13px',
  borderRadius: '30px',
  border: 'none',
  fontWeight: 700,
  fontSize: '15px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

type Step = 'phone' | 'code' | 'profile';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  /** Where to go once signed in — set by the cart when it sends you here. */
  const next = params.get('next') || '/account';

  const { signIn, token, setUser } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Seconds until another code may be requested; the API enforces the same gap. */
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await requestOtp(phone.trim());
      setDevCode(res.devOtp ?? null);
      setCooldown(60);
      setStep('code');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the code.';
      // "Please wait 43 seconds…" — start the counter from what the API said,
      // so the button and the server agree on when the next one is allowed.
      const seconds = Number(message.match(/wait (\d+) second/)?.[1]);
      if (Number.isFinite(seconds)) setCooldown(seconds);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await verifyOtp(phone.trim(), otp.trim());
      signIn(res.token, res.user);
      if (res.needsProfile) {
        setName(res.user.name ?? '');
        setStep('profile');
      } else {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const res = await updateProfile(token, { name: name.trim() });
      setUser(res.user);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: '#f8faf6',
        minHeight: '70vh',
        padding: '40px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '420px',
          padding: '32px 26px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1
            style={{
              fontFamily: 'Goli, sans-serif',
              fontSize: '25px',
              fontWeight: 800,
              color: '#1c2417',
              margin: 0,
            }}
          >
            {step === 'phone' && 'Sign in or create an account'}
            {step === 'code' && 'Enter your code'}
            {step === 'profile' && 'A couple of details'}
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: '8px', lineHeight: 1.55 }}>
            {step === 'phone' && 'We will text you a 4-digit code. No password to remember.'}
            {step === 'code' && (
              <>
                Sent to <strong style={{ color: '#1c2417' }}>+91 {phone}</strong>
              </>
            )}
            {step === 'profile' && 'We need a name to put on your deliveries.'}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              background: '#fff1f1',
              color: '#b33131',
              fontSize: '13px',
              fontWeight: 600,
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            {error}
          </p>
        )}

        {step === 'phone' && (
          <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1c2417', marginBottom: '6px' }}>
                Mobile number
              </span>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    border: '1px solid #d5dbdf',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    background: '#f6f7f8',
                    color: '#4b5563',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ ...input, borderRadius: '0 8px 8px 0' }}
                />
              </div>
            </label>
            <button type="submit" disabled={busy || phone.length !== 10} style={{ ...primaryButton, opacity: busy ? 0.7 : 1 }}>
              {busy ? <Loader2 size={16} className="spin" /> : <Smartphone size={16} />}
              Send me a code
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Development only. The API returns this when no mail server is
                connected; in production the field is absent and this never
                renders. */}
            {devCode && (
              <p
                style={{
                  background: '#fdf8e9',
                  color: '#7a6a2e',
                  fontSize: '13px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  margin: 0,
                }}
              >
                Demo mode — no SMS was sent. Your code is{' '}
                <strong style={{ fontSize: '15px', letterSpacing: '2px' }}>{devCode}</strong>
              </p>
            )}
            <label>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1c2417', marginBottom: '6px' }}>
                4-digit code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={4}
                placeholder="0000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ ...input, letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 700 }}
              />
            </label>
            <button type="submit" disabled={busy || otp.length !== 4} style={{ ...primaryButton, opacity: busy ? 0.7 : 1 }}>
              {busy && <Loader2 size={16} className="spin" />}
              Verify and continue
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowLeft size={13} /> Change number
              </button>
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={busy || cooldown > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: cooldown > 0 ? '#9ca3af' : '#4d7a1f',
                  fontWeight: 700,
                  cursor: cooldown > 0 ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1c2417', marginBottom: '6px' }}>
                Full name
              </span>
              <input
                type="text"
                required
                autoFocus
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
              />
            </label>
            <button type="submit" disabled={busy || !name.trim()} style={{ ...primaryButton, opacity: busy ? 0.7 : 1 }}>
              {busy && <Loader2 size={16} className="spin" />}
              Finish
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '20px', lineHeight: 1.6 }}>
          By continuing you agree to our{' '}
          <Link href="/terms" style={{ color: '#4d7a1f', fontWeight: 600 }}>
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy-policy" style={{ color: '#4d7a1f', fontWeight: 600 }}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * useSearchParams() opts a route out of static prerendering unless it sits
 * behind a Suspense boundary, so the ?next= redirect is read inside one.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <Loader2 size={18} className="spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
