'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, X, ExternalLink, ShoppingBag, Instagram } from 'lucide-react';
import type { ApiReel } from '@/lib/api';

const DEFAULT_REELS: ApiReel[] = [
  {
    id: 'default-1',
    title: 'Pure Herbal Skincare Essentials',
    videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reel1.mp4',
    thumbnailUrl: null,
    caption: `Discover the secret to effortless, budget-friendly natural skincare! ✨🌿

Our Day Cream provides lightweight daily hydration infused with aloe vera, niacinamide, and shea butter. Keep your skin feeling soft, deeply nourished, and glowing all day long.

How do you use your favourite herbal skincare essentials in your daily routine? Let us know in the comments below! 👇`,
    hashtags: ['RoviqueHerbal', 'HerbalSkincare', 'GlowingSkin', 'NaturalBeauty', 'Ayurveda'],
    instagramUrl: 'https://www.instagram.com/roviqueherbal/',
    productLink: '/products/day-cream',
    productName: 'Day Cream',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'default-2',
    title: 'Overnight Skin Repair & Nourishment',
    videoUrl: 'https://mkpillllll.sirv.com/herbal/videos/reels2.mp4',
    thumbnailUrl: null,
    caption: `Transform your night skincare routine with 100% natural herbal ingredients! 🌙✨

Our Night Cream is formulated with Saffron, Licorice Extract, and Shea Butter to repair dullness, diminish dark spots, and restore radiant skin overnight.

Experience gentle, chemical-free care crafted with traditional Ayurvedic wisdom for soft, glowing skin every morning.`,
    hashtags: ['OvernightRepair', 'RoviqueHerbal', 'AyurvedicCare', 'HealthySkin', 'GlowSecrets'],
    instagramUrl: 'https://www.instagram.com/roviqueherbal/',
    productLink: '/products/night-cream',
    productName: 'Night Cream',
    sortOrder: 2,
    isActive: true,
  },
];

const LOGO_AVATAR = 'https://mkpillllll.sirv.com/oldspice/categ/products/logooldspice.png';

interface ReelsSectionProps {
  reels?: ApiReel[];
}

export function ReelsSection({ reels: propReels }: ReelsSectionProps) {
  const displayReels = propReels && propReels.length > 0 ? propReels : DEFAULT_REELS;

  const [activeModalReel, setActiveModalReel] = useState<ApiReel | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const openReelModal = (reel: ApiReel) => {
    setActiveModalReel(reel);
    setIsPlaying(true);
    setIsMuted(false);
  };

  const closeModal = () => {
    setActiveModalReel(null);
  };

  const togglePlayPause = () => {
    if (modalVideoRef.current) {
      if (isPlaying) {
        modalVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        modalVideoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section style={{ padding: '48px 0', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
              fontFamily: "'Goli', sans-serif",
            }}
          >
            Organic Farm Moments On Instagram
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px', margin: 0 }}>
            Watch daily harvests, organic farming stories & fresh produce tips
          </p>
        </div>

        {/* Carousel Container */}
        <div style={{ position: 'relative', margin: '0 auto', maxWidth: '1200px' }}>
          {/* Left Arrow Button */}
          <button
            onClick={scrollLeft}
            aria-label="Previous reels"
            style={{
              position: 'absolute',
              left: '-16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={scrollRight}
            aria-label="Next reels"
            style={{
              position: 'absolute',
              right: '-16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronRight size={22} />
          </button>

          {/* Reels Row Track */}
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              padding: '10px 4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {displayReels.map((reel) => (
                <div
                  key={reel.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play ${reel.title || 'farm reel'}`}
                  onClick={() => openReelModal(reel)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openReelModal(reel);
                    }
                  }}
                style={{
                  flexShrink: 0,
                  width: '210px',
                  height: '350px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  backgroundColor: '#000000',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                <video
                  src={reel.videoUrl}
                  preload="none"
                  poster={reel.thumbnailUrl || undefined}
                  muted
                  playsInline
                  loop
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Bottom Dark Gradient Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Top-Right Instagram Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Instagram size={14} />
                </div>

                {/* Bottom Title & Tag */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '14px',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: '13px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                  >
                    {reel.title || 'Rovique Herbal Reel'}
                  </p>

                  {reel.productName && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '8px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(6px)',
                        fontSize: '11px',
                        fontWeight: 500,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      <ShoppingBag size={11} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                        {reel.productName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a
            href="https://www.instagram.com/roviqueherbal/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#2d451e',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: '12px 28px',
              borderRadius: '4px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(45, 69, 30, 0.2)',
              transition: 'background-color 0.25s ease, transform 0.2s ease',
            }}
          >
            <Instagram size={18} />
            Visit our Instagram Page
          </a>
        </div>
      </div>

      {/* Reel Modal popup matching Reference Image 2 */}
      {activeModalReel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {/* Backdrop Click Close */}
          <div
            onClick={closeModal}
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Main Modal Box */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'row',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Close Button top-right */}
            <button
              onClick={closeModal}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 30,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            {/* Left Side Video Player */}
            <div
              style={{
                position: 'relative',
                width: '380px',
                flexShrink: 0,
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={modalVideoRef}
                src={activeModalReel.videoUrl}
                autoPlay
                loop
                playsInline
                muted={isMuted}
                onClick={togglePlayPause}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '80vh',
                  objectFit: 'cover',
                  cursor: 'pointer',
                }}
              />

              {/* Mute Button top-left */}
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 20,
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Play Overlay if paused */}
              {!isPlaying && (
                <div
                  onClick={togglePlayPause}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    <Play size={30} style={{ marginLeft: '4px', fill: '#ffffff' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side Info & Description */}
            <div
              style={{
                flex: 1,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              <div>
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        backgroundColor: '#f9fafb',
                        padding: '2px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <img src={LOGO_AVATAR} alt="Rovique Herbal" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        roviqueherbal
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Rovique Herbal Official</p>
                    </div>
                  </div>

                  {activeModalReel.instagramUrl && (
                    <a
                      href={activeModalReel.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: '#7FAD4A',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Follow <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                {/* Title */}
                {activeModalReel.title && (
                  <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                    {activeModalReel.title}
                  </h3>
                )}

                {/* Caption Text */}
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.65',
                    color: '#374151',
                    whiteSpace: 'pre-line',
                    fontFamily: 'sans-serif',
                    marginBottom: '16px',
                  }}
                >
                  {activeModalReel.caption || 'Authentic herbal care formulations made with love and traditional wisdom.'}
                </div>

                {/* Hashtags */}
                {activeModalReel.hashtags && activeModalReel.hashtags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {activeModalReel.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '13px',
                          color: '#7FAD4A',
                          fontWeight: 600,
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Tagged Product Card & Footer */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                {activeModalReel.productName && activeModalReel.productLink && (
                  <Link
                    href={activeModalReel.productLink}
                    onClick={closeModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#f4f9ed',
                      borderRadius: '12px',
                      border: '1px solid #d2e5b8',
                      textDecoration: 'none',
                      color: '#2e4e13',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          padding: '8px',
                          backgroundColor: '#7FAD4A',
                          color: '#ffffff',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#567a2c', fontWeight: 700 }}>
                          Featured Product
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700 }}>
                          {activeModalReel.productName}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4d7a1f' }}>
                      View Product &rarr;
                    </span>
                  </Link>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                  <span>Rovique Herbal Moments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
