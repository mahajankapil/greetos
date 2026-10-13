import type { Product } from '@/data/products';

/**
 * Weekly vegetable planner logic — pure functions, no React, so the rules can
 * be tested on their own.
 *
 * The rules a plan follows:
 *   1. Every weekday gets one vegetable group, so "what do I cook on Monday?"
 *      has an answer.
 *   2. The same weekday never repeats the group it had in the reference week
 *      (last week, or this week when planning next week): leafy on Monday this
 *      week means something else next Monday.
 *   3. No group on two days in a row, and no group more than ceil(7 / groups)
 *      times a week.
 *   4. Leafy greens are cooked early in the week (Mon–Thu): they wilt first.
 *   5. Within a day, suggested vegetables avoid the ones suggested for the same
 *      group in the reference week.
 * If a catalogue has too few groups to satisfy every rule, the rules are
 * dropped in the order above's reverse (adjacency last) so a plan always exists.
 */

export type GroupKey = 'leafy' | 'root' | 'beans' | 'gourds' | 'other';

export interface GroupInfo {
  key: GroupKey;
  label: string;
  /** One word, for tight spaces such as the week strip. */
  short: string;
  /** Matches the collection page, so a day can link to the full range. */
  slug: string;
  idea: string;
  /** Tint and ink colours for the day card. */
  bg: string;
  ink: string;
}

export const GROUPS: Record<GroupKey, GroupInfo> = {
  leafy: { key: 'leafy', label: 'Leafy Greens', short: 'Leafy', slug: 'leafy-greens', idea: 'Dal palak, methi paratha, saag or a light stir-fry', bg: '#e4f3d6', ink: '#2f6b1a' },
  root: { key: 'root', label: 'Root Vegetables', short: 'Roots', slug: 'root-vegetables', idea: 'Carrot–beetroot salad, aloo sabzi, soups or a roast', bg: '#fdebd9', ink: '#a85a14' },
  beans: { key: 'beans', label: 'Beans & Peas', short: 'Beans', slug: 'beans-peas', idea: 'Usal, french beans stir-fry, matar pulao or sprouts', bg: '#f3f2cf', ink: '#6f6a0e' },
  gourds: { key: 'gourds', label: 'Gourds & Squash', short: 'Gourds', slug: 'gourds-squash', idea: 'Lauki sabzi, dodka bhaji, pumpkin curry or karela fry', bg: '#d9f0ea', ink: '#1c6b5c' },
  other: { key: 'other', label: 'Everyday Vegetables', short: 'Everyday', slug: 'other-vegetables', idea: 'Baingan bharta, cabbage sabzi, tomato curry or cauliflower fry', bg: '#fbe3df', ink: '#a8382c' },
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Leafy greens must land on a day with index below this (Mon–Thu). */
const LEAFY_LAST_DAY = 3;
export const DEFAULT_PRODUCTS_PER_DAY = 3;

export interface DayPlan {
  group: GroupKey;
  productIds: string[];
}

export type WeekPlan = DayPlan[];

/** Which group a product belongs to, or null when it should not be planned (combos and baskets). */
export function groupOf(product: Product): GroupKey | null {
  const slug = (product.category || '').toLowerCase();
  if (product.isCombo || slug.includes('combo') || slug.includes('basket')) return null;
  if (slug.includes('leaf')) return 'leafy';
  if (slug.includes('root')) return 'root';
  if (slug.includes('bean') || slug.includes('pea')) return 'beans';
  if (slug.includes('gourd') || slug.includes('squash')) return 'gourds';
  return 'other';
}

/** Buyable, in-stock vegetables grouped for planning. Groups with nothing to sell are absent. */
export function groupProducts(products: Product[]): Partial<Record<GroupKey, Product[]>> {
  const out: Partial<Record<GroupKey, Product[]>> = {};
  for (const p of products) {
    const key = groupOf(p);
    // No pack option means the cart cannot add it; out of stock means a shopper cannot buy it.
    if (!key || !p.inStock || !p.options?.[0]) continue;
    (out[key] ||= []).push(p);
  }
  return out;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One group per weekday. `ref` is the reference week's groups (same weekday
 * must differ). Tries the full rule set first and relaxes only when that is
 * impossible for the number of groups on offer.
 */
export function buildGroupPlan(
  groups: GroupKey[],
  ref: (GroupKey | null)[] | null,
  rand: () => number = Math.random,
): GroupKey[] {
  const n = groups.length;
  if (n === 0) return [];
  const cap = Math.ceil(7 / n);

  // Each level drops one more rule than the last.
  for (let level = 0; level <= 4; level++) {
    const useCoverage = level <= 2;
    const usePerishable = level === 0 && n >= 3;
    const useRef = level <= 1;
    const useCap = level <= 2;
    const useAdjacent = level <= 3;

    const plan: GroupKey[] = [];
    const counts = new Map<GroupKey, number>();

    const place = (day: number): boolean => {
      if (day === 7) return !useCoverage || counts.size === n;
      for (const g of shuffle(groups, rand)) {
        if (useAdjacent && plan[day - 1] === g) continue;
        if (useRef && ref?.[day] === g) continue;
        if (usePerishable && g === 'leafy' && day > LEAFY_LAST_DAY) continue;
        if (useCap && (counts.get(g) ?? 0) >= cap) continue;
        plan[day] = g;
        counts.set(g, (counts.get(g) ?? 0) + 1);
        if (place(day + 1)) return true;
        counts.set(g, counts.get(g)! - 1);
        if (counts.get(g) === 0) counts.delete(g);
        plan.length = day;
      }
      return false;
    };

    if (place(0)) return plan;
  }
  // Unreachable: level 4 has no rules left. Kept so the return type is honest.
  return Array.from({ length: 7 }, (_, i) => groups[i % n]);
}

/**
 * A full week: groups for each day plus the specific vegetables to suggest.
 * `refPlan` is the reference week; vegetables it used are passed over while
 * the group still has others to offer.
 */
export function buildWeekPlan(
  grouped: Partial<Record<GroupKey, Product[]>>,
  refPlan: WeekPlan | null,
  rand: () => number = Math.random,
  perDay: number = DEFAULT_PRODUCTS_PER_DAY,
): WeekPlan {
  const available = (Object.keys(grouped) as GroupKey[]).filter((k) => (grouped[k]?.length ?? 0) > 0);
  const groupPlan = buildGroupPlan(available, refPlan ? refPlan.map((d) => d.group) : null, rand);

  const refIds = new Set(refPlan?.flatMap((d) => d.productIds) ?? []);
  const usedThisWeek = new Set<string>();

  return groupPlan.map((group) => {
    const pool = shuffle(grouped[group] ?? [], rand);
    // Not suggested last week and not already on another day this week come first.
    const rank = (p: Product) => (usedThisWeek.has(p.id) ? 2 : 0) + (refIds.has(p.id) ? 1 : 0);
    const picked = pool.sort((a, b) => rank(a) - rank(b)).slice(0, perDay);
    picked.forEach((p) => usedThisWeek.add(p.id));
    return { group, productIds: picked.map((p) => p.id) };
  });
}

/** True when a saved plan is still usable against today's catalogue. */
export function isValidPlan(plan: unknown): plan is WeekPlan {
  return (
    Array.isArray(plan) &&
    plan.length === 7 &&
    plan.every(
      (d) =>
        d &&
        typeof d.group === 'string' &&
        d.group in GROUPS &&
        Array.isArray(d.productIds) &&
        d.productIds.every((id: unknown) => typeof id === 'string'),
    )
  );
}

/** Monday of the week containing `date`, as YYYY-MM-DD in local time. */
export function mondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
}

