import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { config } from '../config/config';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { serializeProduct } from '../serializers/product';
import { stepsForStatus } from '../utils/order';
import { emailConfigured, sendAdminInviteEmail, sendCreatorInviteEmail, sendOrderStatusEmail, verifyEmailTransport, type OrderEmailInput } from '../services/email';
import { buildPasswordLink } from './auth.routes';
import { getReferralSettings, REFERRAL_SETTING_KEYS, rewardReferrerIfDue } from '../utils/referral';
import {
  PAYABLE_ORDER_FILTER,
  isRedemptionPayable,
  payableCommissionByCreator,
  payoutsByCreator,
} from '../utils/creatorEarnings';
import { CREATOR_SETTING_KEYS, getCreatorSettings } from '../utils/creatorSettings';
import { BUSINESS_SETTING_KEYS, computeGst, getBusinessSettings, missingBusinessFields } from '../utils/businessSettings';
import { recomputeProductRating } from '../utils/reviews';

const router = Router();

// Everything in this file requires an authenticated admin.
router.use(requireAuth, requireAdmin);

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function makeUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || 'category';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
}

async function makeUniqueConcernSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || 'concern';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.concern.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
}

// ── Categories ─────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  parentId: z.string().nullable().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/** Admin: all categories (including inactive) with full fields + product counts. */
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const cats = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    res.json(
      cats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        image: c.image,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: c._count.products,
      })),
    );
  }),
);

/** Create a category (top-level if parentId is null/absent). */
router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body);
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new HttpError(400, 'Parent category not found');
    }
    const slug = await makeUniqueSlug(input.name);
    const cat = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        parentId: input.parentId ?? null,
        image: input.image,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    res.status(201).json(cat);
  }),
);

/** Update a category. Guards against making a category its own parent. */
router.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const input = categorySchema.partial().parse(req.body);
    const id = req.params.id;
    if (input.parentId === id) throw new HttpError(400, 'A category cannot be its own parent');

    // Prevent cycles: the new parent must not be a descendant of this category.
    if (input.parentId) {
      let cursor: string | null = input.parentId;
      while (cursor) {
        if (cursor === id) throw new HttpError(400, 'Cannot nest a category under its own descendant');
        const parent: { parentId: string | null } | null = await prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = parent?.parentId ?? null;
      }
    }

    const cat = await prisma.category.update({ where: { id }, data: input });
    res.json(cat);
  }),
);

/** Delete a category. Children become top-level; product links are removed. */
router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ── Concerns ───────────────────────────────────────────────────
/**
 * A concern is a shopper-facing grouping ("Leafy Greens", "Root
 * Vegetables"). Flat by design — concerns do not nest, so there is none of the
 * parent/cycle handling categories need.
 */
const concernSchema = z.object({
  name: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  image: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/** Admin: all concerns (including inactive) with product counts. */
router.get(
  '/concerns',
  asyncHandler(async (_req, res) => {
    const all = await prisma.concern.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    res.json(
      all.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        subtitle: c.subtitle,
        description: c.description,
        image: c.image,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        productCount: c._count.products,
      })),
    );
  }),
);

router.post(
  '/concerns',
  asyncHandler(async (req, res) => {
    const input = concernSchema.parse(req.body);
    const slug = await makeUniqueConcernSlug(input.name);
    const concern = await prisma.concern.create({
      data: {
        name: input.name,
        slug,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        image: input.image ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    res.status(201).json(concern);
  }),
);

/**
 * Update a concern. The slug is deliberately NOT regenerated from a renamed
 * concern: the storefront links /collections/<slug>, so silently changing it
 * would 404 every link already published.
 */
router.put(
  '/concerns/:id',
  asyncHandler(async (req, res) => {
    const input = concernSchema.partial().parse(req.body);
    const concern = await prisma.concern.update({ where: { id: req.params.id }, data: input });
    res.json(concern);
  }),
);

/** Delete a concern. Product links go with it; the products themselves stay. */
router.delete(
  '/concerns/:id',
  asyncHandler(async (req, res) => {
    await prisma.concern.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ── Products ───────────────────────────────────────────────────
/**
 * Form fields arrive as "" when the admin leaves them blank. Persisting that
 * would make the PDP print an empty spec row, so blank is normalised to null.
 */
const optionalText = z.string().trim().max(500).optional().nullable();

const optionSchema = z.object({
  name: z.string().min(1),
  sku: z.string().trim().max(60).optional().nullable(),
  price: z.number().int().nonnegative(),
  comparePrice: z.number().int().nonnegative().optional(),
  memberPrice: z.number().int().nonnegative().optional(),
  savings: z.string().optional(),
  // Per-variant inventory. Defaults to 0 rather than "unlimited": a variant
  // the admin forgot to stock should read as unavailable, not oversell.
  stock: z.number().int().nonnegative().optional(),
});

const productSchema = z.object({
  handle: z.string().min(1).optional(),
  title: z.string().min(1),
  categoryIds: z.array(z.string()).optional(),
  usp: z.string().optional(),
  description: z.string().optional(),
  // Ratings are out of 5; reviews recompute this on their own, this is the manual field.
  rating: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().optional(),
  unitsSold: z.string().optional().nullable(),
  labels: z.array(z.string()).optional(),
  image: z.string().optional(),
  secondaryImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  soldOut: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  featuredOrder: z.number().int().optional(),
  bestSellerOrder: z.number().int().optional(),
  // ── Product spec ───────────────────────────────────────────
  form: optionalText,
  netQuantity: optionalText,
  keyIngredients: z.array(z.string().trim().min(1)).optional(),
  benefits: z.array(z.string().trim().min(1)).optional(),
  howToUse: z.string().trim().max(2000).optional().nullable(),
  suitableFor: optionalText,
  shelfLifeMonths: z.number().int().nonnegative().nullable().optional(),
  storage: optionalText,
  countryOfOrigin: optionalText,
  manufacturedBy: z.string().trim().max(500).optional().nullable(),
  marketedBy: z.string().trim().max(500).optional().nullable(),
  isCombo: z.boolean().optional(),
  concernIds: z.array(z.string()).optional(),
  productCategoryBarId: z.string().nullable().optional(),
  options: z.array(optionSchema).min(1),
});

/** Blank strings from the form become null so the PDP can skip the row. */
function blankToNull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

/** The spec block, shared by create and update so they can never diverge. */
function specFields(input: z.infer<typeof productSchema>) {
  return {
    form: blankToNull(input.form),
    netQuantity: blankToNull(input.netQuantity),
    // Trim and drop blanks: the admin's chip inputs happily emit an empty
    // entry when someone hits comma twice, and an empty ingredient renders as
    // a stray bullet on the PDP.
    ...(input.keyIngredients ? { keyIngredients: input.keyIngredients.map((v) => v.trim()).filter(Boolean) } : {}),
    ...(input.benefits ? { benefits: input.benefits.map((v) => v.trim()).filter(Boolean) } : {}),
    howToUse: blankToNull(input.howToUse),
    suitableFor: blankToNull(input.suitableFor),
    shelfLifeMonths: input.shelfLifeMonths ?? null,
    storage: blankToNull(input.storage),
    countryOfOrigin: blankToNull(input.countryOfOrigin),
    manufacturedBy: blankToNull(input.manufacturedBy),
    marketedBy: blankToNull(input.marketedBy),
    ...(input.isCombo === undefined ? {} : { isCombo: input.isCombo }),
  };
}

/** Create a product. */
router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body);
    const handle = input.handle ?? slugify(input.title);
    const product = await prisma.product.create({
      data: {
        handle,
        title: input.title,
        usp: input.usp,
        description: input.description,
        rating: input.rating ?? 0,
        reviewsCount: input.reviewsCount ?? 0,
        unitsSold: blankToNull(input.unitsSold) ?? '1766+',
        labels: input.labels ?? [],
        image: input.image,
        secondaryImage: input.secondaryImage,
        images: input.images ?? [],
        soldOut: input.soldOut ?? false,
        isFeatured: input.isFeatured ?? false,
        isBestSeller: input.isBestSeller ?? false,
        featuredOrder: input.featuredOrder ?? 0,
        bestSellerOrder: input.bestSellerOrder ?? 0,
        ...specFields(input),
        productCategoryBarId: input.productCategoryBarId,
        categories: { connect: (input.categoryIds ?? []).map((id) => ({ id })) },
        concerns: { connect: (input.concernIds ?? []).map((id) => ({ id })) },
        options: { create: input.options.map((o, i) => ({ ...o, sortOrder: i })) },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } }, categories: true, concerns: true, productCategoryBar: true },
    });
    res.status(201).json(serializeProduct(product));
  }),
);

