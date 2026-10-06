'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOtp, verifyOtp } from '@/lib/authApi';

/**
 * Step one of checkout: prove who you are.
 *
 * The same mobile-and-code flow as the login page, inlined here so the
 * customer never leaves /checkout — bouncing them to another route mid-purchase
 * loses the sense that they are partway through something.
 *
 * Only the number and the code are asked for here. The delivery step already
 * collects a first and last name, so asking again in this step would be the
 * same question twice; a new account's name is backfilled from that instead.
 */

const field: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '8px',
  border: '1px solid #d5dbdf',
  fontSize: '15px',
  background: '#fff',
  outline: 'none',
  color: '#1c2417',
};

const primary: React.CSSProperties = {
  width: '100%',
  background: '#88b950',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '15px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

export const CheckoutSignIn: React.FC = () => {
  const { signIn } = useAuth();
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Seconds until another code may be requested; the API enforces the same gap. */
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await requestOtp(phone.trim());
      setDevCode(res.devOtp ?? null);
      setCooldown(60);
      setStage('code');
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

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await verifyOtp(phone.trim(), otp.trim());
      // The checkout page watches for a signed-in user and moves to step two.
      signIn(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '430px' }}>
      <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#1c2417', margin: '0 0 6px' }}>
        {stage === 'phone' ? 'Sign in to continue' : 'Enter your code'}
      </h2>
      <p style={{ fontSize: '13.5px', color: '#6b7280', margin: '0 0 18px', lineHeight: 1.55 }}>
        {stage === 'phone' && 'We’ll text you a 4-digit code. No password needed — your order and its tracking stay in your account.'}
        {stage === 'code' && (
          <>
            Sent to <strong style={{ color: '#1c2417' }}>+91 {phone}</strong>
          </>
        )}
      </p>

      {error && (
        <p
          role="alert"
          style={{
            background: '#fff1f1',
            color: '#b33131',
            fontSize: '13px',
            fontWeight: 600,
            padding: '11px 13px',
            borderRadius: '8px',
            marginBottom: '15px',
          }}
        >
          {error}
        </p>
      )}

      {stage === 'phone' && (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
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
              placeholder="Mobile number"
              aria-label="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ ...field, borderRadius: '0 8px 8px 0' }}
            />
          </div>
          <button type="submit" disabled={busy || phone.length !== 10} style={{ ...primary, opacity: busy ? 0.7 : 1 }}>
            {busy ? <Loader2 size={16} className="spin" /> : <Smartphone size={16} />}
            Send me a code
          </button>
        </form>
      )}

      {stage === 'code' && (
        <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          {devCode && (
            <p
              style={{
                background: '#fdf8e9',
                color: '#7a6a2e',
                fontSize: '13px',
                padding: '10px 12px',
                borderRadius: '8px',
                margin: 0,
              }}
            >
              Demo mode — no SMS was sent. Your code is{' '}
              <strong style={{ fontSize: '15px', letterSpacing: '2px' }}>{devCode}</strong>
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            maxLength={4}
            placeholder="0000"
            aria-label="4-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            style={{ ...field, letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 700 }}
          />
          <button type="submit" disabled={busy || otp.length !== 4} style={{ ...primary, opacity: busy ? 0.7 : 1 }}>
            {busy && <Loader2 size={16} className="spin" />}
            Verify and continue
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <button
              type="button"
              onClick={() => {
                setStage('phone');
                setOtp('');
                setError('');
              }}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={13} /> Change number
            </button>
            <button
              type="button"
              onClick={() => send()}
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

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '20px', lineHeight: 1.6 }}>
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
  );
};
