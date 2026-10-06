'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart, lineKey } from '@/context/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, subtotal, totalItems, clearCart } = useCart();

  const shippingFee = subtotal >= 499 || subtotal === 0 ? 0 : 50;
  const grandTotal = subtotal + shippingFee;

  return (
    <div style={{ background: '#fcfdfa', minHeight: '80vh', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'Goli, sans-serif', fontSize: '32px', fontWeight: 800, color: '#1c2417', margin: 0 }}>
              Shopping Cart
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
              You have {totalItems} items in your cart
            </p>
          </div>
          <Link href="/collections/all" style={{ color: '#88b950', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
        </div>

        {cart.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', color: '#4a5568', marginBottom: '16px' }}>Your cart is empty</h3>
            <Link href="/collections/all" style={{ background: '#88b950', color: '#fff', padding: '12px 28px', borderRadius: '30px', fontWeight: 700, textDecoration: 'none' }}>
              Explore Herbal Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Cart Table */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {cart.map((item) => (
                  <div key={lineKey(item.product.id, item.option.id)} style={{ display: 'flex', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #edf2f7', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', background: '#f8faf6', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={item.product.primaryImage} alt={item.product.title} fill style={{ objectFit: 'contain' }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Link href={`/products/${item.product.slug}`} style={{ textDecoration: 'none', color: '#1a202c', fontWeight: 700, fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                        {item.product.title}
                      </Link>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#88b950' }}>
                        ₹{(item.option.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginTop: '2px' }}>
                        {item.option.name} · ₹{item.option.price.toLocaleString('en-IN')} each
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '20px', padding: '2px 8px' }}>
                      <button onClick={() => updateQuantity(lineKey(item.product.id, item.option.id), item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 700, padding: '0 8px' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(lineKey(item.product.id, item.option.id), item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
                        <Plus size={14} />
                      </button>
                    </div>

                    <button onClick={() => removeFromCart(lineKey(item.product.id, item.option.id))} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: '8px' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#718096', fontSize: '13px', cursor: 'pointer', marginTop: '16px', textDecoration: 'underline' }}>
                Clear Entire Cart
              </button>
            </div>

            {/* Order Summary Card */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', height: 'fit-content' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1c2417', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #edf2f7' }}>
                Order Summary
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', color: '#4a5568' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', color: '#4a5568' }}>
                <span>Estimated Shipping</span>
                <span>{shippingFee === 0 ? <b style={{ color: '#2f855a' }}>FREE</b> : `₹${shippingFee}`}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #edf2f7', fontSize: '20px', fontWeight: 800, color: '#1a202c' }}>
                <span>Grand Total</span>
                <span style={{ color: '#88b950' }}>₹{grandTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={() => router.push('/checkout')}
                style={{
                  width: '100%',
                  background: '#88b950',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginTop: '24px',
                  boxShadow: '0 4px 14px rgba(136, 185, 80, 0.4)',
                }}
              >
                Proceed to Checkout →
              </button>

              <div style={{ marginTop: '20px', fontSize: '12px', color: '#718096', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#88b950" /> 100% Encrypted & Safe Payments
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} color="#88b950" /> Dispatch within 24 Hours
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