/** Update a product (replaces options and category assignments). Accepts DB id or legacyId. */
router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyId: req.params.id }] },
    });
    if (!existing) throw new HttpError(404, 'Product not found');

    const product = await prisma.$transaction(async (tx) => {
      await tx.productOption.deleteMany({ where: { productId: existing.id } });
      return tx.product.update({
        where: { id: existing.id },
        data: {
          handle: input.handle ?? existing.handle,
          title: input.title,
          usp: input.usp,
          description: input.description,
          rating: input.rating !== undefined ? input.rating : existing.rating,
          reviewsCount: input.reviewsCount !== undefined ? input.reviewsCount : existing.reviewsCount,
          unitsSold: input.unitsSold !== undefined ? blankToNull(input.unitsSold) : (existing as any).unitsSold,
          labels: input.labels ?? existing.labels,
          image: input.image,
          secondaryImage: input.secondaryImage,
          images: input.images ?? existing.images,
          soldOut: input.soldOut ?? existing.soldOut,
          isFeatured: input.isFeatured ?? existing.isFeatured,
          isBestSeller: input.isBestSeller ?? existing.isBestSeller,
          featuredOrder: input.featuredOrder ?? existing.featuredOrder,
          bestSellerOrder: input.bestSellerOrder ?? existing.bestSellerOrder,
          ...specFields(input),
          productCategoryBarId: input.productCategoryBarId !== undefined ? input.productCategoryBarId : existing.productCategoryBarId,
          categories: { set: (input.categoryIds ?? []).map((id) => ({ id })) },
          concerns: { set: (input.concernIds ?? []).map((id) => ({ id })) },
          options: { create: input.options.map((o, i) => ({ ...o, sortOrder: i })) },
        },
        include: { options: { orderBy: { sortOrder: 'asc' } }, categories: true, concerns: true, productCategoryBar: true },
      });
    }, { timeout: 30000 });
    res.json(serializeProduct(product));
  }),
);

/** Delete a product. Accepts DB id or legacyId. */
router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyId: req.params.id }] },
    });
    if (!existing) throw new HttpError(404, 'Product not found');
    await prisma.product.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

// ── Product Category Bar ─────────────────────────────────────────
router.get(
  '/product-category-bars',
  asyncHandler(async (_req, res) => {
    const bars = await prisma.productCategoryBar.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(bars);
  }),
);

router.post(
  '/product-category-bars',
  asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const existing = await prisma.productCategoryBar.findUnique({ where: { name } });
    if (existing) throw new HttpError(409, 'Category Bar with this name already exists');
    
    const bar = await prisma.productCategoryBar.create({
      data: { name },
    });
    res.status(201).json(bar);
  }),
);

router.delete(
  '/product-category-bars/:id',
  asyncHandler(async (req, res) => {
    await prisma.productCategoryBar.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

router.put(
  '/product-category-bars/:id',
  asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const existing = await prisma.productCategoryBar.findUnique({ where: { name } });
    if (existing && existing.id !== req.params.id) {
      throw new HttpError(409, 'Category Bar with this name already exists');
    }
    const bar = await prisma.productCategoryBar.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(bar);
  }),
);

// ── Announcements ──────────────────────────────────────────────
router.put(
  '/announcements',
  asyncHandler(async (req, res) => {
    const { messages, enabled } = z.object({
      messages: z.array(z.string().min(1)),
      enabled: z.boolean().default(true),
    }).parse(req.body);
    await prisma.$transaction([
      prisma.announcement.deleteMany({}),
      prisma.announcement.createMany({
        data: messages.map((message, i) => ({ message, sortOrder: i, active: true })),
      }),
      prisma.setting.upsert({
        where: { key: 'announcement_bar_enabled' },
        update: { value: String(enabled) },
        create: { key: 'announcement_bar_enabled', value: String(enabled) },
      }),
    ]);
    res.json({ ok: true, count: messages.length, enabled });
  }),
);

// ── Notifications ──────────────────────────────────────────────
const notificationSchema = z.object({
  type: z.enum(['offer', 'info']),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
});

/** Send (create) a notification — broadcast to all customers' bell. */
router.post(
  '/notifications',
  asyncHandler(async (req, res) => {
    const input = notificationSchema.parse(req.body);
    const notification = await prisma.notification.create({ data: input });
    res.status(201).json(notification);
  }),
);

/** Delete a notification. */
router.delete(
  '/notifications/:id',
  asyncHandler(async (req, res) => {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ── Orders ─────────────────────────────────────────────────────
router.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  }),
);

router.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ status: z.string().min(1).optional(), steps: z.array(z.unknown()).optional() })
      .parse(req.body);

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Order not found');

    // Cash-on-delivery orders carry no payment until the courier actually
    // collects it. Marking one Delivered is the real-world signal that cash
    // changed hands, so flip it to paid here — this is COD's equivalent of
    // the Razorpay-verified moment that unlocks a referrer's reward for
    // prepaid orders. One-directional by design: correcting the status back
    // later must not un-collect cash that was physically handed over.
    const shouldAutoMarkPaid =
      body.status === 'Delivered' && existing.paymentMethod === 'cod' && existing.paymentStatus === 'pending';

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        // Changing status also rebuilds the tracking timeline so the customer's
        // My Orders / Track Order view reflects the new stage. An explicit
        // `steps` payload still wins if provided.
        ...(body.status ? { status: body.status, steps: stepsForStatus(body.status) as object } : {}),
        ...(body.steps ? { steps: body.steps as object } : {}),
        ...(shouldAutoMarkPaid ? { paymentStatus: 'paid' } : {}),
      },
      include: { items: true },
    });

    if (shouldAutoMarkPaid && existing.userId) {
      try {
        await rewardReferrerIfDue(existing.userId);
      } catch (e) {
        console.error('Referral reward failed for user', existing.userId, e);
      }
    }

    // Lifecycle emails on the milestones a customer actually cares about.
    // Only when the status genuinely changed — re-saving the same status
    // must not re-send. Never fatal to the status update itself.
    const EMAIL_FOR_STATUS: Record<string, 'processing' | 'shipped' | 'delivered'> = {
      'In Process': 'processing',
      Shipped: 'shipped',
      Delivered: 'delivered',
    };
    const kind = body.status ? EMAIL_FOR_STATUS[body.status] : undefined;
    if (kind && body.status !== existing.status && order.email && emailConfigured()) {
      sendOrderStatusEmail(order.email, kind, {
        orderNo: order.orderNo,
        customer: order.customer,
        total: order.total,
        paymentMethod: order.paymentMethod,
        items: order.items.map((i) => ({
          productTitle: i.productTitle,
          optionName: i.optionName,
          quantity: i.quantity,
        })),
        awb: order.trackingNumber,
        courier: order.courierName,
      }).catch((e) => console.error(`${kind} email failed for`, order.orderNo, e));
    }

    res.json(order);
  }),
);

