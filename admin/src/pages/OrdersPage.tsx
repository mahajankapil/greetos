import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, ChevronDown, Truck, PackageCheck, Undo2, Banknote, FileText } from 'lucide-react';
import { api, apiError } from '../lib/api';
import type { Order } from '../types';

function statusPillClass(status: string): string {
  if (status === 'Cancelled') return 'bg-[#fff1f1] text-[#b33131]';
  if (status === 'Delivered') return 'bg-[#eaf3ed] text-[#127748]';
  return 'bg-[#f5f5f5] text-[#2c6b30]';
}

// Must stay in sync with STEP_TITLES in api/src/utils/order.ts — the API rebuilds
// the customer's tracking timeline from this exact string.
const STATUSES = ['Order Placed', 'In Review', 'In Process', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** Draft courier/docket per order, keyed by order id. */
  const [dispatchDraft, setDispatchDraft] = useState<Record<string, { courierName: string; trackingNumber: string; trackingUrl: string }>>({});
  const [invoicing, setInvoicing] = useState<string | null>(null);
  const [invoicedIds, setInvoicedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Order[]>('/admin/orders');
      setOrders(res.data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const draftFor = (o: Order) =>
    dispatchDraft[o.id] ?? {
      courierName: o.courierName ?? '',
      trackingNumber: o.trackingNumber ?? '',
      trackingUrl: o.trackingUrl ?? '',
    };

  const setDraft = (id: string, patch: Partial<{ courierName: string; trackingNumber: string; trackingUrl: string }>) =>
    setDispatchDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { courierName: '', trackingNumber: '', trackingUrl: '' }), ...patch },
    }));

  /** Saves the courier + docket the packer typed in. This is all of fulfilment. */
  const saveDispatch = async (o: Order) => {
    const draft = draftFor(o);
    setSaving(o.id);
    setNote(null);
    try {
      const res = await api.put<Order>(`/admin/orders/${o.id}/dispatch`, {
        courierName: draft.courierName.trim(),
        trackingNumber: draft.trackingNumber.trim() || null,
        trackingUrl: draft.trackingUrl.trim() || null,
      });
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...res.data } : x)));
      setNote(`${o.orderNo} marked dispatched with ${draft.courierName.trim()}.`);
    } catch (e) {
      setNote(apiError(e, 'Could not save the dispatch details'));
    } finally {
      setSaving(null);
    }
  };

  /** Undo — for a docket entered against the wrong order. */
  const clearDispatch = async (o: Order) => {
    if (!confirm(`Clear the dispatch record for ${o.orderNo}? The customer will see it as not yet shipped.`)) return;
    setSaving(o.id);
    try {
      const res = await api.delete<Order>(`/admin/orders/${o.id}/dispatch`);
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...res.data } : x)));
      setDispatchDraft((prev) => ({ ...prev, [o.id]: { courierName: '', trackingNumber: '', trackingUrl: '' } }));
      setNote(`Dispatch record cleared for ${o.orderNo}.`);
    } catch (e) {
      setNote(apiError(e, 'Could not clear the dispatch record'));
    } finally {
      setSaving(null);
    }
  };

  /**
   * Generate-or-open: the API is idempotent (a second call returns the
   * existing invoice), so one button serves both states safely.
   */
  const generateInvoice = async (id: string) => {
    setInvoicing(id);
    try {
      await api.post(`/admin/orders/${id}/invoice`);
      setInvoicedIds((prev) => new Set(prev).add(id));
      navigate(`/orders/${id}/invoice`);
    } catch (e) {
      setNote(apiError(e, 'Could not generate the invoice'));
    } finally {
      setInvoicing(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await api.patch<Order>(`/admin/orders/${id}`, { status });
      // Merge the full response, not just `status` — a COD order moved to
      // Delivered also flips `paymentStatus` server-side (cash collected),
      // and the list should reflect that immediately rather than on reload.
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...res.data } : o)));
    } catch (e) {
      setError(apiError(e, 'Failed to update status'));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Fulfilment</p>
        <h2 className="text-2xl font-black text-[#111111]">Orders</h2>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#f5f7f3] px-4 py-3 text-sm text-[#3c4a35]">
        <Truck size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-bold">Dispatch is manual.</strong> Pack the order, hand it to a courier,
          then record the courier and docket number below — that is what the customer sees when they track it.
        </span>
      </div>

      {note && (
        <p className="mb-4 rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm font-semibold text-[#2a2a2a]">{note}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">
          No orders yet.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const open = expandedId === o.id;
            const itemCount = o.items.reduce((n, it) => n + it.quantity, 0);
            return (
              <div key={o.id} className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white">
                {/* Collapsed header — click to expand (stays on the page) */}
                <button
                  onClick={() => setExpandedId(open ? null : o.id)}
                  className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-[#f5f5f5]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-[#666666]">{o.orderNo}</p>
                    <p className="font-bold text-[#111111]">{o.customer}</p>
                    <p className="text-sm text-[#2a2a2a]">
                      {o.phone ? `📞 ${o.phone} · ` : ''}₹{o.total} · {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {o.paymentMethod === 'cod' && (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#fdf8e9] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7a6a2e]">
                      <Banknote size={11} /> COD
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusPillClass(
                      o.status,
                    )}`}
                  >
                    {o.status}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded — full delivery address, items, and status control */}
                {open && (
                  <div className="border-t border-[#e5e5e5] p-5 pt-4">
                    {o.addressLine1 ? (
                      <div className="flex items-start gap-2 rounded-2xl bg-[#fbfcf8] p-3 text-sm text-[#2a2a2a]">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-[#666666]" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#666666]">Deliver to</p>
                          <p className="mt-0.5 font-semibold text-[#111111]">
                            {o.customer}
                            {o.phone ? ` · 📞 ${o.phone}` : ''}
                          </p>
                          {o.email && <p className="text-xs">{o.email}</p>}
                          <p className="mt-1">
                            {o.addressLine1}
                            {o.addressLine2 ? `, ${o.addressLine2}` : ''}
                          </p>
                          {o.landmark && <p>Near {o.landmark}</p>}
                          <p>
                            {o.city}, {o.state} - {o.pincode}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-[#fbfcf8] p-3 text-sm text-[#666666]">
                        No delivery address on this order.
                      </p>
                    )}

                    {/* The pack list — what fulfilment actually puts in the box. */}
                    <div className="mt-3 space-y-3 border-t border-[#e5e5e5] pt-3 text-sm text-[#2a2a2a]">
                      {o.items.map((it) => {
                        return (
                          <div key={it.id} className="flex justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#111111]">
                                {it.productTitle}
                                {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                              </p>
                              <p className="text-xs text-[#666666]">{it.optionName}</p>
                            </div>
                            <span className="shrink-0">₹{it.price * it.quantity}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-[#666666]">Update status</span>
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="rounded-2xl border border-[#e5e5e5] px-4 py-2 text-sm font-semibold text-[#111111] outline-none focus:border-[#d4af37]"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {o.paymentMethod === 'cod' && (
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#7a6a2e]">
                          <Banknote size={13} />
                          Payment: Cash on Delivery — {o.paymentStatus === 'paid' ? 'Collected' : 'Pending'}
                        </p>
                      )}

                      {/* Generate Invoice Pill Button */}
                      <div className="pt-1">
                        <button
                          onClick={() => generateInvoice(o.id)}
                          disabled={invoicing === o.id}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-white px-4 py-1.5 text-xs font-bold text-gray-900 hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
                        >
                          {invoicing === o.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileText size={14} />
                          )}
                          <span>{invoicedIds.has(o.id) ? 'View Invoice' : 'Generate Invoice'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#e5e5e5] pt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#666666]">Fulfilment</p>

                      {o.dispatchedAt && (
                        <div className="mt-2 rounded-2xl bg-[#f3f7f1] p-3 text-sm text-[#2a2a2a]">
                          <p className="flex flex-wrap items-center gap-2 font-semibold text-[#111111]">
                            <PackageCheck size={14} /> Dispatched {new Date(o.dispatchedAt).toLocaleString()}
                          </p>
                          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                            <dt className="text-[#666666]">Courier</dt>
                            <dd>{o.courierName || '—'}</dd>
                            <dt className="text-[#666666]">Docket</dt>
                            <dd className="font-mono">{o.trackingNumber || '—'}</dd>
                          </dl>
                        </div>
                      )}

                      {/* The same form serves the first entry and a later
                          correction, so a mistyped docket is fixed in place
                          rather than by deleting anything. */}
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <input
                          value={draftFor(o).courierName}
                          onChange={(e) => setDraft(o.id, { courierName: e.target.value })}
                          placeholder="Courier (e.g. Delhivery)"
                          className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                        />
                        <input
                          value={draftFor(o).trackingNumber}
                          onChange={(e) => setDraft(o.id, { trackingNumber: e.target.value })}
                          placeholder="Docket / AWB number"
                          className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                        />
                        <input
                          value={draftFor(o).trackingUrl}
                          onChange={(e) => setDraft(o.id, { trackingUrl: e.target.value })}
                          placeholder="Tracking link (optional)"
                          className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => saveDispatch(o)}
                          disabled={saving === o.id || !draftFor(o).courierName.trim() || !o.pincode}
                          title={o.pincode ? undefined : 'This order has no delivery address'}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-50"
                        >
                          {saving === o.id ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                          {o.dispatchedAt ? 'Update dispatch details' : 'Mark as dispatched'}
                        </button>
                        {o.dispatchedAt && (
                          <button
                            onClick={() => clearDispatch(o)}
                            disabled={saving === o.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-bold text-[#b33131] hover:border-[#b33131] disabled:opacity-50"
                          >
                            <Undo2 size={13} /> Clear
                          </button>
                        )}
                        {!o.pincode && <span className="text-xs text-[#666666]">No delivery address on this order.</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
