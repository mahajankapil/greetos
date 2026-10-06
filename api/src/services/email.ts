import nodemailer from 'nodemailer';
import { config } from '../config/config';

/**
 * SMTP transport. Port 465 is implicit TLS, so `secure` must be true there;
 * 587 / 2587 / 2465 use STARTTLS and must be false. Getting this backwards is
 * the usual cause of a hung connection, so derive it from the port instead of
 * hardcoding it.
 */
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

/** True when SMTP is configured well enough to attempt a send. */
export function emailConfigured(): boolean {
  return Boolean(config.smtp.host && config.smtp.from);
}

/** Verifies the SMTP credentials/connection. Used by the admin health check. */
export async function verifyEmailTransport(): Promise<void> {
  if (!emailConfigured()) throw new Error('SMTP is not configured (set SMTP_HOST and SMTP_FROM).');
  await transporter.verify();
}

// ── Shared chrome ───────────────────────────────────────────────
const GOLD = '#d4af37';
const INK = '#111111';

function layout(heading: string, body: string): string {
  return `
  <div style="background:#f5f5f5;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      <div style="background:${INK};padding:20px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:900;letter-spacing:2px;">OLD SPICE AGRO FRESH LLP</span>
        <span style="color:${GOLD};font-size:10px;font-weight:700;letter-spacing:2px;display:block;margin-top:4px;">100% ORGANIC FARM FRESH VEGETABLES & HERBS</span>
      </div>
      <div style="padding:28px;">
        <h2 style="color:${INK};margin:0 0 16px;font-size:19px;">${heading}</h2>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e5e5e5;color:#999;font-size:11px;">
        Old Spice Agro Fresh LLP · This is an automated message, please do not reply.
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${INK};color:#ffffff;padding:12px 28px;
     border-radius:8px;text-decoration:none;font-weight:bold;margin:18px 0;">${label}</a>`;
}

// ── Templates ───────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Rovique — Reset your admin password',
    html: layout(
      'Reset your admin password',
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         Click the button below to set a new password. This link expires in 1 hour.
       </p>
       ${button(resetLink, 'Reset Password')}
       <p style="color:#666;font-size:12px;line-height:1.6;">
         If you didn't request this, you can safely ignore this email — your password won't change.
       </p>
       <p style="color:#999;font-size:11px;word-break:break-all;margin-top:16px;">
         Or paste this link into your browser:<br/>${resetLink}
       </p>`,
    ),
  });
}

/**
 * Invites a newly created admin. `setPasswordLink` lets them choose their own
 * password, so we never put a password in an email.
 */
export async function sendAdminInviteEmail(
  email: string,
  name: string,
  adminUrl: string,
  setPasswordLink: string,
): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Rovique — You have been added as an admin',
    html: layout(
      `Welcome aboard, ${name}`,
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         An administrator account has been created for you on the Rovique control panel.
         Set your password using the button below — the link expires in 24 hours.
       </p>
       ${button(setPasswordLink, 'Set Your Password')}
       <p style="color:#444;font-size:14px;line-height:1.6;">
         Once set, sign in any time at:<br/>
         <a href="${adminUrl}" style="color:${INK};font-weight:bold;">${adminUrl}</a>
       </p>
       <p style="color:#666;font-size:12px;line-height:1.6;margin-top:16px;">
         Your sign-in email is <strong>${email}</strong>.
       </p>
       <p style="color:#999;font-size:11px;word-break:break-all;margin-top:16px;">
         Or paste this link into your browser:<br/>${setPasswordLink}
       </p>`,
    ),
  });
}

/**
 * Invites a partner creator to their earnings portal. Same set-your-own-password
 * mechanism as the admin invite; the copy is about their code and earnings
 * rather than the control panel, since that is all they will see.
 */
