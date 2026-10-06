'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';

interface ProductSliderProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink: string;
}

export const ProductSlider: React.FC<ProductSliderProps> = ({
  title,
  subtitle,
  products,
  viewAllLink,
}) => {
  const carouselRef = useRef<HTMLUListElement>(null);
  const carouselId = useId();
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const updateArrows = () => {
      setCanScroll({
        previous: carousel.scrollLeft > 1,
        next: carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 1,
      });
    };

    updateArrows();
    carousel.addEventListener('scroll', updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(carousel);
    return () => {
      carousel.removeEventListener('scroll', updateArrows);
      observer.disconnect();
    };
  }, [products.length]);

  const slide = (direction: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * carousel.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="rovique-card" aria-label={title}>
      <div className="rovique-card__inner">
        {/* Section Header */}
        <div className="rovique-card__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="rovique-card__subtitle">{subtitle}</p>}
          </div>
        </div>

        {/* Scrollable product cards */}
        <div className="slider-component product-carousel">
          <ul
            ref={carouselRef}
            id={carouselId}
            className="product-grid product-grid--carousel"
            role="list"
            aria-label={`${title} products`}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                slide(event.key === 'ArrowLeft' ? -1 : 1);
              }
            }}
          >
            {products.map((product) => (
              <li key={product.id} className="grid__item slider__slide">
                <ProductCard product={product} />
              </li>
            ))}
            <li className="grid__item slider__slide product-carousel-end-card">
              <Link href={viewAllLink} className="product-carousel-view-all" aria-label={`View all ${title.toLowerCase()}`}>
                <span className="product-carousel-view-all__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="product-carousel-view-all__title">View All</span>
                <span className="product-carousel-view-all__description">{title}</span>
              </Link>
            </li>
          </ul>
          <div className="product-carousel-arrows">
            <button type="button" className="product-carousel-arrow" aria-label={`Previous ${title.toLowerCase()}`} aria-controls={carouselId} disabled={!canScroll.previous} onClick={() => slide(-1)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="product-carousel-arrow" aria-label={`Next ${title.toLowerCase()}`} aria-controls={carouselId} disabled={!canScroll.next} onClick={() => slide(1)}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
