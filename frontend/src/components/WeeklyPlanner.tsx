'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, RefreshCw, ArrowRight } from 'lucide-react';
import type { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import {
  DAYS,
  GROUPS,
  addDays,
  applyGroupSwitches,
  buildWeekPlan,
  groupProducts,
  ideaFor,
  isValidPlan,
  mondayOf,
  productsPerDay,
  toIso,
  type PlannerConfig,
  type WeekPlan,
} from '@/lib/weeklyPlan';
import styles from './WeeklyPlanner.module.css';

/**
 * Saved in the shopper's browser only (no account, no server). Keeping the
 * previous week's plan is what lets "next Monday is not the same as this
 * Monday" hold across visits.
 */
const STORAGE_KEY = 'oldspice_weekly_plan_v1';

interface Saved {
  /** Monday (YYYY-MM-DD) of the week `plan` is for. */
  weekStart: string;
  /** The week before `plan`; null on a first visit. */
  prev: WeekPlan | null;
  plan: WeekPlan;
}

function readSaved(): Saved | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw.weekStart !== 'string' || !isValidPlan(raw.plan)) return null;
    return { weekStart: raw.weekStart, prev: isValidPlan(raw.prev) ? raw.prev : null, plan: raw.plan };
  } catch {
    return null;
  }
}

const NO_CONFIG: PlannerConfig = {};

export function WeeklyPlanner({ products, config = NO_CONFIG }: { products: Product[]; config?: PlannerConfig }) {
  const { addToCart } = useCart();
  // Admin settings: which groups are on, and how many vegetables a day shows.
  const grouped = useMemo(() => applyGroupSwitches(groupProducts(products), config), [products, config]);
  const perDay = productsPerDay(config);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const hasProducts = Object.keys(grouped).length > 0;

  const [state, setState] = useState<Saved | null>(null);
  const [status, setStatus] = useState('');
  const [todayIso, setTodayIso] = useState('');
  // What was just added ("p:<id>" or "d:<day>"), so its button can say "Added".
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // The plan is random, so it is built after mount — building it during render
  // would differ between the server's HTML and the browser's.
  useEffect(() => {
    if (!hasProducts) return;
    const monday = mondayOf(new Date());
    setTodayIso(toIso(new Date()));
    const saved = readSaved();
    // A saved plan that uses a group the admin has since switched off is stale.
    const usable = (plan: WeekPlan) => plan.every((d) => d.group in grouped);
    if (saved && saved.weekStart === monday && usable(saved.plan)) {
      setState(saved);
    } else if (saved && saved.weekStart <= monday) {
      // A new week has begun (or the plan went stale): plan against the week they just had.
      const prev = saved.weekStart === monday ? saved.prev : saved.plan;
      setState({ weekStart: monday, prev, plan: buildWeekPlan(grouped, prev, Math.random, perDay) });
    } else {
      setState({ weekStart: monday, prev: null, plan: buildWeekPlan(grouped, null, Math.random, perDay) });
    }
  }, [grouped, hasProducts, perDay]);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode or full storage: the plan still works for this visit */
    }
  }, [state]);

  const refresh = useCallback(() => {
    setState((s) => (s ? { ...s, plan: buildWeekPlan(grouped, s.prev, Math.random, perDay) } : s));
    setStatus('Plan refreshed.');
  }, [grouped, perDay]);

  if (!hasProducts) {
    return (
      <div className={styles.empty}>
        <h2>The planner needs our vegetable list</h2>
        <p>We could not load the vegetables right now. Please try again in a moment, or browse the shop directly.</p>
        <Link href="/collections/all" className={styles.primaryBtn}>Shop vegetables</Link>
      </div>
    );
  }

  if (!state) {
    return <div className={styles.loading} role="status">Planning your week…</div>;
  }

  const { plan, weekStart } = state;

  const productsFor = (day: number): Product[] =>
    plan[day].productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);

  const flash = (key: string) => {
    setJustAdded(key);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(null), 1800);
  };

  const addProducts = (list: Product[], label: string, key: string) => {
    let added = 0;
    for (const p of list) {
      const option = p.options?.[0];
      if (!option) continue;
      addToCart(p, option, 1, { openDrawer: false });
      added++;
    }
    if (added) flash(key);
    setStatus(added ? `${label}: ${added} item${added === 1 ? '' : 's'} added to your cart.` : `Nothing to add for ${label}.`);
  };

  const dateOf = (i: number) => {
    const [y, m, d] = addDays(weekStart, i).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.ghostBtn} onClick={refresh}>
          <RefreshCw size={18} aria-hidden="true" /> Refresh plan
        </button>
      </div>

      <div className={styles.days}>
        {DAYS.map((name, i) => {
          const g = GROUPS[plan[i].group];
          const list = productsFor(i);
          const isToday = addDays(weekStart, i) === todayIso;
          const date = dateOf(i);
          return (
            <article
              key={name}
              id={`day-card-${i}`}
              className={`${styles.day} ${isToday ? styles.today : ''}`}
              aria-labelledby={`day-${i}`}
            >
              <header className={styles.dayHead} style={{ background: `linear-gradient(160deg, ${g.bg} 0%, #fff 160%)`, color: g.ink }}>
                <div className={styles.dayTop}>
                  <span className={styles.dayDate}>
                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  {isToday && <span className={styles.todayBadge}>Today</span>}
                </div>
                <h2 id={`day-${i}`} className={styles.dayName}>{name}</h2>
                <p className={styles.group}>{g.label}</p>
                <p className={styles.idea}>{ideaFor(plan[i].group, config)}</p>
                <div className={styles.dayActions}>
                  <button
                    type="button"
                    className={styles.dayAll}
                    style={{ background: g.ink }}
                    onClick={() => addProducts(list, name, `d:${i}`)}
                  >
                    {justAdded === `d:${i}` ? <><Check size={16} aria-hidden="true" /> Added</> : `Add ${name}’s vegetables`}
                  </button>
                  <Link href={`/collections/${g.slug}`} className={styles.more} style={{ color: g.ink }}>
                    See all <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </header>

              <ul className={styles.tiles}>
                {list.map((p) => (
                  <li key={p.id} className={styles.tile}>
                    <Link href={`/products/${p.slug}`} className={styles.photo} tabIndex={-1} aria-hidden="true">
                      <img src={p.primaryImage} alt="" loading="lazy" />
                    </Link>
                    <Link href={`/products/${p.slug}`} className={styles.tileName}>{p.title}</Link>
                    <div className={styles.tileFoot}>
                      <span className={styles.tilePrice}>{p.price}</span>
                      <button
                        type="button"
                        className={`${styles.addBtn} ${justAdded === `p:${p.id}` ? styles.addBtnDone : ''}`}
                        aria-label={`Add ${p.title} to cart`}
                        onClick={() => addProducts([p], p.title, `p:${p.id}`)}
                      >
                        {justAdded === `p:${p.id}` ? <Check size={18} aria-hidden="true" /> : 'Add'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p className={styles.sr} role="status" aria-live="polite">{status}</p>
    </div>
  );
}
