'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Check, ChevronDown, Leaf, ShieldCheck, Truck, RotateCcw, Clock, MapPin, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useShippingRates } from '@/hooks/useShippingRates';
import { ProductGallery } from '@/components/ProductGallery';
import type { Product, ProductPackOption } from '@/data/products';

interface Props {
  product: Product;
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #e5e7eb' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'none',
          border: 'none',
          padding: '16px 0',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 700,
          color: '#111827',
          textAlign: 'left',
        }}
      >
        {title}
        <ChevronDown
          size={18}
          style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && <div style={{ paddingBottom: '18px', fontSize: '14px', lineHeight: 1.7, color: '#4b5563' }}>{children}</div>}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: '#6b7280', padding: '6px 0' }}>{label}</dt>
      <dd style={{ margin: 0, color: '#111827', padding: '6px 0', fontWeight: 600 }}>{value}</dd>
    </>
  );
}

export const ProductDetail: React.FC<Props> = ({ product }) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Pincode state
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [deliveryInfo, setDeliveryInfo] = useState('');

  // Extract tags & benefits
  const labels = product.labels ?? [];
  const benefits = product.benefits ?? [];
  const concerns = product.concerns ?? [];
  const bundleItems = product.bundleItems ?? [];

  // Helper function to extract numeric prices from strings like "₹997" or numbers
  const parsePriceNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Use exact product options set from admin panel if provided, otherwise fallback to standard packs
  const packOptions: ProductPackOption[] = React.useMemo(() => {
    if (product.options && product.options.length > 0) {
      return product.options;
    }

    const leadOption = product.options && product.options.length > 0 ? product.options[0] : null;
    const basePrice = leadOption ? leadOption.price : (parsePriceNum(product.price) || 999);
    const baseComparePrice = (leadOption?.comparePrice && leadOption.comparePrice > 0) 
      ? leadOption.comparePrice 
      : (parsePriceNum(product.compareAtPrice) || (basePrice > 0 ? Math.round(basePrice * 1.4) : 1399));

    return [
      {
        id: `${product.id}-1pc`,
        name: 'Pack Of 1 Pcs',
        price: basePrice,
        comparePrice: baseComparePrice,
        stock: 100,
        badge: '',
      },
      {
        id: `${product.id}-2pc`,
        name: 'Pack Of 2 Pcs',
        price: Math.round(basePrice * 1.85),
        comparePrice: Math.round(baseComparePrice * 1.85),
        stock: 100,
        badge: 'Most popular',
      },
      {
        id: `${product.id}-3pc`,
        name: 'Pack Of 3 Pcs',
        price: Math.round(basePrice * 2.5),
        comparePrice: Math.round(baseComparePrice * 2.5),
        stock: 100,
        badge: '',
      },
    ];
  }, [product]);

  const [selectedId, setSelectedId] = useState(packOptions[0]?.id ?? '');
  const [isBuying, setIsBuying] = useState(false);
  const { freeAbove } = useShippingRates();

  React.useEffect(() => {
    if (packOptions.length > 0 && !packOptions.some((o) => o.id === selectedId)) {
      setSelectedId(packOptions[0].id);
    }
  }, [packOptions, selectedId]);

  const selected = packOptions.find((o) => o.id === selectedId) ?? packOptions[0];
  const inStock = product.inStock && (selected ? selected.stock > 0 : false);

  const selectedPrice = selected ? selected.price : parsePriceNum(product.price);
  const selectedComparePrice = selected?.comparePrice || parsePriceNum(product.compareAtPrice);

  const money = (n: number) => `Rs. ${n.toLocaleString('en-IN')}.00`;

  const getDiscount = (price: number, comparePrice?: number) => {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const handleAdd = () => {
    if (!selected) return;
    addToCart(product, selected, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selected || isBuying || !inStock) return;
    setIsBuying(true);
    addToCart(product, selected, quantity, { openDrawer: false });
    setTimeout(() => {
      router.push('/checkout');
    }, 1700);
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode)) {
      setPincodeStatus('error');
      setDeliveryInfo('Please enter a valid 6-digit pincode');
      return;
    }
    setPincodeStatus('checking');
    setTimeout(() => {
      setPincodeStatus('success');
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      setDeliveryInfo(`Delivering to ${pincode}: Expected delivery by ${dateStr}. Priority dispatch active!`);
    }, 400);
  };

  const hasSpec =
    product.netQuantity ||
    product.form ||
    product.suitableFor ||
    product.storage ||
    product.countryOfOrigin ||
    product.manufacturedBy ||
    product.marketedBy;

  // Concern tags list
  const concernTags = concerns.length > 0 ? concerns.map((c) => c.name) : (labels.length > 0 ? labels : ['Farm Fresh', '100% Natural', 'Harvested Daily']);

  return (
    <div style={{ background: '#ffffff', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px 0' }}>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" style={{ fontSize: '13px', color: '#6b7280', marginBottom: '18px' }}>
          <Link href="/" style={{ color: '#166534', textDecoration: 'none', fontWeight: 600 }}>
            Home
          </Link>{' '}
          /{' '}
          <Link href="/collections/all" style={{ color: '#166534', textDecoration: 'none', fontWeight: 600 }}>
            All Products
          </Link>{' '}
          / <span style={{ color: '#111827', fontWeight: 600 }}>{product.title}</span>
        </nav>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '40px',
            alignItems: 'start',
          }}
        >
          {/* Left Side: Product Image Gallery */}
          <ProductGallery images={product.images ?? []} title={product.title} />

          {/* Right Side: Product Details & Buy Box */}
          <div>
            {/* Top Rating & Sold Badge Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                background: '#ffffff',
              }}
            >
              <span style={{ color: '#ea580c', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 800 }}>
                ★ {product.rating > 0 ? product.rating.toFixed(1) : '4.8'}
              </span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span>{product.reviewCount > 0 ? `${product.reviewCount} ratings` : '773 ratings'}</span>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>
                {product.unitsSold
                  ? product.unitsSold.toLowerCase().includes('unit')
                    ? product.unitsSold
                    : `${product.unitsSold} Units Sold`
                  : '1766+ Units Sold'}
              </span>
            </div>

            {/* Product Title */}
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '28px',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 12px',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {product.title}
            </h1>

            {/* Dark Green Concern Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {concernTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: '#0f5636',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ✓ {tag}
                </span>
              ))}
            </div>

            {/* Pricing Box */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
                {money(selectedPrice)}
              </span>
              {selectedComparePrice && selectedComparePrice > selectedPrice && (
                <span style={{ fontSize: '15px', color: '#9ca3af', textDecoration: 'line-through' }}>
                  {money(selectedComparePrice)}
                </span>
              )}
              {selectedComparePrice && selectedComparePrice > selectedPrice && (
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
                  | Save {money(selectedComparePrice - selectedPrice)} ({getDiscount(selectedPrice, selectedComparePrice)}% off)
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 18px' }}>
              Shipping calculated at checkout.
            </p>

            {/* Dashed USP Badges — Continuous Infinite Slider */}
            <div
              className="usp-ticker-wrapper"
              style={{
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                marginBottom: '22px',
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              }}
            >
              <div
                className="usp-ticker-track"
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: 'max-content',
                  animation: 'uspMarquee 20s linear infinite',
                }}
              >
                {[
                  { icon: '🚚', text: `Free Delivery Above ₹${freeAbove}` },
                  { icon: '🌿', text: 'Farm Fresh, Harvested Daily' },
                  { icon: '⚡', text: 'Express Dispatch in 24 Hours' },
                  { icon: '🔒', text: '100% Organic & Chemical Free' },
                  { icon: '🚚', text: `Free Delivery Above ₹${freeAbove}` },
                  { icon: '🌿', text: 'Farm Fresh, Harvested Daily' },
                  { icon: '⚡', text: 'Express Dispatch in 24 Hours' },
                  { icon: '🔒', text: '100% Organic & Chemical Free' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1.5px dashed #0f5636',
                      borderRadius: '20px',
                      background: '#f4fbf6',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#0f5636',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <style jsx>{`
                @keyframes uspMarquee {
                  0% {
                    transform: translateX(0%);
                  }
                  100% {
                    transform: translateX(-50%);
                  }
                }
                .usp-ticker-wrapper:hover .usp-ticker-track {
                  animation-play-state: paused;
                }
              `}</style>
            </div>

            {/* BUY MORE & SAVE MORE Pack Tier Selector */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 0 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#0f5636' }} />
                <span
                  style={{
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#0f5636',
                    textTransform: 'uppercase',
                  }}
                >
                  BUY MORE & SAVE MORE
                </span>
                <div style={{ flex: 1, height: '1px', background: '#0f5636' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} role="radiogroup" aria-label="Pack size">
                {packOptions.map((opt) => {
                  const active = opt.id === selectedId;
                  const isPopular = opt.badge === 'Most popular';
                  return (
                    <div
                      key={opt.id}
                      role="radio"
                      aria-checked={active}
                      aria-label={`${opt.name}, ${money(opt.price)}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedId(opt.id)}
                      onKeyDown={(event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault();
                          setSelectedId(opt.id);
                          return;
                        }
                        const index = packOptions.findIndex((option) => option.id === opt.id);
                        const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
                        if (!direction && !['Home', 'End'].includes(event.key)) return;
                        event.preventDefault();
                        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? packOptions.length - 1 : (index + direction + packOptions.length) % packOptions.length;
                        setSelectedId(packOptions[nextIndex].id);
                        event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[nextIndex]?.focus();
                      }}
                      style={{
                        position: 'relative',
                        border: `2px solid ${active ? '#0f766e' : '#cbd5e1'}`,
                        borderRadius: '12px',
                        background: active ? '#f0fdfa' : '#ffffff',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Left: Radio & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `2px solid ${active ? '#0f766e' : '#9ca3af'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: '#ffffff',
                          }}
                        >
                          {active && (
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#0f766e',
                              }}
                            />
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                              {opt.name}
                            </span>
                            {opt.price >= freeAbove && (
                            <span
                              style={{
                                border: '1px solid #0d9488',
                                borderRadius: '4px',
                                color: '#0d9488',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '1px 6px',
                              }}
                            >
                              Free Delivery
                            </span>
                            )}
                          </div>
                          {opt.subtitle && (
                            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                              {opt.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Prices */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f766e', display: 'block' }}>
                          {money(opt.price)}
                        </span>
                        {opt.comparePrice && opt.comparePrice > opt.price && (
                          <span style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through' }}>
                            {money(opt.comparePrice)}
                          </span>
                        )}
                      </div>

                      {/* Most Popular Corner Badge */}
                      {isPopular && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '16px',
                            background: '#0f766e',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          Most popular
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Add to Cart & Buy It Now */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inStock}
                style={{
                  width: '100%',
                  background: inStock ? '#ea580c' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  cursor: inStock ? 'pointer' : 'not-allowed',
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {added ? (
                  <>
                    <Check size={18} /> ADDED TO CART
                  </>
                ) : (
                  'ADD TO CART'
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!inStock || isBuying}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '48px',
                  background: isBuying ? '#182b3c' : (inStock ? '#0f5636' : '#cbd5e1'),
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  cursor: inStock && !isBuying ? 'pointer' : 'not-allowed',
                  boxShadow: isBuying ? '0 4px 14px rgba(24, 43, 60, 0.4)' : '0 2px 6px rgba(15, 86, 54, 0.2)',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {isBuying ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Animated Road Dashed Line */}
                    <div
                      className="road-line-anim"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        right: '0',
                        height: '2px',
                        transform: 'translateY(-50%)',
                      }}
                    />

                    {/* Animated Driving Truck */}
                    <div
                      className="truck-drive-anim"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '0',
                        marginTop: '-14px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Cargo Container (White/Silver with shadow line) */}
                        <rect x="2" y="4" width="31" height="17" rx="3" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
                        <line x1="18" y1="4" x2="18" y2="21" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                        
                        {/* Parcel Box Accent */}
                        <rect x="8" y="8" width="8" height="9" rx="1" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
                        
                        {/* Cabin (Navy Blue) */}
                        <path d="M33 7H45C47.5 7 49 9.5 50.5 12L52.5 15.5C53.5 17 53.5 21 53.5 21H33V7Z" fill="#2563EB" />
                        {/* Windshield Window */}
                        <path d="M37 9H44C45.5 9 46.5 10 47.2 12L48.8 14.5H37V9Z" fill="#93C5FD" />
                        
                        {/* Headlight yellow glow */}
                        <circle cx="53" cy="17" r="1.8" fill="#FBBF24" />

                        {/* Wheels */}
                        <g className="wheel-spin" style={{ transformOrigin: '11px 21px' }}>
                          <circle cx="11" cy="21" r="4.5" fill="#0F172A" />
                          <circle cx="11" cy="21" r="2" fill="#94A3B8" />
                        </g>
                        <g className="wheel-spin" style={{ transformOrigin: '43px 21px' }}>
                          <circle cx="43" cy="21" r="4.5" fill="#0F172A" />
                          <circle cx="43" cy="21" r="2" fill="#94A3B8" />
                        </g>
                      </svg>
                    </div>
                  </div>
                ) : (
                  'BUY IT NOW'
                )}
              </button>
            </div>

            {/* Estimated Delivery Date & Pincode Checker */}
            <div
              style={{
                background: '#fffbf5',
                border: '1.5px solid #fef3c7',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    background: '#fef3c7',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#d97706',
                  }}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                    Estimated Delivery Date
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    Prepaid orders are delivered on priority.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCheckPincode} style={{ display: 'flex', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <MapPin size={16} color="#9ca3af" style={{ marginLeft: '12px', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Enter Pincode"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      border: 'none',
                      outline: 'none',
                      padding: '10px 12px',
                      fontSize: '13px',
                      width: '100%',
                      color: '#111827',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#0f5636',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CHECK
                  </button>
                </div>
              </form>

              {deliveryInfo && (
                <p
                  style={{
                    margin: '10px 0 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: pincodeStatus === 'error' ? '#dc2626' : '#0f5636',
                  }}
                >
                  {deliveryInfo}
                </p>
              )}
            </div>

            {/* Product Description Section */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>
                Product Description
              </h3>

              {product.description && (
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#4b5563', margin: '0 0 20px' }}>
                  {product.description}
                </p>
              )}

              {/* Accordion Sections */}
              {benefits.length > 0 && (
                <Accordion title="Benefits" defaultOpen>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {benefits.map((b) => (
                      <li key={b} style={{ marginBottom: '6px' }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </Accordion>
              )}

              {product.ingredients && product.ingredients.length > 0 && (
                <Accordion title="What you get">
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {product.ingredients.map((i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        {i}
                      </li>
                    ))}
                  </ul>
                </Accordion>
              )}

              {product.howToUse && (
                <Accordion title="How to use">
                  <p style={{ margin: 0 }}>{product.howToUse}</p>
                </Accordion>
              )}

              {hasSpec && (
                <Accordion title="Product details">
                  <dl
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      columnGap: '20px',
                      margin: 0,
                      fontSize: '13px',
                    }}
                  >
                    {product.netQuantity && <SpecRow label="Net quantity" value={product.netQuantity} />}
                    {product.form && <SpecRow label="Form" value={product.form} />}
                    {product.suitableFor && <SpecRow label="Suitable for" value={product.suitableFor} />}
                    {product.storage && <SpecRow label="Storage" value={product.storage} />}
                    {product.countryOfOrigin && <SpecRow label="Country of origin" value={product.countryOfOrigin} />}
                    {product.manufacturedBy && <SpecRow label="Grown by" value={product.manufacturedBy} />}
                    {product.marketedBy && <SpecRow label="Sold by" value={product.marketedBy} />}
                  </dl>
                </Accordion>
              )}
            </div>

            {/* Trust Badges Footer Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginTop: '24px',
                fontSize: '12px',
                color: '#4b5563',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Truck size={16} color="#0f5636" /> Dispatched in 24 hours
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <ShieldCheck size={16} color="#0f5636" /> Secure payments
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <RotateCcw size={16} color="#0f5636" /> 7-day return policy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
