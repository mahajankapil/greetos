'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart, lineKey } from '@/context/CartContext';
import { useDialog } from '@/hooks/useDialog';

export const CartDrawer: React.FC = () => {
  const { cart, isOpen, closeCart, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();
  const dialogRef = useDialog(isOpen, closeCart);

  if (!isOpen) return null;

  const freeShippingThreshold = 499;
  const progressPercent = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShipping = freeShippingThreshold - subtotal;

  return (
    // Keep cart actions above site navigation and within the dynamic viewport.
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        tabIndex={-1}
        style={{
          position: 'relative',
          zIndex: 10001,
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="#88b950" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a202c' }}>
              Your Cart ({totalItems})
            </h3>
          </div>
          <button className="touch-icon" aria-label="Close cart" onClick={closeCart} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={22} color="#4a5568" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div style={{ background: '#f4f8f0', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
          {subtotal >= freeShippingThreshold ? (
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2f855a' }}>
              🎉 Congratulations! You unlocked FREE SHIPPING!
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#4a5568' }}>
              Add <b>₹{remainingForFreeShipping.toFixed(0)}</b> more for FREE Shipping!
            </span>
          )}
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#88b950', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <ShoppingBag size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', color: '#718096', margin: '0 0 16px' }}>Your cart is currently empty</p>
              <button
                onClick={closeCart}
                style={{ background: '#88b950', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: '20px', fontWeight: 700, cursor: 'pointer' }}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item) => (
                <div key={lineKey(item.product.id, item.option.id)} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #edf2f7' }}>
                  <div style={{ position: 'relative', width: '70px', height: '70px', background: '#f8faf6', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <Image src={item.product.primaryImage} alt={item.product.title} fill style={{ objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1a202c', lineHeight: '1.3' }}>
                      {item.product.title}
                    </h4>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#88b950' }}>
                      ₹{(item.option.price * item.quantity).toLocaleString('en-IN')}
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#718096' }}>
                        {item.option.name}
                      </span>
                    </span>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                        <button
                          className="touch-icon"
                          aria-label={`Decrease quantity of ${item.product.title}`}
                          onClick={() => updateQuantity(lineKey(item.product.id, item.option.id), item.quantity - 1)}
                          style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 6px' }}>{item.quantity}</span>
                        <button
                          className="touch-icon"
                          aria-label={`Increase quantity of ${item.product.title}`}
                          onClick={() => updateQuantity(lineKey(item.product.id, item.option.id), item.quantity + 1)}
                          style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        className="touch-icon"
                        aria-label={`Remove ${item.product.title} from cart`}
                        onClick={() => removeFromCart(lineKey(item.product.id, item.option.id))}
                        style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Subtotal & Checkout */}
        {cart.length > 0 && (
          <div
            style={{
              padding: '20px',
              // Clears the iPhone home indicator.
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid #edf2f7',
              background: '#ffffff',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', color: '#4a5568', fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#88b950' }}>₹{subtotal.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#a0aec0', margin: '0 0 16px' }}>Taxes and shipping calculated at checkout</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/cart"
                onClick={closeCart}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#88b950',
                  color: '#fff',
                  padding: '14px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                View Full Cart & Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
