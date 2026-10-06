import { useEffect, useState } from 'react';
import { Loader2, Building2, Check, AlertTriangle } from 'lucide-react';
import { api, apiError } from '../lib/api';

interface BusinessSettings {
  legalName: string;
  address: string;
  gstin: string;
  fssai: string;
  state: string;
  hsn: string;
  gstRate: number;
  invoicePrefix: string;
}

const EMPTY: BusinessSettings = {
  legalName: '',
  address: '',
  gstin: '',
  fssai: '',
  state: '',
  hsn: '',
  gstRate: 0,
  invoicePrefix: 'INV',
};

/**
 * The business's legal/GST identity. Invoicing stays locked until the
 * required fields are filled — the values live here, in the panel, never
 * hard-coded into the app.
 */
export default function BusinessSettingsPage() {
  const [form, setForm] = useState<BusinessSettings>(EMPTY);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  useEffect(() => {
    api
      .get<{ settings: BusinessSettings; missing: string[] }>('/admin/business-settings')
      .then((res) => {
        setForm(res.data.settings);
        setMissing(res.data.missing);
      })
      .catch((e) => setNotice({ kind: 'warn', text: apiError(e, 'Could not load business settings') }))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.put<{ settings: BusinessSettings; missing: string[] }>(
        '/admin/business-settings',
        { ...form, gstRate: Number(form.gstRate) || 0 },
      );
      setForm(res.data.settings);
      setMissing(res.data.missing);
      setNotice(
        res.data.missing.length === 0
          ? { kind: 'ok', text: 'Saved. Invoicing is unlocked — you can now generate GST invoices from Orders.' }
          : { kind: 'warn', text: `Saved, but invoicing stays locked until you fill: ${res.data.missing.join(', ')}.` },
      );
    } catch (e) {
      setNotice({ kind: 'warn', text: apiError(e, 'Could not save') });
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof BusinessSettings) => (v: string) =>
    setForm((f) => ({ ...f, [k]: k === 'gstRate' ? (v as unknown as number) : v }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#2a2a2a]">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Legal</p>
        <h2 className="text-2xl font-black text-[#111111]">Business & GST</h2>
        <p className="mt-1 text-sm text-[#666666]">
          These details go on every tax invoice exactly as entered here. Nothing is invoiced until
          they're complete.
        </p>
      </div>

      {missing.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#fdf8e9] px-4 py-3 text-sm font-semibold text-[#7a6a2e]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          Invoicing is locked. Still needed: {missing.join(', ')}.
        </p>
      )}
      {notice && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            notice.kind === 'ok' ? 'bg-[#eefbef] text-[#2c6b30]' : 'bg-[#fdf8e9] text-[#7a6a2e]'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="space-y-4 rounded-[24px] border border-[#e5e5e5] bg-white p-6">
        <Field label="Legal entity name" value={form.legalName} onChange={set('legalName')} placeholder="The registered selling entity — as it must appear on invoices" />
        <Field label="Registered address" value={form.address} onChange={set('address')} placeholder="Full registered address" textarea />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GSTIN" value={form.gstin} onChange={(v) => set('gstin')(v.toUpperCase())} placeholder="15 characters, e.g. 29ABCDE1234F1Z5" mono />
          <Field label="FSSAI licence (optional)" value={form.fssai} onChange={(v) => set('fssai')(v.replace(/\D/g, ''))} placeholder="14 digits" mono />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="State (supply from)" value={form.state} onChange={set('state')} placeholder="e.g. Karnataka" />
          <Field label="HSN code" value={form.hsn} onChange={(v) => set('hsn')(v.replace(/\D/g, ''))} placeholder="4–8 digits" mono />
          <Field label="GST rate (%)" value={String(form.gstRate || '')} onChange={(v) => setForm((f) => ({ ...f, gstRate: Number(v.replace(/[^\d.]/g, '')) || 0 }))} placeholder="e.g. 18" mono />
        </div>
        <Field label="Invoice number prefix" value={form.invoicePrefix} onChange={set('invoicePrefix')} placeholder="e.g. SCH" mono />

        <div className="flex justify-end pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-6 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save
          </button>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-[#888888]">
        <Building2 size={14} className="mt-0.5 shrink-0" />
        Confirm the GSTIN, HSN and rate with your accountant — invoices snapshot these values
        permanently at the moment each one is issued.
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, textarea, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  mono?: boolean;
}) {
  const cls = `mt-1 w-full rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-sm outline-none focus:border-[#d4af37] ${mono ? 'font-mono' : ''}`;
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#666666]">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </label>
  );
}
