import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { config } from '../config/config';
import { asyncHandler } from '../utils/asyncHandler';
import { optionalAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { razorpayClient } from '../services/razorpay';
import { makeOrderNo, initialOrderSteps } from '../utils/order';
import { physicalAddressSchema } from '../utils/address';
import { applyCoupon, recordRedemption } from '../utils/coupon';
import { rewardReferrerIfDue } from '../utils/referral';
import { emailConfigured, sendOrderStatusEmail, type OrderEmailInput } from '../services/email';
import { shippingFor } from '../utils/shippingSettings';
import { markCartRecovered } from '../utils/abandonedCart';

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
  items: z.array(itemSchema).min(1),
  couponCode: z.string().optional(),
  /**
   * Delivery state. Required in practice because the charge depends on it —
   * optional in the schema only so an older client gets the higher rate
   * rather than a validation error it cannot explain to a customer.
   */
  state: z.string().trim().optional(),
});

/**
 * Creates a Razorpay order for the cart total (in paise). Call this right
 * before opening Razorpay Checkout on the client. No local Order row is
 * created yet — that happens after /verify confirms payment succeeded.
 * A coupon (if valid) is applied server-side so the charged amount already
 * reflects the discount; the client can never dictate the amount.
 */
router.post(
  '/create-order',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { items, couponCode, state } = createOrderSchema.parse(req.body);
    const subtotal = computeTotal(items);
    if (subtotal <= 0) throw new HttpError(400, 'Cart total must be greater than zero');

    let discount = 0;
    if (couponCode) {
      const applied = await applyCoupon(couponCode, subtotal, req.user?.id);
      discount = applied.discount;
    }
    // Must match /verify exactly, or the customer is charged one amount and
    // the order is recorded with another — which is why the state travels with
    // this call rather than only arriving with the address at /verify.
    const shippingCharge = await shippingFor(subtotal - discount, state);
    const total = subtotal - discount + shippingCharge;

    const order = await razorpayClient().orders.create({
      amount: total * 100,
      currency: 'INR',
      receipt: `rvq_${Date.now()}`,
    });

    res.json({
      keyId: config.razorpay.keyId,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      /**
       * The breakdown the amount was built from. Returned so the checkout can
       * display the authoritative numbers rather than its own estimate — if
       * the client's guess at shipping or a discount differs from the server's,
       * the customer should see the server's before they pay, not after.
       */
      subtotal,
      discount,
      shippingCharge,
      total,
    });
  }),
);

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  customer: z.string().trim().min(1).max(120),
  email: z.string().email().optional(),
  // Required (not optional) here: a human courier needs a number to call for delivery.
  phone: z.string().regex(/^\d{10}$/),
  items: z.array(itemSchema).min(1),
  couponCode: z.string().optional(),
}).merge(physicalAddressSchema);

/**
 * Verifies the Razorpay payment signature (HMAC-SHA256 of `orderId|paymentId`
 * using the key secret — the standard Razorpay verification recipe) and only
 * then creates the local Order, marked paid. A forged/tampered callback fails
 * the signature check and no order is created.
 */
router.post(
  '/verify',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const body = verifySchema.parse(req.body);

    const expected = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest('hex');

    if (expected !== body.razorpay_signature) {
      throw new HttpError(400, 'Payment verification failed');
    }

    const subtotal = computeTotal(body.items);

    // Re-validate the coupon server-side (a stale/over-limit code is rejected here,
    // even if it slipped past /create-order), then persist the order and bump the
    // coupon's redemption count together so the usage total can't drift.
    let discount = 0;
    let couponCode: string | undefined;
    if (body.couponCode) {
      const applied = await applyCoupon(body.couponCode, subtotal, req.user?.id);
      discount = applied.discount;
      couponCode = applied.code;
    }
    // Recomputed here, not carried over from /create-order: this endpoint
    // accepts its own item payload, so the charge must be derived again from
    // the same rules rather than trusted.
    const shippingCharge = await shippingFor(subtotal - discount, body.state);
    const total = subtotal - discount + shippingCharge;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo: makeOrderNo(),
          // Null for a guest checkout. The order still carries the email and
          // phone, which is what fulfilment and support actually need.
          userId: req.user?.id ?? null,
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
          razorpayOrderId: body.razorpay_order_id,
          razorpayPaymentId: body.razorpay_payment_id,
          paymentStatus: 'paid',
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
          userId: req.user?.id ?? null,
          subtotal,
          discount,
          orderTotal: total,
        });
      }
      return created;
    });

    // Keep the delivery address on the customer's profile, so their next order
    // can be one tap instead of retyping it. Only for a signed-in buyer, and
    // only when it isn't already saved — a repeat customer ordering to the same
    // place should not accumulate duplicates.
    //
    // Outside the transaction on purpose: failing to file an address away is
    // not a reason to undo a payment that already went through.
    if (req.user && body.addressLine1 && body.city && body.state && body.pincode) {
      try {
        const line1 = body.addressLine1.trim();
        const pincode = body.pincode.trim();
        const already = await prisma.address.findFirst({
          where: {
            userId: req.user.id,
            pincode,
            // Case- and spacing-insensitive, because the same address typed
            // twice is rarely typed identically.
            addressLine1: { equals: line1, mode: 'insensitive' },
          },
        });
        if (!already) {
          const count = await prisma.address.count({ where: { userId: req.user.id } });
          await prisma.address.create({
            data: {
              userId: req.user.id,
              addressLine1: line1,
              addressLine2: body.addressLine2?.trim() || null,
              landmark: body.landmark?.trim() || null,
              city: body.city.trim(),
              state: body.state.trim(),
              pincode,
              // Their first saved address becomes the default one.
              isDefault: count === 0,
            },
          });
        }
      } catch (err) {
        console.error(`Could not save address for user ${req.user.id}: ${(err as Error).message}`);
      }
    }

    // This customer paying is what unlocks their referrer's reward. Kept outside
    // the transaction: a hiccup issuing a bonus coupon must never roll back a
    // payment that already went through.
    // Only a signed-in buyer can have a referrer to reward.
    if (req.user) {
      try {
        await rewardReferrerIfDue(req.user.id);
      } catch (e) {
        console.error('Referral reward failed for user', req.user.id, e);
      }
    }

    // Payment + order confirmation in one email — the customer just paid, and
    // this is the receipt-shaped proof of what for. Never fatal.
    // The customer bought — no reminder should ever go out for this cart.
    await markCartRecovered(order.email);

    if (order.email && emailConfigured()) {
      sendOrderStatusEmail(order.email, 'confirmed', {
        orderNo: order.orderNo,
        customer: order.customer,
        total: order.total,
        paymentMethod: 'prepaid',
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

export default router;
