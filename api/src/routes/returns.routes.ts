import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { prisma } from '../config/prisma';
import { UPLOADS_DIR } from '../config/uploads';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// GET user's return requests
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const returns = await prisma.returnRequest.findMany({
      where: { order: { userId: req.user!.id } },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
    res.json(returns);
  }),
);

// POST a new return request for an order
router.post(
  '/:orderId',
  requireAuth,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    // No change-of-mind returns: configurations are curated per customer, so
    // the only accepted claims are legitimate problems with what arrived.
    // (Old rows may still carry Return/Refund/Exchange from the earlier flow.)
    const bodySchema = z.object({
      type: z.enum([
        'Damaged package',
        'Compromised seal',
        'Damaged contents',
        'Defective product',
        'Wrong product',
        'Wrong size or variant',
        'Wrong quantity',
        'Materially different from order',
      ]),
      reason: z.string().min(1),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid input');
    }

    const { type, reason } = parsed.data;

    // Verify the order belongs to the user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    if (order.userId !== req.user!.id) {
      throw new HttpError(403, 'Not authorized for this order');
    }

    // Only allow returns for Delivered orders
    if (order.status !== 'Delivered') {
      throw new HttpError(400, 'Returns can only be requested for delivered orders');
    }

    // Construct image URL if uploaded
    let imageUrl: string | undefined = undefined;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        type,
        reason,
        imageUrl,
      },
    });

    res.status(201).json(returnRequest);
  }),
);

export default router;
