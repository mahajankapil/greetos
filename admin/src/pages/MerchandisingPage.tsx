import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Star, TrendingUp, ArrowUp, ArrowDown, X, Plus, Search } from 'lucide-react';
import { api, apiError, resolveImage } from '../lib/api';

interface MerchProduct {
  id: string;
  handle: string;
  title: string;
  image: string | null;
  soldOut: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  options: { price: number }[];
}

type ListKey = 'featured' | 'bestSellers';

const LISTS: { key: ListKey; label: string; blurb: string; icon: typeof Star }[] = [
  {
    key: 'featured',
    label: 'Featured',
    blurb: 'The highlighted row near the top of the home page.',
    icon: Star,
  },
  {
    key: 'bestSellers',
    label: 'Bestsellers',
    blurb: 'The "Most Loved" row on the home page.',
    icon: TrendingUp,
  },
];

/**
 * Curate the two merchandising rows on the home page.
 *
 * These used to be guessed at: Featured matched any product whose free-text
 * label happened to contain "featured", and Bestsellers sorted by rating —
 * which is zero for every product until reviews accumulate, so it was really
 * just whichever four came first. Both are now explicit lists the admin owns.
 */
export default function MerchandisingPage() {
  const [all, setAll] = useState<MerchProduct[]>([]);
  const [lists, setLists] = useState<Record<ListKey, string[]>>({ featured: [], bestSellers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ListKey | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<ListKey | null>(null);

  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/merchandising');
      setAll(res.data.all ?? []);
      setLists({
        featured: (res.data.featured ?? []).map((p: MerchProduct) => p.id),
        bestSellers: (res.data.bestSellers ?? []).map((p: MerchProduct) => p.id),
      });
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load merchandising'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (key: ListKey) => {
    setSaving(key);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/merchandising', { list: key, productIds: lists[key] });
      setSuccess(`${key === 'featured' ? 'Featured' : 'Bestsellers'} row saved.`);
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to save'));
    } finally {
      setSaving(null);
    }
  };

  const move = (key: ListKey, index: number, dir: -1 | 1) => {
    const next = [...lists[key]];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLists({ ...lists, [key]: next });
  };

  const remove = (key: ListKey, id: string) =>
    setLists({ ...lists, [key]: lists[key].filter((x) => x !== id) });

  const add = (key: ListKey, id: string) => {
    if (lists[key].includes(id)) return;
    setLists({ ...lists, [key]: [...lists[key], id] });
  };

  const candidates = all.filter(
    (p) => !query.trim() || p.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#d4af37]" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111111]">Featured &amp; Bestsellers</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Choose exactly which pieces appear in each home page row, and in what order.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        {LISTS.map(({ key, label, blurb, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-[#e5e5e5] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[#111111]">
                  <Icon size={18} className="text-[#d4af37]" /> {label}
                </h2>
                <p className="mt-0.5 text-xs text-[#888888]">{blurb}</p>
              </div>
              <button
                onClick={() => save(key)}
                disabled={saving === key}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving === key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {lists[key].length === 0 && (
                <li className="rounded-xl bg-[#faf8f4] p-4 text-center text-xs text-[#888888]">
                  Nothing here yet — this row is hidden on the home page.
                </li>
              )}
              {lists[key].map((id, i) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <li key={id} className="flex items-center gap-3 rounded-xl border border-[#eee8dc] bg-[#fdfbf7] p-2.5">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-[#b9955e]">{i + 1}</span>
                    {p.image && (
                      <img src={resolveImage(p.image)} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2a2a2a]">
                      {p.title}
                      {/* A sold-out piece is filtered out by the storefront, so
                          say so here rather than let it look live. */}
                      {p.soldOut && (
                        <span className="ml-2 rounded bg-[#fff1f1] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#b33131]">
                          Sold out — hidden
                        </span>
                      )}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => move(key, i, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className="rounded-lg p-1.5 text-[#666666] hover:bg-[#f0ece4] disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => move(key, i, 1)}
                        disabled={i === lists[key].length - 1}
                        aria-label="Move down"
                        className="rounded-lg p-1.5 text-[#666666] hover:bg-[#f0ece4] disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => remove(key, id)}
                        aria-label="Remove"
                        className="rounded-lg p-1.5 text-[#b33131] hover:bg-[#fff1f1]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => setPicking(picking === key ? null : key)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#d4af37]"
            >
              <Plus size={14} /> Add a piece
            </button>

            {picking === key && (
              <div className="mt-3 rounded-xl border border-[#e5e5e5] p-3">
                <div className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] px-3 py-2">
                  <Search size={14} className="text-[#999999]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products…"
                    className="w-full text-sm outline-none"
                  />
                </div>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {candidates.map((p) => {
                    const already = lists[key].includes(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => add(key, p.id)}
                          disabled={already}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[#faf8f4] disabled:opacity-40"
                        >
                          {p.image && <img src={resolveImage(p.image)} alt="" className="h-7 w-7 rounded object-cover" />}
                          <span className="min-w-0 flex-1 truncate">{p.title}</span>
                          {already && <span className="text-[10px] font-bold uppercase text-[#999999]">Added</span>}
                        </button>
                      </li>
                    );
                  })}
                  {candidates.length === 0 && (
                    <li className="px-2 py-3 text-center text-xs text-[#888888]">No products match.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-[#888888]">
        Changes apply to the home page as soon as a row is saved. A row with nothing in it is hidden
        rather than shown empty.
      </p>
    </div>
  );
}