// ── Manual fulfilment ─────────────────────────────────────────

/**
 * Records that an order was dispatched: which courier took it and the docket
 * number, typed in by whoever packed it. There is no courier integration —
 * this is the whole of fulfilment.
 *
 * Re-submitting is allowed on purpose: docket numbers get mistyped, and
 * making the admin delete an order to fix one would be worse.
 */
const dispatchSchema = z.object({
  courierName: z.string().trim().min(1).max(80),
  trackingNumber: z.string().trim().max(120).optional().nullable(),
  trackingUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal('')),
});

router.put(
  '/orders/:id/dispatch',
  asyncHandler(async (req, res) => {
    const input = dispatchSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Order not found');
    if (!order.addressLine1 || !order.pincode) {
      throw new HttpError(400, 'This order has no delivery address, so it cannot be dispatched.');
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        courierName: input.courierName,
        trackingNumber: blankToNull(input.trackingNumber),
        trackingUrl: blankToNull(input.trackingUrl),
        // Keep the original dispatch date when a correction comes in later —
        // fixing a typo should not reset when the parcel actually left.
        dispatchedAt: order.dispatchedAt ?? new Date(),
      },
      include: { items: true },
    });

    res.json(updated);
  }),
);

/** Clears the dispatch record — for when it was entered against the wrong order. */
router.delete(
  '/orders/:id/dispatch',
  asyncHandler(async (req, res) => {
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { courierName: null, trackingNumber: null, trackingUrl: null, dispatchedAt: null },
      include: { items: true },
    });
    res.json(updated);
  }),
);

// ── Email health ───────────────────────────────────────────────

/** Verifies the SMTP connection so the panel can show whether invites will work. */
router.get(
  '/email/status',
  asyncHandler(async (_req, res) => {
    if (!emailConfigured()) {
      res.json({ configured: false, ok: false, message: 'SMTP is not configured (SMTP_HOST / SMTP_FROM).' });
      return;
    }
    try {
      await verifyEmailTransport();
      res.json({ configured: true, ok: true, message: `Connected to ${config.smtp.host}.` });
    } catch (e) {
      res.json({
        configured: true,
        ok: false,
        message: e instanceof Error ? e.message : 'Could not connect to the SMTP server.',
      });
    }
  }),
);

// ── Creators / affiliate programme ─────────────────────────────

const creatorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  handle: z.string().trim().max(60).optional().or(z.literal('')),
  code: z.string().trim().min(3).max(30),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().positive(),
  minAmount: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().int().positive().nullable().optional(),
  commissionType: z.enum(['percent', 'flat']),
  commissionValue: z.number().int().nonnegative(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  /** Also create a portal login and email them an invite. */
  createLogin: z.boolean().optional(),
});

/** Rolls redemption rows up into the per-creator numbers the panel shows. */
function summarise(redemptions: { orderTotal: number; discount: number; commission: number }[]) {
  return {
    uses: redemptions.length,
    revenue: redemptions.reduce((s, r) => s + r.orderTotal, 0),
    discountGiven: redemptions.reduce((s, r) => s + r.discount, 0),
    commission: redemptions.reduce((s, r) => s + r.commission, 0),
  };
}

/**
 * Creates the partner's login and emails them a set-password link.
 *
 * Returns a non-fatal report rather than throwing: a creator whose invite
 * email bounced is still a valid creator, and the caller decides how loudly
 * to say so (same contract as the admin-user invite).
 */
async function inviteCreator(creator: {
  id: string;
  name: string;
  email: string;
  userId: string | null;
  coupon: { code: string };
}): Promise<{ sent: boolean; error?: string }> {
  let userId = creator.userId;

  if (!userId) {
    // An existing account on this address (e.g. they shop here too) is promoted
    // rather than duplicated — email is unique on User, so we cannot re-create it.
    const existing = await prisma.user.findUnique({ where: { email: creator.email } });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { role: existing.role === 'admin' ? existing.role : 'creator', name: existing.name ?? creator.name },
        })
      : await prisma.user.create({
          data: { email: creator.email, name: creator.name, role: 'creator', isActive: true },
        });
    userId = user.id;
    await prisma.creator.update({ where: { id: creator.id }, data: { userId } });
  }

  if (!emailConfigured()) return { sent: false, error: 'Email is not configured, so no invite was sent.' };
  try {
    await sendCreatorInviteEmail(
      creator.email,
      creator.name,
      creator.coupon.code,
      config.urls.admin,
      buildPasswordLink(userId, '24h'),
    );
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Could not send the invite email.' };
  }
}

/** All creators with their coupon, lifetime performance and payout position. */
router.get(
  '/creators',
  asyncHandler(async (_req, res) => {
    const [creators, volume, payable, payouts] = await Promise.all([
      prisma.creator.findMany({ orderBy: { createdAt: 'desc' }, include: { coupon: true } }),
      // One grouped query instead of loading every redemption row per creator.
      prisma.couponRedemption.groupBy({
        by: ['creatorId'],
        where: { creatorId: { not: null } },
        _count: { id: true },
        _sum: { orderTotal: true, discount: true, commission: true },
      }),
      payableCommissionByCreator(),
      payoutsByCreator(),
    ]);

    const volumeById = new Map(volume.map((v) => [v.creatorId as string, v]));

    res.json(
      creators.map((c) => {
        const v = volumeById.get(c.id);
        const commission = v?._sum.commission ?? 0;
        const payableCommission = payable.get(c.id) ?? 0;
        const requestedPayouts = payouts.get(`${c.id}:requested`) ?? 0;
        const paidPayouts = payouts.get(`${c.id}:paid`) ?? 0;

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          handle: c.handle,
          isActive: c.isActive,
          notes: c.notes,
          createdAt: c.createdAt,
          commissionType: c.commissionType,
          commissionValue: c.commissionValue,
          hasLogin: Boolean(c.userId),
          coupon: {
            code: c.coupon.code,
            discountType: c.coupon.discountType,
            discountValue: c.coupon.discountValue,
            minAmount: c.coupon.minAmount,
            maxDiscount: c.coupon.maxDiscount,
            active: c.coupon.active,
          },
          stats: {
            uses: v?._count.id ?? 0,
            revenue: v?._sum.orderTotal ?? 0,
            discountGiven: v?._sum.discount ?? 0,
            commission,
            payableCommission,
            pendingCommission: commission - payableCommission,
            requestedPayouts,
            paidPayouts,
            available: Math.max(0, payableCommission - requestedPayouts - paidPayouts),
          },
        };
      }),
    );
  }),
);

