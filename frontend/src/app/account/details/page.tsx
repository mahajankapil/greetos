'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/authApi';
import { AccountShell, CARD } from '@/components/account/AccountShell';

const field: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #dbe2ea',
  fontSize: '15px',
  background: '#fff',
  outline: 'none',
  color: '#1c2417',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 700,
  color: '#1c2417',
  marginBottom: '6px',
};

export default function AccountDetailsPage() {
  const { user, token, setUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setDob(user.dob ?? '');
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const res = await updateProfile(token, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        dob: dob || undefined,
      });
      setUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell title="Personal details" subtitle="Used on your deliveries and order updates" backTo="/account">
      <form onSubmit={save} style={{ ...CARD, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={label} htmlFor="acc-name">
            Full name
          </label>
          <input id="acc-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={field} />
        </div>

        <div>
          <label style={label} htmlFor="acc-phone">
            Mobile number
          </label>
          <input
            id="acc-phone"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="10-digit mobile number"
            style={field}
          />
          <p style={{ fontSize: '11.5px', color: '#8a9a80', margin: '6px 0 0' }}>
            The courier calls this number on delivery.
          </p>
        </div>

        <div>
          <label style={label} htmlFor="acc-dob">
            Date of birth <span style={{ fontWeight: 500, color: '#a3b199' }}>(optional)</span>
          </label>
          <input id="acc-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={field} />
        </div>

        <div>
          <label style={label}>Email</label>
          {/* The email is the login identity — changing it would change who you
              are, so it is shown but not editable here. */}
          <input value={user?.email ?? ''} readOnly aria-readonly style={{ ...field, background: '#f3f4f6', color: '#6b7280' }} />
          <p style={{ fontSize: '11.5px', color: '#8a9a80', margin: '6px 0 0' }}>
            Your email is how you sign in, so it can&rsquo;t be changed here. Contact us if you need it moved.
          </p>
        </div>

        {error && <p style={{ color: '#b33131', fontSize: '13px', fontWeight: 600, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          style={{
            background: saved ? '#2c6b30' : '#88b950',
            color: '#fff',
            border: 'none',
            borderRadius: '30px',
            padding: '13px',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {busy && <Loader2 size={15} className="spin" />}
          {saved && <Check size={16} />}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </form>
    </AccountShell>
  );
}
