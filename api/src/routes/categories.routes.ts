import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/error';
import { serializeProduct } from '../serializers/product';

const router = Router();

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children: TreeNode[];
}

/** Public: the full category tree (top-level with nested children) + product counts. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const all = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });

    const byId = new Map<string, TreeNode>(
      all.map((c) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image,
          parentId: c.parentId,
          productCount: c._count.products,
          children: [],
        },
      ]),
    );

    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    res.json(roots);
  }),
);

/** Public: a category by slug — its subcategories AND its direct products. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { products: true } } },
        },
        products: {
          include: { options: true, categories: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!category) throw new HttpError(404, 'Category not found');

    res.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      subcategories: category.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
      })),
      products: category.products.map(serializeProduct),
    });
  }),
);

export default router;
