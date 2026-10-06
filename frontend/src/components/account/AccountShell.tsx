'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, LogIn, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Shared chrome for every /account page: the signed-out card, the loading
 * state, and the back link on sub-pages.
 *
 * Centralised because the three states have to behave identically everywhere.
 * The important one is "still checking": the stored token is validated against
 * the API on mount, so a page that treats the first render as signed-out
 * bounces a returning customer to the login screen on every refresh.
 */

export const CARD: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e6ece0',
  borderRadius: '18px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
};

export const SECTION_LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#8a9a80',
  margin: '30px 0 10px',
};

export function AccountShell({
  title,
  subtitle,
  backTo,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Shown on sub-pages so the hub is always one tap away. */
  backTo?: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#64748b',
          fontSize: '14px',
        }}
      >
        <Loader2 size={18} className="spin" /> Loading your account…
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: '#f8faf6',
        }}
      >
        <div style={{ ...CARD, maxWidth: '380px', width: '100%', padding: '40px 30px', textAlign: 'center' }}>
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              background: '#eef7e6',
              color: '#4d7a1f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <User size={26} />
          </div>
          <h1 style={{ fontFamily: 'Goli, sans-serif', fontSize: '21px', fontWeight: 800, color: '#1c2417', margin: 0 }}>
            You&rsquo;re not signed in
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, margin: '10px 0 0' }}>
            Sign in with your email to view your orders, track a delivery and save your addresses.
          </p>
          <button
            onClick={() => router.push('/account/login?next=/account')}
            style={{
              marginTop: '24px',
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#88b950',
              color: '#fff',
              border: 'none',
              borderRadius: '30px',
              padding: '13px',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <LogIn size={15} /> Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8faf6', minHeight: '75vh', padding: '30px 16px 70px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        {backTo && (
          <Link
            href={backTo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4d7a1f',
              textDecoration: 'none',
              marginBottom: '14px',
            }}
          >
            <ChevronLeft size={15} /> My account
          </Link>
        )}
        <h1
          style={{
            fontFamily: 'Goli, sans-serif',
            fontSize: '29px',
            fontWeight: 800,
            color: '#1c2417',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: '13.5px', color: '#7b8a72', margin: '6px 0 0' }}>{subtitle}</p>}
        <div style={{ marginTop: '22px' }}>{children}</div>
      </div>
    </div>
  );
}
