import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts, getConcern, getCategory, getConcerns, getCategories } from '@/lib/api';
import { adaptProduct } from '@/lib/productAdapter';
// PRODUCTS is the bundled catalogue used as the fallback below, so it has
// to come in as a value, not just a type.
import { PRODUCTS, type Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { SITE } from '@/lib/site';

export const revalidate = 0;

interface Props {
  params: { slug: string };
  searchParams?: { q?: string };
}

interface Resolved {
  title: string;
  description: string;
  products: Product[];
}

/**
 * One route serves three kinds of listing, because they are all "a page of
 * products" to a shopper and all live under /collections/:
 *
 *   - the merchandising slugs the nav uses (all, best-sellers, super-saver-combos)
 *   - a real category (leafy-greens, root-vegetables, …)
 *   - a concern (a shopper-facing grouping set in admin)
 *
 * The concern case is why the "Shop By Concern" tiles work at all: all nine of
 * them pointed at /collections/<slug> and every one used to 404.
 */
const CATEGORY_NAMES: Record<string, { title: string; description: string }> = {
  'leafy-greens': { title: 'Leafy Greens', description: 'Fresh spinach, fenugreek, coriander, dill & colocasia leaves' },
  'root-vegetables': { title: 'Root Vegetables', description: 'Farm fresh beetroot, carrot, radish, potato, suran, ginger, garlic, onion & green onion' },
  'beans-peas': { title: 'Beans & Peas', description: 'Broad beans, cluster beans, french beans, green peas, green chilli & capsicum' },
  'gourds-squash': { title: 'Gourds & Squash', description: 'Tender bottle gourd, dodka (ridge gourd), karela, pumpkin, cucumber & tendli' },
  'other-vegetables': { title: 'Other Vegetables', description: 'Daily fresh brinjal, cabbage, cauliflower, drumstick & tomato' },
  'combos': { title: 'Organic Farm Baskets', description: 'Complete Organic Vegetable & Herb Baskets' },
  'super-saver-combos': { title: 'Organic Farm Baskets', description: 'Complete Organic Vegetable & Herb Baskets' },
  'best-sellers': { title: 'Best Sellers', description: 'Top Reordered Farm Produce' },
  'all': { title: 'All Organic Produce', description: '100% Farm Fresh Vegetables & Herbs' },
};

const resolve = cache(async (slug: string): Promise<Resolved> => {
  const allApi = await getProducts();
  let all = allApi.map(adaptProduct);

  if (!all || all.length === 0) {
    all = PRODUCTS;
  }

  if (slug === 'all') {
    return {
      title: 'All Products',
      description: 'Farm Fresh Organic Produce',
      products: all,
    };
  }

  if (slug === 'best-sellers') {
    return {
      title: 'Best Sellers',
      description: 'Top Reordered Essentials',
      products: all.filter((p) => p.isBestSeller),
    };
  }

  if (slug === 'super-saver-combos' || slug === 'combos') {
    return {
      title: 'Super Saver Combos',
      description: 'Farm Fresh Vegetable Baskets',
      products: all.filter((p) => p.isCombo || p.category === 'combos' || p.category === 'super-saver-combos'),
    };
  }

  const [category, concern] = await Promise.all([getCategory(slug), getConcern(slug)]);

  const catInfo = CATEGORY_NAMES[slug] || {
    title: category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'Farm Fresh Organic Produce',
  };

  const pageTitle = category?.name || concern?.name || catInfo.title;

  // Instant in-memory filter matching category slug or name
  const matchingProducts = all.filter((p) => {
    const pCat = (p.category || '').toLowerCase();
    const targetSlug = slug.toLowerCase();
    const targetTitle = catInfo.title.toLowerCase();
    const liveTitle = (category?.name || '').toLowerCase();
    return pCat === targetSlug || pCat === targetTitle || (liveTitle && pCat === liveTitle) || pCat.includes(targetSlug) || targetSlug.includes(pCat);
  });

  if (matchingProducts.length > 0) {
    return {
      title: pageTitle,
      description: catInfo.description,
      products: matchingProducts,
    };
  }

  if (category && category.products && category.products.length > 0) {
    return {
      title: category.name || pageTitle,
      description: catInfo.description,
      products: category.products.map(adaptProduct),
    };
  }

  if (concern && concern.products && concern.products.length > 0) {
    return {
      title: concern.name || pageTitle,
      description: catInfo.description,
      products: concern.products.map(adaptProduct),
    };
  }

  return {
    title: pageTitle,
    description: catInfo.description,
    products: [],
  };
});

export async function generateStaticParams() {
  const [categories, concerns] = await Promise.all([getCategories(), getConcerns()]);
  return [
    { slug: 'all' },
    { slug: 'best-sellers' },
    { slug: 'super-saver-combos' },
    ...categories.map((c) => ({ slug: c.slug })),
    ...concerns.map((c) => ({ slug: c.slug })),
  ];
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolved = await resolve(params.slug);
  if (!resolved) return { title: 'Not found' };
  const query = searchParams?.q?.trim();
  const pageTitle = query ? `Search Results for "${query}"` : resolved.title;
  return {
    title: `${pageTitle} | ${SITE.name}`,
    description: resolved.description,
    alternates: { canonical: `/collections/${params.slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const resolved = await resolve(params.slug);
  if (!resolved) notFound();

  let { title, description, products } = resolved;
  const searchQuery = searchParams?.q?.trim() || '';

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    title = `Search Results for "${searchQuery}"`;
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '80vh', padding: '20px 0 60px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
              {title}
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>{description}</p>
          </div>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
            {products.length} product{products.length === 1 ? '' : 's'}
          </span>
        </div>

        {products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #eee',
            }}
          >
            <h2 style={{ fontSize: '20px', color: '#4a5568', fontWeight: 600 }}>
              {searchQuery ? `No products found matching "${searchQuery}"` : 'Nothing here just yet'}
            </h2>
            <p style={{ fontSize: '14px', color: '#718096', maxWidth: '420px', margin: '10px auto 0' }}>
              {searchQuery
                ? 'Try checking for spelling errors or search for another term like spinach, carrot, or tomato.'
                : 'We’re still building out this range. In the meantime, the rest of the collection is worth a look.'}
            </p>
            <Link
              href="/collections/all"
              style={{
                display: 'inline-block',
                marginTop: '18px',
                background: '#2d451e',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
