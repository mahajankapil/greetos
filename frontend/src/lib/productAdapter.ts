import { Product, ProductPackOption } from '@/data/products';

/**
 * The product as the API returns it. Deliberately a separate type from the
 * storefront's `Product`: the two shapes differ in ways that matter (prices
 * are integers here and formatted strings there), and pretending they are the
 * same is how "₹NaN" ends up on a product card.
 */
export interface ApiProduct {
  id: string;
  handle: string;
  title: string;
  category: string;
  categories: { id: string; name: string; slug: string }[];
  concerns: { id: string; name: string; slug: string }[];
  usp: string;
  description: string;
  rating: number;
  reviewsCount: number;
  labels: string[];
  image: string;
  secondaryImage: string;
  images: string[];
  soldOut: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  bestSellerOrder: number;
  isCombo: boolean;
  form: string | null;
  netQuantity: string | null;
  keyIngredients: string[];
  benefits: string[];
  howToUse: string | null;
  suitableFor: string | null;
  shelfLifeMonths: number | null;
  storage: string | null;
  countryOfOrigin: string | null;
  manufacturedBy: string | null;
  marketedBy: string | null;
  bundleItems: {
    id: string;
    quantity: number;
    componentId: string;
    title: string;
    handle: string;
    image: string;
    netQuantity: string | null;
  }[];
  options: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    comparePrice?: number;
    savings?: string;
    stock: number;
  }[];
}

/**
 * Rupees, Indian digit grouping — 1,05,000 rather than 105,000. The storefront
 * prints price strings verbatim, so the formatting decision lives here once
 * instead of in every component.
 */
function formatPrice(paise: number): string {
  return `₹${paise.toLocaleString('en-IN')}`;
}

/**
 * The DB taxonomy and the storefront's category union do not use the same
 * words: the catalogue calls the kits "Combos", the storefront's routes call
 * them "super-saver-combos". Mapping here keeps the existing collection URLs
 * working without renaming rows the admin has to read.
 */
/**
 * The storefront's own merchandising routes use slugs that differ from the
 * catalogue's. Anything not listed passes through unchanged, so a category the
 * client adds in admin works immediately without a code change.
 */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  combos: 'super-saver-combos',
};

/** Maps an API product onto the shape every storefront component expects. */
export function adaptProduct(p: ApiProduct): Product {
  // The headline price comes from the first option, which the API returns in
  // explicit sortOrder — so adding a second size cannot silently reprice the
  // card.
  const lead = p.options[0];
  const price = lead ? lead.price : 0;
  const compareAt = lead?.comparePrice && lead.comparePrice > price ? lead.comparePrice : null;

  // Percentage off, rounded down: claiming 13% when it is 12.6% overstates the
  // discount, and rounding up a price claim is the wrong direction to be wrong.
  const discount = compareAt ? `${Math.floor(((compareAt - price) / compareAt) * 100)}% off` : undefined;

  const categorySlug = p.categories[0]?.slug ?? '';

  // Gallery: `images` when the admin has filled it, else whatever single
  // images exist, deduplicated so the same photo is not a second thumbnail.
  const gallery = p.images.length > 0 ? p.images : [p.image, p.secondaryImage].filter(Boolean);

  return {
    id: p.id,
    slug: p.handle,
    title: p.title,
    price: formatPrice(price),
    compareAtPrice: compareAt ? formatPrice(compareAt) : null,
    discount,
    primaryImage: p.image,
    hoverImage: p.secondaryImage || undefined,
    images: Array.from(new Set(gallery)),
    rating: p.rating,
    reviewCount: p.reviewsCount,
    unitsSold: (p as any).unitsSold || undefined,
    description: p.description,
    shortDescription: p.usp,
    buttonText: p.isCombo ? 'Add to cart' : 'Add to cart',
    category: CATEGORY_SLUG_ALIASES[categorySlug] ?? categorySlug,
    ingredients: p.keyIngredients,
    howToUse: p.howToUse ?? undefined,
    // Sold out is the admin's explicit switch; stock 0 on every option means
    // the same thing to a shopper, so both close the buy button.
    inStock: !p.soldOut && p.options.some((o) => o.stock > 0),
    isBestSeller: p.isBestSeller,
    isCombo: p.isCombo,

    // ── Fields the static file never had ──────────────────────────
    // These are what make the product page describe THIS product instead of
    // the hair combo it used to hardcode for everything.
    benefits: p.benefits,
    netQuantity: p.netQuantity ?? undefined,
    suitableFor: p.suitableFor ?? undefined,
    storage: p.storage ?? undefined,
    shelfLifeMonths: p.shelfLifeMonths ?? undefined,
    countryOfOrigin: p.countryOfOrigin ?? undefined,
    manufacturedBy: p.manufacturedBy ?? undefined,
    marketedBy: p.marketedBy ?? undefined,
    form: p.form ?? undefined,
    concerns: p.concerns,
    bundleItems: p.bundleItems,
    labels: p.labels,
    options: p.options.map(
      (o): ProductPackOption => ({
        id: o.id,
        name: o.name,
        price: o.price,
        comparePrice: o.comparePrice ?? null,
        savings: o.savings ?? null,
        stock: o.stock,
      }),
    ),
  };
}
