import React from 'react';
import type { Metadata } from 'next';
import { HeroSlider, type DynamicBanner } from '@/components/HeroSlider';
import { CollectionsGrid } from '@/components/CollectionsGrid';
import { ProductSlider } from '@/components/ProductSlider';
import { CustomerReviews } from '@/components/CustomerReviews';
import { TrustBadges } from '@/components/TrustBadges';
import { NewsInsights } from '@/components/NewsInsights';
import { ReelsSection } from '@/components/ReelsSection';
import { getProducts, getSettings, getReels, getCategories } from '@/lib/api';
import { COLLECTIONS } from '@/data/collections';
import { BLOG_POSTS } from '@/data/blogs';
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
  const [products, settings, reels, apiCategories] = await Promise.all([
    getProducts(),
    getSettings(),
    getReels(),
    getCategories(),
  ]);

  const all = products.map(adaptProduct);

  const combos = all.filter((p) => p.isCombo);
  const bestSellers = all.filter((p) => p.isBestSeller);

  const vegetableSections = COLLECTIONS
    .filter((collection) => collection.slug !== 'organic-baskets')
    .map((collection) => ({
      ...collection,
      title: collection.slug === 'other-vegetables' ? 'Everyday Vegetables' : collection.title,
      products: products
        .filter((product) => !product.isCombo && (
          product.categories.some((category) => category.slug === collection.slug || category.name.toLowerCase() === collection.title.toLowerCase()) ||
          product.category?.toLowerCase() === collection.title.toLowerCase() ||
          product.category === collection.slug
        ))
        .map(adaptProduct),
    }))
    .filter((collection) => collection.products.length > 0);

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
          const isLegacy = !post.title || /skin|hair|herbal-skincare/i.test(`${post.title} ${post.slug || ''}`);
          if (isLegacy) {
            return BLOG_POSTS[idx % BLOG_POSTS.length];
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

      <div className="home-vegetable-sections">
        {vegetableSections.map((collection) => (
          <ProductSlider
            key={collection.slug}
            title={collection.title}
            subtitle={collection.subtitle}
            products={collection.products}
            viewAllLink={`/collections/${collection.slug}`}
          />
        ))}
      </div>

      <ReelsSection reels={reels} />

      <NewsInsights posts={blogPosts} />

      <CustomerReviews />

      <TrustBadges />
    </div>
  );
}
