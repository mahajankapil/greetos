'use client';

import React from 'react';

export interface DirectorCard {
  id?: string;
  name: string;
  role: string;
  image: string;
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  pinterest?: string;
}

export interface OurStoryData {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  directors?: DirectorCard[];
}

interface OurStorySectionProps {
  data?: OurStoryData;
}

const DEFAULT_DIRECTORS: DirectorCard[] = [
  {
    id: 'sunny-dumbre',
    name: 'Sunny Ashok Dumbre',
    role: 'CEO',
    image: '/directors/sunny-ashok-dumbre.png',
    instagram: '#',
    whatsapp: '#',
  },
  {
    id: 'akash-dumbre',
    name: 'Akash Dilip Dumbre',
    role: 'DIRECTOR',
    image: '/directors/akash-dilip-dumbre.png',
    facebook: '#',
    linkedin: '#',
    twitter: '#',
    pinterest: '#',
  },
  {
    id: 'anita-dumbre',
    name: 'Anita Ashok Dumbre',
    role: 'DIRECTOR',
    image: '/directors/anita-ashok-dumbre.png',
    facebook: '#',
    linkedin: '#',
    twitter: '#',
    pinterest: '#',
  },
];

export function OurStorySection({ data }: OurStorySectionProps) {
  if (data && data.enabled === false) {
    return null;
  }

  const title = data?.title || 'Board Of Directors';
  const subtitle = data?.subtitle || '';
  const directors = data?.directors && data.directors.length > 0 ? data.directors : DEFAULT_DIRECTORS;

  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        padding: '64px 20px',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#334155',
              margin: 0,
              letterSpacing: '-0.3px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: '15px',
                color: '#64748b',
                marginTop: '8px',
                marginBottom: 0,
                fontWeight: 500,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Directors Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
            justifyContent: 'center',
          }}
        >
          {directors.map((director, idx) => (
            <div
              key={director.id || idx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                border: '1px solid #f1f5f9',
                padding: '40px 24px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.05)';
              }}
            >
              {/* Circle Image */}
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginBottom: '24px',
                  backgroundColor: '#f8faf6',
                  border: '3px solid #f1f5f9',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={director.image}
                  alt={director.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              {/* Name & Role */}
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#334155',
                  margin: '0 0 6px',
                  lineHeight: '1.3',
                }}
              >
                {director.name}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  margin: '0 0 20px',
                }}
              >
                {director.role}
              </p>

              {/* Social Icons Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: 'auto',
                }}
              >
                {director.instagram && (
                  <a
                    href={director.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#e1306c')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}

                {director.whatsapp && (
                  <a
                    href={director.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#25d366')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.05 4.91A9.87 9.87 0 0 0 12.04 2 9.94 9.94 0 0 0 2 12.03a9.86 9.86 0 0 0 1.43 5.14L2 22l4.97-1.43a9.9 9.9 0 0 0 5.08 1.4h.01c5.5 0 10-4.47 10.01-9.97A9.81 9.81 0 0 0 19.05 4.9ZM12.06 20a8.32 8.32 0 0 1-4.24-1.17l-.3-.18-2.95.85.84-2.88-.2-.3A8.33 8.33 0 0 1 3.7 12a8.4 8.4 0 0 1 8.37-8.38A8.36 8.36 0 0 1 20.4 12c-.01 4.62-3.78 8.37-8.34 8.37Zm4.67-6.23c-.25-.13-1.47-.72-1.69-.8-.23-.08-.4-.13-.56.13-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.13-1.04-.38-1.99-1.21-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.01-.38.12-.5.13-.13.25-.29.38-.42.13-.17.17-.29.25-.46.08-.17.04-.32-.02-.45-.06-.13-.56-1.34-.77-1.83-.2-.49-.4-.42-.56-.43l-.48-.01c-.17 0-.41.06-.62.29-.21.23-.82.8-.82 1.97 0 1.16.84 2.28.96 2.44.13.17 1.65 2.64 4.12 3.69.58.25 1.04.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.57-.62 1.8-1.22.22-.6.22-1.09.15-1.2-.06-.11-.22-.18-.47-.31Z" />
                    </svg>
                  </a>
                )}

                {director.facebook && (
                  <a
                    href={director.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1877f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}

                {director.linkedin && (
                  <a
                    href={director.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#0a66c2')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                )}

                {director.twitter && (
                  <a
                    href={director.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1da1f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                )}

                {director.pinterest && (
                  <a
                    href={director.pinterest}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Pinterest"
                    style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'flex' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#bd081c')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
