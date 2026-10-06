'use client';

import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

export interface DynamicBanner {
  id?: string;
  desktop: string;
  mobile?: string;
  link?: string;
  alt?: string;
}

interface HeroSliderProps {
  banners?: DynamicBanner[];
}

/**
 * Shown until banners are uploaded in admin. These are product photos, not
 * banner artwork (some are only a few hundred pixels wide), so they sit in a
 * framed split layout instead of being stretched edge to edge.
 */
const FALLBACK_SLIDES = [
  {
    id: 'fallback-1',
    link: '/collections/leafy-greens',
    image: '/products/coriander.webp',
    eyebrow: 'Harvested daily',
    title: 'Fresh Leafy Greens',
    text: 'Spinach, methi, coriander and dill, straight from local organic farms.',
    cta: 'Shop Leafy Greens',
  },
  {
    id: 'fallback-2',
    link: '/collections/root-vegetables',
    image: '/products/beetroot.jpg',
    eyebrow: '100% organic',
    title: 'Farm Fresh Root Vegetables',
    text: 'Beetroot, carrot, radish and potato, naturally grown.',
    cta: 'Shop Root Vegetables',
  },
  {
    id: 'fallback-3',
    link: '/collections/all',
    image: '/products/onion.jpg',
    eyebrow: 'Farm to doorstep',
    title: 'All Organic Produce',
    text: 'Direct from local organic farms to your doorstep.',
    cta: 'Shop All Produce',
  },
];

export const HeroSlider: React.FC<HeroSliderProps> = ({ banners }) => {
  const validCustomBanners = (banners || []).filter((b) => Boolean(b && b.desktop && b.desktop.trim().length > 0));

  const customSlides = validCustomBanners.map((b, idx) => ({
    id: b.id || `custom-${idx}`,
    link: b.link || '/collections/all',
    webImg: b.desktop,
    mobileImg: b.mobile || b.desktop,
    alt: b.alt || 'Old Spice Agro Fresh Banner',
  }));
  const useFallback = customSlides.length === 0;
  const slideCount = useFallback ? FALLBACK_SLIDES.length : customSlides.length;

  const swiperKey = useFallback ? 'fallback' : customSlides.map((s) => s.id || s.webImg).join('___');

  return (
    <section className={`rovique-banner-slider${useFallback ? ' rovique-banner-slider--fallback' : ''}`}>
      <Swiper
        key={swiperKey}
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        loop={slideCount > 1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation={slideCount > 1}
        style={{ width: '100%' }}
      >
        {useFallback
          ? FALLBACK_SLIDES.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div className="hero-fallback">
                  <div className="hero-fallback__inner page-width">
                    <div className="hero-fallback__copy">
                      <span className="hero-fallback__eyebrow">{slide.eyebrow}</span>
                      <h2 className="hero-fallback__title">{slide.title}</h2>
                      <p className="hero-fallback__text">{slide.text}</p>
                      <Link href={slide.link} className="hero-fallback__cta">{slide.cta}</Link>
                    </div>
                    <Link href={slide.link} className="hero-fallback__media" aria-label={slide.cta}>
                      <img src={slide.image} alt="" loading="eager" />
                    </Link>
                  </div>
                </div>
              </SwiperSlide>
            ))
          : customSlides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <div style={{ width: '100%', position: 'relative' }}>
                  <Link href={slide.link} style={{ display: 'block', width: '100%' }}>
                    <picture style={{ display: 'block', width: '100%' }}>
                      {slide.mobileImg && <source media="(max-width: 768px)" srcSet={slide.mobileImg} />}
                      <img className="hero-banner__img" src={slide.webImg} alt={slide.alt} loading="eager" />
                    </picture>
                  </Link>
                </div>
              </SwiperSlide>
            ))}
      </Swiper>
    </section>
  );
};
