import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { physicalAddressSchema } from '../utils/address';

const router = Router();

// Every route here is the signed-in customer's own address book.
router.use(requireAuth);

/**
 * Validates the shape of a delivery pincode.
 *
 * Deliberately does NOT claim to know whether we deliver there: fulfilment is
 * manual, so there is no carrier serviceability API behind this. Telling a
 * shopper "serviceable" on a guess is worse than saying nothing, so the
 * response only reports that the pincode is well-formed.
 */
router.get(
  '/pincode/:pincode',
  asyncHandler(async (req, res) => {
    if (!/^\d{6}$/.test(req.params.pincode)) throw new HttpError(400, 'Enter a valid 6-digit pincode.');
    res.json({ pincode: req.params.pincode, valid: true });
  }),
);

const addressInputSchema = physicalAddressSchema.extend({
  label: z.string().trim().max(40).optional(),
  isDefault: z.boolean().optional(),
});

/** List the signed-in user's saved addresses, default first. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    res.json(addresses);
  }),
);

/** Create an address. The user's first-ever address always becomes their default. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = addressInputSchema.parse(req.body);
    const existingCount = await prisma.address.count({ where: { userId: req.user!.id } });
    const isDefault = existingCount === 0 ? true : !!input.isDefault;

    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({ where: { userId: req.user!.id, isDefault: true }, data: { isDefault: false } });
      }
      return await tx.address.create({
        data: {
          userId: req.user!.id,
          label: input.label,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          landmark: input.landmark,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          isDefault,
        },
      });
    });
    res.status(201).json(address);
  }),
);

/** Update an address. Only the owner may edit it. */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = addressInputSchema.partial().parse(req.body);
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) throw new HttpError(404, 'Address not found');

    const address = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user!.id, isDefault: true, id: { not: existing.id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id: existing.id }, data: input });
    });
    res.json(address);
  }),
);

/** Delete an address. Only the owner may delete it. */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) throw new HttpError(404, 'Address not found');
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

export default router;
