import React from 'react';
import type { Metadata } from 'next';
import { HeroSlider, type DynamicBanner } from '@/components/HeroSlider';
import { CollectionsGrid } from '@/components/CollectionsGrid';
import { ProductSlider } from '@/components/ProductSlider';
import { ShopByConcern } from '@/components/ShopByConcern';
import { CustomerReviews } from '@/components/CustomerReviews';
import { TrustBadges } from '@/components/TrustBadges';
import { NewsInsights } from '@/components/NewsInsights';
import { ReelsSection } from '@/components/ReelsSection';
import { OurStorySection } from '@/components/OurStorySection';
import { getProducts, getConcerns, getSettings, getReels, getCategories } from '@/lib/api';
import { adaptProduct } from '@/lib/productAdapter';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    'Shop Old Spice Agro Fresh for 100% organic, farm-fresh vegetables, green leafy herbs, roots, gourds, and daily cooking produce delivered straight from local farms to your doorstep.',
  alternates: { canonical: '/' },
};

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'leafy-greens': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
  'root-vegetables': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
  'beans-peas': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop',
  'gourds-squash': 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?q=80&w=800&auto=format&fit=crop',
  'other-vegetables': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop',
};

export default async function HomePage() {
  const [products, concerns, settings, reels, apiCategories] = await Promise.all([
    getProducts(),
    getConcerns(),
    getSettings(),
    getReels(),
    getCategories(),
  ]);

  const all = products.map(adaptProduct);

  const combos = all.filter((p) => p.isCombo);
  const bestSellers = all.filter((p) => p.isBestSeller);

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

  const homeCategories = apiCategories
    .filter((c) => !c.parentId)
    .map((cat) => ({
      title: cat.name,
      href: `/collections/${cat.slug}`,
      image: cat.image || DEFAULT_CATEGORY_IMAGES[cat.slug] || '',
    }));

  let blogPosts = [];
  if (settings?.blog_posts) {
    try {
      const parsed = JSON.parse(settings.blog_posts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blogPosts = parsed.map((post: any, idx: number) => {
          const isLegacy = !post.title || post.title.includes('Skin') || post.title.includes('Hair');
          if (isLegacy) {
            const defaults = [
              {
                title: 'Guide to Storing Fresh Organic Leafy Greens at Home',
                author: 'Old Spice Agro Fresh LLP',
                date: 'August 31, 2026',
                image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
                slug: 'guide-to-storing-fresh-organic-leafy-greens',
              },
              {
                title: 'Health Benefits of Eating Seasonally Harvested Produce',
                author: 'Old Spice Agro Fresh LLP',
                date: 'August 31, 2026',
                image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
                slug: 'health-benefits-of-eating-seasonally-harvested-produce',
              },
              {
                title: '100% Organic Produce: From Our Local Farms to Your Kitchen',
                author: 'Old Spice Agro Fresh LLP',
                date: 'April 22, 2026',
                image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop',
                slug: '100-percent-organic-vegetables-from-farm-to-table',
              },
            ];
            return defaults[idx % defaults.length];
          }
          return {
            ...post,
            author: (!post.author || post.author.includes('Rovique')) ? 'Old Spice Agro Fresh LLP' : post.author,
          };
        });
      }
    } catch {
      blogPosts = [];
    }
  }

  let ourStoryData = undefined;
  if (settings?.our_story_section) {
    try {
      const parsed = JSON.parse(settings.our_story_section);
      ourStoryData = {
        ...parsed,
        title: !parsed.title || parsed.title.includes('Rovique') ? 'Board Of Directors' : parsed.title,
        subtitle: !parsed.subtitle || parsed.subtitle.includes('Rovique') || parsed.subtitle.includes('Glow') ? 'Leadership & Vision Behind Old Spice Agro Fresh LLP' : parsed.subtitle,
      };
    } catch {
      ourStoryData = undefined;
    }
  }

  return (
    <div style={{ background: '#ffffff' }}>
      <HeroSlider banners={heroBanners} />

      <CollectionsGrid categories={homeCategories} />

      {combos.length > 0 && (
        <ProductSlider title="Super Saver Combos" products={combos} viewAllLink="/collections/super-saver-combos" />
      )}

      {bestSellers.length > 0 && (
        <ProductSlider title="Best Sellers" products={bestSellers} viewAllLink="/collections/best-sellers" />
      )}

      <OurStorySection data={ourStoryData} />

      <ReelsSection reels={reels} />

      <CustomerReviews />

      <TrustBadges />

      <NewsInsights posts={blogPosts} />
    </div>
  );
}
