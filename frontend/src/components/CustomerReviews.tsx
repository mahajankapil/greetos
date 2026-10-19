'use client';

import React from 'react';

interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  text: string;
  initial: string;
  avatarColor: string;
}

const REVIEWS_ROW_1: ReviewItem[] = [
  {
    id: 'r1',
    name: 'Karan M.',
    rating: 5,
    text: 'GREETOS organic products worked wonders for my health! 100% natural and farm fresh.',
    initial: 'K',
    avatarColor: '#728b97',
  },
  {
    id: 'r2',
    name: 'Arjun S.',
    rating: 5,
    text: 'The fresh organic vegetables and herbs delivery is super quick and fresh. Best quality organic produce!',
    initial: 'A',
    avatarColor: '#ab47bc',
  },
  {
    id: 'r3',
    name: 'Priya K.',
    rating: 5,
    text: 'Fresh leafy greens cleared up our daily diet! Vegetables taste so natural and crisp.',
    initial: 'P',
    avatarColor: '#3a5a40',
  },
];

const REVIEWS_ROW_2: ReviewItem[] = [
  {
    id: 'r4',
    name: 'Girish S.',
    rating: 5,
    text: 'Pure organic produce with no chemicals or pesticides. Our daily salad routine keeps us energetic all day.',
    initial: 'G',
    avatarColor: '#455a64',
  },
  {
    id: 'r5',
    name: 'Pooja T.',
    rating: 5,
    text: 'Regular ordering from GREETOS gave our family access to pure, farm-fresh nutrition!',
    initial: 'P',
    avatarColor: '#ad1457',
  },
];

/** Repeats a short row until it is at least four cards wide, so the loop has no gap. */
const fillRow = (row: ReviewItem[]): ReviewItem[] => {
  let out = [...row];
  while (out.length < 4) out = [...out, ...row];
  return out;
};

export const CustomerReviews: React.FC = () => {
  // Duplicate rows for seamless infinite continuous scroll loop
  const track1 = [...fillRow(REVIEWS_ROW_1), ...fillRow(REVIEWS_ROW_1)];
  const track2 = [...fillRow(REVIEWS_ROW_2), ...fillRow(REVIEWS_ROW_2)];

  const renderStars = (rating: number) => {
    return (
      <span style={{ color: '#ea580c', letterSpacing: '2px', fontSize: '14px', marginLeft: '6px' }}>
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </span>
    );
  };

  const renderAvatar = (item: ReviewItem) => {
    return (
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: item.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '22px',
          fontWeight: 600,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          userSelect: 'none',
          fontFamily: 'inherit',
        }}
      >
        {item.initial}
      </div>
    );
  };

  return (
    <section style={{ background: '#ffffff', padding: '60px 0', overflow: 'hidden', position: 'relative' }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', padding: '0 20px' }}>
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 8px',
            letterSpacing: '-0.3px',
          }}
        >
          Our customers love us
        </h2>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: 0 }}>
          4.8 star Based on all customer reviews
        </p>
      </div>

      {/* Marquee Slider Container */}
      <div
        className="review-marquee-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        }}
      >
        {/* Track 1 (Scroll Left) */}
        <div
          className="review-track track-left"
          style={{
            display: 'flex',
            gap: '20px',
            width: 'max-content',
            animation: 'reviewScrollLeft 32s linear infinite',
          }}
        >
          {track1.map((item, idx) => (
            <div
              key={`${item.id}-1-${idx}`}
              style={{
                width: '420px',
                flexShrink: 0,
                background: '#ffffff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '24px',
                padding: '16px 20px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Left Customer Initial Avatar */}
              {renderAvatar(item)}

              {/* Right Review Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                    {item.name}
                  </span>
                  {renderStars(item.rating)}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.45',
                    fontWeight: 500,
                  }}
                >
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Track 2 (Scroll Right) */}
        <div
          className="review-track track-right"
          style={{
            display: 'flex',
            gap: '20px',
            width: 'max-content',
            animation: 'reviewScrollRight 36s linear infinite',
          }}
        >
          {track2.map((item, idx) => (
            <div
              key={`${item.id}-2-${idx}`}
              style={{
                width: '420px',
                flexShrink: 0,
                background: '#ffffff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '24px',
                padding: '16px 20px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Left Customer Initial Avatar */}
              {renderAvatar(item)}

              {/* Right Review Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                    {item.name}
                  </span>
                  {renderStars(item.rating)}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.45',
                    fontWeight: 500,
                  }}
                >
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes reviewScrollLeft {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes reviewScrollRight {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .review-marquee-wrapper:hover .review-track {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

