import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config, assertProductionSecrets } from './config/config';
import { UPLOADS_DIR } from './config/uploads';
import { notFound, errorHandler } from './middleware/error';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/products.routes';
import reviewRoutes from './routes/reviews.routes';
import cartRoutes from './routes/cart.routes';
import subscriberRoutes from './routes/subscribers.routes';
import categoryRoutes from './routes/categories.routes';
import concernRoutes from './routes/concerns.routes';
import announcementRoutes from './routes/announcements.routes';
import notificationRoutes from './routes/notifications.routes';
import couponRoutes from './routes/coupons.routes';
import referralRoutes from './routes/referrals.routes';
import orderRoutes from './routes/orders.routes';
import paymentRoutes from './routes/payments.routes';
import addressRoutes from './routes/addresses.routes';
import adminRoutes from './routes/admin.routes';
import creatorRoutes from './routes/creator.routes';
import returnsRoutes from './routes/returns.routes';
import settingsRoutes from './routes/settings.routes';
import reelsRoutes from './routes/reels.routes';
import geoRoutes from './routes/geo.routes';

assertProductionSecrets();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to be loaded
app.use(express.json({ limit: '2mb' }));

app.use('/uploads', express.static(UPLOADS_DIR));

// Exact-match CORS allowlist. `!origin` allows same-origin / server-to-server
// and tools like curl. Cross-origin browsers must be listed in ALLOWED_ORIGINS.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: config.env, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/concerns', concernRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reels', reelsRoutes);
// Reverse geocoding for the checkout's "use my current location" button.
app.use('/api/geo', geoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/creator', creatorRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Old Spice API listening on :${config.port} (${config.env})`);
  if (config.allowDevOtpInProd) {
    console.warn(
      '⚠  ALLOW_DEV_OTP is on — anyone can sign in with the fixed code ' +
        `"${config.devOtp}". This is for demos only. Turn it off and configure SMTP before real customers use this site.`,
    );
  }
});
