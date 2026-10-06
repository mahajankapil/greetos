import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Loader2,
  Ticket,
  Plus,
  X,
  Search,
  Trash2,
  Pencil,
  Power,
  BadgePercent,
  IndianRupee,
  TrendingDown,
} from 'lucide-react';
import { api, apiError } from '../lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
}

interface Stats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

interface FormState {
  id?: string;
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: string;
  minAmount: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
}

const emptyForm: FormState = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  minAmount: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '',
  validFrom: '',
  validUntil: '',
  active: true,
};

/** yyyy-MM-dd for <input type="date"> from an ISO string. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ coupons: Coupon[]; stats: Stats }>('/admin/coupons');
      setCoupons(res.data.coupons);
      setStats(res.data.stats);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load coupons'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(
      (c) => c.code.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q),
    );
  }, [coupons, search]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setFormError('');
  };

  const openEdit = (c: Coupon) => {
    setForm({
      id: c.id,
      code: c.code,
      description: c.description ?? '',
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minAmount: c.minAmount ? String(c.minAmount) : '',
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : '',
      validFrom: toDateInput(c.validFrom),
      validUntil: toDateInput(c.validUntil),
      active: c.active,
    });
    setFormError('');
  };

  const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minAmount: form.minAmount.trim() === '' ? 0 : Number(form.minAmount),
        maxDiscount: form.discountType === 'percent' ? numOrNull(form.maxDiscount) : null,
        usageLimit: numOrNull(form.usageLimit),
        perUserLimit: numOrNull(form.perUserLimit),
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        active: form.active,
      };
      if (form.id) {
        await api.put(`/admin/coupons/${form.id}`, payload);
      } else {
        await api.post('/admin/coupons', payload);
      }
      setForm(null);
      await load();
    } catch (e) {
      setFormError(apiError(e, 'Could not save the coupon'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    setBusyId(c.id);
    try {
      await api.put(`/admin/coupons/${c.id}`, { active: !c.active });
      await load();
    } catch (e) {
      setError(apiError(e, 'Could not update the coupon'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    setBusyId(c.id);
    try {
      await api.delete(`/admin/coupons/${c.id}`);
      await load();
    } catch (e) {
      setError(apiError(e, 'Could not delete the coupon'));
    } finally {
      setBusyId(null);
    }
  };

  const discountLabel = (c: Coupon) =>
    c.discountType === 'percent' ? `${c.discountValue}%` : inr(c.discountValue);

  const validityLabel = (c: Coupon) => {
    const from = c.validFrom ? new Date(c.validFrom).toLocaleDateString() : null;
    const until = c.validUntil ? new Date(c.validUntil).toLocaleDateString() : null;
    if (!from && !until) return 'Always';
    return `${from ?? '—'} → ${until ?? '—'}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Marketing</p>
          <h2 className="text-2xl font-black text-[#111111]">Coupons</h2>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a]"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Ticket size={18} />} label="Total Coupons" value={stats ? String(stats.totalCoupons) : '—'} />
        <StatCard icon={<Power size={18} />} label="Active Coupons" value={stats ? String(stats.activeCoupons) : '—'} />
        <StatCard icon={<BadgePercent size={18} />} label="Total Redemptions" value={stats ? String(stats.totalRedemptions) : '—'} />
        <StatCard icon={<TrendingDown size={18} />} label="Total Discount Given" value={stats ? inr(stats.totalDiscountGiven) : '—'} />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {/* Search */}
      <div className="mb-4 flex items-center rounded-2xl border border-[#e5e5e5] bg-white px-4 sm:max-w-xs">
        <Search size={16} className="mr-2 shrink-0 text-[#666666]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coupons…"
          className="w-full bg-transparent py-2.5 text-sm text-[#111111] outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">
          {coupons.length === 0 ? 'No coupons yet. Create your first one.' : 'No coupons match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-[#e5e5e5] bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#f5f5f5] text-left text-[#666666]">
              <tr>
                <th className="px-5 py-3 font-semibold">Code</th>
                <th className="px-5 py-3 font-semibold">Discount</th>
                <th className="px-5 py-3 font-semibold">Usage</th>
                <th className="px-5 py-3 font-semibold">Min Amount</th>
                <th className="px-5 py-3 font-semibold">Validity</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-[#e5e5e5] align-top">
                  <td className="px-5 py-3">
                    <div className="font-black tracking-wide text-[#111111]">{c.code}</div>
                    {c.description ? <div className="text-xs text-[#666666]">{c.description}</div> : null}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-[#d4af37]">{discountLabel(c)}</span>
                    {c.discountType === 'percent' && c.maxDiscount != null ? (
                      <div className="text-xs text-[#666666]">max {inr(c.maxDiscount)}</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-[#2a2a2a]">
                    <div>
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
                    </div>
                    {c.perUserLimit != null ? <div className="text-xs text-[#666666]">{c.perUserLimit} per user</div> : null}
                  </td>
                  <td className="px-5 py-3 text-[#2a2a2a]">{c.minAmount ? inr(c.minAmount) : '—'}</td>
                  <td className="px-5 py-3 text-xs text-[#2a2a2a]">{validityLabel(c)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                        c.active ? 'bg-[#f5f5f5] text-[#d4af37]' : 'bg-[#f3f0ee] text-[#9c8b7d]'
                      }`}
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        title="Edit"
                        className="rounded-lg p-2 text-[#2a2a2a] hover:bg-[#fafafa]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        title={c.active ? 'Deactivate' : 'Activate'}
                        className="rounded-lg p-2 text-[#2a2a2a] hover:bg-[#fafafa] disabled:opacity-50"
                      >
                        {busyId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        title="Delete"
                        className="rounded-lg p-2 text-[#b33131] hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-10 w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">{form.id ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button onClick={() => setForm(null)} className="rounded-lg p-1 text-[#666666] hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <Field
                label="Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v.toUpperCase().replace(/\s/g, '') })}
                placeholder="WELCOME10"
                autoFocus
              />
              <Field
                label="Description"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="10% off your first order"
              />

              {/* Discount type segmented control */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Discount type</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <TypeButton
                    active={form.discountType === 'percent'}
                    onClick={() => setForm({ ...form, discountType: 'percent' })}
                    icon={<BadgePercent size={15} />}
                    label="Percentage"
                  />
                  <TypeButton
                    active={form.discountType === 'flat'}
                    onClick={() => setForm({ ...form, discountType: 'flat' })}
                    icon={<IndianRupee size={15} />}
                    label="Flat ₹"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={form.discountType === 'percent' ? 'Discount (%)' : 'Discount (₹)'}
                  value={form.discountValue}
                  onChange={(v) => setForm({ ...form, discountValue: v.replace(/\D/g, '') })}
                  placeholder={form.discountType === 'percent' ? '10' : '100'}
                />
                {form.discountType === 'percent' ? (
                  <Field
                    label="Max discount (₹)"
                    value={form.maxDiscount}
                    onChange={(v) => setForm({ ...form, maxDiscount: v.replace(/\D/g, '') })}
                    placeholder="Optional"
                  />
                ) : (
                  <div />
                )}
              </div>

              <Field
                label="Minimum order amount (₹)"
                value={form.minAmount}
                onChange={(v) => setForm({ ...form, minAmount: v.replace(/\D/g, '') })}
                placeholder="0"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Total usage limit"
                  value={form.usageLimit}
                  onChange={(v) => setForm({ ...form, usageLimit: v.replace(/\D/g, '') })}
                  placeholder="Unlimited"
                />
                <Field
                  label="Per-user limit"
                  value={form.perUserLimit}
                  onChange={(v) => setForm({ ...form, perUserLimit: v.replace(/\D/g, '') })}
                  placeholder="Unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Valid from"
                  type="date"
                  value={form.validFrom}
                  onChange={(v) => setForm({ ...form, validFrom: v })}
                />
                <Field
                  label="Valid until"
                  type="date"
                  value={form.validUntil}
                  onChange={(v) => setForm({ ...form, validUntil: v })}
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-sm font-semibold text-[#111111]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-[#e5e5e5] accent-[#d4af37]"
                />
                Active
              </label>
            </div>

            {formError && <p className="mt-3 text-sm font-semibold text-[#b33131]">{formError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-[#2a2a2a] hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.code.trim() || !form.discountValue.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {form.id ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-center gap-2 text-[#d4af37]">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5f5f5]">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-[#111111]">{value}</p>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors ${
        active ? 'border-[#d4af37] bg-[#f5f5f5] text-[#111111]' : 'border-[#e5e5e5] text-[#2a2a2a] hover:bg-[#fafafa]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
}: {
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
