'use client';

import React from 'react';
import { ShieldCheck, Leaf, Sparkles } from 'lucide-react';

export const TrustBadges: React.FC = () => {
  const baseBadges = [
    {
      title: 'Original Product',
      desc: '100% authentic product with certification of authenticity.',
      image: '/original-product-seal.png',
    },
    {
      title: 'Compliant to Standards',
      desc: 'Made using natural herbal ingredients following strict quality control standards.',
      icon: <ShieldCheck size={56} color="#0f5636" strokeWidth={1.8} />,
    },
    {
      title: 'Paraben Free',
      desc: '100% free from harmful parabens, sulfates, silicones, and toxic chemicals.',
      icon: <Leaf size={56} color="#0f5636" strokeWidth={1.8} />,
    },
    {
      title: '100% Cruelty Free',
      desc: 'Ethically crafted in India and never tested on animals.',
      icon: <Sparkles size={56} color="#0f5636" strokeWidth={1.8} />,
    },
  ];

  // Duplicate for seamless infinite continuous scroll loop
  const tickerItems = [...baseBadges, ...baseBadges];

  return (
    <section
      style={{
        background: '#f3f9ec',
        color: '#1c2417',
        padding: '48px 0',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        className="trust-wrapper"
        style={{
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        }}
      >
        <div
          className="trust-track"
          style={{
            display: 'flex',
            gap: '40px',
            width: 'max-content',
            animation: 'trustMarquee 25s linear infinite',
          }}
        >
          {tickerItems.map((b, index) => (
            <div
              key={index}
              style={{
                width: '290px',
                flexShrink: 0,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  height: '96px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }}
              >
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.image}
                    alt={b.title}
                    style={{
                      maxHeight: '92px',
                      width: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  b.icon
                )}
              </div>
              <h4
                style={{
                  margin: '0 0 8px',
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#111827',
                  letterSpacing: '-0.2px',
                }}
              >
                {b.title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#374151',
                  lineHeight: '1.55',
                  maxWidth: '260px',
                  fontWeight: 500,
                }}
              >
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes trustMarquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .trust-wrapper:hover .trust-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};
