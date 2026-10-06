import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Disabled / empty response for concerns endpoint
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json([]);
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (_req, res) => {
    res.json(null);
  }),
);

export default router;
