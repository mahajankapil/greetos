import React from 'react';
import type { Metadata } from 'next';
import { PolicyPage, H2, P, UL, PolicyContentRenderer } from '@/components/PolicyPage';
import { getSettings } from '@/lib/api';
import { SITE, formattedAddress } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE.name}`,
  description: `How ${SITE.name} collects, uses and protects your personal information when you shop with us.`,
  alternates: { canonical: '/privacy-policy' },
};

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  let custom: any = null;
  if (settings?.legal_privacy_policy) {
    try {
      custom = JSON.parse(settings.legal_privacy_policy);
    } catch {}
  }

  if (custom && custom.content) {
    return (
      <PolicyPage
        title={custom.title || 'Privacy Policy'}
        lastUpdated={custom.lastUpdated || '8 September 2026'}
        intro={custom.intro}
      >
        <PolicyContentRenderer content={custom.content} />
      </PolicyPage>
    );
  }

  return (
    <PolicyPage
      title="Privacy Policy"
      lastUpdated="8 September 2026"
      intro={`This policy explains what personal information ${SITE.name} collects when you visit or buy from this store, why we collect it, and what we do with it.`}
    >
      <H2>Information we collect</H2>
      <P>When you place an order we collect the details needed to fulfil it:</P>
      <UL>
        <li>Your name, email address and phone number</li>
        <li>The delivery address you provide, including pincode</li>
        <li>What you ordered, and the amount paid</li>
      </UL>
      <P>
        We do not store your card, UPI or net-banking details. Payments are handled by our payment gateway, which
        receives those details directly and never passes them to us.
      </P>

      <H2>How we use it</H2>
      <UL>
        <li>To pack, dispatch and deliver your order, and to answer questions about it</li>
        <li>To send order confirmation and delivery updates by email</li>
        <li>To process a return or refund you have asked for</li>
        <li>To meet our legal and tax obligations</li>
      </UL>

      <H2>Who we share it with</H2>
      <P>
        We do not sell your personal information. We share it only with the parties who make an order possible: the
        courier delivering your parcel (name, address and phone number), our payment gateway, and our email provider.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this policy can go to <strong>{SITE.email}</strong> or {SITE.phone}, or by post to{' '}
        {SITE.legalName}, {formattedAddress()}.
      </P>
    </PolicyPage>
  );
}
