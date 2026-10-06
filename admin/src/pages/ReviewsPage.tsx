import { useCallback, useEffect, useState } from 'react';
import { Loader2, Star, Check, EyeOff, Trash2, BadgeCheck, Home, ImagePlus } from 'lucide-react';
import { api, apiError } from '../lib/api';

interface AdminReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  approved: boolean;
  verified: boolean;
  imageUrl: string | null;
  showOnHome: boolean;
  createdAt: string;
  product: { id: string; handle: string; title: string; image: string | null };
  user: { email: string | null } | null;
}

type Filter = 'pending' | 'approved' | 'all';

/**
 * Review moderation (client requirement Q15).
 *
 * A customer submits, this page approves, and only then does the review show
 * on the storefront. Approving or hiding one also rebuilds that product's
 * average rating server-side, so the stars on the product grid always reflect
 * exactly the set of reviews that are publicly visible.
 */
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pending, setPending] = useState(0);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/reviews', {
        params: filter === 'all' ? {} : { status: filter },
      });
      setReviews(res.data.reviews ?? []);
      setPending(res.data.pending ?? 0);
    } catch (e) {
      setError(apiError(e, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Partial update: only the fields passed are written. */
  const patch = async (id: string, data: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await api.put(`/admin/reviews/${id}`, data);
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to update review'));
    } finally {
      setBusyId(null);
    }
  };

  const setApproved = async (id: string, approved: boolean) => {
    setBusyId(id);
    try {
      await api.put(`/admin/reviews/${id}`, { approved });
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to update review'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    // Deleting is not the same as hiding: hiding is reversible, this is not.
    if (!window.confirm('Delete this review permanently? Use Hide instead if you may want it back.')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/reviews/${id}`);
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to delete review'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-[#111111]">
          Reviews
          {pending > 0 && (
            <span className="ml-3 rounded-full bg-[#d4af37] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              {pending} awaiting approval
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#e5e5e5] bg-white text-[#111111] hover:border-[#999999]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#d4af37]" size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <p className="rounded-lg border border-[#e5e5e5] bg-white p-8 text-center text-sm text-[#888888]">
          {filter === 'pending' ? 'Nothing waiting for approval.' : 'No reviews here yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-[#e5e5e5] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={14}
                          strokeWidth={1.5}
                          className={i <= r.rating ? 'fill-[#d4af37] text-[#d4af37]' : 'text-[#d9d9d9]'}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-bold text-[#111111]">{r.authorName}</span>
                    {r.verified && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#2c6b30]">
                        <BadgeCheck size={12} /> Verified purchase
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        r.approved ? 'bg-[#e8f5e9] text-[#2c6b30]' : 'bg-[#fff8e6] text-[#8a6d1f]'
                      }`}
                    >
                      {r.approved ? 'Live' : 'Pending'}
                    </span>
                    {r.showOnHome && (
                      <span className="rounded-full bg-[#fdf3e3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8a6d1f]">
                        On home page
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#888888]">
                    on <strong className="text-[#111111]">{r.product.title}</strong>
                    {r.user?.email ? ` · ${r.user.email}` : ''} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>

                  {r.title && <p className="text-sm font-bold text-[#111111]">{r.title}</p>}
                  {r.body && <p className="text-sm leading-relaxed text-[#555555]">{r.body}</p>}

                  {/* Customer photo. Shown on the review card, and it is what
                      makes the home page carousel look like the reference. */}
                  <div className="flex items-center gap-2 pt-1">
                    <ImagePlus size={14} className="shrink-0 text-[#999999]" />
                    <input
                      defaultValue={r.imageUrl ?? ''}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next !== (r.imageUrl ?? '')) patch(r.id, { imageUrl: next || null });
                      }}
                      placeholder="Photo URL, e.g. /reviews/model.webp"
                      className="w-full max-w-md rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-xs outline-none focus:border-[#d4af37]"
                    />
                    {r.imageUrl && (
                      <img src={r.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                    )}
                  </div>

                  {/* Approving publishes a review on its product page; the home
                      page is a separate, deliberate choice. */}
                  <label
                    className={`flex w-fit items-center gap-2 pt-1 text-xs font-semibold ${
                      r.approved ? 'text-[#2a2a2a]' : 'text-[#aaaaaa]'
                    }`}
                    title={r.approved ? '' : 'Approve the review first'}
                  >
                    <input
                      type="checkbox"
                      checked={r.showOnHome}
                      disabled={!r.approved || busyId === r.id}
                      onChange={(e) => patch(r.id, { showOnHome: e.target.checked })}
                    />
                    <Home size={13} /> Show in home page carousel
                  </label>
                </div>

                <div className="flex shrink-0 gap-2">
                  {r.approved ? (
                    <button
                      onClick={() => setApproved(r.id, false)}
                      disabled={busyId === r.id}
                      title="Hide from the storefront"
                      className="flex items-center gap-1.5 rounded-md border border-[#e5e5e5] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#111111] hover:border-[#999999] disabled:opacity-50"
                    >
                      <EyeOff size={14} /> Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => setApproved(r.id, true)}
                      disabled={busyId === r.id}
                      className="flex items-center gap-1.5 rounded-md bg-[#2c6b30] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#245827] disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    title="Delete permanently"
                    className="flex items-center gap-1.5 rounded-md border border-[#e5e5e5] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:border-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