/** Programme-wide totals for the dashboard header. */
router.get(
  '/creators/summary',
  asyncHandler(async (_req, res) => {
    const [redemptions, creatorCount, activeCount, payableAgg, payoutRows, openRequests] =
      await Promise.all([
        prisma.couponRedemption.findMany({ where: { creatorId: { not: null } } }),
        prisma.creator.count(),
        prisma.creator.count({ where: { isActive: true } }),
        prisma.couponRedemption.aggregate({
          _sum: { commission: true },
          where: { creatorId: { not: null }, order: PAYABLE_ORDER_FILTER },
        }),
        prisma.creatorPayout.groupBy({
          by: ['status'],
          _sum: { amount: true },
          where: { status: { in: ['requested', 'paid'] } },
        }),
        prisma.creatorPayout.count({ where: { status: 'requested' } }),
      ]);

    const base = summarise(redemptions);
    const payableCommission = payableAgg._sum.commission ?? 0;
    const requestedPayouts = payoutRows.find((r) => r.status === 'requested')?._sum.amount ?? 0;
    const paidPayouts = payoutRows.find((r) => r.status === 'paid')?._sum.amount ?? 0;

    res.json({
      creators: creatorCount,
      activeCreators: activeCount,
      ...base,
      payableCommission,
      pendingCommission: base.commission - payableCommission,
      requestedPayouts,
      paidPayouts,
      openPayoutRequests: openRequests,
      // What the business still owes across the whole programme.
      outstanding: Math.max(0, payableCommission - paidPayouts),
    });
  }),
);

// ── Partner programme settings ─────────────────────────────────
// Before /creators/:id so "settings" is never read as a creator id.

/** The admin-editable rules for the programme. */
router.get(
  '/creators/settings',
  asyncHandler(async (_req, res) => {
    res.json(await getCreatorSettings());
  }),
);

/** Update the programme rules. */
router.put(
  '/creators/settings',
  asyncHandler(async (req, res) => {
    const { minPayout } = z
      .object({ minPayout: z.number().int().nonnegative().max(1_000_000) })
      .parse(req.body);

    await prisma.setting.upsert({
      where: { key: CREATOR_SETTING_KEYS.minPayout },
      create: { key: CREATOR_SETTING_KEYS.minPayout, value: String(minPayout) },
      update: { value: String(minPayout) },
    });

    res.json(await getCreatorSettings());
  }),
);

// ── Creator payouts ────────────────────────────────────────────
// Declared before the /creators/:id routes so "payouts" is never read as an id.

/** Every payout request, newest first. */
router.get(
  '/creators/payouts',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await prisma.creatorPayout.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true, email: true, coupon: { select: { code: true } } } } },
    });
    res.json(
      rows.map((p) => ({
        id: p.id,
        creatorId: p.creator.id,
        creatorName: p.creator.name,
        creatorEmail: p.creator.email,
        code: p.creator.coupon.code,
        amount: p.amount,
        status: p.status,
        // How to actually pay them — the whole point of the request.
        method: p.method,
        upiId: p.upiId,
        accountName: p.accountName,
        accountNumber: p.accountNumber,
        ifsc: p.ifsc,
        bankName: p.bankName,
        note: p.note,
        adminNote: p.adminNote,
        settledAt: p.settledAt,
        createdAt: p.createdAt,
      })),
    );
  }),
);

/** Settle a payout request — mark it paid (money sent) or reject it. */
router.put(
  '/creators/payouts/:id',
  asyncHandler(async (req, res) => {
    const { status, adminNote } = z
      .object({ status: z.enum(['paid', 'rejected']), adminNote: z.string().trim().max(300).optional() })
      .parse(req.body);

    const existing = await prisma.creatorPayout.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Payout request not found');
    if (existing.status !== 'requested') {
      throw new HttpError(409, `This request was already ${existing.status}.`);
    }

    const updated = await prisma.creatorPayout.update({
      where: { id: existing.id },
      // Rejecting releases the amount back into the partner's available balance,
      // because only 'requested' and 'paid' rows are held against it.
      data: { status, adminNote: adminNote || null, settledAt: new Date() },
    });
    res.json(updated);
  }),
);

/** Per-order breakdown for one creator. */
router.get(
  '/creators/:id/redemptions',
  asyncHandler(async (req, res) => {
    const rows = await prisma.couponRedemption.findMany({
      where: { creatorId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNo: true,
            customer: true,
            status: true,
            paymentStatus: true,
            returnRequests: { select: { status: true } },
          },
        },
      },
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        orderNo: r.order.orderNo,
        customer: r.order.customer,
        status: r.order.status,
        subtotal: r.subtotal,
        discount: r.discount,
        orderTotal: r.orderTotal,
        commission: r.commission,
        payable: isRedemptionPayable(r.order),
        createdAt: r.createdAt,
      })),
    );
  }),
);

/** Create or re-send this creator's portal login invite. */
router.post(
  '/creators/:id/invite',
  asyncHandler(async (req, res) => {
    const creator = await prisma.creator.findUnique({
      where: { id: req.params.id },
      include: { coupon: { select: { code: true } } },
    });
    if (!creator) throw new HttpError(404, 'Creator not found');

    const invite = await inviteCreator(creator);
    if (!invite.sent) throw new HttpError(502, invite.error ?? 'Could not send the invite email.');
    res.json({ message: `Invite sent to ${creator.email}.`, invite });
  }),
);

