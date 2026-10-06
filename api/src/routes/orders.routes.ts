import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { config } from '../config/config';
import { HttpError } from '../middleware/error';
import { makeOrderNo, initialOrderSteps } from '../utils/order';
import { shippingFor } from '../utils/shippingSettings';
import { markCartRecovered } from '../utils/abandonedCart';
import { physicalAddressSchema } from '../utils/address';
import { applyCoupon, recordRedemption } from '../utils/coupon';
import { emailConfigured, sendOrderStatusEmail, type OrderEmailInput } from '../services/email';

const router = Router();

const itemSchema = z.object({
  productTitle: z.string().min(1),
  optionName: z.string().min(1),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

function computeTotal(items: z.infer<typeof itemSchema>[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

const createOrderSchema = z.object({
  customer: z.string().trim().min(1).max(120),
  email: z.string().email().optional(),
  // Required (not optional) here: a human courier needs a number to call for delivery.
  phone: z.string().regex(/^\d{10}$/),
  items: z.array(itemSchema).min(1),
  couponCode: z.string().optional(),
}).merge(physicalAddressSchema);

/**
 * Create a Cash on Delivery order (customer). No Razorpay round-trip — this
 * is the unpaid counterpart to `payments.routes.ts`'s `/verify`, and mirrors
 * its coupon handling exactly (re-validated server-side, discount can never
 * be forged client-side, redemption recorded in the same transaction).
 *
 * `paymentStatus` stays 'pending' and no referral reward fires here — for
 * COD, "payment confirmed" only happens once cash is actually collected,
 * which is signalled by an admin marking the order Delivered (see
 * `admin.routes.ts`'s `PATCH /orders/:id`), not at order placement.
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Cash on delivery is switched off: every order is prepaid through
    // Razorpay. This endpoint is the COD path, so it refuses rather than
    // quietly creating an unpaid order that nobody is going to collect cash
    // for. Flip COD_ENABLED to bring it back — the logic below still works.
    if (!config.codEnabled) {
      throw new HttpError(
        400,
        'Cash on delivery is not available. Please complete your order with an online payment.',
      );
    }

    const body = createOrderSchema.parse(req.body);
    const subtotal = computeTotal(body.items);
    if (subtotal <= 0) throw new HttpError(400, 'Cart total must be greater than zero');

    let discount = 0;
    let couponCode: string | undefined;
    if (body.couponCode) {
      const applied = await applyCoupon(body.couponCode, subtotal, req.user!.id);
      discount = applied.discount;
      couponCode = applied.code;
    }
    // Delivery is charged on what the customer actually pays, so the free
    // threshold is tested against the discounted subtotal, not the list price.
    const shippingCharge = await shippingFor(subtotal - discount, body.state);
    const total = subtotal - discount + shippingCharge;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo: makeOrderNo(),
          userId: req.user!.id,
          customer: body.customer,
          email: body.email,
          phone: body.phone,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2,
          landmark: body.landmark,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          total,
          discount,
          shippingCharge,
          couponCode,
          status: 'Order Placed',
          steps: initialOrderSteps() as object,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          items: {
            create: body.items.map((i) => ({
              productTitle: i.productTitle,
              optionName: i.optionName,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });
      if (couponCode) {
        await recordRedemption(tx, {
          code: couponCode,
          orderId: created.id,
          userId: req.user!.id,
          subtotal,
          discount,
          orderTotal: total,
        });
      }
      return created;
    });

    // The customer bought — no reminder should ever go out for this cart.
    await markCartRecovered(order.email);

    // Confirmation email — never fatal: a bounced email must not undo an order.
    if (order.email && emailConfigured()) {
      sendOrderStatusEmail(order.email, 'confirmed', {
        orderNo: order.orderNo,
        customer: order.customer,
        total: order.total,
        paymentMethod: 'cod',
        items: order.items.map((i) => ({
          productTitle: i.productTitle,
          optionName: i.optionName,
          quantity: i.quantity,
        })),
      }).catch((e) => console.error('Order confirmation email failed for', order.orderNo, e));
    }

    res.status(201).json(order);
  }),
);

/** List the signed-in user's orders. */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true, returnRequests: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  }),
);

/** Public: track an order by its order number. */
router.get(
  '/:orderNo',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNo: req.params.orderNo },
      include: { items: true, returnRequests: true },
    });
    if (!order) throw new HttpError(404, 'Order not found');
    res.json(order);
  }),
);

/**
 * Public: delivery status for an order, by order number — what the customer
 * sees on "track my order".
 *
 * Fulfilment is manual, so this reports what the admin actually recorded when
 * the parcel went out. Before dispatch it says so plainly rather than
 * inventing an estimate. Never exposes internal DB ids.
 */
router.get(
  '/:orderNo/tracking',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNo: req.params.orderNo },
      select: {
        status: true,
        courierName: true,
        trackingNumber: true,
        trackingUrl: true,
        dispatchedAt: true,
      },
    });
    if (!order) throw new HttpError(404, 'Order not found');

    if (!order.dispatchedAt) {
      res.json({ dispatched: false, status: order.status });
      return;
    }
    res.json({
      dispatched: true,
      status: order.status,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      dispatchedAt: order.dispatchedAt,
    });
  }),
);

export default router;
