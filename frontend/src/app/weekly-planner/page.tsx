import type { Metadata } from 'next';
import { getProducts, getSettings } from '@/lib/api';
import { adaptProduct } from '@/lib/productAdapter';
import { WeeklyPlanner } from '@/components/WeeklyPlanner';
import { parsePlannerConfig } from '@/lib/weeklyPlan';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Weekly Vegetable Planner | ${SITE.name}`,
  description:
    'Not sure what to cook from Monday to Sunday? Get a weekly vegetable plan with a different group every day and no repeats week to week.',
  alternates: { canonical: '/weekly-planner' },
};

const wrap = { width: 'min(1360px, 100% - 32px)', margin: '0 auto' } as const;

export default async function WeeklyPlannerPage() {
  // Read-only catalogue fetch. When the API is down this is empty and the
  // planner shows its own message rather than the bundled fallback rows, which
  // have no pack options and so cannot be added to a cart.
  const [apiProducts, settings] = await Promise.all([getProducts(), getSettings()]);
  const products = apiProducts.map(adaptProduct);
  // Optional wording and switches from Admin → Weekly Planner.
  const config = parsePlannerConfig(settings.weekly_planner);

  return (
    <div style={{ background: '#fff', color: '#243a29', paddingBottom: 64, fontFamily: 'var(--font-body)' }}>
      <section style={{ background: 'linear-gradient(180deg, #eef7e6 0%, #f8fbf4 100%)', padding: 'clamp(32px, 5vw, 64px) 0' }}>
        <div style={wrap}>
          <p style={{ margin: '0 0 10px', fontFamily: 'var(--font-nav)', fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4f7a2f' }}>
            Shop vegetables
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'clamp(34px, 5.5vw, 60px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-.02em', color: '#1f3318', textWrap: 'balance' }}>
            {config.title?.trim() || 'Weekly Vegetable Planner'}
          </h1>
          <p style={{ margin: '16px 0 0', maxWidth: '62ch', fontSize: 'clamp(16px, 1.5vw, 19px)', lineHeight: 1.65, color: '#3d5233' }}>
            {config.intro?.trim() ||
              'Never wonder what to cook on a Monday again. Get a Monday-to-Sunday plan with a different vegetable group each day, and a fresh mix every week, so the same weekday never repeats what you ate before.'}
          </p>
        </div>
      </section>
      <div style={{ ...wrap, marginTop: 28 }}>
        <WeeklyPlanner products={products} config={config} />
      </div>
    </div>
  );
}
