import dotenv from 'dotenv';

dotenv.config();

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === 'true';
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),

  /** When true, OTPs are logged/echoed instead of sent via SMS. */
  devMode: bool('DEV_MODE', true),
  /**
   * Cash on delivery. Off: the client wants every order paid up front through
   * Razorpay. The COD order path still exists behind this switch rather than
   * being deleted, because "do we take COD" is a business decision that tends
   * to get revisited.
   */
  codEnabled: bool('COD_ENABLED', false),
  /**
   * Fixed login code used when DEV_MODE is on and NODE_ENV is not production.
   * It exists so the storefront's login can be exercised before SMTP is
   * connected. Both conditions are required, so shipping with DEV_MODE left on
   * still cannot open the door in production.
   */
  devOtp: process.env.DEV_OTP ?? '1234',
  /**
   * Lets the fixed DEV_OTP work even when NODE_ENV is production.
   *
   * Exists for the client demo box, which has no mail server: without it
   * nobody can sign in, and checkout requires signing in. It is a separate,
   * explicitly-named switch rather than a relaxation of the NODE_ENV rule, so
   * turning it on is always a decision someone made on purpose — and the API
   * shouts about it on every boot.
   *
   * MUST be off before real customers use the site.
   */
  allowDevOtpInProd: bool('ALLOW_DEV_OTP', false),

  /**
   * IndiaHost SMS gateway, used to deliver login codes to a mobile number.
   * The code itself is still generated and checked by this API — the gateway
   * only carries the message.
   */
  sms: {
    user: process.env.SMS_OTP_USER ?? '',
    key: process.env.SMS_OTP_KEY ?? '',
  },

  databaseUrl: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DIRECT_URL ?? '',

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  },

  /** Exact-match CORS allowlist. */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Public URLs, used to build links inside emails. */
  urls: {
    storefront: process.env.STOREFRONT_URL ?? 'http://localhost:3000',
    admin: process.env.ADMIN_URL ?? 'http://localhost:3001',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '465', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '',
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@greetos.in',
    password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  },
};

export function assertProductionSecrets(): void {
  if (config.env === 'production') {
    if (config.jwt.secret === 'dev-insecure-secret-change-me') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL must be set in production');
    }
  }
}