/** Create a creator together with the coupon their audience will use. */
router.post(
  '/creators',
  asyncHandler(async (req, res) => {
    const input = creatorSchema.parse(req.body);
    const code = input.code.toUpperCase();

    if (await prisma.creator.findUnique({ where: { email: input.email.toLowerCase() } })) {
      throw new HttpError(409, 'A creator with that email already exists.');
    }
    if (await prisma.coupon.findUnique({ where: { code } })) {
      throw new HttpError(409, `The coupon code ${code} is already taken.`);
    }

    const creator = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({
        data: {
          code,
          description: `${input.name}'s creator code`,
          discountType: input.discountType,
          discountValue: input.discountValue,
          minAmount: input.minAmount ?? 0,
          maxDiscount: input.maxDiscount ?? null,
          source: 'creator',
        },
      });
      return tx.creator.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || null,
          handle: input.handle || null,
          notes: input.notes || null,
          commissionType: input.commissionType,
          commissionValue: input.commissionValue,
          couponId: coupon.id,
        },
        include: { coupon: true },
      });
    });

    // Outside the transaction: a bounced invite email must never undo a
    // perfectly good creator + coupon. The caller shows the outcome instead.
    const invite = input.createLogin ? await inviteCreator(creator) : undefined;

    res.status(201).json({ ...creator, hasLogin: Boolean(input.createLogin), invite });
  }),
);

/**
 * Update a creator and their coupon's terms.
 *
 * The coupon CODE is intentionally immutable: it is already out in the world on
 * the creator's posts, and changing it would silently break every link they've
 * shared. Deactivate and issue a new creator instead.
 */
router.put(
  '/creators/:id',
  asyncHandler(async (req, res) => {
    const input = creatorSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.creator.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Creator not found');

    const updated = await prisma.$transaction(async (tx) => {
      if (
        input.discountType !== undefined ||
        input.discountValue !== undefined ||
        input.minAmount !== undefined ||
        input.maxDiscount !== undefined ||
        input.isActive !== undefined
      ) {
        await tx.coupon.update({
          where: { id: existing.couponId },
          data: {
            ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
            ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
            ...(input.minAmount !== undefined ? { minAmount: input.minAmount } : {}),
            ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
            // Pausing a creator pauses their code.
            ...(input.isActive !== undefined ? { active: input.isActive } : {}),
          },
        });
      }
      return tx.creator.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
          ...(input.handle !== undefined ? { handle: input.handle || null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
          ...(input.commissionType !== undefined ? { commissionType: input.commissionType } : {}),
          ...(input.commissionValue !== undefined ? { commissionValue: input.commissionValue } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        include: { coupon: true },
      });
    });

    res.json(updated);
  }),
);

/**
 * Delete a creator. Their redemption history is kept (creatorId is nulled), so
 * past revenue reporting stays intact; the coupon is retired at the same time.
 *
 * Blocked once money is involved: payouts and bonuses cascade-delete with the
 * creator, so removing one who has been paid would erase the only record that
 * it happened. Pause them instead — that retires the code just the same.
 */
router.delete(
  '/creators/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.creator.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Creator not found');

    const payouts = await prisma.creatorPayout.count({ where: { creatorId: existing.id } });
    if (payouts > 0) {
      throw new HttpError(
        409,
        'This partner has payout history, which must be kept. Pause them instead — it retires their code the same way.',
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.couponRedemption.updateMany({ where: { creatorId: existing.id }, data: { creatorId: null } });
      await tx.creator.delete({ where: { id: existing.id } });
      await tx.coupon.update({ where: { id: existing.couponId }, data: { active: false } });
    });

    res.json({ message: 'Creator removed and their code retired.' });
  }),
);

// ── Referral programme ─────────────────────────────────────────

/** Current referral settings plus how the programme is performing. */
router.get(
  '/referrals',
  asyncHandler(async (_req, res) => {
    const [settings, referrals, rewarded] = await Promise.all([
      getReferralSettings(),
      prisma.referral.count(),
      prisma.referral.count({ where: { status: 'rewarded' } }),
    ]);

    const top = await prisma.referral.groupBy({
      by: ['referrerId'],
      _count: { referrerId: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: 10,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((t) => t.referrerId) } },
      select: { id: true, name: true, email: true, referralCode: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    res.json({
      settings,
      stats: { total: referrals, rewarded, pending: referrals - rewarded },
      leaderboard: top.map((t) => ({
        userId: t.referrerId,
        name: byId.get(t.referrerId)?.name ?? null,
        email: byId.get(t.referrerId)?.email ?? null,
        code: byId.get(t.referrerId)?.referralCode ?? null,
        referrals: t._count.referrerId,
      })),
    });
  }),
);

/** Update the referral terms. Existing issued coupons keep their old terms. */
router.put(
  '/referrals',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        enabled: z.boolean().optional(),
        refereePercent: z.number().int().min(0).max(100).optional(),
        referrerPercent: z.number().int().min(0).max(100).optional(),
        maxDiscount: z.number().int().min(0).nullable().optional(),
        minAmount: z.number().int().min(0).optional(),
        validityDays: z.number().int().min(1).max(3650).optional(),
      })
      .parse(req.body);

    const writes: { key: string; value: string }[] = [];
    if (input.enabled !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.enabled, value: String(input.enabled) });
    if (input.refereePercent !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.refereePercent, value: String(input.refereePercent) });
    if (input.referrerPercent !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.referrerPercent, value: String(input.referrerPercent) });
    if (input.maxDiscount !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.maxDiscount, value: input.maxDiscount == null ? '' : String(input.maxDiscount) });
    if (input.minAmount !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.minAmount, value: String(input.minAmount) });
    if (input.validityDays !== undefined) writes.push({ key: REFERRAL_SETTING_KEYS.validityDays, value: String(input.validityDays) });

    for (const w of writes) {
      await prisma.setting.upsert({ where: { key: w.key }, update: { value: w.value }, create: w });
    }

    res.json({ settings: await getReferralSettings() });
  }),
);

// ── Users ──────────────────────────────────────────────────────
/** List all users (customers + admins), with an order count. */
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        orderCount: u._count.orders,
        createdAt: u.createdAt,
      })),
    );
  }),
);

const createUserSchema = z
  .object({
    role: z.enum(['customer', 'admin']),
    name: z.string().trim().min(1).max(80),
    phone: z.string().regex(/^\d{10}$/).optional(),
    email: z.string().email().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'admin') {
      if (!val.email) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email is required for an admin', path: ['email'] });
    } else if (!val.phone && !val.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A mobile number or email is required for a customer', path: ['phone'] });
    }
  });

/**
 * Create a new user.
 *
 * Admins are created WITHOUT a password: we email them a signed, 24-hour
 * set-password link plus the panel URL, so a password never travels in an email
 * and the invitee chooses their own. The account cannot be signed into until
 * they use that link.
 *
 * The response reports whether the invite actually went out, so the panel can
 * surface an SMTP problem instead of silently creating an unusable account.
 */
router.post(
  '/users',
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const email = input.email?.toLowerCase();

    if (input.phone && (await prisma.user.findUnique({ where: { phone: input.phone } }))) {
      throw new HttpError(409, 'A user with that mobile number already exists.');
    }
    if (email && (await prisma.user.findUnique({ where: { email } }))) {
      throw new HttpError(409, 'A user with that email already exists.');
    }

    const user = await prisma.user.create({
      data: { role: input.role, name: input.name, phone: input.phone, email },
    });

    let invite: { sent: boolean; error?: string } = { sent: false };
    if (user.role === 'admin' && user.email) {
      if (!emailConfigured()) {
        invite = { sent: false, error: 'SMTP is not configured, so no invite email was sent.' };
      } else {
        try {
          await sendAdminInviteEmail(
            user.email,
            user.name ?? 'there',
            config.urls.admin,
            buildPasswordLink(user.id, '24h'),
          );
          invite = { sent: true };
        } catch (e) {
          // The account exists and the invite can be re-sent, so don't fail the
          // whole request — just tell the panel what went wrong.
          invite = { sent: false, error: e instanceof Error ? e.message : 'Could not send the invite email.' };
        }
      }
    }

    res.status(201).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      orderCount: 0,
      createdAt: user.createdAt,
      invite,
    });
  }),
);

