import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { api, apiError, resolveImage } from '../lib/api';
import type { Product, ProductOption } from '../types';

interface FlatCat {
  id: string;
  name: string;
  parentId: string | null;
}

/** Concerns are flat — no parent, so no tree to walk. */
interface ConcernRow {
  id: string;
  name: string;
  slug: string;
}

interface FormState {
  id?: string;
  title: string;
  categoryIds: string[];
  usp: string;
  description: string;
  image: string;
  secondaryImage: string;
  images: string[];
  labels: string;
  rating: string;
  reviewsCount: string;
  unitsSold: string;
  soldOut: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  // ── Product spec ───────────────────────────────────────────
  // Held as strings because they come straight from form inputs; blanks are
  // normalised to null by the API rather than saved as "".
  // keyIngredients/benefits are comma-separated in the box and split on save,
  // the same way labels already work — one input idiom, not two.
  isCombo: boolean;
  concernIds: string[];
  form: string;
  netQuantity: string;
  keyIngredients: string;
  benefits: string;
  howToUse: string;
  suitableFor: string;
  shelfLifeMonths: string;
  storage: string;
  countryOfOrigin: string;
  manufacturedBy: string;
  marketedBy: string;
  productCategoryBarId: string | null;
  options: ProductOption[];
}

const emptyForm: FormState = {
  title: '',
  categoryIds: [],
  usp: '',
  description: '',
  image: '',
  secondaryImage: '',
  images: [],
  labels: '',
  rating: '4.8',
  reviewsCount: '773',
  unitsSold: '1766+',
  soldOut: false,
  isFeatured: false,
  isBestSeller: false,
  isCombo: false,
  concernIds: [],
  form: '',
  netQuantity: '',
  keyIngredients: '',
  benefits: '',
  howToUse: '',
  suitableFor: '',
  shelfLifeMonths: '',
  storage: '',
  manufacturedBy: '',
  marketedBy: '',
  // Required on Indian e-commerce listings, and true for every product here,
  // so it is prefilled rather than left for the admin to remember.
  countryOfOrigin: 'India',
  productCategoryBarId: null,
  options: [{ name: '', price: 0 }],
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<FlatCat[]>([]);
  const [concerns, setConcerns] = useState<ConcernRow[]>([]);
  const [categoryBars, setCategoryBars] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Product[]>('/products');
      setProducts(res.data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get<FlatCat[]>('/admin/categories').then((r) => setCats(r.data)).catch(() => {});
    api.get('/admin/product-category-bars').then((r) => setCategoryBars(r.data)).catch(() => {});
    api.get<ConcernRow[]>('/admin/concerns').then((r) => setConcerns(r.data)).catch(() => {});
  }, []);

  const toggleConcern = (id: string) =>
    setEditing((f) =>
      f
        ? { ...f, concernIds: f.concernIds.includes(id) ? f.concernIds.filter((x) => x !== id) : [...f.concernIds, id] }
        : f,
    );

  const toggleCat = (id: string) =>
    setEditing((f) =>
      f
        ? { ...f, categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id] }
        : f,
    );

  const openNew = () => setEditing({ ...emptyForm, options: [{ name: '', price: 0 }] });

  const openEdit = (p: Product) =>
    setEditing({
      id: p.id,
      title: p.title,
      categoryIds: p.categories?.map((c) => c.id) ?? [],
      usp: p.usp,
      description: p.description,
      image: p.image,
      secondaryImage: p.secondaryImage,
      images: p.images || [],
      labels: p.labels.join(', '),
      rating: p.rating != null ? String(p.rating) : '4.8',
      reviewsCount: p.reviewsCount != null ? String(p.reviewsCount) : '773',
      unitsSold: p.unitsSold || '1766+',
      soldOut: !!p.soldOut,
      isFeatured: !!p.isFeatured,
      isBestSeller: !!p.isBestSeller,
      isCombo: !!p.isCombo,
      concernIds: (p.concerns ?? []).map((c) => c.id),
      form: p.form ?? '',
      netQuantity: p.netQuantity ?? '',
      keyIngredients: (p.keyIngredients ?? []).join(', '),
      benefits: (p.benefits ?? []).join(', '),
      howToUse: p.howToUse ?? '',
      suitableFor: p.suitableFor ?? '',
      shelfLifeMonths: p.shelfLifeMonths != null ? String(p.shelfLifeMonths) : '',
      storage: p.storage ?? '',
      countryOfOrigin: p.countryOfOrigin ?? '',
      manufacturedBy: p.manufacturedBy ?? '',
      marketedBy: p.marketedBy ?? '',
      productCategoryBarId: (p as any).productCategoryBarId ?? null,
      options: p.options.length ? p.options : [{ name: '', price: 0 }],
    });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: editing.title.trim(),
        categoryIds: editing.categoryIds,
        usp: editing.usp,
        description: editing.description,
        image: editing.image,
        secondaryImage: editing.secondaryImage,
        images: editing.images.filter((img) => img.trim() !== ''),
        labels: editing.labels
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        rating: clampRating(editing.rating),
        reviewsCount: editing.reviewsCount.trim() === '' ? 0 : Number(editing.reviewsCount),
        unitsSold: editing.unitsSold.trim(),
        soldOut: editing.soldOut,
        isFeatured: editing.isFeatured,
        isBestSeller: editing.isBestSeller,
        isCombo: editing.isCombo,
        concernIds: editing.concernIds,
        form: editing.form,
        netQuantity: editing.netQuantity,
        keyIngredients: editing.keyIngredients
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        benefits: editing.benefits
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        howToUse: editing.howToUse,
        suitableFor: editing.suitableFor,
        // An empty box means "not specified", not zero.
        shelfLifeMonths: editing.shelfLifeMonths.trim() === '' ? null : Number(editing.shelfLifeMonths),
        storage: editing.storage,
        countryOfOrigin: editing.countryOfOrigin,
        manufacturedBy: editing.manufacturedBy,
        marketedBy: editing.marketedBy,
        productCategoryBarId: editing.productCategoryBarId,
        options: editing.options
          .filter((o) => o.name.trim())
          .map((o) => ({
            name: o.name.trim(),
            sku: o.sku?.trim() || undefined,
            stock: Number(o.stock) || 0,
            price: Number(o.price) || 0,
            memberPrice: o.memberPrice ? Number(o.memberPrice) : undefined,
            comparePrice: o.comparePrice ? Number(o.comparePrice) : undefined,
          })),
      };
      if (editing.id) await api.put(`/admin/products/${editing.id}`, payload);
      else await api.post('/admin/products', payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      await load();
    } catch (e) {
      setError(apiError(e, 'Failed to delete'));
    }
  };

  const setOpt = (i: number, patch: Partial<ProductOption>) =>
    setEditing((f) =>
      f ? { ...f, options: f.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) } : f,
    );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Catalog</p>
          <h2 className="text-2xl font-black text-[#111111]">Products</h2>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a]"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f5] text-left text-[#666666]">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">From</th>
                <th className="px-5 py-3 font-semibold">Options</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[#e5e5e5]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.image && <img src={resolveImage(p.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                      <span className="font-semibold text-[#111111]">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#2a2a2a]">{p.category}</td>
                  <td className="px-5 py-3 text-[#2a2a2a]">₹{p.options[0]?.price ?? '—'}</td>
                  <td className="px-5 py-3 text-[#2a2a2a]">{p.options.length}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#111111] hover:bg-[#e5e5e5]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1f1] text-[#b33131] hover:bg-[#fee3e3]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#666666]">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-[24px] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">{editing.id ? 'Edit product' : 'New product'}</h3>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1 text-[#666666] hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
              <Field label="USP" value={editing.usp} onChange={(v) => setEditing({ ...editing, usp: v })} />
              <Field
                label="Labels (comma-separated)"
                value={editing.labels}
                onChange={(v) => setEditing({ ...editing, labels: v })}
                hint="Shown as badges on the product card, e.g. New In, Bestseller."
              />
            </div>

            {/* Rating and review count used to be typed in here. They are now
                calculated from approved customer reviews, so anything entered
                would be overwritten by the next moderation action — and until
                then the storefront would show a score nobody gave. */}
            <p className="mt-2 rounded-xl bg-[#faf8f4] px-4 py-2.5 text-xs text-[#666666]">
              Rating and review count are calculated automatically from approved reviews.
              Manage them under <strong>Reviews</strong>.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Images</span>
                <button
                  onClick={() => setEditing({ ...editing, images: [...editing.images, ''] })}
                  className="text-xs font-bold text-[#d4af37]"
                >
                  + Add image
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Main Image URL" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
                  <Field label="Secondary Image URL" value={editing.secondaryImage} onChange={(v) => setEditing({ ...editing, secondaryImage: v })} />
                </div>
                {editing.images.map((img, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      placeholder="Additional image URL"
                      value={img}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          images: editing.images.map((url, idx) => (idx === i ? e.target.value : url)),
                        })
                      }
                      className="flex-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                    />
                    <button
                      onClick={() => setEditing({ ...editing, images: editing.images.filter((_, idx) => idx !== i) })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f1] text-[#b33131]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Categories</span>
              <div className="mt-2 max-h-44 overflow-y-auto rounded-2xl border border-[#e5e5e5] p-3">
                {cats.filter((c) => !c.parentId).map((top) => (
                  <div key={top.id}>
                    <label className="flex items-center gap-2 py-1 text-sm font-semibold text-[#111111]">
                      <input
                        type="checkbox"
                        checked={editing.categoryIds.includes(top.id)}
                        onChange={() => toggleCat(top.id)}
                      />
                      {top.name}
                    </label>
                    {cats.filter((c) => c.parentId === top.id).map((sub) => (
                      <label key={sub.id} className="ml-6 flex items-center gap-2 py-1 text-sm text-[#2a2a2a]">
                        <input
                          type="checkbox"
                          checked={editing.categoryIds.includes(sub.id)}
                          onChange={() => toggleCat(sub.id)}
                        />
                        {sub.name}
                      </label>
                    ))}
                  </div>
                ))}
                {cats.length === 0 && (
                  <p className="text-sm text-[#666666]">No categories yet — create some in the Categories tab.</p>
                )}
              </div>
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Home Filter Category</span>
              <select
                value={editing.productCategoryBarId || ''}
                onChange={(e) => setEditing({ ...editing, productCategoryBarId: e.target.value || null })}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="">None</option>
                {categoryBars.map((bar) => (
                  <option key={bar.id} value={bar.id}>
                    {bar.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Description</span>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-[#2a2a2a]">
                <input type="checkbox" checked={editing.soldOut} onChange={(e) => setEditing({ ...editing, soldOut: e.target.checked })} />
                Sold out
              </label>
              {/* Membership only. The ORDER of each row is set on the
                  Featured & Bestsellers page; a piece added here lands at the
                  end of its row. */}
              <label className="flex items-center gap-2 text-sm text-[#2a2a2a]">
                <input type="checkbox" checked={editing.isFeatured} onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })} />
                Featured on home page
              </label>
              <label className="flex items-center gap-2 text-sm text-[#2a2a2a]">
                <input type="checkbox" checked={editing.isBestSeller} onChange={(e) => setEditing({ ...editing, isBestSeller: e.target.checked })} />
                Bestseller
              </label>
            </div>


            {/* ── Concerns ─────────────────────────────────────
                What this product is FOR. Drives the storefront's "Shop By
                Concern" grid, which is a separate axis from Categories: a
                product sits in one category but can answer several concerns. */}
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Concerns</span>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-[#e5e5e5] p-3">
                <div className="grid gap-1 sm:grid-cols-2">
                  {concerns.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm text-[#2a2a2a]">
                      <input
                        type="checkbox"
                        checked={editing.concernIds.includes(c.id)}
                        onChange={() => toggleConcern(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                {concerns.length === 0 && (
                  <p className="text-sm text-[#666666]">No concerns yet — create some in the Concerns tab.</p>
                )}
              </div>
            </div>

            {/* ── The PDP sections, in the order they appear on the page ──
                The product page renders Benefits, Ingredients, How to use and
                Product details as four separate blocks. The editor is grouped
                the same way on purpose: whoever fills this in can see which
                box becomes which section, instead of typing into one long
                spec form and hoping. Every field is optional and the PDP hides
                an empty section, so a sparse listing still looks deliberate. */}
            <div className="mt-5 rounded-2xl border border-[#e6ecdf] bg-[#fafcf7] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4d7a1f]">Benefits</span>
                <span className="text-[11px] text-[#999999]">Chips under the price, and the first accordion</span>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-[#2a2a2a]">
                <input type="checkbox" checked={editing.isCombo} onChange={(e) => setEditing({ ...editing, isCombo: e.target.checked })} />
                This is a combo / kit
              </label>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Benefit chips</span>
                <input
                  value={editing.benefits}
                  onChange={(e) => setEditing({ ...editing, benefits: e.target.value })}
                  placeholder="Rich in iron, Farm fresh, Chemical-free"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
                <span className="mt-1 block text-[11px] text-[#999999]">
                  Comma separated. Short claims — three or four work best.
                </span>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-[#fee2e2] bg-[#fff5f5] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#dc2626]">★ Rating &amp; Badge Section</span>
                <span className="text-[11px] text-[#999999]">Shown in badge: ★ {editing.rating || '4.8'} | {editing.reviewsCount || '773'} ratings | {editing.unitsSold || '1766+'} Units Sold</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field
                  label="Rating"
                  value={editing.rating}
                  onChange={(v) => setEditing({ ...editing, rating: limitRatingInput(v) })}
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  hint="0 to 5, e.g. 4.8"
                />
                <Field
                  label="Ratings count"
                  value={editing.reviewsCount}
                  onChange={(v) => setEditing({ ...editing, reviewsCount: v })}
                  type="number"
                  hint="e.g. 773"
                />
                <Field
                  label="Units sold"
                  value={editing.unitsSold}
                  onChange={(v) => setEditing({ ...editing, unitsSold: v })}
                  hint="e.g. 1766+ or 1766+ Units Sold"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e6ecdf] bg-[#fafcf7] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4d7a1f]">Ingredients</span>
                <span className="text-[11px] text-[#999999]">Second accordion on the product page</span>
              </div>
              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Key ingredients</span>
                <input
                  value={editing.keyIngredients}
                  onChange={(e) => setEditing({ ...editing, keyIngredients: e.target.value })}
                  placeholder="Fresh spinach leaves"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
                <span className="mt-1 block text-[11px] text-[#999999]">
                  Comma separated. These are the hero ingredients, not the full INCI list — the page tells the
                  customer to check the pack for that.
                </span>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e6ecdf] bg-[#fafcf7] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4d7a1f]">How to use</span>
                <span className="text-[11px] text-[#999999]">Third accordion on the product page</span>
              </div>
              <label className="mt-3 block">
                <textarea
                  value={editing.howToUse}
                  onChange={(e) => setEditing({ ...editing, howToUse: e.target.value })}
                  rows={3}
                  placeholder="Wash thoroughly before cooking. Keep refrigerated."
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Suitable for</span>
                <input
                  value={editing.suitableFor}
                  onChange={(e) => setEditing({ ...editing, suitableFor: e.target.value })}
                  placeholder="Daily cooking, soups & salads"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>

            {/* The regulatory block. Net quantity, country of origin and the
                grower/seller details are required on an Indian
                e-commerce food listing, which is why they are grouped and
                labelled rather than mixed in with marketing copy. */}
            <div className="mt-4 rounded-2xl border border-[#eee8dc] bg-[#fdfbf7] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6d1f]">Product details</span>
                <span className="text-[11px] text-[#999999]">Last accordion — the pack &amp; compliance facts</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Picker
                  label="Form"
                  value={editing.form}
                  onChange={(v) => setEditing({ ...editing, form: v })}
                  options={['Whole', 'Bunch', 'Leaves', 'Pods', 'Cut', 'Pack', 'Basket']}
                />
                <Field
                  label="Net quantity"
                  value={editing.netQuantity}
                  onChange={(v) => setEditing({ ...editing, netQuantity: v })}
                  hint="As sold, e.g. 250 g — legally required"
                />
                <Field
                  label="Shelf life (months)"
                  value={editing.shelfLifeMonths}
                  onChange={(v) => setEditing({ ...editing, shelfLifeMonths: v })}
                  type="number"
                  hint="Leave blank for fresh produce"
                />
                <Field
                  label="Country of origin"
                  value={editing.countryOfOrigin}
                  onChange={(v) => setEditing({ ...editing, countryOfOrigin: v })}
                  hint="Legally required on Indian listings"
                />
                <Field
                  label="Grown by"
                  value={editing.manufacturedBy}
                  onChange={(v) => setEditing({ ...editing, manufacturedBy: v })}
                  hint="Name and address, legally required"
                />
                <Field
                  label="Sold by"
                  value={editing.marketedBy}
                  onChange={(v) => setEditing({ ...editing, marketedBy: v })}
                  hint="Leave blank if same as manufacturer"
                />
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Storage</span>
                <textarea
                  value={editing.storage}
                  onChange={(e) => setEditing({ ...editing, storage: e.target.value })}
                  rows={2}
                  placeholder="Store in a cool, dry place away from direct sunlight."
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
                  Options <span className="normal-case text-[#666666]">— Sell = price paid · MRP = struck-through original · Stock 0 = sold out</span>
                </span>
                <button
                  onClick={() => setEditing({ ...editing, options: [...editing.options, { name: '', price: 0, stock: 0 }] })}
                  className="text-xs font-bold text-[#d4af37]"
                >
                  + Add option
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {editing.options.map((o, i) => (
                  <div key={i} className="grid grid-cols-[1fr_110px_80px_80px_70px_32px] items-center gap-2">
                    <input
                      placeholder="Name (e.g. 250 g)"
                      value={o.name}
                      onChange={(e) => setOpt(i, { name: e.target.value })}
                      className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                    <input
                      placeholder="SKU"
                      title="Stock-keeping unit for this exact variant"
                      value={o.sku ?? ''}
                      onChange={(e) => setOpt(i, { sku: e.target.value })}
                      className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                    <input
                      placeholder="Sell ₹"
                      title="Selling price (what the customer pays)"
                      type="number"
                      value={o.price}
                      onChange={(e) => setOpt(i, { price: Number(e.target.value) })}
                      className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                    <input
                      placeholder="MRP ₹"
                      title="Original price — shown struck-through if higher than the selling price"
                      type="number"
                      value={o.comparePrice ?? ''}
                      onChange={(e) => setOpt(i, { comparePrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#d4af37]"
                    />
                    <input
                      placeholder="Stock"
                      title="Units on hand for this variant. 0 shows it as sold out."
                      type="number"
                      min={0}
                      value={o.stock ?? 0}
                      onChange={(e) => setOpt(i, { stock: Number(e.target.value) })}
                      className={`rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#d4af37] ${
                        Number(o.stock ?? 0) === 0 ? 'border-[#f0c9c9] bg-[#fff8f8] text-[#b33131]' : 'border-[#e5e5e5]'
                      }`}
                    />
                    <button
                      onClick={() => setEditing({ ...editing, options: editing.options.filter((_, idx) => idx !== i) })}
                      className="inline-flex h-9 w-8 items-center justify-center rounded-lg bg-[#fff1f1] text-[#b33131]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-semibold text-[#b33131]">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-[#2a2a2a] hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Highest rating a product can have. */
const MAX_RATING = 5;

/** Typed rating → a number in 0–5 with one decimal. Empty or invalid is 0. */
function clampRating(raw: string): number {
  const n = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(n)) return 0;
  return Math.round(Math.min(MAX_RATING, Math.max(0, n)) * 10) / 10;
}

/** Keeps the box from ever holding a rating above 5 (or below 0) while typing. */
function limitRatingInput(raw: string): string {
  const n = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(n)) return raw;
  if (n > MAX_RATING) return String(MAX_RATING);
  if (n < 0) return '0';
  return raw;
}

function Field({
  label,
  value,
  onChange,
  type,
  step,
  min,
  max,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">{label}</span>
      <input
        value={value}
        type={type}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
      />
      {hint && <span className="mt-1 block text-[11px] text-[#999999]">{hint}</span>}
    </label>
  );
}

/**
 * A suggestion list that still accepts free text.
 *
 * A hard <select> would be wrong here: the common answers should be one click
 * away, but a catalogue will always grow a format nobody anticipated, and the
 * admin must not have to ask a developer to add it.
 */
function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const listId = `opt-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">{label}</span>
      <input
        value={value}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Choose or type your own"
        className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}
