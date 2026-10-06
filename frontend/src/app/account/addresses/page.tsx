'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
  type AddressInput,
  type SavedAddress,
} from '@/lib/accountApi';
import { AccountShell, CARD } from '@/components/account/AccountShell';
import { INDIAN_STATES, SHIP_TO_COUNTRY } from '@/data/indianStates';

const field: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: '10px',
  border: '1px solid #dbe2ea',
  fontSize: '14.5px',
  background: '#fff',
  outline: 'none',
  color: '#1c2417',
};

const EMPTY: AddressInput = {
  label: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
};

export default function AccountAddressesPage() {
  const { token } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<(AddressInput & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = React.useCallback(() => {
    if (!token) return;
    listAddresses(token)
      .then(setAddresses)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your addresses.'));
  }, [token]);

  useEffect(load, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;
    setBusy(true);
    setError('');
    try {
      const payload: AddressInput = {
        label: editing.label?.trim() || undefined,
        addressLine1: editing.addressLine1.trim(),
        addressLine2: editing.addressLine2?.trim() || undefined,
        landmark: editing.landmark?.trim() || undefined,
        city: editing.city.trim(),
        state: editing.state,
        pincode: editing.pincode.trim(),
      };
      if (editing.id) await updateAddress(token, editing.id, payload);
      else await createAddress(token, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this address.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: SavedAddress) => {
    if (!token) return;
    if (!confirm(`Delete this address?\n${a.addressLine1}, ${a.city}`)) return;
    try {
      await deleteAddress(token, a.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this address.');
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    if (!token) return;
    try {
      await updateAddress(token, a.id, { isDefault: true });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this address.');
    }
  };

  return (
    <AccountShell title="Saved addresses" subtitle="Where we deliver your orders" backTo="/account">
      {error && (
        <p style={{ background: '#fff1f1', color: '#b33131', padding: '12px 14px', borderRadius: '10px', fontSize: '13.5px', marginBottom: '14px' }}>
          {error}
        </p>
      )}

      {!addresses && !error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
          <Loader2 size={16} className="spin" /> Loading…
        </p>
      )}

      {addresses && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {addresses.map((a) => (
            <div key={a.id} style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: 700, color: '#1c2417' }}>
                    <MapPin size={15} color="#4d7a1f" />
                    {a.label || 'Address'}
                    {a.isDefault && (
                      <span
                        style={{
                          background: '#eef7e6',
                          color: '#4d7a1f',
                          borderRadius: '20px',
                          padding: '2px 9px',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Default
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '7px 0 0', fontSize: '13px', color: '#5a6b52', lineHeight: 1.6 }}>
                    {a.addressLine1}
                    {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                    {a.landmark ? `, near ${a.landmark}` : ''}
                    <br />
                    {a.city}, {a.state} {a.pincode}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => setEditing({ ...a, label: a.label ?? '', addressLine2: a.addressLine2 ?? '', landmark: a.landmark ?? '' })}
                    aria-label="Edit address"
                    style={iconBtn}
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(a)} aria-label="Delete address" style={{ ...iconBtn, color: '#b33131' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {!a.isDefault && (
                <button
                  onClick={() => makeDefault(a)}
                  style={{
                    marginTop: '12px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#4d7a1f',
                    cursor: 'pointer',
                  }}
                >
                  <Star size={12} /> Make default
                </button>
              )}
            </div>
          ))}

          {addresses.length === 0 && !editing && (
            <div style={{ ...CARD, padding: '40px 24px', textAlign: 'center' }}>
              <MapPin size={28} color="#b8c4ae" style={{ marginBottom: '10px' }} />
              <h2 style={{ fontSize: '16.5px', fontWeight: 700, color: '#1c2417', margin: '0 0 6px' }}>No saved addresses</h2>
              <p style={{ fontSize: '13.5px', color: '#7b8a72', margin: 0 }}>
                Save an address and it will be ready at checkout.
              </p>
            </div>
          )}

          {!editing && (
            <button
              onClick={() => setEditing({ ...EMPTY })}
              style={{
                display: 'flex',
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
                marginTop: '4px',
              }}
            >
              <Plus size={16} /> Add a new address
            </button>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={save} style={{ ...CARD, padding: '20px 18px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2417', margin: 0 }}>
              {editing.id ? 'Edit address' : 'New address'}
            </h2>
            <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" style={iconBtn}>
              <X size={15} />
            </button>
          </div>

          <input
            placeholder="Label (Home, Office)"
            value={editing.label ?? ''}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            style={field}
          />
          <input
            required
            placeholder="Flat / house no., building, street"
            value={editing.addressLine1}
            onChange={(e) => setEditing({ ...editing, addressLine1: e.target.value })}
            style={field}
          />
          <input
            placeholder="Area, colony (optional)"
            value={editing.addressLine2 ?? ''}
            onChange={(e) => setEditing({ ...editing, addressLine2: e.target.value })}
            style={field}
          />
          <input
            placeholder="Landmark (optional)"
            value={editing.landmark ?? ''}
            onChange={(e) => setEditing({ ...editing, landmark: e.target.value })}
            style={field}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px' }}>
            <input
              required
              placeholder="City"
              value={editing.city}
              onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              style={field}
            />
            <input
              required
              placeholder="PIN code"
              inputMode="numeric"
              maxLength={6}
              value={editing.pincode}
              onChange={(e) => setEditing({ ...editing, pincode: e.target.value.replace(/\D/g, '') })}
              style={field}
            />
          </div>
          <select
            required
            value={editing.state}
            onChange={(e) => setEditing({ ...editing, state: e.target.value })}
            style={{ ...field, color: editing.state ? '#1c2417' : '#9ca3af' }}
          >
            <option value="">State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input value={SHIP_TO_COUNTRY} readOnly aria-readonly style={{ ...field, background: '#f3f4f6', color: '#6b7280' }} />

          <button
            type="submit"
            disabled={busy}
            style={{
              background: '#88b950',
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
              marginTop: '4px',
            }}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <Check size={16} />}
            {editing.id ? 'Save address' : 'Add address'}
          </button>
        </form>
      )}
    </AccountShell>
  );
}

const iconBtn: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '9px',
  border: '1px solid #e6ece0',
  background: '#fff',
  color: '#5a6b52',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
