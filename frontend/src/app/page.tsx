import React from 'react';
import type { Metadata } from 'next';
import { HeroSlider, type DynamicBanner } from '@/components/HeroSlider';
import { CollectionsGrid } from '@/components/CollectionsGrid';
import { ProductSlider } from '@/components/ProductSlider';
import { NewsInsights } from '@/components/NewsInsights';
import { ReelsSection } from '@/components/ReelsSection';
import { getProducts, getSettings, getReels, getCategories } from '@/lib/api';
import { getArticles } from '@/lib/blog';
import { adaptProduct } from '@/lib/productAdapter';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    'Shop GREETOS for 100% organic, farm-fresh vegetables, green leafy herbs, roots, gourds, and daily cooking produce delivered straight from local farms to your doorstep.',
  alternates: { canonical: '/' },
};

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'leafy-greens': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
  'root-vegetables': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
  'beans-peas': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop',
  'gourds-squash': 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?q=80&w=800&auto=format&fit=crop',
  'other-vegetables': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop',
};

/** Shown until the admin uploads their own hero banners. */
const DEFAULT_HERO_BANNERS: DynamicBanner[] = [
  {
    id: 'default-mixed-veg',
    desktop: '/banner/hero-1-desktop.jpg',
    mobile: '/banner/hero-1-mobile.jpg',
    link: '/collections/all',
    alt: 'Mixed Veg Combo: potato, carrot and green peas. Fresh vegetables for a delicious mixed veg sabzi.',
  },
  {
    id: 'default-fresh-salad',
    desktop: '/banner/hero-2-desktop.jpg',
    mobile: '/banner/hero-2-mobile.jpg',
    link: '/collections/all',
    alt: 'Fresh Salad Combo: cucumber, tomato, carrot and lettuce. Fresh vegetables for a crunchy, colourful salad.',
  },
];

export default async function HomePage() {
  const [products, settings, reels, apiCategories, articles] = await Promise.all([
    getProducts(),
    getSettings(),
    getReels(),
    getCategories(),
    getArticles(),
  ]);

  const all = products.map(adaptProduct);

  const combos = all.filter((p) => p.isCombo);
  const bestSellers = all.filter((p) => p.isBestSeller);

  const categorySections = apiCategories
    .filter((category) => !category.parentId)
    .map((category) => {
      const categoryProducts = category.slug === 'all-items'
        ? all
        : category.slug === 'new-arrival'
          ? [...all].reverse()
          : products
              .filter((product) => product.categories.some((assignedCategory) => assignedCategory.slug === category.slug))
              .map(adaptProduct);
      return {
        slug: category.slug,
        title: category.name,
        products: categoryProducts.slice(0, 6),
      };
    })
    .filter((category) => category.products.length > 0);

  let heroBanners: DynamicBanner[] = [];
  if (settings?.hero_banners) {
    try {
      heroBanners = JSON.parse(settings.hero_banners);
    } catch {
      heroBanners = [];
    }
  }
  if (heroBanners.length === 0 && (settings?.hero_banner_desktop || settings?.hero_banner_mobile)) {
    heroBanners = [
      {
        id: 'legacy-banner-1',
        desktop: settings.hero_banner_desktop || '',
        mobile: settings.hero_banner_mobile || '',
      },
    ];
  }

  // Nothing uploaded in Admin → Appearance: show the two brand banners from
  // /public/banner (a wide one for desktop, a portrait one for phones).
  if (heroBanners.length === 0) heroBanners = DEFAULT_HERO_BANNERS;

  const homeCategories = apiCategories
    .filter((c) => !c.parentId)
    .map((cat) => ({
      title: cat.name,
      href: `/collections/${cat.slug}`,
      image: cat.image || DEFAULT_CATEGORY_IMAGES[cat.slug] || '',
    }));

  return (
    <div style={{ background: '#ffffff' }}>
      {settings?.hero_banners_enabled !== 'false' && <HeroSlider banners={heroBanners} />}

      <CollectionsGrid categories={homeCategories} />

      <div className="home-vegetable-sections">
        {categorySections.map((category) => (
          <ProductSlider
            key={category.slug}
            title={category.title}
            products={category.products}
            viewAllLink={`/collections/${category.slug}`}
          />
        ))}
      </div>

      {combos.length > 0 && (
        <ProductSlider title="Super Saver Combos" products={combos} viewAllLink="/collections/super-saver-combos" />
      )}

      {bestSellers.length > 0 && (
        <ProductSlider title="Best Sellers" products={bestSellers} viewAllLink="/collections/best-sellers" />
      )}

      <ReelsSection reels={reels} />

      <NewsInsights posts={articles.slice(0, 4)} />

    </div>
  );
}