/** Re-sends the set-password invite to an admin who never used (or lost) theirs. */
router.post(
  '/users/:id/resend-invite',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new HttpError(404, 'User not found');
    if (user.role !== 'admin' || !user.email) {
      throw new HttpError(400, 'Invites can only be sent to admin users with an email address.');
    }
    if (!emailConfigured()) throw new HttpError(503, 'SMTP is not configured on the server.');

    await sendAdminInviteEmail(
      user.email,
      user.name ?? 'there',
      config.urls.admin,
      buildPasswordLink(user.id, '24h'),
    );
    res.json({ message: `Invite re-sent to ${user.email}.` });
  }),
);

// ── Coupons ────────────────────────────────────────────────────
const couponSchema = z.object({
  code: z.string().trim().min(3).max(30),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().int().positive(),
  minAmount: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().int().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
});

/** List all coupons with summary stats for the admin dashboard. */
router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const [coupons, discountAgg] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.order.aggregate({ _sum: { discount: true } }),
    ]);
    const stats = {
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter((c) => c.active).length,
      totalRedemptions: coupons.reduce((sum, c) => sum + c.usedCount, 0),
      totalDiscountGiven: discountAgg._sum.discount ?? 0,
    };
    res.json({ coupons, stats });
  }),
);

/** Create a coupon. Code is normalised to UPPERCASE and must be unique. */
router.post(
  '/coupons',
  asyncHandler(async (req, res) => {
    const input = couponSchema.parse(req.body);
    const code = input.code.toUpperCase();
    if (await prisma.coupon.findUnique({ where: { code } })) {
      throw new HttpError(409, 'A coupon with that code already exists.');
    }
    if (input.discountType === 'percent' && input.discountValue > 100) {
      throw new HttpError(400, 'Percentage discount cannot exceed 100.');
    }
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: input.description || null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minAmount: input.minAmount ?? 0,
        maxDiscount: input.discountType === 'percent' ? input.maxDiscount ?? null : null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        active: input.active ?? true,
      },
    });
    res.status(201).json(coupon);
  }),
);

/** Update / toggle a coupon. */
router.put(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    const input = couponSchema.partial().parse(req.body);
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Coupon not found');

    const nextType = input.discountType ?? existing.discountType;
    const nextValue = input.discountValue ?? existing.discountValue;
    if (nextType === 'percent' && nextValue > 100) {
      throw new HttpError(400, 'Percentage discount cannot exceed 100.');
    }

    let code = existing.code;
    if (input.code && input.code.toUpperCase() !== existing.code) {
      code = input.code.toUpperCase();
      if (await prisma.coupon.findUnique({ where: { code } })) {
        throw new HttpError(409, 'A coupon with that code already exists.');
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        code,
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
        ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
        ...(input.minAmount !== undefined ? { minAmount: input.minAmount } : {}),
        // maxDiscount only applies to percentage coupons; clear it for flat ones.
        ...(nextType === 'flat' ? { maxDiscount: null } : input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
        ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
        ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    res.json(coupon);
  }),
);

/** Delete a coupon. */
router.delete(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ── Payments report ────────────────────────────────────────────
/**
 * The finance view. Three facts have to survive into every number here,
 * because the old report quietly got all three wrong:
 *
 *  1. COD is not revenue until it is collected. An undelivered COD order is
 *     cash sitting with a courier, so it is reported separately as "to
 *     collect" and never mixed into what has actually landed.
 *  2. An accepted return is not a sale. It is subtracted to give a net figure
 *     rather than left inflating the total.
 *  3. Prepaid and COD have to be separable, because only the prepaid column
 *     can ever be reconciled against a Razorpay settlement.
 *
 * Cancelled orders are excluded outright. Volume is small, so the aggregation
 * runs in JS rather than as several round trips.
 */
router.get(
  '/payments/report',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'Cancelled' } },
      select: {
        id: true,
        orderNo: true,
        customer: true,
        total: true,
        discount: true,
        razorpayPaymentId: true,
        paymentStatus: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        // Same definition of "returned" the partner earnings use, so the two
        // pages can never disagree about which orders counted.
        returnRequests: { where: { status: 'Accepted' }, select: { id: true } },
        invoice: { select: { invoiceNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      customer: o.customer,
      total: o.total,
      discount: o.discount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt,
      /** What you'd quote to trace the money: a gateway id, or the cash itself. */
      paymentRef: o.razorpayPaymentId ?? (o.paymentMethod === 'cod' ? 'Cash on Delivery' : null),
      invoiceNo: o.invoice?.invoiceNo ?? null,
      refunded: o.returnRequests.length > 0,
    }));

    const sum = (list: typeof rows, pick: (r: (typeof rows)[number]) => number) =>
      list.reduce((n, r) => n + pick(r), 0);

    const collected = rows.filter((r) => r.paymentStatus === 'paid');
    const prepaid = collected.filter((r) => r.paymentMethod !== 'cod');
    const cod = collected.filter((r) => r.paymentMethod === 'cod');
    const awaitingCod = rows.filter((r) => r.paymentMethod === 'cod' && r.paymentStatus !== 'paid');
    const refunded = collected.filter((r) => r.refunded);

    const grossCollected = sum(collected, (r) => r.total);
    const refundedValue = sum(refunded, (r) => r.total);

    const stats = {
      /** Money in hand, minus anything given back. The headline number. */
      netRevenue: grossCollected - refundedValue,
      grossCollected,
      prepaidCollected: sum(prepaid, (r) => r.total),
      codCollected: sum(cod, (r) => r.total),
      /** Cash still out with couriers on undelivered COD orders. */
      codPending: sum(awaitingCod, (r) => r.total),
      codPendingOrders: awaitingCod.length,
      refundedValue,
      refundedOrders: refunded.length,
      paidOrders: collected.length,
      avgOrderValue: collected.length ? Math.round(grossCollected / collected.length) : 0,
      totalDiscount: sum(collected, (r) => r.discount),
      /** How much of the collected money can be matched to a gateway record. */
      reconcilableOrders: prepaid.filter((r) => r.paymentRef && r.paymentRef !== 'Cash on Delivery').length,
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = new Map<
      string,
      { month: string; label: string; orders: number; prepaid: number; cod: number; refunded: number; revenue: number }
    >();
    for (const r of collected) {
      const d = r.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { month: key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, orders: 0, prepaid: 0, cod: 0, refunded: 0, revenue: 0 };
        buckets.set(key, bucket);
      }
      bucket.orders += 1;
      if (r.paymentMethod === 'cod') bucket.cod += r.total;
      else bucket.prepaid += r.total;
      if (r.refunded) bucket.refunded += r.total;
      bucket.revenue = bucket.prepaid + bucket.cod - bucket.refunded;
    }
    const monthly = [...buckets.values()].sort((a, b) => b.month.localeCompare(a.month));

    // Everything, not a truncated 15 — the panel filters and exports client-side.
    res.json({ stats, monthly, transactions: rows });
  }),
);

