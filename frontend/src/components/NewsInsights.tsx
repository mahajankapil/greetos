'use client';

import React from 'react';
import Link from 'next/link';

export interface BlogPostItem {
  id?: string;
  title: string;
  author: string;
  date: string;
  image: string;
  slug: string;
}

interface NewsInsightsProps {
  posts?: BlogPostItem[];
}

const DEFAULT_POSTS: BlogPostItem[] = [
  {
    id: '1',
    title: 'How to Know Your Organic Vegetables at Home? A Simple Guide',
    author: 'Old Spice Agro Fresh LLP',
    date: 'August 31, 2026',
    image: '/products/spinach.webp',
    slug: 'how-to-know-your-skin-type-at-home',
  },
  {
    id: '2',
    title: '12 Organic Farming Habits for Healthy Living That Cost You ₹0',
    author: 'Old Spice Agro Fresh LLP',
    date: 'August 31, 2026',
    image: '/products/coriander.webp',
    slug: '12-hair-care-habits-for-healthy-hair',
  },
  {
    id: '3',
    title: 'Best Organic Vegetables & Herbs for Naturally Healthy Life',
    author: 'Old Spice Agro Fresh LLP',
    date: 'April 22, 2026',
    image: '/products/fenugreek.webp',
    slug: 'best-herbal-skincare-products',
  },
];

export const NewsInsights: React.FC<NewsInsightsProps> = ({ posts }) => {
  const displayPosts = posts && posts.length > 0 ? posts : DEFAULT_POSTS;

  return (
    <section style={{ padding: '60px 20px', background: '#ffffff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#111827',
            textAlign: 'center',
            marginBottom: '36px',
            letterSpacing: '-0.3px',
          }}
        >
          Blog
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {displayPosts.map((post, idx) => (
            <div
              key={post.id || post.slug || idx}
              style={{
                background: '#f6faf2',
                borderRadius: '14px',
                border: '1px solid #e2ece0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {/* Banner Image */}
              <div style={{ height: '210px', width: '100%', overflow: 'hidden', background: '#e5e7eb' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Author & Date Metadata Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#4c1d95' }}>👤</span> {post.author || 'Old Spice Agro Fresh LLP'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#3b82f6' }}>🗓️</span> {post.date}
                  </span>
                </div>

                {/* Post Title */}
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#111827',
                    margin: '12px 0 16px',
                    lineHeight: 1.38,
                  }}
                >
                  {post.title}
                </h3>

                {/* Read More Link */}
                <Link
                  href={post.slug ? (post.slug.startsWith('/') ? post.slug : `/blogs/news#${post.slug}`) : '/blogs/news'}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#374151',
                    textDecoration: 'underline',
                    marginTop: 'auto',
                    alignSelf: 'flex-start',
                  }}
                >
                  Read more
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
