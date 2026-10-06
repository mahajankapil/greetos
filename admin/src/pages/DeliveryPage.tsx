import { useEffect, useState } from 'react';
import { Loader2, Save, Truck } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { INDIAN_STATES } from '../data/indianStates';

/**
 * Delivery charges (client requirement Q16).
 *
 * The policy is: one rate inside the home state, a higher one everywhere
 * else, and a total above which both are waived. They are stored in the
 * Setting table and read back by BOTH the storefront (to show the customer
 * what they will pay) and the order routes (to decide what they are actually
 * charged) — so changing them here changes both, and they can never drift.
 */
export default function DeliveryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [homeState, setHomeState] = useState('Maharashtra');
  const [localRate, setLocalRate] = useState('90');
  const [otherRate, setOtherRate] = useState('200');
  const [freeAbove, setFreeAbove] = useState('0');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/settings');
        const s = res.data || {};
        // Fall back to the old single flat rate for a store configured before
        // rates were split by state, so nothing changes until this is saved.
        const legacy = s.shipping_flat_rate;
        setHomeState(String(s.shipping_home_state ?? 'Maharashtra'));
        setLocalRate(String(s.shipping_local_rate ?? legacy ?? '90'));
        setOtherRate(String(s.shipping_other_rate ?? legacy ?? '200'));
        setFreeAbove(String(s.shipping_free_above ?? '0'));
      } catch (e) {
        setError(apiError(e, 'Failed to load delivery settings'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const local = Number(localRate);
  const other = Number(otherRate);
  const threshold = Number(freeAbove);
  // A negative charge would pay customers to order; a non-numeric one would
  // be discarded by the server and silently leave the old value in place.
  const bad = (n: number) => !Number.isFinite(n) || n < 0;
  const invalid = bad(local) || bad(other) || bad(threshold) || homeState.trim() === '';

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/settings', {
        shipping_home_state: homeState.trim(),
        shipping_local_rate: String(Math.round(local)),
        shipping_other_rate: String(Math.round(other)),
        shipping_free_above: String(Math.round(threshold)),
      });
      setSuccess('Delivery settings saved.');
    } catch (e) {
      setError(apiError(e, 'Failed to save delivery settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#d4af37]" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="text-[#d4af37]" size={22} />
        <h1 className="text-2xl font-black text-[#111111]">Delivery Charges</h1>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}

      <div className="space-y-5 rounded-lg border border-[#e5e5e5] bg-white p-6">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wide text-[#111111]">
            Home state
          </label>
          <select
            value={homeState}
            onChange={(e) => setHomeState(e.target.value)}
            className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          >
            {INDIAN_STATES.map((st: string) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#888888]">
            Orders delivered here pay the local rate. Everywhere else pays the other-state rate.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-[#111111]">
              Within {homeState || 'home state'} (₹)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={localRate}
              onChange={(e) => setLocalRate(e.target.value)}
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-[#111111]">
              All other states (₹)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={otherRate}
              onChange={(e) => setOtherRate(e.target.value)}
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wide text-[#111111]">
            Free delivery above (₹)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={freeAbove}
            onChange={(e) => setFreeAbove(e.target.value)}
            className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
          />
          <p className="text-xs text-[#888888]">
            Orders at or above this amount ship free, to any state. Set to <strong>0</strong> to
            always charge a rate. The order total is compared <em>after</em> any coupon discount.
          </p>
        </div>

        <div className="rounded-md bg-[#faf8f4] p-4 text-xs text-[#555555]">
          <p className="mb-1 font-bold uppercase tracking-wide text-[#111111]">What customers will see</p>
          <p>
            <strong>{homeState || 'Home state'}:</strong>{' '}
            {local <= 0 ? 'free delivery' : '\u20b9' + Math.round(local) + ' delivery'}
          </p>
          <p>
            <strong>Every other state:</strong>{' '}
            {other <= 0 ? 'free delivery' : '\u20b9' + Math.round(other) + ' delivery'}
          </p>
          <p className="mt-1">
            {threshold > 0
              ? 'Both are waived on orders of \u20b9' + Math.round(threshold) + ' or more.'
              : 'No free-delivery threshold \u2014 a rate applies to every order.'}
          </p>
        </div>

        {invalid && (
          <p className="text-xs font-bold text-red-600">
            Pick a home state, and give both rates as zero or a positive number.
          </p>
        )}

        <button
          onClick={save}
          disabled={saving || invalid}
          className="flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#cccccc]"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save
        </button>
      </div>
    </div>
  );
}
