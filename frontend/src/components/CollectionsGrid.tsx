'use client';

import React from 'react';
import Link from 'next/link';

export interface CategoryItem {
  title: string;
  href: string;
  image: string;
}

interface CollectionsGridProps {
  categories?: CategoryItem[];
}

export const CollectionsGrid: React.FC<CollectionsGridProps> = ({ categories: customCategories }) => {
  const defaultCategories: CategoryItem[] = [
    {
      title: 'Leafy Greens',
      href: '/collections/leafy-greens',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Root Vegetables',
      href: '/collections/root-vegetables',
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Beans & Peas',
      href: '/collections/beans-peas',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Gourds & Squash',
      href: '/collections/gourds-squash',
      image: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Other Vegetables',
      href: '/collections/other-vegetables',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800&auto=format&fit=crop',
    },
  ];

  const categories = customCategories && customCategories.length > 0 ? customCategories : defaultCategories;

  return (
    <section
      className="rovique-collections"
      style={{
        position: 'relative',
        padding: '36px 16px',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        className="rovique-collections__wrapper collections-slider-smooth"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-start',
          gap: '40px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          paddingTop: '12px',
          paddingLeft: '16px',
          paddingRight: '32px',
        }}
      >
        {categories.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            prefetch={true}
            className="rovique-collections__item collections-item-link"
            style={{
              textAlign: 'center',
              textDecoration: 'none',
              color: '#000000',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
          >
            <div
              className="collections-item-circle"
              style={{
                width: '160px',
                height: '160px',
                marginBottom: '16px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#f8faf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #eef6e6',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              }}
            >
              <img
                src={cat.image}
                alt={cat.title}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'none',
                  transition: 'transform 0.35s ease',
                }}
              />
            </div>
            <p
              className="collections-item-title"
              style={{
                fontFamily: 'Goli, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: '1.25',
                color: '#1D1D1D',
                margin: 0,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {cat.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};
