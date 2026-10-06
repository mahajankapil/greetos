import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, UserPlus, ShieldPlus, X, Phone, Mail, User as UserIcon, Shield, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, apiError } from '../lib/api';

interface AdminUser {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  orderCount: number;
  createdAt: string;
}

type FormRole = 'customer' | 'admin';

interface FormState {
  role: FormRole;
  name: string;
  phone: string;
  email: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminUser[]>('/admin/users');
      setUsers(res.data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (role: FormRole) => {
    setForm({ role, name: '', phone: '', email: '' });
    setFormError('');
    setNotice(null);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await api.post('/admin/users', {
        role: form.role,
        name: form.name.trim(),
        phone: form.role === 'customer' ? form.phone.trim() : undefined,
        email: form.role === 'admin' ? form.email.trim() : undefined,
      });
      const invite = res.data?.invite;
      if (form.role === 'admin') {
        setNotice(
          invite?.sent
            ? { kind: 'ok', text: `Invite sent to ${form.email.trim()} with a link to set their password.` }
            : { kind: 'warn', text: invite?.error ?? 'Admin created, but the invite email could not be sent.' },
        );
      }
      setForm(null);
      await load();
    } catch (e) {
      setFormError(apiError(e, 'Could not create the user'));
    } finally {
      setSaving(false);
    }
  };

  const resendInvite = async (u: AdminUser) => {
    setResending(u.id);
    setNotice(null);
    try {
      const res = await api.post(`/admin/users/${u.id}/resend-invite`);
      setNotice({ kind: 'ok', text: res.data?.message ?? `Invite re-sent to ${u.email}.` });
    } catch (e) {
      setNotice({ kind: 'warn', text: apiError(e, 'Could not re-send the invite') });
    } finally {
      setResending(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">People</p>
          <h2 className="text-2xl font-black text-[#111111]">Users</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openForm('customer')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f5f5f5] px-4 py-2.5 text-sm font-bold text-[#111111] hover:bg-[#e5e5e5]"
          >
            <UserPlus size={16} /> Add Customer
          </button>
          <button
            onClick={() => openForm('admin')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a]"
          >
            <ShieldPlus size={16} /> Add Admin
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {notice && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            notice.kind === 'ok' ? 'bg-[#eefbef] text-[#2c6b30]' : 'bg-[#fdf8e9] text-[#7a6a2e]'
          }`}
        >
          {notice.kind === 'ok' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">No users yet.</p>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f5] text-left text-[#666666]">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Orders</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#e5e5e5]">
                  <td className="px-5 py-3 font-semibold text-[#111111]">{u.name || '—'}</td>
                  <td className="px-5 py-3 text-[#2a2a2a]">
                    {u.phone ? <div>+91 {u.phone}</div> : null}
                    {u.email ? <div className="text-xs text-[#666666]">{u.email}</div> : null}
                    {!u.phone && !u.email ? '—' : null}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        u.role === 'admin' ? 'bg-[#111111] text-white' : 'bg-[#f5f5f5] text-[#d4af37]'
                      }`}
                    >
                      {u.role === 'admin' && <Shield size={11} />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#2a2a2a]">{u.orderCount}</td>
                  <td className="px-5 py-3 text-[#2a2a2a]">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    {u.role === 'admin' && u.email && (
                      <button
                        onClick={() => resendInvite(u)}
                        disabled={resending === u.id}
                        title="Email this admin a fresh set-password link"
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[#2a2a2a] hover:bg-[#f5f5f5] disabled:opacity-50"
                      >
                        {resending === u.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        Resend invite
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-16 w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">
                {form.role === 'admin' ? 'New Admin' : 'New Customer'}
              </h3>
              <button onClick={() => setForm(null)} className="rounded-lg p-1 text-[#666666] hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <Field icon={<UserIcon size={16} />} label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" autoFocus />
              {form.role === 'customer' ? (
                <Field
                  icon={<Phone size={16} />}
                  label="Mobile number"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit number"
                />
              ) : (
                <>
                  <Field icon={<Mail size={16} />} label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="admin@example.com" />
                  <p className="flex gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2.5 text-xs leading-relaxed text-[#666666]">
                    <Send size={14} className="mt-0.5 shrink-0" />
                    <span>
                      We'll email them a link to the admin panel and a secure link to set their own
                      password. The link expires in 24 hours. No password is ever sent by email.
                    </span>
                  </p>
                </>
              )}
            </div>

            {formError && <p className="mt-3 text-sm font-semibold text-[#b33131]">{formError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-[#2a2a2a] hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || (form.role === 'admin' && !form.email.trim())}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {form.role === 'admin' ? 'Create & Send Invite' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">{label}</span>
      <div className="mt-1 flex items-center rounded-2xl border border-[#e5e5e5] px-4 focus-within:border-[#d4af37]">
        <span className="mr-2 shrink-0 text-[#666666]">{icon}</span>
        <input
          type={type}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm text-[#111111] outline-none"
        />
      </div>
    </label>
  );
}
