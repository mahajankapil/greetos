'use client';

import React from 'react';
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
  products,
  viewAllLink,
}) => {
  return (
    <section className="rovique-card" id="rovique-card-template--22337521025251__rovique_card_Fa3AbK">
      <div className="rovique-card__inner">
        {/* Section Header */}
        <div className="rovique-card__header">
          <h2>{title}</h2>
          <Link href={viewAllLink} className="rovique-card__btn">
            View All
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="slider-component">
          <ul className="product-grid" role="list">
            {products.slice(0, 4).map((product) => (
              <li key={product.id} className="grid__item slider__slide">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>

        {/* Center Bottom View All Button */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link href={viewAllLink} className="rovique-card__btn" style={{ padding: '10px 32px' }}>
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};
