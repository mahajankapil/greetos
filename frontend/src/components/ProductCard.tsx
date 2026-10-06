'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // A card has no pack selector, so it adds the smallest pack — the same
    // one whose price the card is showing.
    const option = product.options?.[0];
    if (!option) return;
    addToCart(product, option, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const buttonText = isAdded ? 'Added to Cart' : (product.buttonText || (product.isCombo ? 'Choose options' : 'Add to cart'));

  return (
    <div className="card-wrapper product-card-wrapper">
      <div className="card card--standard card--media">
        <div className="card__inner color-scheme-1 gradient ratio">
          <div className="card__media">
            <div className="media media--transparent media--hover-effect">
              <Link href={`/products/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                <img
                  src={product.primaryImage}
                  alt={product.title}
                  className="motion-reduce"
                  loading="lazy"
                />
                {product.hoverImage && (
                  <img
                    src={product.hoverImage}
                    alt={product.title}
                    className="motion-reduce"
                    loading="lazy"
                  />
                )}
              </Link>
            </div>
          </div>
        </div>

        <div className="card__content">
          <div className="card__information">
            <h3 className="card__heading h5">
              <Link href={`/products/${product.slug}`} className="full-unstyled-link">
                {product.title}
              </Link>
            </h3>

            <div className="card-information">
              {product.shortDescription && (
                <div className="card-desc">
                  <div className="metafield-rich_text_field">
                    <p>{product.shortDescription}</p>
                  </div>
                </div>
              )}

              {/* Shown only once a product has real reviews. A card reading
                  "★ 0 · 0 Reviews" looks broken, and inventing a score to
                  avoid that is worse. */}
              {product.reviewCount > 0 && (
                <div className="custom-rating">
                  <span className="star">★</span>
                  <span className="rating-number">{product.rating.toFixed(1)}</span>
                  <span className="review-count">
                    {product.reviewCount} Review{product.reviewCount === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              <div className="price price--on-sale">
                <div className="price__container">
                  <div className="price__sale">
                    <span className="price-item price-item--sale price-item--last">
                      {product.price}
                    </span>
                    {product.compareAtPrice && (
                      <span className="price-item price-item--regular">
                        <s>{product.compareAtPrice}</s>
                      </span>
                    )}
                  </div>
                  {product.discount && (
                    <span className="discount">{product.discount}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="quick-add no-js-hidden">
            <button
              onClick={handleAddToCart}
              type="button"
              className="quick-add__submit button button--full-width button--secondary card-add-to-cart"
            >
              <span>{buttonText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