export async function sendCreatorInviteEmail(
  email: string,
  name: string,
  couponCode: string,
  portalUrl: string,
  setPasswordLink: string,
): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Rovique — Your partner code and earnings portal',
    html: layout(
      `Welcome to Rovique, ${name}`,
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         Your Rovique partner code is live:
       </p>
       <p style="margin:14px 0;">
         <span style="display:inline-block;border:1px dashed ${INK};border-radius:8px;padding:10px 20px;
           font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:2px;color:${INK};">${couponCode}</span>
       </p>
       <p style="color:#444;font-size:14px;line-height:1.6;">
         Share it with your audience — every order placed with it earns you commission.
         Set your password below to open your earnings portal, where you can track your
         sales and request a payout. The link expires in 24 hours.
       </p>
       ${button(setPasswordLink, 'Set Your Password')}
       <p style="color:#444;font-size:14px;line-height:1.6;">
         Then sign in any time at:<br/>
         <a href="${portalUrl}" style="color:${INK};font-weight:bold;">${portalUrl}</a>
       </p>
       <p style="color:#666;font-size:12px;line-height:1.6;margin-top:16px;">
         Your sign-in email is <strong>${email}</strong>.
       </p>
       <p style="color:#999;font-size:11px;word-break:break-all;margin-top:16px;">
         Or paste this link into your browser:<br/>${setPasswordLink}
       </p>`,
    ),
  });
}

// ── Order lifecycle ─────────────────────────────────────────────

export type OrderEmailKind = 'confirmed' | 'processing' | 'shipped' | 'delivered';

export interface OrderEmailInput {
  orderNo: string;
  customer: string;
  total: number;
  paymentMethod: string; // "prepaid" | "cod"
  items: {
    productTitle: string;
    optionName: string;
    quantity: number;
  }[];
  /** Set on shipped emails when the courier has been assigned. */
  awb?: string | null;
  courier?: string | null;
}

const ORDER_EMAIL_COPY: Record<OrderEmailKind, { subject: (o: string) => string; heading: string; body: string }> = {
  confirmed: {
    subject: (o) => `Order ${o} confirmed — ROVIQUE`,
    heading: 'Your order is confirmed',
    body: 'We have your order and it is locked in. You will hear from us again when it ships.',
  },
  processing: {
    subject: (o) => `Order ${o} is being packed — ROVIQUE`,
    heading: 'Your order is being packed',
    body: 'Each piece is checked and wrapped by hand before it leaves us.',
  },
  shipped: {
    subject: (o) => `Order ${o} has shipped — ROVIQUE`,
    heading: 'Your order is on its way',
    body: 'Your parcel has been handed to the courier.',
  },
  delivered: {
    subject: (o) => `Order ${o} delivered — ROVIQUE`,
    heading: 'Delivered',
    body: 'Your order has arrived. If anything is damaged or not what you ordered, report it from My Orders and we will put it right.',
  },
};

/**
 * One template for the whole order lifecycle, so every email describes the
 * purchase identically: the piece, and the size or finish chosen.
 */
export async function sendOrderStatusEmail(
  email: string,
  kind: OrderEmailKind,
  order: OrderEmailInput,
): Promise<void> {
  const copy = ORDER_EMAIL_COPY[kind];
  // The standalone tracking page is gone; order status now lives in the
  // customer's own account, deep-linked to the order this email is about.
  const trackLink = `${config.urls.storefront}/account/orders?order=${encodeURIComponent(order.orderNo)}`;

  const itemsHtml = order.items
    .map((i) => {
      return `<div style="padding:10px 0;border-bottom:1px solid #eee;">
        <div style="color:${INK};font-size:13px;font-weight:700;">${i.productTitle}${i.quantity > 1 ? ` × ${i.quantity}` : ''}</div>
        <div style="color:#666;font-size:12px;">${i.optionName}</div>
      </div>`;
    })
    .join('');

  const shippedExtra =
    kind === 'shipped' && (order.awb || order.courier)
      ? `<p style="color:#444;font-size:13px;line-height:1.6;margin-top:12px;">
           ${order.courier ? `Courier: <strong>${order.courier}</strong><br/>` : ''}
           ${order.awb ? `Tracking number (AWB): <strong>${order.awb}</strong>` : ''}
         </p>`
      : '';

  const paymentLine =
    order.paymentMethod === 'cod'
      ? `Payment: <strong>Cash on Delivery — ₹${order.total.toLocaleString('en-IN')} due when your order arrives</strong>`
      : `Payment: <strong>₹${order.total.toLocaleString('en-IN')} paid</strong>`;

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: copy.subject(order.orderNo),
    html: layout(
      copy.heading,
      `<p style="color:#444;font-size:14px;line-height:1.6;">Hi ${order.customer.split(' ')[0]}, ${copy.body}</p>
       <p style="color:#666;font-size:12px;margin-top:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Order ${order.orderNo}</p>
       ${itemsHtml}
       <p style="color:#444;font-size:13px;margin-top:12px;">${paymentLine}<br/>Shipping: <strong>FREE</strong></p>
       ${shippedExtra}
       ${button(trackLink, 'Track Your Order')}`,
    ),
  });
}

/** One-time login code for the storefront. */
export async function sendLoginOtpEmail(email: string, code: string, ttlMinutes: number): Promise<void> {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `${code} is your Rovique login code`,
    html: layout(
      'Your login code',
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         Enter this code on the Rovique storefront to sign in. It expires in
         ${ttlMinutes} minutes and can only be used once.
       </p>
       <div style="margin:22px 0;padding:18px;background:#f5f5f5;border-radius:10px;text-align:center;">
         <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:bold;
                      letter-spacing:14px;color:${INK};">${code}</span>
       </div>
       <p style="color:#666;font-size:12px;line-height:1.6;">
         If you didn't try to sign in, you can ignore this email — nobody can access your
         account without this code. Never share it with anyone.
       </p>`,
    ),
  });
}

