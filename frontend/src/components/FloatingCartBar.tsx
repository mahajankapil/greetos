'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';

/**
 * Phone-only "View Cart" bar, floating above the bottom navigation once the
 * cart has something in it. It replaces the cart icon in the header and the
 * Cart tab in the bottom nav, so there is one obvious way to the cart with the
 * running total beside it. Hidden on the cart page itself; checkout never
 * renders it (SiteFooter returns nothing there).
 */
export const FloatingCartBar: React.FC = () => {
  const pathname = usePathname();
  const { totalItems, subtotal, openCart, hydrated, isOpen } = useCart();

  if (!hydrated || totalItems === 0 || isOpen || pathname === '/cart') return null;

  const total = `₹${subtotal.toLocaleString('en-IN')}`;
  const items = `${totalItems} item${totalItems === 1 ? '' : 's'}`;

  return (
    <button
      type="button"
      className="cart-float"
      onClick={openCart}
      aria-label={`View cart, ${items}, ${total}`}
    >
      <span className="cart-float__icon" aria-hidden="true"><ShoppingCart size={22} /></span>
      <span className="cart-float__sum">
        <span className="cart-float__count">{items}</span>
        <span className="cart-float__total">{total}</span>
      </span>
      <span className="cart-float__cta">
        View Cart <ChevronRight size={18} aria-hidden="true" />
      </span>
    </button>
  );
};
