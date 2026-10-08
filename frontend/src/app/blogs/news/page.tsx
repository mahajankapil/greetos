import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BLOG_POSTS } from '@/data/blogs';

export default function BlogPage() {
  return (
    <div style={{ background: '#ffffff', paddingBottom: '60px' }}>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #eef7e6 0%, #d8ebc8 100%)', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ color: '#88b950', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            OLD SPICE AGRO FRESH LLP JOURNAL
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '40px', fontWeight: 800, color: '#1c2417', margin: '8px 0' }}>
            Blogs & Organic Farming News
          </h1>
          <p style={{ fontSize: '16px', color: '#4a5568' }}>
            Fresh vegetable guides, seasonal produce stories, and ideas from our local farms.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '60px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '50px' }}>
        {BLOG_POSTS.map((post) => (
          <article id={post.slug} key={post.slug} style={{ scrollMarginTop: '130px', background: '#f8faf6', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '30px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: '12px', overflow: 'hidden' }}>
              <Image src={post.image} alt={post.title} fill style={{ objectFit: 'cover' }} />
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#88b950', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                {post.category} • {post.date}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1c2417', margin: '0 0 12px', lineHeight: '1.3' }}>
                {post.title}
              </h2>
              <p style={{ fontSize: '15px', color: '#4a5568', lineHeight: '1.6', marginBottom: '20px' }}>
                {post.excerpt}
              </p>
              
              <div style={{ whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.7', color: '#334155', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                {post.content}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
