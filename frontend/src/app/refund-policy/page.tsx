import React from 'react';
import type { Metadata } from 'next';
import { PolicyPage, H2, P, UL, PolicyContentRenderer } from '@/components/PolicyPage';
import { getSettings } from '@/lib/api';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Refund & Cancellation Policy | ${SITE.name}`,
  description: `Official Refund, Cancellation & Exchange Policy for ${SITE.name}.`,
  alternates: { canonical: '/refund-policy' },
};

export default async function RefundPolicyPage() {
  const settings = await getSettings();
  let custom: any = null;
  if (settings?.legal_refund_policy) {
    try {
      custom = JSON.parse(settings.legal_refund_policy);
    } catch {}
  }

  if (custom && custom.content) {
    return (
      <PolicyPage
        title={custom.title || 'Refund & Cancellation Policy'}
        lastUpdated={custom.lastUpdated || '8 September 2026'}
        intro={custom.intro}
      >
        <PolicyContentRenderer content={custom.content} />
      </PolicyPage>
    );
  }

  return (
    <PolicyPage
      title="Refund & Cancellation Policy"
      lastUpdated="8 September 2026"
      intro={`Important policy details regarding refunds, returns, and product exchanges at ${SITE.name}.`}
    >
      <div
        style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '28px',
          color: '#991b1b',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>
          🚫 Strict No Refund &amp; No Return Policy
        </div>
        <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
          At <strong>{SITE.name}</strong>, we strictly follow a <strong>No Refund &amp; No Returns</strong> policy.
          We only process product <strong>Exchanges</strong> under specific conditions outlined below.
        </div>
      </div>

      <H2>1. No Refunds &amp; No Returns</H2>
      <P>
        Once an order is placed or delivered, we do not accept returns or offer financial refunds under any circumstances.
      </P>

      <H2>2. Exchange Eligibility</H2>
      <P>
        We only offer an <strong>Exchange</strong> if the following mandatory conditions are met:
      </P>
      <UL>
        <li>The product must be completely <strong>unused</strong>, <strong>unopened</strong>, and in its <strong>original condition</strong> with sealed packaging intact.</li>
        <li>A <strong>proper, unedited, continuous unboxing video</strong> is mandatory. The video must show the parcel from its sealed outer packaging stage to opening the box and revealing the product.</li>
        <li>Without a valid unboxing video, exchange requests will not be entertained.</li>
      </UL>

      <H2>3. How to Request an Exchange</H2>
      <P>
        If your product meets the above exchange criteria, please reach out to us within 48 hours of delivery:
      </P>
      <UL>
        <li>Email your order ID and unboxing video to <strong>{SITE.email}</strong></li>
        <li>Or contact / WhatsApp us at <strong>{SITE.phone}</strong></li>
      </UL>
      <P>
        Our support team will verify the unboxing video and guide you through the exchange process.
      </P>
    </PolicyPage>
  );
}
