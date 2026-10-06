import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { config } from '../config/config';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { sendPasswordResetEmail } from '../services/email';
import { smsConfigured, sendLoginOtpSms, toE164India, SmsError } from '../services/sms';

const router = Router();

/** Shapes a user for the client, formatting `dob` as YYYY-MM-DD to match the <input type="date"> value. */
function serializeUser(user: {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  role: string;
  avatarUrl?: string | null;
  dob?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
  };
}

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  dob: z.string().date().optional().or(z.literal('')),
});

// ── Customer auth: one-time code ────────────────────────────────
//
// Customers sign in with a code texted to their mobile number. There is no
// email login: the storefront asks for a number at checkout anyway, and one
// way in is easier to support than two.

const OTP_TTL_MINUTES = 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
/** A 4-digit code is only 10,000 combinations, so cap guesses hard. */
const OTP_MAX_ATTEMPTS = 5;
/** Codes a single address may request within the window below. */
const OTP_MAX_PER_WINDOW = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000;
/**
 * Minimum gap between two codes for the same number.
 *
 * The window limit above caps the total, but says nothing about how fast they
 * can be spent — five taps in five seconds would empty it instantly and send
 * five texts, which costs SMS balance and reads as harassment at the handset.
 */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;


/**
 * True only when a fixed code may be used instead of a mailed one.
 *
 * Deliberately requires BOTH switches: `NODE_ENV !== 'production'` is the one
 * that cannot be forgotten on a deploy, and DEV_MODE is the one a developer
 * turns off locally to rehearse the real flow.
 */
function devOtpAllowed(): boolean {
  if (config.devMode && config.env !== 'production') return true;
  // The demo-box escape hatch. Still requires someone to have set it.
  return config.allowDevOtpInProd;
}

/**
 * 4-digit code, from a CSPRNG rather than Math.random().
 *
 * In development it returns the fixed `DEV_OTP` instead, so login works with
 * no mail server attached. It is still hashed and still expires — the only
 * thing that changes is how predictable it is.
 */
function generateOtp(): string {
  if (devOtpAllowed()) return config.devOtp;
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}




// ── Customer auth: mobile one-time code ────────────────────────
//
// The same shape as the email flow above — same TTL, same attempt cap, same
// rate window, same "answer identically whether or not an account exists".
// Only the delivery channel differs, and the identity the code proves control
// of is a phone number rather than a mailbox.

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => toE164India(v) ?? v)
    .refine((v) => /^\+91[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number'),
});
const verifyPhoneSchema = phoneSchema.extend({
  otp: z.string().regex(/^\d{4}$/, 'Enter the 4-digit code'),
});

/** Codes are only ever stored hashed, so a leaked table can't be replayed. */
function hashPhoneOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', config.jwt.secret).update(`${phone}:${code}`).digest('hex');
}

/**
 * Step 1 — text a one-time code.
 *
 * The number is normalised to +91XXXXXXXXXX first, so the same subscriber
 * typed as "98…", "098…", "+91 98…" shares one rate-limit bucket and one
 * stored user rather than looking like three different people.
 */
