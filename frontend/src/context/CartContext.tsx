'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductPackOption } from '@/data/products';

/**
 * The cart.
 *
 * A line is a product AND a pack size, not just a product: "Day Cream, Pack of
 * 2" and "Day Cream, Pack of 3" are different things at different prices, and a
 * shopper can legitimately want both. So every line is keyed by
 * `${productId}:${optionId}` rather than by product alone — keying on the
 * product would silently merge the two and charge one of them wrongly.
 */

export interface CartItem {
  product: Product;
  option: ProductPackOption;
  quantity: number;
}

/** The identity of a cart line. Exported so callers can address a line directly. */
export function lineKey(productId: string, optionId: string): string {
  return `${productId}:${optionId}`;
}

interface CartContextType {
  cart: CartItem[];
  /**
   * False until the saved cart has been read back from localStorage.
   *
   * Anything that reacts to an EMPTY cart must wait for this. The first render
   * always has an empty array — the restore happens in an effect — so a
   * redirect that fires on `cart.length === 0` would bounce every customer
   * off the checkout before their cart had loaded.
   */
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (
    product: Product,
    option: ProductPackOption,
    quantity?: number,
    options?: { openDrawer?: boolean },
  ) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Versioned so a change to the line shape can retire old saved carts (a line
 * with no `option` would show with no price) instead of crashing on them —
 * bump the suffix when that happens.
 */
const STORAGE_KEY = 'oldspice_cart_v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as CartItem[];
      // Defend against a hand-edited or half-written value.
      setCart(Array.isArray(parsed) ? parsed.filter((i) => i?.product?.id && i?.option?.id) : []);
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    // Never write before the restore has run, or the first render's empty
    // array would overwrite the saved cart.
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart, hydrated]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addToCart = (
    product: Product,
    option: ProductPackOption,
    quantity: number = 1,
    options?: { openDrawer?: boolean },
  ) => {
    setCart((prev) => {
      const key = lineKey(product.id, option.id);
      const existing = prev.find((i) => lineKey(i.product.id, i.option.id) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.product.id, i.option.id) === key ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { product, option, quantity }];
    });
    // On phones the floating "View Cart" bar confirms the add instead; popping
    // the whole cart open over the page after every tap is what shoppers there
    // did not want. Larger screens keep the drawer. (768px matches the CSS
    // that shows the bar and hides the header cart icon.)
    const onPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (options?.openDrawer !== false && !onPhone) {
      setIsOpen(true);
    }
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((i) => lineKey(i.product.id, i.option.id) !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (lineKey(i.product.id, i.option.id) === key ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);

  // Prices come from the option as a number, so there is no string parsing to
  // get wrong — the old cart scraped "₹1,050" back into a float.
  const subtotal = cart.reduce((acc, i) => acc + i.option.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        hydrated,
        isOpen,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
