import React from 'react';
import type { Metadata } from 'next';
import { PolicyPage, H2, P, UL, PolicyContentRenderer } from '@/components/PolicyPage';
import { getSettings } from '@/lib/api';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Shipping & Delivery Policy | ${SITE.name}`,
  description: `Dispatch times, delivery estimates and shipping charges for ${SITE.name} orders across India.`,
  alternates: { canonical: '/shipping-policy' },
};

export default async function ShippingPolicyPage() {
  const settings = await getSettings();
  let custom: any = null;
  if (settings?.legal_shipping_policy) {
    try {
      custom = JSON.parse(settings.legal_shipping_policy);
    } catch {}
  }

  if (custom && custom.content) {
    return (
      <PolicyPage
        title={custom.title || 'Shipping & Delivery Policy'}
        lastUpdated={custom.lastUpdated || '8 September 2026'}
        intro={custom.intro}
      >
        <PolicyContentRenderer content={custom.content} />
      </PolicyPage>
    );
  }

  return (
    <PolicyPage
      title="Shipping & Delivery"
      lastUpdated="8 September 2026"
      intro={`How and when ${SITE.name} orders are dispatched and delivered.`}
    >
      <H2>Where we deliver</H2>
      <P>We deliver across India. We do not currently ship internationally.</P>

      <H2>Dispatch &amp; Delivery Time</H2>
      <P>
        Orders are packed and handed to a courier within {SITE.shipping.dispatchDays} of payment being confirmed.
        Once dispatched, most orders arrive within {SITE.shipping.deliveryDays}.
      </P>

      <H2>Shipping charges</H2>
      <UL>
        <li>Flat ₹{SITE.shipping.flatRate} on orders below ₹{SITE.shipping.freeAbove}</li>
        <li>Free shipping on prepaid orders of ₹{SITE.shipping.freeAbove} and above</li>
      </UL>

      <H2>Contact</H2>
      <P>
        For anything about a delivery, write to <strong>{SITE.email}</strong> or call {SITE.phone} with your order
        number to hand.
      </P>
    </PolicyPage>
  );
}
