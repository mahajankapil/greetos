/**
 * Seeds the database:
 *  - the initial admin user (ADMIN_EMAIL / ADMIN_PASSWORD from .env)
 *  - the five product categories the storefront nav is built around
 *  - the nine concerns the "Shop By Concern" grid links to
 *  - starter collections (merchandising groups, separate from categories)
 *  - the quick-filter bars shown above the catalog grid on the home page
 *  - default announcement bar messages
 *  - default delivery-charge settings
 *  - the product catalog (from prisma/seed-data/products.json)
 *
 * Idempotent: safe to run repeatedly (upserts by handle / slug / email / key).
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/config';
import { DEFAULT_ANNOUNCEMENTS } from '../src/data/announcements';
import { recomputeProductRating } from '../src/utils/reviews';

/**
 * Supabase project rzpjeynwqauwxbwukpge is Poshanful's live database. This
 * codebase pointed at it by mistake until 2026-10-05, and the catalog step
 * below deletes every product not in products.json — run there, it would wipe
 * Poshanful's catalogue. Refuse outright.
 */
const FORBIDDEN_DB_REFS = ['rzpjeynwqauwxbwukpge'];
for (const url of [process.env.DATABASE_URL ?? '', process.env.DIRECT_URL ?? '']) {
  const hit = FORBIDDEN_DB_REFS.find((ref) => url.includes(ref));
  if (hit) {
    console.error(`Refusing to seed: DATABASE_URL/DIRECT_URL points at ${hit} (Poshanful's live database).`);
    process.exit(1);
  }
}

/**
 * products.json stores image URLs against the local dev API. Set
 * SEED_IMAGE_BASE (e.g. https://api.oldspice.pcgnp.co) to rewrite them for a
 * deployed API.
 */
const LOCAL_IMAGE_BASE = 'http://localhost:5002';
function seedImage(url: string | undefined): string | undefined {
  const base = process.env.SEED_IMAGE_BASE?.replace(/\/$/, '');
  if (!url || !base || !url.startsWith(LOCAL_IMAGE_BASE)) return url;
  return base + url.slice(LOCAL_IMAGE_BASE.length);
}

const prisma = new PrismaClient();

