import React from 'react';
import type { Metadata } from 'next';
import { PolicyPage, H2, P, UL, PolicyContentRenderer } from '@/components/PolicyPage';
import { getSettings } from '@/lib/api';
import { SITE, formattedAddress } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Terms of Service | ${SITE.name}`,
  description: `The terms on which ${SITE.name} sells products through this website.`,
  alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
  const settings = await getSettings();
  let custom: any = null;
  if (settings?.legal_terms_of_service) {
    try {
      custom = JSON.parse(settings.legal_terms_of_service);
    } catch {}
  }

  if (custom && custom.content) {
    return (
      <PolicyPage
        title={custom.title || 'Terms of Service'}
        lastUpdated={custom.lastUpdated || '8 September 2026'}
        intro={custom.intro}
      >
        <PolicyContentRenderer content={custom.content} />
      </PolicyPage>
    );
  }

  return (
    <PolicyPage
      title="Terms of Service"
      lastUpdated="8 September 2026"
      intro={`These terms govern your use of this website and any order you place with ${SITE.legalName}. By placing an order you accept them.`}
    >
      <H2>Who we are</H2>
      <P>
        This store is operated by {SITE.legalName}, {formattedAddress()}. You can reach us at {SITE.email} or{' '}
        {SITE.phone}.
      </P>

      <H2>Products and pricing</H2>
      <P>
        All prices are in Indian Rupees and inclusive of applicable taxes. We try to describe and photograph every
        product accurately.
      </P>

      <H2>Orders &amp; Payments</H2>
      <P>
        An order is accepted when we confirm dispatch. Payments are processed by a third-party gateway.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of India, and the courts at {SITE.address.city} have jurisdiction over
        any dispute.
      </P>
    </PolicyPage>
  );
}
