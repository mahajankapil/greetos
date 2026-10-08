'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Headphones,
  Info,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Ticket,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listAddresses, listMyOrders } from '@/lib/accountApi';
import { AccountShell, CARD, SECTION_LABEL } from '@/components/account/AccountShell';

/**
 * The account hub.
 *
 * Same shape as the Schmiede one: profile card, a row of counts, then grouped
 * menu rows. Counts load independently of the profile and each falls back to a
 * dash rather than zero — "0 orders" and "we couldn't load your orders" are
 * different statements, and only one of them is safe to make.
 */

function memberSince(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | null; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 0' }}>
      {icon}
      <span style={{ fontSize: '22px', fontWeight: 800, color: '#1c2417', lineHeight: 1.1, marginTop: '5px' }}>
        {value ?? '—'}
      </span>
      <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#8a9a80' }}>
        {label}
      </span>
    </div>
  );
}

function MenuRow({
  href,
  icon,
  title,
  subtitle,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '15px 18px',
        textDecoration: 'none',
        borderBottom: last ? 'none' : '1px solid #f0f4ec',
      }}
    >
      <span
        style={{
          width: '40px',
          height: '40px',
          flexShrink: 0,
          borderRadius: '12px',
          background: '#f4f8ef',
          border: '1px solid #e6ece0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, color: '#1c2417' }}>{title}</span>
        <span style={{ display: 'block', fontSize: '12.5px', color: '#8a9a80', marginTop: '1px' }}>{subtitle}</span>
      </span>
      <ChevronRight size={17} color="#b8c4ae" style={{ flexShrink: 0 }} />
    </Link>
  );
}

export default function AccountPage() {
  const { user, token, signOut } = useAuth();
  const router = useRouter();
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [addressCount, setAddressCount] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    listMyOrders(token)
      .then((o) => active && setOrderCount(o.length))
      .catch(() => {});
    listAddresses(token)
      .then((a) => active && setAddressCount(a.length))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  const since = user ? memberSince((user as { createdAt?: string }).createdAt) : null;

  return (
    <AccountShell title="My account" subtitle="Manage your profile, orders and addresses">
      {user && (
        <>
          <div style={{ ...CARD, padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div
                style={{
                  width: '62px',
                  height: '62px',
                  flexShrink: 0,
                  borderRadius: '16px',
                  background: '#eef7e6',
                  border: '1px solid #e0ebd4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#4d7a1f',
                }}
              >
                {(user.name || user.email || '?').trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#1c2417',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name || 'Add your name'}
                </h2>
                {user.phone && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#7b8a72', margin: '5px 0 0' }}>
                    <Phone size={13} color="#a3b199" /> +91 {user.phone}
                  </p>
                )}
                {user.email && (
                  <p
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12.5px',
                      color: '#7b8a72',
                      margin: '2px 0 0',
                      overflow: 'hidden',
                    }}
                  >
                    <Mail size={13} color="#a3b199" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                  </p>
                )}
              </div>
            </div>

            {since && (
              <div style={{ marginTop: '15px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#1c2417',
                    color: '#fff',
                    borderRadius: '30px',
                    padding: '6px 14px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Star size={10} fill="#fff" color="#fff" /> Member since {since}
                </span>
              </div>
            )}

            {/* Two stats, not three: there is no wishlist on this store, and a
                tile that always reads 0 is worse than one fewer tile. */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderTop: '1px solid #f0f4ec',
                marginTop: '18px',
                paddingTop: '16px',
              }}
            >
              <Stat icon={<ShoppingBag size={18} color="#4d7a1f" />} value={orderCount} label="Orders" />
              <Stat icon={<MapPin size={18} color="#4d7a1f" />} value={addressCount} label="Addresses" />
            </div>
          </div>

          <p style={SECTION_LABEL}>Orders &amp; addresses</p>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <MenuRow
              href="/account/orders"
              icon={<ShoppingBag size={18} color="#4d7a1f" />}
              title="My orders"
              subtitle="Track a delivery or reorder"
            />
            <MenuRow
              href="/account/addresses"
              icon={<MapPin size={18} color="#4d7a1f" />}
              title="Saved addresses"
              subtitle="Manage your delivery addresses"
              last
            />
          </div>

          <p style={SECTION_LABEL}>Account &amp; preferences</p>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <MenuRow
              href="/account/details"
              icon={<User size={18} color="#4d7a1f" />}
              title="Personal details"
              subtitle="Update your name and mobile number"
            />
            <MenuRow
              href="/contact"
              icon={<Headphones size={18} color="#4d7a1f" />}
              title="Help &amp; support"
              subtitle="Questions about an order or a product"
            />
            <MenuRow
              href="/about-us"
              icon={<Info size={18} color="#4d7a1f" />}
              title="About Old Spice Agro Fresh"
              subtitle="Our story and our farms"
              last
            />
          </div>

          <button
            onClick={() => {
              signOut();
              router.push('/');
            }}
            style={{
              marginTop: '26px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#fff',
              border: '1px solid #e6ece0',
              borderRadius: '30px',
              padding: '14px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#b33131',
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </>
      )}
    </AccountShell>
  );
}
