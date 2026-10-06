import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Gift, Save, Users, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { api, apiError } from '../lib/api';

interface ReferralSettings {
  enabled: boolean;
  refereePercent: number;
  referrerPercent: number;
  maxDiscount: number | null;
  minAmount: number;
  validityDays: number;
}

interface LeaderRow {
  userId: string;
  name: string | null;
  email: string | null;
  code: string | null;
  referrals: number;
}

interface Payload {
  settings: ReferralSettings;
  stats: { total: number; rewarded: number; pending: number };
  leaderboard: LeaderRow[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Form mirrors settings as strings so the inputs can be cleared while typing.
  const [form, setForm] = useState({
    enabled: true,
    refereePercent: '10',
    referrerPercent: '15',
    maxDiscount: '',
    minAmount: '0',
    validityDays: '90',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Payload>('/admin/referrals');
      setData(res.data);
      setForm({
        enabled: res.data.settings.enabled,
        refereePercent: String(res.data.settings.refereePercent),
        referrerPercent: String(res.data.settings.referrerPercent),
        maxDiscount: res.data.settings.maxDiscount == null ? '' : String(res.data.settings.maxDiscount),
        minAmount: String(res.data.settings.minAmount),
        validityDays: String(res.data.settings.validityDays),
      });
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load the referral programme'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice('');
    try {
      await api.put('/admin/referrals', {
        enabled: form.enabled,
        refereePercent: parseInt(form.refereePercent || '0', 10),
        referrerPercent: parseInt(form.referrerPercent || '0', 10),
        maxDiscount: form.maxDiscount ? parseInt(form.maxDiscount, 10) : null,
        minAmount: parseInt(form.minAmount || '0', 10),
        validityDays: parseInt(form.validityDays || '90', 10),
      });
      setNotice('Saved. New terms apply to coupons issued from now on.');
      await load();
    } catch (e) {
      setError(apiError(e, 'Could not save the referral settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Growth</p>
        <h2 className="text-2xl font-black text-[#111111]">Referrals</h2>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}
      {notice && <p className="mb-4 rounded-xl bg-[#eefbef] px-4 py-3 text-sm font-semibold text-[#2c6b30]">{notice}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {data && (
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Users size={15} />} label="Total referrals" value={String(data.stats.total)} />
              <Stat icon={<CheckCircle2 size={15} />} label="Rewarded" value={String(data.stats.rewarded)} />
              <Stat icon={<Clock size={15} />} label="Awaiting first order" value={String(data.stats.pending)} />
            </div>
          )}

          <div className="rounded-[24px] border border-[#e5e5e5] bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <Gift size={17} className="text-[#d4af37]" />
              <h3 className="text-base font-black text-[#111111]">Programme terms</h3>
            </div>

            <label className="mb-5 flex items-center gap-3 rounded-2xl bg-[#f9f9f9] p-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-[#111111]"
              />
              <span>
                <span className="block text-sm font-bold text-[#111111]">Referral programme active</span>
                <span className="block text-xs text-[#666666]">
                  When off, the code field is hidden at login and no new rewards are issued.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Num
                label="New customer gets (%)"
                hint="Issued the moment they sign up with a code"
                value={form.refereePercent}
                onChange={(v) => setForm({ ...form, refereePercent: v })}
              />
              <Num
                label="Referrer gets (%)"
                hint="Issued once their referee pays for an order"
                value={form.referrerPercent}
                onChange={(v) => setForm({ ...form, referrerPercent: v })}
              />
              <Num
                label="Max discount (₹)"
                hint="Caps the percentage. Leave blank for no cap."
                value={form.maxDiscount}
                onChange={(v) => setForm({ ...form, maxDiscount: v })}
                placeholder="No cap"
              />
              <Num
                label="Minimum order (₹)"
                hint="Cart value needed to use a referral coupon"
                value={form.minAmount}
                onChange={(v) => setForm({ ...form, minAmount: v })}
              />
              <Num
                label="Coupon validity (days)"
                hint="How long an issued reward stays usable"
                value={form.validityDays}
                onChange={(v) => setForm({ ...form, validityDays: v })}
              />
            </div>

            <p className="mt-4 rounded-xl bg-[#f9f9f9] px-3 py-2.5 text-xs leading-relaxed text-[#666666]">
              Changing these only affects coupons issued from now on — rewards already sitting in
              customers' accounts keep the terms they were created with.
            </p>

            <button
              onClick={save}
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save terms
            </button>
          </div>

          {data && data.leaderboard.length > 0 && (
            <div className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white">
              <div className="flex items-center gap-2 border-b border-[#e5e5e5] px-5 py-4">
                <Trophy size={16} className="text-[#d4af37]" />
                <h3 className="text-base font-black text-[#111111]">Top referrers</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#f5f5f5] text-left text-[#666666]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 text-right font-semibold">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((r) => (
                    <tr key={r.userId} className="border-t border-[#e5e5e5]">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-[#111111]">{r.name || '—'}</span>
                        {r.email && <span className="block text-xs text-[#666666]">{r.email}</span>}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[#2a2a2a]">{r.code || '—'}</td>
                      <td className="px-5 py-3 text-right font-black text-[#111111]">{r.referrals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e5e5] bg-white p-4">
      <div className="flex items-center gap-1.5 text-[#888888]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-[#111111]">{value}</p>
    </div>
  );
}

function Num({
  label, hint, value, onChange, placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#666666]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        inputMode="numeric"
        className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none focus:border-[#d4af37]"
      />
      <span className="mt-1 block text-[11px] text-[#999999]">{hint}</span>
    </label>
  );
}
