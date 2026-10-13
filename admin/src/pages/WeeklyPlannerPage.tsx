import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { api, apiError } from '../lib/api';

/**
 * Admin → Weekly Planner.
 *
 * The planner page on the storefront builds each weekday from the products in
 * Products / Categories, so adding a vegetable there is all it takes for it to
 * appear. This page only holds the extras: page wording, how many vegetables a
 * day shows, and per-group on/off and cooking-idea text.
 *
 * Saved as one JSON string under the `weekly_planner` setting. Nothing else in
 * the settings table is read or written here.
 */

type GroupKey = 'leafy' | 'root' | 'beans' | 'gourds' | 'other';

const GROUPS: { key: GroupKey; label: string; hint: string; idea: string }[] = [
  { key: 'leafy', label: 'Leafy Greens', hint: 'Categories with "leaf" in the name', idea: 'Dal palak, methi paratha, saag or a light stir-fry' },
  { key: 'root', label: 'Root Vegetables', hint: 'Categories with "root" in the name', idea: 'Carrot–beetroot salad, aloo sabzi, soups or a roast' },
  { key: 'beans', label: 'Beans & Peas', hint: 'Categories with "bean" or "pea" in the name', idea: 'Usal, french beans stir-fry, matar pulao or sprouts' },
  { key: 'gourds', label: 'Gourds & Squash', hint: 'Categories with "gourd" or "squash" in the name', idea: 'Lauki sabzi, dodka bhaji, pumpkin curry or karela fry' },
  { key: 'other', label: 'Everyday Vegetables', hint: 'Every other vegetable category', idea: 'Baingan bharta, cabbage sabzi, tomato curry or cauliflower fry' },
];

interface Config {
  title: string;
  intro: string;
  productsPerDay: number;
  groups: Record<GroupKey, { enabled: boolean; idea: string }>;
}

const DEFAULT_TITLE = 'Weekly Vegetable Planner';
const DEFAULT_INTRO =
  'Never wonder what to cook on a Monday again. Get a Monday-to-Sunday plan with a different vegetable group each day, and a fresh mix every week, so the same weekday never repeats what you ate before.';

function emptyConfig(): Config {
  return {
    title: '',
    intro: '',
    productsPerDay: 3,
    groups: Object.fromEntries(GROUPS.map((g) => [g.key, { enabled: true, idea: '' }])) as Config['groups'],
  };
}

export default function WeeklyPlannerPage() {
  const [config, setConfig] = useState<Config>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/settings');
        const raw = res.data?.weekly_planner;
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            const base = emptyConfig();
            setConfig({
              title: saved.title ?? '',
              intro: saved.intro ?? '',
              productsPerDay: Number(saved.productsPerDay) || 3,
              groups: Object.fromEntries(
                GROUPS.map((g) => [
                  g.key,
                  {
                    enabled: saved.groups?.[g.key]?.enabled !== false,
                    idea: saved.groups?.[g.key]?.idea ?? base.groups[g.key].idea,
                  },
                ]),
              ) as Config['groups'],
            });
          } catch {
            /* malformed setting — keep the defaults */
          }
        }
      } catch (e) {
        setError(apiError(e, 'Failed to load settings'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setGroup = (key: GroupKey, patch: Partial<Config['groups'][GroupKey]>) =>
    setConfig((c) => ({ ...c, groups: { ...c.groups, [key]: { ...c.groups[key], ...patch } } }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    if (Object.values(config.groups).every((g) => !g.enabled)) {
      setError('Keep at least one vegetable group switched on.');
      setSaving(false);
      return;
    }
    try {
      // Only this one key is sent, so no other setting is touched.
      await api.put('/admin/settings', {
        weekly_planner: JSON.stringify({
          title: config.title.trim(),
          intro: config.intro.trim(),
          productsPerDay: Math.min(6, Math.max(1, Math.round(config.productsPerDay) || 3)),
          groups: config.groups,
        }),
      });
      setSuccess('Weekly planner settings saved. The storefront page updates right away.');
    } catch (e) {
      setError(apiError(e, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const field =
    'mt-1 w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#111111] outline-none focus:border-[#2d6033]';
  const label = 'text-xs font-semibold uppercase tracking-wide text-[#666666]';

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#666666]">Storefront</p>
        <h2 className="text-2xl font-black text-[#111111]">Weekly Planner</h2>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-[#b33131]">{error}</p>}
      {success && <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{success}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[#2a2a2a]">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="max-w-4xl rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-black text-[#111111]">Which vegetables appear</h3>
            <p className="text-sm text-[#666666]">
              You do not add vegetables here. The planner uses your products: add or edit a vegetable under{' '}
              <strong>Products</strong>, give it a category, keep it in stock with a price, and it appears in the plan on its own.
              Combos and baskets are left out. The category name decides the group (see the hints below).
            </p>
          </div>

          <div className="max-w-4xl rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-[#111111]">Page text</h3>
            <div className="space-y-4">
              <label className="block">
                <span className={label}>Title</span>
                <input className={field} value={config.title} placeholder={DEFAULT_TITLE} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Intro text</span>
                <textarea className={field} rows={3} value={config.intro} placeholder={DEFAULT_INTRO} onChange={(e) => setConfig({ ...config, intro: e.target.value })} />
              </label>
              <label className="block max-w-[220px]">
                <span className={label}>Vegetables shown per day (1–6)</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  className={field}
                  value={config.productsPerDay}
                  onChange={(e) => setConfig({ ...config, productsPerDay: Number(e.target.value) })}
                />
              </label>
              <p className="text-xs text-[#666666]">Leave the title and intro empty to use the standard wording.</p>
            </div>
          </div>

          <div className="max-w-4xl rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-black text-[#111111]">Vegetable groups</h3>
            <p className="mb-4 text-xs text-[#666666]">
              Switch a group off to leave it out of the weekly plan, and write the cooking idea shoppers see on its days.
            </p>
            <div className="space-y-5">
              {GROUPS.map((g) => (
                <div key={g.key} className="rounded-2xl border border-[#eeeeee] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#111111]">{g.label}</p>
                      <p className="text-xs text-[#666666]">{g.hint}</p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#2a2a2a]">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#2d6033]"
                        checked={config.groups[g.key].enabled}
                        onChange={(e) => setGroup(g.key, { enabled: e.target.checked })}
                      />
                      Show in plan
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className={label}>Cooking idea</span>
                    <input className={field} value={config.groups[g.key].idea} placeholder={g.idea} onChange={(e) => setGroup(g.key, { idea: e.target.value })} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save changes
          </button>
        </div>
      )}
    </div>
  );
}