/** Order confirmation for the customer. */
export async function sendOrderConfirmationEmail(
  email: string,
  order: { orderNo: string; customer: string; total: number; items: { productTitle: string; optionName: string; quantity: number; price: number }[] },
): Promise<void> {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;color:#444;font-size:13px;">${i.productTitle}<br/>
          <span style="color:#999;font-size:11px;">${i.optionName} × ${i.quantity}</span></td>
        <td style="padding:8px 0;color:#444;font-size:13px;text-align:right;">₹${i.price * i.quantity}</td>
      </tr>`,
    )
    .join('');

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `Rovique — Order ${order.orderNo} confirmed`,
    html: layout(
      `Thanks, ${order.customer}`,
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         Your order is confirmed and being prepared. Order
         <strong>${order.orderNo}</strong>.
       </p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;">
         ${rows}
         <tr><td colspan="2" style="border-top:1px solid #e5e5e5;padding-top:12px;"></td></tr>
         <tr>
           <td style="color:${INK};font-size:14px;font-weight:bold;">Total</td>
           <td style="color:${INK};font-size:14px;font-weight:bold;text-align:right;">₹${order.total}</td>
         </tr>
       </table>
       ${button(`${config.urls.storefront}/account/orders`, 'View Your Order')}`,
    ),
  });
}

// ── Abandoned cart ──────────────────────────────────────────────

export interface AbandonedCartEmailItem {
  productTitle: string;
  optionName?: string;
  price: number;
  quantity: number;
}

/**
 * The "you left something behind" reminder (client requirement Q7).
 *
 * Sent at most twice per abandoned cart by scripts/send-cart-reminders.ts.
 * There is no discount code in here on purpose: teaching customers that
 * abandoning a cart produces a coupon is a habit that costs margin forever.
 */
export async function sendAbandonedCartEmail(
  email: string,
  items: AbandonedCartEmailItem[],
  subtotal: number,
): Promise<void> {
  const rows = items
    .map(
      (i) => `<div style="padding:10px 0;border-bottom:1px solid #eee;">
        <div style="color:${INK};font-size:13px;font-weight:700;">${i.productTitle}${i.quantity > 1 ? ` × ${i.quantity}` : ''}</div>
        ${i.optionName ? `<div style="color:#666;font-size:12px;">${i.optionName}</div>` : ''}
      </div>`,
    )
    .join('');

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'You left something behind — ROVIQUE',
    html: layout(
      'Still thinking it over?',
      `<p style="color:#444;font-size:14px;line-height:1.6;">
         Your bag is still here. Nothing is reserved, so popular sizes can go.
       </p>
       ${rows}
       <p style="color:${INK};font-size:14px;font-weight:700;margin-top:14px;">Subtotal: ₹${subtotal}</p>
       <p style="margin:22px 0;">
         <a href="${config.urls.storefront}/checkout"
            style="background:${INK};color:#fff;text-decoration:none;padding:12px 26px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
           Finish your order
         </a>
       </p>
       <p style="color:#999;font-size:11px;">
         If you have changed your mind, you can ignore this — we won't send another.
       </p>`,
    ),
  });
}
