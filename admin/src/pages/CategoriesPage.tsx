import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, CornerDownRight, EyeOff } from "lucide-react";
import { api, apiError, resolveImage } from "../lib/api";

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

interface FormState {
  id?: string;
  name: string;
  image: string;
  sortOrder: string;
  isActive: boolean;
  parentId: string | null;
}

const emptyForm = (parentId: string | null): FormState => ({
  name: "",
  image: "",
  sortOrder: "0",
  isActive: true,
  parentId,
});

export default function CategoriesPage() {
  const [cats, setCats] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<FlatCategory[]>("/admin/categories");
      setCats(res.data);
      setError("");
    } catch (e) {
      setError(apiError(e, "Failed to load categories"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topLevel = cats.filter((c) => !c.parentId);
  const childrenOf = (id: string) => cats.filter((c) => c.parentId === id);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: editing.name.trim(),
        image: editing.image.trim() || undefined,
        sortOrder: Number(editing.sortOrder) || 0,
        isActive: editing.isActive,
        parentId: editing.parentId,
      };
      if (editing.id) await api.put(`/admin/categories/${editing.id}`, payload);
      else await api.post("/admin/categories", payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError(apiError(e, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: FlatCategory) => {
    const hasChildren = childrenOf(c.id).length > 0;
    const msg = hasChildren
      ? `Delete "${c.name}"? Its subcategories will become top-level.`
      : `Delete "${c.name}"?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      await load();
    } catch (e) {
      setError(apiError(e, "Failed to delete"));
    }
  };

  const openEdit = (c: FlatCategory) =>
    setEditing({
      id: c.id,
      name: c.name,
      image: c.image ?? "",
      sortOrder: String(c.sortOrder),
      isActive: c.isActive,
      parentId: c.parentId,
    });

  const Row = ({ c, depth }: { c: FlatCategory; depth: number }) => (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-3 ${
        !c.isActive ? "opacity-60" : ""
      }`}
      style={{ marginLeft: depth * 28 }}
    >
      {depth > 0 && <CornerDownRight size={15} className="text-[#e5e5e5]" />}
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
        </p>
      </div>
      {depth === 0 && (
        <button
          onClick={() => setEditing(emptyForm(c.id))}
          className="inline-flex items-center gap-1 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#e2eede]"
        >
          <Plus size={13} /> Subcategory
        </button>
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
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Catalog structure</p>
          <h2 className="text-2xl font-black text-[#111111]">Categories</h2>
          <p className="mt-1 text-sm text-[#2a2a2a]">
            Build the category tree. A category can have subcategories and its own products.
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyForm(null))}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#111111] px-5 py-3 text-sm font-bold text-white hover:bg-[#2a2a2a]"
        >
          <Plus size={16} /> Add category
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : topLevel.length === 0 ? (
        <p className="rounded-[24px] border border-[#e5e5e5] bg-white px-6 py-8 text-center text-[#666666]">
          No categories yet. Add your first one.
        </p>
      ) : (
        <div className="space-y-2">
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-2">
              <Row c={c} depth={0} />
              {childrenOf(c.id).map((sub) => (
                <Row key={sub.id} c={sub} depth={1} />
              ))}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-16 w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">
                {editing.id ? "Edit category" : editing.parentId ? "New subcategory" : "New category"}
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