export function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}

/**
 * What the admin can change on the planner page. Saved as JSON under the
 * `weekly_planner` setting; every field is optional so an empty or missing
 * setting simply means "use the defaults".
 */
export interface PlannerConfig {
  title?: string;
  intro?: string;
  productsPerDay?: number;
  groups?: Partial<Record<GroupKey, { enabled?: boolean; idea?: string }>>;
}

/** Reads the raw setting string; anything malformed falls back to the defaults. */
export function parsePlannerConfig(raw: string | undefined): PlannerConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PlannerConfig) : {};
  } catch {
    return {};
  }
}

export function productsPerDay(config: PlannerConfig): number {
  const n = Math.round(Number(config.productsPerDay));
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : DEFAULT_PRODUCTS_PER_DAY;
}

/** The cooking idea for a group: the admin's wording when set, else the built-in one. */
export function ideaFor(group: GroupKey, config: PlannerConfig): string {
  return config.groups?.[group]?.idea?.trim() || GROUPS[group].idea;
}

/**
 * Drops groups the admin turned off. If that would leave nothing to plan with,
 * the switch is ignored rather than showing an empty page.
 */
export function applyGroupSwitches(
  grouped: Partial<Record<GroupKey, Product[]>>,
  config: PlannerConfig,
): Partial<Record<GroupKey, Product[]>> {
  const out: Partial<Record<GroupKey, Product[]>> = {};
  for (const key of Object.keys(grouped) as GroupKey[]) {
    if (config.groups?.[key]?.enabled !== false) out[key] = grouped[key];
  }
  return Object.keys(out).length > 0 ? out : grouped;
}