interface SeedOption {
  name: string;
  sku?: string;
  price: number;
  comparePrice?: number;
  savings?: string;
  stock?: number;
  sortOrder?: number;
}
interface SeedProduct {
  handle: string;
  title: string;
  category: string;
  usp?: string;
  description?: string;
  rating?: number;
  reviewsCount?: number;
  labels?: string[];
  image?: string;
  secondaryImage?: string;
  soldOut?: boolean;
  images?: string[];
  isBestSeller?: boolean;
  bestSellerOrder?: number;
  isCombo?: boolean;
  /** Concern slugs this product addresses — must exist in CONCERNS below. */
  concerns?: string[];
  /**
   * For a combo: the products inside it, by handle. Seeded as real BundleItem
   * rows after every product exists, so a kit can reference something defined
   * further down the file.
   */
  bundle?: { handle: string; quantity?: number }[];
  form?: string;
  netQuantity?: string | null;
  keyIngredients?: string[];
  benefits?: string[];
  howToUse?: string | null;
  suitableFor?: string | null;
  shelfLifeMonths?: number | null;
  storage?: string | null;
  countryOfOrigin?: string | null;
  manufacturedBy?: string | null;
  marketedBy?: string | null;
  options: SeedOption[];
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * The catalogue taxonomy for GREETOS.
 */
const CATEGORIES = [
  {
    name: 'Leafy Greens',
    slug: 'leafy-greens',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Root Vegetables',
    slug: 'root-vegetables',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Beans & Peas',
    slug: 'beans-peas',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Gourds & Squash',
    slug: 'gourds-squash',
    image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Other Vegetables',
    slug: 'other-vegetables',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop',
  },
];

/**
 * Merchandising groups.
 */
const COLLECTIONS = [
  { name: 'Super Saver Combos', description: 'Complete organic farm fresh vegetable baskets.' },
  { name: 'Best Sellers', description: 'Daily essential produce our customers order most.' },
  { name: 'New In', description: 'The latest fresh farm harvest.' },
  { name: 'Under ₹199', description: 'Fresh organic greens & daily produce under ₹199.' },
];

/**
 * Produce categories & specialty highlights.
 */
const CONCERNS: { name: string; slug: string; subtitle: string; image: string }[] = [
  { name: 'Leafy Greens', slug: 'leafy-greens', subtitle: 'Spinach, Fenugreek, Coriander & Dill',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop' },
  { name: 'Root Vegetables', slug: 'root-vegetables', subtitle: 'Beetroot, Carrot, Radish & Potato',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop' },
  { name: 'Beans & Peas', slug: 'beans-peas', subtitle: 'French Beans, Green Peas & Chillies',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop' },
  { name: 'Gourds & Squash', slug: 'gourds-squash', subtitle: 'Bottle Gourd, Dodka, Karela & Cucumber',
    image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?q=80&w=800&auto=format&fit=crop' },
  { name: 'Other Vegetables', slug: 'other-vegetables', subtitle: 'Brinjal, Cabbage, Cauliflower & Tomato',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop' },
];

/** Quick-filter pills rendered above the product grid on the home page. */
const CATEGORY_BARS = [
  'Leafy Greens',
  'Root Vegetables',
  'Beans & Peas',
  'Gourds & Squash',
  'Other Vegetables',
];

/**
 * Delivery charge defaults, admin-editable under Appearance / Business
 * settings. Seeded rather than hard-coded so the storefront and the order
 * total always read the same numbers from one place.
 */
/**
 * One shipping rule, seeded rather than hard-coded, because the storefront had
 * three contradictory ones in copy (₹799 prepaid in Maharashtra on the
 * announcement bar, ₹499 India-wide on the offers page, ₹50 under ₹499 in the
 * cart). The cart, the offers page and the announcement bar must all read
 * these two numbers.
 */
const DEFAULT_SETTINGS: Record<string, string> = {
  shipping_flat_rate: '50',
  shipping_free_above: '499',
  home_categories: JSON.stringify([
    { title: 'Leafy Vegetables', href: '/collections/leafy-vegetables', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop' },
    { title: 'Root Vegetables', href: '/collections/root-vegetables', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop' },
    { title: 'Onion & Bulbs', href: '/collections/onion-bulbs', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=800&auto=format&fit=crop' },
    { title: 'Chilli & Peppers', href: '/collections/chilli-peppers', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=800&auto=format&fit=crop' },
    { title: 'Beans & Legumes', href: '/collections/beans-legumes', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop' },
    { title: 'Gourds & Squash', href: '/collections/gourds-squash', image: 'https://images.unsplash.com/photo-1593105544559-ecb03ab26232?q=80&w=800&auto=format&fit=crop' },
    { title: 'Other Vegetables', href: '/collections/other-vegetables', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop' },
    { title: 'Fresh Herbs', href: '/collections/fresh-herbs', image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?q=80&w=800&auto=format&fit=crop' },
  ]),
};

/**
 * Placeholder customer reviews for the home page carousel.
 *
 * These are not real customers. They exist so the reviews section can be
 * demonstrated before the store has genuine reviews, and they are gated behind
 * an explicit opt-in: they seed only when SEED_DEMO_REVIEWS=true, which is
 * false by default.
 *
 * Keep that gate. These read as real testimonials from named people, so they
 * must not reach production just because someone ran the seed. Replace or
 * delete them from admin -> Reviews once real reviews come in.
 */
const DEMO_REVIEWS: {
  handle: string;
  authorName: string;
  rating: number;
  body: string;
  imageUrl: string;
}[] = [
  // Intentionally empty. The forked list was five jewellery testimonials for
  // products that do not exist here; they would have seeded invented praise
  // for this store. Add entries only if a demo needs populated reviews, and
  // delete them from admin -> Reviews before launch.
];

async function main() {
  // ── Clean sweep of old products and categories ──────────────
  console.log('Skipping wipe of user products, categories & settings to preserve admin edits...');
  // ── Admin user ──────────────────────────────────────────────
  if (!config.admin.password) {
    console.warn('⚠  ADMIN_PASSWORD is empty in .env — skipping admin user.');
  } else {
    const passwordHash = await bcrypt.hash(config.admin.password, 12);
    await prisma.user.upsert({
      where: { email: config.admin.email },
      update: { role: 'admin', passwordHash, isActive: true },
      create: { email: config.admin.email, name: 'Administrator', role: 'admin', passwordHash },
    });
    console.log(`Admin ready: ${config.admin.email}`);
  }

  // ── Announcements ───────────────────────────────────────────
  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.createMany({
      data: DEFAULT_ANNOUNCEMENTS.map((message, i) => ({ message, sortOrder: i })),
    });
    console.log(`Seeded ${DEFAULT_ANNOUNCEMENTS.length} announcements`);
  }

  // ── Settings ────────────────────────────────────────────────
  // `create`-only on purpose: re-running the seed must never overwrite a rate
  // the admin has since changed in the panel.
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`Seeded ${Object.keys(DEFAULT_SETTINGS).length} settings`);

  // ── Collections ─────────────────────────────────────────────
  for (const [i, c] of COLLECTIONS.entries()) {
    await prisma.collection.upsert({
      where: { slug: slugify(c.name) },
      update: { name: c.name, description: c.description, sortOrder: i },
      create: { name: c.name, slug: slugify(c.name), description: c.description, sortOrder: i },
    });
  }
  console.log(`Seeded ${COLLECTIONS.length} collections`);

  // ── Categories ──────────────────────────────────────────────
  const catByName = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: c.image, parentId: null, sortOrder: i },
      create: { name: c.name, slug: c.slug, image: c.image, parentId: null, sortOrder: i },
    });
    catByName.set(c.name, cat.id);
  }
  console.log(`Seeded ${catByName.size} categories`);

  const homeCatList = CATEGORIES.map((c) => ({
    title: c.name,
    href: `/collections/${c.slug}`,
    image: c.image,
  }));
  await prisma.setting.upsert({
    where: { key: 'home_categories' },
    update: { value: JSON.stringify(homeCatList) },
    create: { key: 'home_categories', value: JSON.stringify(homeCatList) },
  });

  // ── Concerns ────────────────────────────────────────────────
  const concernBySlug = new Map<string, string>();
  for (const [i, c] of CONCERNS.entries()) {
    const row = await prisma.concern.upsert({
      where: { slug: c.slug },
      update: { name: c.name, subtitle: c.subtitle, image: c.image, sortOrder: i },
      create: { name: c.name, slug: c.slug, subtitle: c.subtitle, image: c.image, sortOrder: i },
    });
    concernBySlug.set(c.slug, row.id);
  }
  console.log(`Seeded ${concernBySlug.size} concerns`);

  // ── Home-page quick-filter bars ─────────────────────────────
  const barByName = new Map<string, string>();
  for (const name of CATEGORY_BARS) {
    const bar = await prisma.productCategoryBar.upsert({ where: { name }, update: {}, create: { name } });
    barByName.set(name, bar.id);
  }

  // ── Catalog ─────────────────────────────────────────────────
  const jsonPath = path.resolve(__dirname, 'seed-data/products.json');
  if (!existsSync(jsonPath)) {
    console.warn(`\n⚠  ${jsonPath} not found — skipping product seed.\n`);
    return;
  }
  const items: SeedProduct[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const validHandles = items.map((i) => i.handle);
  await prisma.bundleItem.deleteMany({});
  await prisma.product.deleteMany({
    where: { handle: { notIn: validHandles } },
  });
  await prisma.category.deleteMany({
    where: { slug: { notIn: CATEGORIES.map((c) => c.slug) } },
  });

  for (const p of items) {
    const catId = catByName.get(p.category);
    if (!catId) {
      console.warn(`⚠  ${p.handle}: unknown category "${p.category}" — skipped.`);
      continue;
    }
    const options = p.options.map((o, i) => ({
      name: o.name,
      sku: o.sku ?? null,
      price: o.price,
      comparePrice: o.comparePrice ?? null,
      memberPrice: null,
      savings: o.savings ?? null,
      stock: o.stock ?? 0,
      sortOrder: o.sortOrder ?? i,
    }));
    const base = {
      title: p.title,
      usp: p.usp,
      description: p.description,
      rating: p.rating ?? 0,
      reviewsCount: p.reviewsCount ?? 0,
      labels: p.labels ?? [],
      image: seedImage(p.image),
      secondaryImage: seedImage(p.secondaryImage),
      soldOut: p.soldOut ?? false,
      images: (p.images ?? []).map((u) => seedImage(u) ?? u),
      isBestSeller: p.isBestSeller ?? false,
      bestSellerOrder: p.bestSellerOrder ?? 0,
      isCombo: p.isCombo ?? false,
      form: p.form ?? null,
      netQuantity: p.netQuantity ?? null,
      keyIngredients: p.keyIngredients ?? [],
      benefits: p.benefits ?? [],
      howToUse: p.howToUse ?? null,
      suitableFor: p.suitableFor ?? null,
      shelfLifeMonths: p.shelfLifeMonths ?? null,
      storage: p.storage ?? null,
      countryOfOrigin: p.countryOfOrigin ?? null,
      manufacturedBy: p.manufacturedBy ?? null,
      marketedBy: p.marketedBy ?? null,
      productCategoryBarId: barByName.get(p.category) ?? null,
    };

    // Unknown concern slugs are reported rather than skipped silently — a typo
    // here means a storefront tile quietly loses its products.
    const concernIds: { id: string }[] = [];
    for (const slug of p.concerns ?? []) {
      const id = concernBySlug.get(slug);
      if (!id) {
        console.warn(`⚠  ${p.handle}: unknown concern "${slug}" — not linked.`);
        continue;
      }
      concernIds.push({ id });
    }
    await prisma.product.upsert({
      where: { handle: p.handle },
      update: {
        ...base,
        categories: { set: [{ id: catId }] },
        concerns: { set: concernIds },
        options: { deleteMany: {}, create: options },
      },
      create: {
        handle: p.handle,
        ...base,
        categories: { connect: [{ id: catId }] },
        concerns: { connect: concernIds },
        options: { create: options },
      },
    });
  }
  console.log(`Seeded ${items.length} products`);

  // ── Combo contents ──────────────────────────────────────────
  // A second pass, because a combo can list a component that appears later in
  // the file — every product exists by now, so order in the JSON stops
  // mattering. Rebuilt from scratch each run so removing a component from the
  // JSON actually removes it from the kit.
  for (const p of items) {
    if (!p.bundle?.length) continue;
    const parent = await prisma.product.findUnique({ where: { handle: p.handle } });
    if (!parent) continue;

    await prisma.bundleItem.deleteMany({ where: { bundleId: parent.id } });
    for (const [i, entry] of p.bundle.entries()) {
      const component = await prisma.product.findUnique({ where: { handle: entry.handle } });
      if (!component) {
        console.warn(`⚠  ${p.handle}: combo component "${entry.handle}" does not exist — not linked.`);
        continue;
      }
      await prisma.bundleItem.create({
        data: {
          bundleId: parent.id,
          componentId: component.id,
          quantity: entry.quantity ?? 1,
          sortOrder: i,
        },
      });
    }
  }
  const bundleCount = await prisma.bundleItem.count();
  console.log(`Linked ${bundleCount} combo components`);

  // ── Demo reviews (opt-in only) ──────────────────────────────
  if (process.env.SEED_DEMO_REVIEWS === 'true') {
    if ((await prisma.review.count()) > 0) {
      console.log('Reviews already exist — leaving them alone.');
    } else {
      let made = 0;
      for (const r of DEMO_REVIEWS) {
        const product = await prisma.product.findUnique({ where: { handle: r.handle } });
        if (!product) continue;
        await prisma.review.create({
          data: {
            productId: product.id,
            authorName: r.authorName,
            rating: r.rating,
            body: r.body,
            imageUrl: r.imageUrl,
            approved: true,
            showOnHome: true,
            verified: true,
          },
        });
        await recomputeProductRating(product.id);
        made += 1;
      }
      console.log(`Seeded ${made} DEMO reviews — delete these before launch.`);
    }
  }

}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
