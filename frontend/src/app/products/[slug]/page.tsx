import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/api';
import { adaptProduct } from '@/lib/productAdapter';
import { ProductDetail } from '@/components/ProductDetail';
import { ProductSlider } from '@/components/ProductSlider';
import { SITE } from '@/lib/site';

export const revalidate = 0;

interface Props {
  params: { slug: string };
}

/**
 * Per-product metadata. Every product page used to share the site-wide title,
 * which meant search engines saw one page repeated five times.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Product not found' };

  const description = (product.usp || product.description || '').slice(0, 300);
  return {
    // Product titles already carry the brand ("… by Rovique Herbal"), so only
    // append the site name when it is not there — otherwise every tab reads
    // "Rovique Herbal | Rovique Herbal".
    title: product.title.includes(SITE.name) ? product.title : `${product.title} | ${SITE.name}`,
    description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      title: product.title,
      description,
      type: 'website',
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const raw = await getProduct(params.slug);
  if (!raw) notFound();

  const product = adaptProduct(raw);
  const all = (await getProducts()).map(adaptProduct);
  const related = all
    .filter((p) => p.slug !== product.slug)
    .filter((p) => p.category === product.category || p.isBestSeller)
    .slice(0, 4);

  /**
   * Product structured data. Google requires `offers` to reflect what is
   * actually charged, so price and availability come from the same row the
   * page renders. `aggregateRating` is omitted entirely until real reviews
   * exist — marking up a rating no customer gave is a manual-action risk, not
   * just bad manners.
   */
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.shortDescription,
    image: product.images,
    brand: { '@type': 'Brand', name: SITE.name },
    ...(product.netQuantity ? { size: product.netQuantity } : {}),
    ...(product.countryOfOrigin ? { countryOfOrigin: product.countryOfOrigin } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: raw.options[0]?.price ?? 0,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE.url}/products/${product.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetail product={product} />
      {related.length > 0 && (
        <ProductSlider title="You may also like" products={related} viewAllLink="/collections/all" />
      )}
    </>
  );
}