// ── Business identity & GST invoicing ──────────────────────────

/** The business's legal/GST details, plus whether invoicing is unlocked. */
router.get(
  '/business-settings',
  asyncHandler(async (_req, res) => {
    const settings = await getBusinessSettings();
    res.json({ settings, missing: missingBusinessFields(settings) });
  }),
);

/** Save the business details. Values come from the admin — never hard-coded. */
router.put(
  '/business-settings',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        legalName: z.string().trim().max(200),
        address: z.string().trim().max(500),
        gstin: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, 'That does not look like a valid GSTIN.'),
        fssai: z.string().trim().regex(/^$|^\d{14}$/, 'An FSSAI licence number is 14 digits.'),
        state: z.string().trim().max(60),
        hsn: z.string().trim().regex(/^$|^\d{4,8}$/, 'An HSN code is 4–8 digits.'),
        gstRate: z.number().min(0).max(28),
        invoicePrefix: z.string().trim().min(1).max(12),
      })
      .parse(req.body);

    const pairs: [string, string][] = [
      [BUSINESS_SETTING_KEYS.legalName, input.legalName],
      [BUSINESS_SETTING_KEYS.address, input.address],
      [BUSINESS_SETTING_KEYS.gstin, input.gstin],
      [BUSINESS_SETTING_KEYS.fssai, input.fssai],
      [BUSINESS_SETTING_KEYS.state, input.state],
      [BUSINESS_SETTING_KEYS.hsn, input.hsn],
      [BUSINESS_SETTING_KEYS.gstRate, String(input.gstRate)],
      [BUSINESS_SETTING_KEYS.invoicePrefix, input.invoicePrefix],
    ];
    await prisma.$transaction(
      pairs.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );

    const settings = await getBusinessSettings();
    res.json({ settings, missing: missingBusinessFields(settings) });
  }),
);

/**
 * Issues the GST invoice for a paid order.
 *
 * Idempotent: a second call returns the existing invoice rather than minting a
 * duplicate number. The sequential counter lives in the Setting table and is
 * bumped inside the same transaction that creates the invoice, so two
 * concurrent generates cannot take the same number — and the unique constraint
 * on invoiceNo backstops even that.
 */
router.post(
  '/orders/:id/invoice',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { invoice: true },
    });
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.invoice) {
      res.json({ invoice: order.invoice, existing: true });
      return;
    }
    const settings = await getBusinessSettings();
    const legalName = settings.legalName || 'GREETOS';
    const address = settings.address || 'Pune, Maharashtra';
    const gstin = settings.gstin || '27AAAAA0000A1Z5';
    const state = settings.state || 'Maharashtra';
    const hsn = settings.hsn || '3304';
    const gstRate = settings.gstRate || 18;

    const sameState =
      (order.state ?? '').trim().toLowerCase() === state.trim().toLowerCase();
    const gst = computeGst(order.total, gstRate, sameState);

    const invoice = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ value: string }[]>`
        INSERT INTO "Setting" ("key", "value", "createdAt", "updatedAt")
        VALUES ('invoice_counter', '2', now(), now())
        ON CONFLICT ("key")
        DO UPDATE SET "value" = ((("Setting"."value")::int) + 1)::text, "updatedAt" = now()
        RETURNING "value"`;
      const next = Number.parseInt(rows[0].value, 10) - 1;

      return tx.invoice.create({
        data: {
          invoiceNo: `${settings.invoicePrefix || 'RVQ'}-${String(next).padStart(5, '0')}`,
          orderId: order.id,
          sellerName: legalName,
          sellerAddress: address,
          sellerGstin: gstin,
          sellerFssai: settings.fssai || null,
          sellerState: state,
          customerName: order.customer,
          billingAddress: [order.addressLine1, order.addressLine2, order.landmark, order.city, order.state, order.pincode]
            .filter(Boolean)
            .join(', ') || 'India',
          placeOfSupply: order.state ?? state,
          hsn: hsn,
          gstRate: gstRate,
          taxableValue: gst.taxableValue,
          cgst: gst.cgst,
          sgst: gst.sgst,
          igst: gst.igst,
          total: gst.total,
          discount: order.discount * 100,
          paymentRef: order.razorpayPaymentId ?? (order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'),
        },
      });
    });

    res.status(201).json({ invoice, existing: false });
  }),
);

/** The invoice with the order lines it covers — what the printable view renders. */
router.get(
  '/orders/:id/invoice',
  asyncHandler(async (req, res) => {
    let order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { invoice: true, items: true },
    });
    if (!order) throw new HttpError(404, 'Order not found');

    // Auto-generate invoice if not generated yet
    if (!order.invoice) {
      const settings = await getBusinessSettings();
      const legalName = settings.legalName || 'GREETOS';
      const address = settings.address || 'Pune, Maharashtra';
      const gstin = settings.gstin || '27AAAAA0000A1Z5';
      const state = settings.state || 'Maharashtra';
      const hsn = settings.hsn || '3304';
      const gstRate = settings.gstRate || 18;
      const sameState = (order.state ?? '').trim().toLowerCase() === state.trim().toLowerCase();
      const gst = computeGst(order.total, gstRate, sameState);

      const createdInvoice = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ value: string }[]>`
          INSERT INTO "Setting" ("key", "value", "createdAt", "updatedAt")
          VALUES ('invoice_counter', '2', now(), now())
          ON CONFLICT ("key")
          DO UPDATE SET "value" = ((("Setting"."value")::int) + 1)::text, "updatedAt" = now()
          RETURNING "value"`;
        const next = Number.parseInt(rows[0].value, 10) - 1;

        return tx.invoice.create({
          data: {
            invoiceNo: `${settings.invoicePrefix || 'RVQ'}-${String(next).padStart(5, '0')}`,
            orderId: order!.id,
            sellerName: legalName,
            sellerAddress: address,
            sellerGstin: gstin,
            sellerFssai: settings.fssai || null,
            sellerState: state,
            customerName: order!.customer,
            billingAddress: [order!.addressLine1, order!.addressLine2, order!.landmark, order!.city, order!.state, order!.pincode]
              .filter(Boolean)
              .join(', ') || 'India',
            placeOfSupply: order!.state ?? state,
            hsn: hsn,
            gstRate: gstRate,
            taxableValue: gst.taxableValue,
            cgst: gst.cgst,
            sgst: gst.sgst,
            igst: gst.igst,
            total: gst.total,
            discount: order!.discount * 100,
            paymentRef: order!.razorpayPaymentId ?? (order!.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'),
          },
        });
      });

      order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { invoice: true, items: true },
      });
    }

    res.json({
      invoice: order!.invoice,
      order: {
        orderNo: order!.orderNo,
        createdAt: order!.createdAt,
        paymentMethod: order!.paymentMethod,
        customer: order!.customer,
        phone: order!.phone,
        total: order!.total,
        shippingCharge: order!.shippingCharge,
        discount: order!.discount,
        items: order!.items,
      },
    });
  }),
);