router.post(
  '/request-phone-otp',
  asyncHandler(async (req, res) => {
    const { phone } = phoneSchema.parse(req.body);

    if (!smsConfigured() && !devOtpAllowed()) {
      throw new HttpError(503, 'Mobile sign-in is temporarily unavailable. Please try again shortly.');
    }

    const last = await prisma.phoneOtp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last) {
      const waited = Date.now() - last.createdAt.getTime();
      if (waited < OTP_RESEND_COOLDOWN_MS) {
        const seconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - waited) / 1000);
        // The seconds are returned as a field too, so the storefront can run a
        // countdown instead of making the customer guess.
        const err = new HttpError(429, `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before asking for another code.`);
        (err as HttpError & { retryAfter?: number }).retryAfter = seconds;
        res.setHeader('Retry-After', String(seconds));
        throw err;
      }
    }

    const recent = await prisma.phoneOtp.count({
      where: { phone, createdAt: { gt: new Date(Date.now() - OTP_WINDOW_MS) } },
    });
    if (recent >= OTP_MAX_PER_WINDOW) {
      throw new HttpError(429, 'Too many codes requested. Please try again in a few minutes.');
    }

    // Any earlier code for this number stops working the moment a new one is
    // issued, so a forwarded or shoulder-surfed old SMS is worthless.
    await prisma.phoneOtp.updateMany({ where: { phone, consumed: false }, data: { consumed: true } });

    const code = generateOtp();
    await prisma.phoneOtp.create({
      data: { phone, codeHash: hashPhoneOtp(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    if (smsConfigured() && !devOtpAllowed()) {
      try {
        await sendLoginOtpSms(phone, code);
      } catch (err) {
        const detail = err instanceof SmsError ? err.gatewayStatus : (err as Error).message;
        console.error(`SMS OTP to ${phone} failed: ${detail ?? 'unknown'}`);
        throw new HttpError(502, err instanceof SmsError ? err.message : 'The code could not be sent.');
      }
    }

    res.json({
      sent: true,
      expiresInMinutes: OTP_TTL_MINUTES,
      // Only ever present on a demo box; see devOtpAllowed().
      ...(devOtpAllowed() ? { devOtp: code } : {}),
    });
  }),
);

/**
 * Step 2 — exchange a correct code for a session.
 *
 * First successful code creates the account, exactly as the email flow does.
 */
router.post(
  '/verify-phone-otp',
  asyncHandler(async (req, res) => {
    const { phone, otp } = verifyPhoneSchema.parse(req.body);

    const record = await prisma.phoneOtp.findFirst({
      where: { phone, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new HttpError(400, 'That code has expired. Please request a new one.');

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.phoneOtp.update({ where: { id: record.id }, data: { consumed: true } });
      throw new HttpError(429, 'Too many incorrect attempts. Please request a new code.');
    }

    // Constant-time compare so a wrong code can't be narrowed down by timing.
    const expected = Buffer.from(record.codeHash);
    const supplied = Buffer.from(hashPhoneOtp(phone, otp));
    const ok = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);

    if (!ok) {
      await prisma.phoneOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      const left = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      throw new HttpError(
        400,
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Please request a new one.',
      );
    }

    await prisma.phoneOtp.update({ where: { id: record.id }, data: { consumed: true } });

    // Stored as the bare ten digits, which is what the profile form, the
    // checkout form and every order row already use.
    const local = phone.replace(/^\+91/, '');
    const existing = await prisma.user.findUnique({ where: { phone: local } });
    if (existing && !existing.isActive) throw new HttpError(403, 'This account has been deactivated.');

    const user = existing ?? (await prisma.user.create({ data: { phone: local, role: 'customer' } }));

    const token = signToken({ userId: user.id, role: user.role });
    res.json({
      token,
      isNewUser: !existing,
      // Delivery needs a name; the number is already known from signing in.
      needsProfile: !user.name,
      user: serializeUser(user),
    });
  }),
);

/** Updates the signed-in user's profile (name required; phone/DOB optional). */
router.put(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = profileSchema.parse(req.body);
    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: input.name,
          phone: input.phone || undefined,
          dob: input.dob ? new Date(input.dob) : undefined,
        },
      });
      res.json({ user: serializeUser(user) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new HttpError(409, 'That mobile number is already in use.');
      }
      throw e;
    }
  }),
);

/** Current user from the Bearer token. */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: serializeUser(user) });
  }),
);

// ── Staff auth: email + password (admins and partner creators) ──

/** Roles that sign in with email + password on the admin origin. */
const PASSWORD_LOGIN_ROLES = ['admin', 'creator'];

/**
 * Email + password login for the panel at ADMIN_URL.
 *
 * Serves both admins and partner creators — the panel shows each of them a
 * different set of pages based on the role it gets back here. Customers are
 * excluded: they log in with an emailed code via /request-otp instead.
 */
router.post(
  '/admin/login',
  asyncHandler(async (req, res) => {
    const { email, password } = adminLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !PASSWORD_LOGIN_ROLES.includes(user.role) || !user.passwordHash) {
      throw new HttpError(401, 'Invalid credentials');
    }
    if (!user.isActive) throw new HttpError(403, 'This account has been deactivated.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);

/**
 * Request a password reset email (panel accounts — admins and partners).
 *
 * Always responds with the same message so this cannot be used to discover
 * which email addresses have panel accounts.
 */
router.post(
  '/admin/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user && PASSWORD_LOGIN_ROLES.includes(user.role) && user.isActive) {
      const resetLink = buildPasswordLink(user.id, '1h');
      await sendPasswordResetEmail(user.email!, resetLink);
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  }),
);

/** Reset/set a password using the token from the email. */
router.post(
  '/admin/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = z
      .object({ token: z.string().min(1), password: z.string().min(6).max(100) })
      .parse(req.body);

    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(token, config.jwt.secret) as any;
    } catch {
      throw new HttpError(400, 'Invalid or expired reset token');
    }

    if (payload.purpose !== 'password-reset') {
      throw new HttpError(400, 'Invalid token purpose');
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: hash },
    });

    res.json({ message: 'Password updated successfully.' });
  }),
);

/**
 * Builds a signed set-password link for the admin panel. Shared by the
 * forgot-password flow and the "add admin" invite so both honour the same
 * token shape and the same reset page.
 */
export function buildPasswordLink(userId: string, expiresIn: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ userId, purpose: 'password-reset', nonce }, config.jwt.secret, {
    expiresIn,
  } as jwt.SignOptions);
  return `${config.urls.admin}/reset-password?token=${token}`;
}

export default router;
