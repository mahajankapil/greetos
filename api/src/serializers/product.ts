import { Product, ProductOption, Category, Concern, BundleItem } from '@prisma/client';

type BundleItemWithComponent = BundleItem & {
  component?: Pick<Product, 'id' | 'handle' | 'title' | 'image' | 'netQuantity'> | null;
};

type ProductWithRelations = Product & {
  options: ProductOption[];
  categories?: Category[];
  concerns?: Concern[];
  bundleItems?: BundleItemWithComponent[];
  productCategoryBarId?: string | null;
};

/**
 * Maps a DB product to the shape the storefront expects. Keeps `category`
 * (primary category name, backward-compatible) and adds `categories`
 * (all assigned categories, since products are now many-to-many).
 */
export function serializeProduct(p: ProductWithRelations) {
  const cats = p.categories ?? [];
  return {
    id: p.legacyId ?? p.id,
    handle: p.handle,
    title: p.title,
    category: cats[0]?.name ?? '',
    categories: cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    productCategoryBarId: p.productCategoryBarId,
    usp: p.usp ?? '',
    description: p.description ?? '',
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    unitsSold: (p as any).unitsSold ?? '1766+',
    labels: p.labels,
    image: p.image ?? '',
    secondaryImage: p.secondaryImage ?? '',
    images: p.images ?? [],
    soldOut: p.soldOut,
    isFeatured: p.isFeatured,
    featuredOrder: p.featuredOrder,
    isBestSeller: p.isBestSeller,
    bestSellerOrder: p.bestSellerOrder,
    form: p.form,
    netQuantity: p.netQuantity,
    keyIngredients: p.keyIngredients,
    benefits: p.benefits,
    howToUse: p.howToUse,
    suitableFor: p.suitableFor,
    shelfLifeMonths: p.shelfLifeMonths,
    storage: p.storage,
    countryOfOrigin: p.countryOfOrigin,
    manufacturedBy: p.manufacturedBy,
    marketedBy: p.marketedBy,
    concerns: (p.concerns ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    isCombo: p.isCombo,
    /**
     * What is inside a combo. Empty for a single product, so the PDP can just
     * check the length rather than branching on isCombo.
     */
    bundleItems: (p.bundleItems ?? []).map((b) => ({
      id: b.id,
      quantity: b.quantity,
      componentId: b.componentId,
      title: b.component?.title ?? '',
      handle: b.component?.handle ?? '',
      image: b.component?.image ?? '',
      netQuantity: b.component?.netQuantity ?? null,
    })),
    options: p.options.map((o) => ({
      id: o.id,
      name: o.name,
      sku: o.sku,
      price: o.price,
      comparePrice: o.comparePrice ?? undefined,
      savings: o.savings ?? undefined,
      memberPrice: o.memberPrice ?? undefined,
      stock: o.stock,
    })),
  };
}
