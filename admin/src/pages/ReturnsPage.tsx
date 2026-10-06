import React, { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { Loader2, CheckCircle2, XCircle, Search, Eye, PackageCheck } from 'lucide-react';

interface ReturnRequest {
  id: string;
  orderId: string;
  type: string;
  reason: string;
  imageUrl: string | null;
  status: string;
  adminComments: string | null;
  pickupTime: string | null;
  createdAt: string;
  // Reverse pickup, arranged by hand once the return is accepted.
  returnCourierName: string | null;
  returnTrackingNumber: string | null;
  pickedUpAt: string | null;
  order: {
    orderNo: string;
    customer: string;
    total: number;
    pincode?: string | null;
    items: any[];
  };
}

export default function ReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedReq, setSelectedReq] = useState<ReturnRequest | null>(null);
  const [actionStatus, setActionStatus] = useState<'Accepted' | 'Declined' | 'Pending'>('Accepted');
  const [adminComments, setAdminComments] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [pickupCourier, setPickupCourier] = useState('');
  const [pickupDocket, setPickupDocket] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get<ReturnRequest[]>('/admin/returns');
      setRequests(res.data);
    } catch (err) {
      setError('Failed to load return requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    
    setProcessing(true);
    try {
      await api.put(`/admin/returns/${selectedReq.id}`, {
        status: actionStatus,
        adminComments: adminComments.trim() || undefined,
        pickupTime: actionStatus === 'Accepted' && pickupTime.trim() ? pickupTime.trim() : undefined,
      });
      setSelectedReq(null);
      fetchRequests();
    } catch (err) {
      alert('Failed to update request');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Records the collection you arranged by hand. There is no courier booking
   * API — this is a note of what was actually organised.
   */
  const savePickup = async () => {
    if (!selectedReq) return;
    setBooking(true);
    try {
      const res = await api.put<ReturnRequest>(`/admin/returns/${selectedReq.id}/pickup`, {
        returnCourierName: pickupCourier.trim(),
        returnTrackingNumber: pickupDocket.trim() || null,
      });
      setSelectedReq((prev) => (prev ? { ...prev, ...res.data } : prev));
      setNotice({ kind: 'ok', text: `Pickup recorded with ${pickupCourier.trim()}.` });
      fetchRequests();
    } catch (err) {
      setNotice({ kind: 'warn', text: apiError(err, 'Could not record the pickup') });
    } finally {
      setBooking(false);
    }
  };

  const openModal = (req: ReturnRequest) => {
    setSelectedReq(req);
    setActionStatus(req.status === 'Pending' ? 'Accepted' : req.status as any);
    setAdminComments(req.adminComments || '');
    setPickupTime(req.pickupTime || '');
    setNotice(null);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-black uppercase tracking-tight text-[#111111]">
        Issue Claims
      </h1>
      <p className="mb-6 text-sm text-[#666666]">
        Customer-reported problems with delivered orders. There is no change-of-mind return flow —
        accept a claim to book the reverse pickup.
      </p>

      {error && <div className="text-red-500 font-bold mb-4">{error}</div>}

      <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5e5] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f9f9f9] text-[#666666] font-bold uppercase text-[10px] tracking-wider border-b border-[#e5e5e5]">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Order No</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Pickup</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-[#fafafa] transition-colors">
                <td className="px-6 py-4 text-[#666666]">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-bold text-[#111111]">
                  {req.order.orderNo}
                </td>
                <td className="px-6 py-4 text-[#666666]">{req.order.customer}</td>
                <td className="px-6 py-4 font-bold text-[#d4af37]">{req.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide
                    ${req.status === 'Accepted' ? 'bg-[#f5f5f5] text-[#111111]' : 
                      req.status === 'Declined' ? 'bg-red-100 text-red-700' : 
                      'bg-gray-100 text-gray-700'}`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {req.pickedUpAt ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2c6b30]">
                      <PackageCheck size={13} />
                      {req.returnTrackingNumber ? `Docket ${req.returnTrackingNumber}` : 'Collected'}
                    </span>
                  ) : req.status === 'Accepted' ? (
                    <span className="text-xs font-semibold text-[#b0862a]">Not arranged</span>
                  ) : (
                    <span className="text-xs text-[#aaaaaa]">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openModal(req)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] px-4 py-2 text-xs font-bold text-[#111111] hover:bg-[#e5e5e5]"
                  >
                    <Eye size={14} /> Review
                  </button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-[#666666]">
                  No return or refund requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
          <div className="my-8 w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-black text-[#111111] uppercase tracking-tight mb-2">Review Request</h3>

            {notice && (
              <p
                className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                  notice.kind === 'ok' ? 'bg-[#eefbef] text-[#2c6b30]' : 'bg-[#fdf8e9] text-[#7a6a2e]'
                }`}
              >
                {notice.text}
              </p>
            )}

            <div className="mb-6 space-y-3 text-sm text-[#666666]">
              <p><strong>Order:</strong> #{selectedReq.order.orderNo}</p>
              <p><strong>Customer:</strong> {selectedReq.order.customer}</p>
              <p><strong>Type:</strong> <span className="font-bold text-[#d4af37]">{selectedReq.type}</span></p>
              <div className="bg-[#f9f9f9] p-4 rounded-xl border border-[#e5e5e5]">
                <p className="font-bold mb-1 text-[#111111]">Reason:</p>
                <p>{selectedReq.reason}</p>
              </div>
              
              {selectedReq.imageUrl && (
                <div className="mt-4">
                  <p className="font-bold mb-2 text-[#111111]">Attached Image:</p>
                  <a href={`http://localhost:5000${selectedReq.imageUrl}`} target="_blank" rel="noreferrer">
                    <img src={`http://localhost:5000${selectedReq.imageUrl}`} alt="Defect" className="max-h-48 rounded-xl border border-[#e5e5e5] object-contain bg-gray-50" />
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#666666] tracking-wider">Update Status</span>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm font-semibold text-[#111111] outline-none focus:border-[#111111]"
                >
                  <option value="Accepted">Accept claim</option>
                  <option value="Declined">Decline claim</option>
                  <option value="Pending">Keep Pending</option>
                </select>
              </label>

              {actionStatus === 'Accepted' && (
                <label className="block">
                  <span className="text-xs font-bold uppercase text-[#666666] tracking-wider">Assign Pickup Time</span>
                  <input
                    type="text"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    placeholder="e.g. Tomorrow between 2 PM - 4 PM"
                    className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#111111]"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#666666] tracking-wider">Admin Comments (Reason if declined)</span>
                <textarea
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  placeholder="Explain why it was declined or add notes..."
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-3 text-sm outline-none focus:border-[#111111]"
                  rows={3}
                />
              </label>

              {/* Reverse pickup — only once the return has actually been approved. */}
              <div className="rounded-2xl border border-[#e5e5e5] bg-[#fbfcf8] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#666666]">Reverse pickup</p>

                {selectedReq.pickedUpAt ? (
                  <div className="mt-2 text-sm text-[#2a2a2a]">
                    <p className="flex items-center gap-2 font-semibold text-[#111111]">
                      <PackageCheck size={14} /> Collection arranged
                    </p>
                    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                      <dt className="text-[#666666]">Courier</dt>
                      <dd>{selectedReq.returnCourierName || '—'}</dd>
                      <dt className="text-[#666666]">Docket</dt>
                      <dd className="font-mono">{selectedReq.returnTrackingNumber || '—'}</dd>
                      <dt className="text-[#666666]">Recorded</dt>
                      <dd>{new Date(selectedReq.pickedUpAt).toLocaleString()}</dd>
                    </dl>
                  </div>
                ) : selectedReq.status !== 'Accepted' ? (
                  <p className="mt-1.5 text-xs text-[#666666]">
                    Accept this {selectedReq.type.toLowerCase()} and save first — then you can record the collection.
                  </p>
                ) : (
                  <div className="mt-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={pickupCourier}
                        onChange={(e) => setPickupCourier(e.target.value)}
                        placeholder="Courier collecting"
                        className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                      />
                      <input
                        value={pickupDocket}
                        onChange={(e) => setPickupDocket(e.target.value)}
                        placeholder="Docket number (optional)"
                        className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={savePickup}
                      disabled={booking || !pickupCourier.trim()}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-50"
                    >
                      {booking ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                      Record Collection
                    </button>
                    <p className="mt-2 text-xs text-[#666666]">
                      Arrange the pickup from {selectedReq.order.customer} yourself, then note it here.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="rounded-full px-6 py-3 text-sm font-bold text-[#666666] hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-50"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
