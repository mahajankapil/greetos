import { prisma } from '../config/prisma';

/**
 * Recomputes a product's denormalised rating and review count.
 *
 * `Product.rating` / `Product.reviewsCount` exist so a product grid can show
 * stars without joining and averaging every review on every card. That is only
 * safe if they are refreshed whenever the set of APPROVED reviews changes —
 * on submit, on approve, on un-approve, and on delete.
 *
 * Counting only approved reviews is the point: a product must not advertise a
 * rating built partly from reviews nobody has moderated yet.
 */
export async function recomputeProductRating(productId: string): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  // One decimal place, matching how the storefront prints it ("4.6 / 5.0").
  // Rounding here rather than at render time keeps the number in the database
  // identical to the number in the Product structured data.
  const rating = count > 0 ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0;

  await prisma.product.update({
    where: { id: productId },
    data: { rating, reviewsCount: count },
  });
}