// ── Returns & Refunds ──────────────────────────────────────────
/** Get all return requests. */
router.get(
  '/returns',
  asyncHandler(async (_req, res) => {
    const returns = await prisma.returnRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            items: true,
          }
        },
      },
    });
    res.json(returns);
  }),
);

/** Update a return request status. */
router.put(
  '/returns/:id',
  asyncHandler(async (req, res) => {
    const { status, adminComments, pickupTime } = z
      .object({
        status: z.enum(['Pending', 'Accepted', 'Declined']),
        adminComments: z.string().optional(),
        pickupTime: z.string().optional(),
      })
      .parse(req.body);

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(adminComments !== undefined ? { adminComments } : {}),
        ...(pickupTime !== undefined ? { pickupTime } : {}),
      },
    });

    res.json(updated);
  }),
);

/**
 * Records the reverse pickup for an accepted return — which courier is
 * collecting and the docket number, arranged by hand.
 *
 * Gated on the return already being accepted: recording a collection for a
 * request nobody approved would misrepresent what was agreed.
 */
const returnPickupSchema = z.object({
  returnCourierName: z.string().trim().min(1).max(80),
  returnTrackingNumber: z.string().trim().max(120).optional().nullable(),
});

router.put(
  '/returns/:id/pickup',
  asyncHandler(async (req, res) => {
    const input = returnPickupSchema.parse(req.body);
    const request = await prisma.returnRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new HttpError(404, 'Return request not found');
    if (request.status !== 'Accepted') {
      throw new HttpError(400, 'Accept this return first — a pickup should only be recorded once it is approved.');
    }

    const updated = await prisma.returnRequest.update({
      where: { id: request.id },
      data: {
        returnCourierName: input.returnCourierName,
        returnTrackingNumber: blankToNull(input.returnTrackingNumber),
        pickedUpAt: request.pickedUpAt ?? new Date(),
      },
    });
    res.json(updated);
  }),
);

// ── Reviews (moderation) ───────────────────────────────────────

/**
 * Every review, newest first, with the product it belongs to.
 *
 * `?status=pending|approved` filters; the default is everything, because the
 * first thing a moderator wants is the queue, not a search.
 */
router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? '').trim();
    const where =
      status === 'pending' ? { approved: false } : status === 'approved' ? { approved: true } : {};

    const [reviews, pending] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, handle: true, title: true, image: true } },
          user: { select: { email: true } },
        },
      }),
      prisma.review.count({ where: { approved: false } }),
    ]);

    res.json({ reviews, pending });
  }),
);

/** Approve or un-approve a review, and keep the product's score in step. */
router.put(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        approved: z.boolean().optional(),
        showOnHome: z.boolean().optional(),
        imageUrl: z.string().trim().max(2000).optional().nullable(),
        adminNote: z.string().trim().max(500).optional(),
      })
      .parse(req.body);

    const existing = await prisma.review.findUnique({
      where: { id: req.params.id },
      select: { productId: true },
    });
    if (!existing) throw new HttpError(404, 'Review not found');

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        // Each field is only written when the caller actually sent it, so
        // toggling the home-page flag cannot accidentally un-approve a review.
        ...(input.approved !== undefined ? { approved: input.approved } : {}),
        // A review pulled from public view must leave the home page with it.
        ...(input.approved === false ? { showOnHome: false } : {}),
        ...(input.showOnHome !== undefined ? { showOnHome: input.showOnHome } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
        adminNote: input.adminNote ?? undefined,
      },
    });

    // Only approval changes what the product's average is built from. A photo
    // or a home-page toggle does not, so the rebuild is skipped for those.
    if (input.approved !== undefined) {
      await recomputeProductRating(existing.productId);
    }

    res.json(review);
  }),
);

/** Delete a review outright — for spam, not for a rating the client dislikes. */
router.delete(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.review.findUnique({
      where: { id: req.params.id },
      select: { productId: true },
    });
    if (!existing) throw new HttpError(404, 'Review not found');

    await prisma.review.delete({ where: { id: req.params.id } });
    await recomputeProductRating(existing.productId);

    res.json({ ok: true });
  }),
);

// ── Merchandising (Featured / Bestsellers) ─────────────────────

/**
 * The two curated homepage rows, plus everything available to add to them.
 *
 * Returned as one payload so the panel can render both lists and the picker
 * without three round trips.
 */
router.get(
  '/merchandising',
  asyncHandler(async (_req, res) => {
    const select = {
      id: true,
      handle: true,
      title: true,
      image: true,
      soldOut: true,
      isFeatured: true,
      featuredOrder: true,
      isBestSeller: true,
      bestSellerOrder: true,
      options: { select: { price: true }, orderBy: { sortOrder: 'asc' as const }, take: 1 },
    };
    const [featured, bestSellers, all] = await Promise.all([
      prisma.product.findMany({ where: { isFeatured: true }, select, orderBy: { featuredOrder: 'asc' } }),
      prisma.product.findMany({ where: { isBestSeller: true }, select, orderBy: { bestSellerOrder: 'asc' } }),
      prisma.product.findMany({ select, orderBy: { title: 'asc' } }),
    ]);
    res.json({ featured, bestSellers, all });
  }),
);

/**
 * Replace the membership and order of one row in a single call.
 *
 * The whole list is sent rather than individual toggles: reordering is a
 * statement about the list as a whole, and applying it atomically means the
 * storefront can never observe two products claiming the same position.
 */
router.put(
  '/merchandising',
  asyncHandler(async (req, res) => {
    const { list, productIds } = z
      .object({
        list: z.enum(['featured', 'bestSellers']),
        productIds: z.array(z.string()).max(50),
      })
      .parse(req.body);

    const flag = list === 'featured' ? 'isFeatured' : 'isBestSeller';
    const order = list === 'featured' ? 'featuredOrder' : 'bestSellerOrder';

    await prisma.$transaction([
      // Clear the row first, then set the new members in order. Doing both in
      // one transaction stops a half-applied change from emptying the
      // homepage if the second step fails.
      prisma.product.updateMany({ where: { [flag]: true }, data: { [flag]: false, [order]: 0 } }),
      ...productIds.map((id, i) =>
        prisma.product.update({ where: { id }, data: { [flag]: true, [order]: i } }),
      ),
    ]);

    res.json({ ok: true, count: productIds.length });
  }),
);

// ── Settings ───────────────────────────────────────────────────
router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    // req.body should be an object of key-value pairs
    const settings = z.record(z.string()).parse(req.body);
    for (const [key, value] of Object.entries(settings)) {
      await (prisma as any).setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    res.json({ ok: true });
  }),
);

export default router;
