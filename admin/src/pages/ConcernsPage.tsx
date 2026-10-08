import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, EyeOff } from "lucide-react";
import { api, apiError, resolveImage } from "../lib/api";

/**
 * Concerns are shopper-facing groupings (here "Leafy Greens", "Root
 * Vegetables", …). Flat by design: unlike categories they do not nest, because a
 * concern cuts across the catalogue rather than dividing it.
 *
 * Products are attached to a concern from the product editor, not here, so
 * this page is deliberately just the list itself.
 */
interface ConcernRow {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

interface FormState {
  id?: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  subtitle: "",
  description: "",
  image: "",
  sortOrder: "0",
  isActive: true,
});

export default function ConcernsPage() {
  const [rows, setRows] = useState<ConcernRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ConcernRow[]>("/admin/concerns");
      setRows(res.data);
      setError("");
    } catch (e) {
      setError(apiError(e, "Failed to load concerns"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: editing.name.trim(),
        subtitle: editing.subtitle.trim() || null,
        description: editing.description.trim() || null,
        image: editing.image.trim() || null,
        sortOrder: Number(editing.sortOrder) || 0,
        isActive: editing.isActive,
      };
      if (editing.id) await api.put(`/admin/concerns/${editing.id}`, payload);
      else await api.post("/admin/concerns", payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError(apiError(e, "Failed to save concern"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: ConcernRow) => {
    // The storefront links /collections/<slug>, so deleting a concern breaks
    // whatever already points at it. Say so rather than just asking twice.
    const msg =
      c.productCount > 0
        ? `Delete "${c.name}"? ${c.productCount} product${c.productCount === 1 ? "" : "s"} will lose this tag, and any link to /collections/${c.slug} will stop working. The products themselves are not deleted.`
        : `Delete "${c.name}"? Any link to /collections/${c.slug} will stop working.`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/admin/concerns/${c.id}`);
      await load();
    } catch (e) {
      setError(apiError(e, "Failed to delete"));
    }
  };

  const openEdit = (c: ConcernRow) =>
    setEditing({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle ?? "",
      description: c.description ?? "",
      image: c.image ?? "",
      sortOrder: String(c.sortOrder),
      isActive: c.isActive,
    });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Catalog structure</p>
          <h2 className="text-2xl font-black text-[#111111]">Concerns</h2>
          <p className="mt-1 text-sm text-[#2a2a2a]">
            What customers are trying to fix. These fill the storefront&rsquo;s &ldquo;Shop By Concern&rdquo; grid.
            Tag products from the product editor.
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyForm())}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a]"
        >
          <Plus size={16} /> Add concern
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">
          No concerns yet. Add your first one.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-3 ${
                !c.isActive ? "opacity-60" : ""
              }`}
            >
              {c.image ? (
                <img src={resolveImage(c.image)} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-[#f5f5f5]" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-[#111111]">
                  {c.name}
                  {!c.isActive && <EyeOff size={13} className="ml-2 inline text-[#8a8471]" />}
                </p>
                <p className="text-xs text-[#666666]">
                  /{c.slug} · {c.productCount} product{c.productCount === 1 ? "" : "s"}
                  {c.subtitle ? ` · ${c.subtitle}` : ""}
                </p>
              </div>
              {/* A concern with nothing behind it sends shoppers to an empty
                  page, so it is called out here rather than discovered live. */}
              {c.productCount === 0 && c.isActive && (
                <span className="rounded-lg bg-[#fff7e6] px-2 py-1 text-[11px] font-semibold text-[#8a6d1f]">
                  No products
                </span>
              )}
              <button
                onClick={() => openEdit(c)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#111111] hover:bg-[#e5e5e5]"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => remove(c)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1f1] text-[#b33131] hover:bg-[#fee3e3]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-16 w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">
                {editing.id ? "Edit concern" : "New concern"}
              </h3>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1 text-[#666666] hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Name</span>
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
                {editing.id && (
                  <span className="mt-1 block text-[11px] text-[#999999]">
                    Renaming does not change the URL, so existing links keep working.
                  </span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Subtitle (optional)</span>
                <input
                  value={editing.subtitle}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  placeholder="Strengthen roots, regrow density"
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
                <span className="mt-1 block text-[11px] text-[#999999]">Shown under the tile on the storefront.</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Description (optional)</span>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Image URL (optional)</span>
                <input
                  value={editing.image}
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Sort order</span>
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#d4af37]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#2a2a2a]">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Active (visible on the storefront)
              </label>
            </div>

            {error && <p className="mt-3 text-sm font-semibold text-[#b33131]">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-[#2a2a2a] hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !editing.name.trim()}
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
