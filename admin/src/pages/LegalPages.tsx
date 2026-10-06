import { useEffect, useState } from 'react';
import { Loader2, Save, FileText, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { api, apiError } from '../lib/api';

export interface PolicyData {
  title: string;
  lastUpdated: string;
  intro: string;
  content: string;
}

type PolicyKey = 'privacy' | 'refund' | 'terms' | 'shipping';

const DEFAULT_POLICIES: Record<PolicyKey, PolicyData> = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '8 September 2026',
    intro: 'This policy explains what personal information Old Spice Agro Fresh LLP collects when you visit or buy from this store, why we collect it, and what we do with it.',
    content: `## 1. Information We Collect
We collect information you provide directly to us when creating an account, placing an order, or contacting us for support (e.g. name, email, phone number, delivery address).

## 2. How We Use Your Information
We use your information to process orders, arrange delivery, send order updates, communicate with you, and improve our services.

## 3. Data Protection
Your personal information is kept secure and will never be sold or shared with unauthorized third parties.`,
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: '8 September 2026',
    intro: 'Important policy details regarding refunds, returns, and product exchanges at Old Spice Agro Fresh LLP.',
    content: `## STRICT NO REFUND & NO RETURN POLICY
At Old Spice Agro Fresh LLP, we strictly follow a No Refund & No Returns policy. We only process product Exchanges under specific conditions outlined below.

## 1. No Refunds & No Returns
Once an order is placed or delivered, we do not accept returns or offer financial refunds under any circumstances.

## 2. Exchange Eligibility
We only offer an Exchange if the following mandatory conditions are met:
- The product must be completely unused, unopened, and in its original condition with sealed packaging intact.
- A proper, unedited, continuous unboxing video is mandatory. The video must show the parcel from its sealed outer packaging stage to opening the box and revealing the product.
- Without a valid unboxing video, exchange requests will not be entertained.

## 3. How to Request an Exchange
If your product meets the above exchange criteria, please reach out to us within 48 hours of delivery:
- Email your order ID and unboxing video to support@oldspiceagro.com
- Or contact / WhatsApp us at +917249485006`,
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: '8 September 2026',
    intro: 'These terms govern your use of this website and any order you place with Old Spice Agro Fresh LLP.',
    content: `## 1. Overview
By visiting our site and/or purchasing something from us, you engage in our Service and agree to be bound by the following terms and conditions.

## 2. Product Information & Pricing
Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue any product.

## 3. Governing Law
These terms are governed by and construed in accordance with the laws of India.`,
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    lastUpdated: '8 September 2026',
    intro: 'How and when Old Spice Agro Fresh LLP orders are dispatched and delivered across India.',
    content: `## 1. Dispatch & Delivery Estimates
- Orders are packed and handed to courier partners within 1–2 business days of payment confirmation.
- Standard delivery usually takes 3–7 business days depending on location.

## 2. Shipping Charges
- Free shipping on prepaid orders of ₹799 and above.
- Flat shipping charge of ₹50 applies on orders below ₹799.`,
  },
};

export default function LegalPages() {
  const [activeTab, setActiveTab] = useState<PolicyKey>('refund');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [policies, setPolicies] = useState<Record<PolicyKey, PolicyData>>(DEFAULT_POLICIES);

  useEffect(() => {
    const fetchLegalSettings = async () => {
      try {
        const res = await api.get('/settings');
        const s = res.data || {};

        const updated = { ...DEFAULT_POLICIES };

        if (s.legal_privacy_policy) {
          try { updated.privacy = { ...updated.privacy, ...JSON.parse(s.legal_privacy_policy) }; } catch {}
        }
        if (s.legal_refund_policy) {
          try { updated.refund = { ...updated.refund, ...JSON.parse(s.legal_refund_policy) }; } catch {}
        }
        if (s.legal_terms_of_service) {
          try { updated.terms = { ...updated.terms, ...JSON.parse(s.legal_terms_of_service) }; } catch {}
        }
        if (s.legal_shipping_policy) {
          try { updated.shipping = { ...updated.shipping, ...JSON.parse(s.legal_shipping_policy) }; } catch {}
        }

        setPolicies(updated);
      } catch (e) {
        setError(apiError(e, 'Failed to load legal pages settings'));
      } finally {
        setLoading(false);
      }
    };
    fetchLegalSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/settings', {
        legal_privacy_policy: JSON.stringify(policies.privacy),
        legal_refund_policy: JSON.stringify(policies.refund),
        legal_terms_of_service: JSON.stringify(policies.terms),
        legal_shipping_policy: JSON.stringify(policies.shipping),
      });
      setSuccess('Legal pages saved successfully!');
    } catch (e) {
      setError(apiError(e, 'Failed to save legal pages'));
    } finally {
      setSaving(false);
    }
  };

  const updateCurrentField = (field: keyof PolicyData, value: string) => {
    setPolicies({
      ...policies,
      [activeTab]: {
        ...policies[activeTab],
        [field]: value,
      },
    });
  };

  const tabs: { key: PolicyKey; label: string; icon: any }[] = [
    { key: 'refund', label: 'Refund & Cancellation', icon: RefreshCw },
    { key: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { key: 'terms', label: 'Terms of Service', icon: FileText },
    { key: 'shipping', label: 'Shipping & Delivery', icon: Truck },
  ];

  const current = policies[activeTab];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Legal Pages</h1>
          <p className="text-sm text-[#666666]">Manage Customer Policy pages (Refund, Privacy, Terms, Shipping) shown in the website footer.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Legal Pages
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-[#d4af37]" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-[#e5e5e5] pb-3">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-colors ${
                  activeTab === key
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-[#f4f4f4] text-[#666666] hover:bg-[#e8e8e8] hover:text-[#111111]'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Page Title</span>
                <input
                  value={current.title}
                  onChange={(e) => updateCurrentField('title', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Last Updated Date</span>
                <input
                  value={current.lastUpdated}
                  onChange={(e) => updateCurrentField('lastUpdated', e.target.value)}
                  placeholder="e.g. 8 September 2026"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Intro / Subtitle</span>
              <input
                value={current.intro}
                onChange={(e) => updateCurrentField('intro', e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Full Policy Content</span>
                <span className="text-[11px] text-[#999999]">Use ## for headings, - for bullet points, or plain paragraphs</span>
              </div>
              <textarea
                value={current.content}
                onChange={(e) => updateCurrentField('content', e.target.value)}
                rows={16}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] p-4 text-sm font-mono leading-relaxed outline-none focus:border-[#d4af37]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
