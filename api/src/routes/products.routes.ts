import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/error';
import { serializeProduct } from '../serializers/product';

const router = Router();

const INCLUDE = {
  options: { orderBy: { sortOrder: 'asc' } },
  categories: true,
  concerns: true,
  productCategoryBar: true,
} as const;

/**
 * The single-product view additionally resolves what is inside a combo. It is
 * kept out of INCLUDE because the listing renders cards — pulling every kit's
 * components for a 40-product grid is work nobody looks at.
 */
const INCLUDE_DETAIL = {
  ...INCLUDE,
  bundleItems: {
    orderBy: { sortOrder: 'asc' },
    include: {
      component: { select: { id: true, handle: true, title: true, image: true, netQuantity: true } },
    },
  },
} as const;

/**
 * Hard ceiling on the un-paginated listing.
 *
 * The client's brief allows for up to 5000 products. This endpoint joins every
 * option and category on every row, so returning the whole table is not
 * something to leave unbounded — anything that needs to browse a catalog that
 * size must use /search, which paginates. The cap is high enough that a normal
 * catalog is unaffected and low enough that this can never take the API down.
 */
const FULL_LIST_CAP = 500;

/**
 * Public: the full catalog, capped.
 *
 * Used by the prerender step and the home page grid, both of which genuinely
 * want everything at once. `X-Total-Count` always reports the true total, so a
 * caller can tell it was truncated rather than silently rendering a partial
 * catalog as if it were complete.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [total, products] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        include: INCLUDE,
        orderBy: { createdAt: 'asc' },
        take: FULL_LIST_CAP,
      }),
    ]);
    res.setHeader('X-Total-Count', String(total));
    if (total > FULL_LIST_CAP) {
      res.setHeader('X-Truncated', 'true');
      console.warn(
        `GET /api/products returned ${FULL_LIST_CAP} of ${total} products. ` +
          'Callers that need the rest must page through /api/products/search.',
      );
    }
    res.json(products.map(serializeProduct));
  }),
);

/**
 * Public: paginated search and filtering.
 *
 * This is the endpoint that has to survive a large catalog, so it filters,
 * sorts and pages in Postgres rather than shipping rows to the browser to be
 * filtered there.
 *
 * Matching is a case-insensitive substring over title, USP and description.
 * That compiles to ILIKE '%q%', which cannot use a btree index — fine at the
 * few-thousand-row scale in the brief, but if the catalog grows an order of
 * magnitude beyond it, this is the query to move to a tsvector index.
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const categorySlug = String(req.query.category ?? '').trim();
    const collectionSlug = String(req.query.collection ?? '').trim();
    const sort = String(req.query.sort ?? 'newest');

    // Clamped, not trusted: `limit` is a public query parameter, and an
    // unbounded one re-introduces exactly the problem this endpoint exists to
    // avoid. NaN falls back to the default rather than to zero.
    const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const rawLimit = Number.parseInt(String(req.query.limit ?? '24'), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 24;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { usp: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        // Category name too, so "anklets" finds anklets even when the word is
        // not in the product title — people search by what a thing IS.
        { categories: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    if (categorySlug) where.categories = { some: { slug: categorySlug } };
    if (collectionSlug) where.collections = { some: { slug: collectionSlug } };

    // Price sorting is deliberately absent here: a product's price lives on its
    // options, so "cheapest first" is not a column Postgres can order this
    // query by. The storefront sorts a page by its own headline price instead.
    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'title'
          ? { title: 'asc' as const }
          : sort === 'rating'
            ? { rating: 'desc' as const }
            : { createdAt: 'desc' as const };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: INCLUDE,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      items: products.map(serializeProduct),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  }),
);

/** Public: get all product category bars. */
router.get(
  '/category-bars',
  asyncHandler(async (_req, res) => {
    const bars = await prisma.productCategoryBar.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(bars);
  }),
);

/** Public: single product by handle. */
router.get(
  '/:handle',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { handle: req.params.handle },
      include: INCLUDE_DETAIL,
    });
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(serializeProduct(product));
  }),
);

export default router;
