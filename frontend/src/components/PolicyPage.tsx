import React from 'react';
import Link from 'next/link';

/**
 * Shared shell for the legal/policy pages.
 *
 * These exist because a store that wants to advertise needs them: Google Ads
 * and AdSense both expect a real, reachable privacy policy, refund and
 * shipping terms, and contact details before they will approve a commerce
 * site. Keeping one shell means they cannot drift apart in tone or layout.
 *
 * `lastUpdated` is shown deliberately — an undated policy is worth little to
 * a customer and reads as boilerplate to a reviewer.
 */
interface Props {
  title: string;
  intro?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const PolicyPage: React.FC<Props> = ({ title, intro, lastUpdated, children }) => (
  <div style={{ background: '#fcfdfa', minHeight: '70vh', padding: '40px 16px 70px' }}>
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: '13px', color: '#718096', marginBottom: '14px' }}>
        <Link href="/" style={{ color: '#4d7a1f', textDecoration: 'none', fontWeight: 600 }}>
          Home
        </Link>{' '}
        / <span style={{ color: '#1c2417' }}>{title}</span>
      </nav>

      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '32px',
          fontWeight: 800,
          color: '#1c2417',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 24px' }}>Last updated: {lastUpdated}</p>

      {intro && (
        <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#3d4852', margin: '0 0 24px' }}>{intro}</p>
      )}

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e8ece4',
          borderRadius: '16px',
          padding: '28px 26px',
          fontSize: '15px',
          lineHeight: 1.8,
          color: '#3d4852',
        }}
      >
        {children}
      </div>
    </div>
  </div>
);

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2417', margin: '26px 0 10px' }}>{children}</h2>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: '0 0 14px' }}>{children}</p>
);

export const UL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul style={{ paddingLeft: '22px', margin: '0 0 16px' }}>{children}</ul>
);

export function PolicyContentRenderer({ content }: { content: string }) {
  if (!content) return null;

  const blocks = content.split('\n\n').map((b) => b.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {blocks.map((block, idx) => {
        if (block.startsWith('## ')) {
          return <H2 key={idx}>{block.replace(/^##\s+/, '')}</H2>;
        }
        if (block.startsWith('- ') || block.includes('\n- ')) {
          const items = block.split('\n').map((line) => line.replace(/^-\s+/, '').trim()).filter(Boolean);
          return (
            <UL key={idx}>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </UL>
          );
        }
        return <P key={idx}>{block}</P>;
      })}
    </div>
  );
}
