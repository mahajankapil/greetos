'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { PRODUCTS, Product } from '@/data/products';
import { VegetableNavigation } from '@/components/VegetableNavigation';
import { useDialog } from '@/hooks/useDialog';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

const SEARCH_SUGGESTIONS = [
  'Search "Fresh Spinach"...',
  'Search "Organic Carrot"...',
  'Search "Red Onion"...',
  'Search "Green Chilli"...',
  'Search "Green Peas"...',
  'Search "Fresh Coriander"...',
  'Search "Bottle Gourd"...',
  'Search "Desi Garlic"...',
];

export const Header: React.FC = () => {
  const { totalItems, openCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useDialog(drawerOpen, () => setDrawerOpen(false));
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
    setMoreDropdownOpen(false);
    setIsFocused(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const logo = 'https://mkpillllll.sirv.com/oldspice/categ/products/logooldspice.png';

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPlaceholderIdx((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
        setAnimating(false);
      }, 250);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Fetch exact live products from backend API (matching /collections/all).
  //
  // Absolute, not `/api/products`: the API is its own hostname in production,
  // and a same-origin path only worked because the old single-domain vhost
  // happened to proxy /api/ through to it.
  useEffect(() => {
    fetch(`${API_BASE}/products`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const apiAdapted: Product[] = data.map((item: any) => {
            const firstOpt = item.options?.[0];
            const pPrice = firstOpt?.price ?? item.price ?? 0;
            const pCompare = firstOpt?.comparePrice && firstOpt.comparePrice > pPrice ? firstOpt.comparePrice : item.comparePrice || null;

            return {
              id: item.id || item.handle || item._id,
              slug: item.handle || item.slug || item.id,
              title: item.title || item.name,
              price: typeof pPrice === 'number' ? `₹${pPrice.toLocaleString('en-IN')}` : String(pPrice),
              compareAtPrice: pCompare ? (typeof pCompare === 'number' ? `₹${pCompare.toLocaleString('en-IN')}` : String(pCompare)) : null,
              primaryImage: item.image || item.primaryImage || item.images?.[0] || 'https://via.placeholder.com/150',
              rating: item.rating || 5,
              reviewCount: item.reviewsCount || item.reviewCount || 0,
              description: item.description || item.usp || '',
              category: item.categories?.[0]?.name || item.category || 'Leafy Vegetables',
              inStock: !item.soldOut,
            };
          });

          setAllProducts(apiAdapted);
        } else {
          setAllProducts(PRODUCTS);
        }
      })
      .catch(() => {
        setAllProducts(PRODUCTS);
      });
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter ONLY products from /collections/all
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      const descMatch = (p.description || '').toLowerCase().includes(q);
      return titleMatch || catMatch || descMatch;
    });
  }, [searchQuery, allProducts]);

  const menuItems = [
    { id: 'HeaderMenu-home', name: 'HOME', href: '/' },
    { id: 'HeaderMenu-best-sellers', name: 'BEST SELLERS', href: '/collections/best-sellers' },
    { id: 'HeaderMenu-combos', name: 'ORGANIC BASKETS', href: '/collections/super-saver-combos' },
    { id: 'HeaderMenu-all-products', name: 'SHOP VEGETABLES', href: '/collections/all' },
    { id: 'HeaderMenu-offers', name: 'OFFERS', href: '/offers' },
  ];

  const moreDropdownItems = [
    { id: 'HeaderMenu-blog', name: 'BLOGS & ORGANIC FARMING NEWS', href: '/blogs/news' },
    { id: 'HeaderMenu-about', name: 'ABOUT US', href: '/about-us' },
    { id: 'HeaderMenu-directors', name: 'BOARD OF DIRECTORS', href: '/board-of-directors' },
    { id: 'HeaderMenu-contact-us', name: 'CONTACT US', href: '/contact' },
  ];

  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header
      className="header-wrapper"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #eaeaea',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Single-Row Authentic Modern Navbar */}
      <div
        className="header-container"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* Left Side: Mobile Menu Button + Brand Logo */}
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, marginRight: '36px' }}>
          <button
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111827',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '22px', height: '22px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={logo}
              alt="Old Spice Agro Fresh"
              width="135"
              height="45"
              style={{ objectFit: 'contain', display: 'block', maxHeight: '42px', width: 'auto' }}
            />
          </Link>
        </div>

        {/* Center: Clean Modern Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {menuItems.map((item) => {
              if (item.id === 'HeaderMenu-all-products') return <VegetableNavigation key={item.id} />;
              const active = isItemActive(item.href);
              return (
                <li key={item.id}>
                  <Link
                    id={item.id}
                    href={item.href}
                    style={{
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: active ? 800 : 700,
                      color: active ? '#111827' : '#4b5563',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      padding: '8px 0',
                      position: 'relative',
                      transition: 'color 0.2s ease',
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{item.name}</span>
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          height: '2px',
                          backgroundColor: '#111827',
                          borderRadius: '1px',
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}

            {/* More navigation */}
            <li
              style={{ position: 'relative' }}
              onMouseEnter={() => setMoreDropdownOpen(true)}
              onMouseLeave={() => setMoreDropdownOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMoreDropdownOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setMoreDropdownOpen(false);
                  event.currentTarget.querySelector('button')?.focus();
                }
              }}
            >
              <button
                type="button"
                onClick={() => setMoreDropdownOpen((prev) => !prev)}
                aria-expanded={moreDropdownOpen}
                aria-controls="desktop-more-links"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: moreDropdownItems.some((i) => isItemActive(i.href)) ? 800 : 700,
                  color: moreDropdownItems.some((i) => isItemActive(i.href)) ? '#111827' : '#4b5563',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  padding: '8px 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>MORE</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{
                    width: '14px',
                    height: '14px',
                    transform: moreDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {moreDropdownOpen && (
                <div
                  id="desktop-more-links"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 0',
                    minWidth: '220px',
                    border: '1px solid #f3f4f6',
                    zIndex: 110,
                  }}
                >
                  {moreDropdownItems.map((subItem) => {
                    const subActive = isItemActive(subItem.href);
                    return (
                      <Link
                        key={subItem.id}
                        href={subItem.href}
                        onClick={() => setMoreDropdownOpen(false)}
                        style={{
                          display: 'block',
                          padding: '10px 18px',
                          fontSize: '12px',
                          fontWeight: subActive ? 800 : 700,
                          color: subActive ? '#15803d' : '#374151',
                          textDecoration: 'none',
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          transition: 'background 0.2s ease',
                          background: subActive ? '#f0fdf4' : 'transparent',
                        }}
                      >
                        {subItem.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </li>
          </ul>
        </nav>

        {/* Right Side: Search Input/Icon + Account + Cart + Action Button */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Integrated Search Box with Animated Placeholder */}
          <div className="desktop-search-container" ref={searchContainerRef} style={{ position: 'relative' }}>
            <form action="/collections/all" method="get" role="search" style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  padding: '7px 14px',
                  width: '240px',
                  border: '1.5px solid #e5e7eb',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                }}
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="#4b5563" style={{ width: '15px', height: '15px', marginRight: '8px', flexShrink: 0, zIndex: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>

                {!searchQuery && (
                  <span
                    className={`animated-placeholder ${animating ? 'fade-out' : 'fade-in'}`}
                    style={{
                      position: 'absolute',
                      left: '36px',
                      fontSize: '12px',
                      color: '#9ca3af',
                      fontWeight: 500,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, transform 0.25s ease',
                      transform: animating ? 'translateY(-5px)' : 'translateY(0)',
                      opacity: animating ? 0 : 1,
                      zIndex: 1,
                    }}
                  >
                    {SEARCH_SUGGESTIONS[placeholderIdx]}
                  </span>
                )}

                <input
                  type="text"
                  name="q"
                  aria-label="Search vegetables"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  autoComplete="off"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '12px',
                    color: '#111827',
                    fontWeight: 500,
                    position: 'relative',
                    zIndex: 2,
                  }}
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      margin: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#9ca3af',
                      zIndex: 3,
                    }}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '13px', height: '13px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Desktop Live Search Dropdown */}
            {searchQuery.trim() && isFocused && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '360px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.18)',
                  border: '1px solid #e5e7eb',
                  zIndex: 9999,
                  maxHeight: '440px',
                  overflowY: 'auto',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    padding: '4px 8px 8px',
                    borderBottom: '1px solid #f3f4f6',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Products ({searchResults.length})
                  </span>
                  {searchResults.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Click product to view</span>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.slice(0, 6).map((product) => (
                      <Link
                        key={product.id || product.slug}
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          setSearchQuery('');
                          setIsFocused(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          transition: 'background 0.15s ease',
                        }}
                        className="search-item-hover"
                      >
                        <img
                          src={product.primaryImage}
                          alt={product.title}
                          style={{
                            width: '44px',
                            height: '44px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #f3f4f6',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                              {product.price}
                            </span>
                            {product.compareAtPrice && (
                              <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                {product.compareAtPrice}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#2d451e', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
                          View →
                        </span>
                      </Link>
                    ))}

                    {searchResults.length > 6 && (
                      <Link
                        href={`/collections/all?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setIsFocused(false)}
                        style={{
                          marginTop: '6px',
                          padding: '10px',
                          width: '100%',
                          background: '#2d451e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'block',
                        }}
                      >
                        View all {searchResults.length} results
                      </Link>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: '#6b7280' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No products found for "{searchQuery}"</p>
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#9ca3af' }}>Try searching for spinach, carrot, onion or tomato</p>
                    <Link
                      href="/collections/all"
                      onClick={() => {
                        setSearchQuery('');
                        setIsFocused(false);
                      }}
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        background: '#2d451e',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Explore All Products
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Icon */}
          <Link
            href={user ? '/account' : '/account/login'}
            className="touch-icon"
            aria-label={user ? 'Account' : 'Sign In'}
            style={{
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background 0.2s ease',
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: '22px', height: '22px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </Link>

          {/* Cart Icon with Counter */}
          <button
            onClick={openCart}
            className="touch-icon"
            type="button"
            aria-label="Cart"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111827',
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: '22px', height: '22px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  background: '#111827',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {totalItems}
              </span>
            )}
          </button>

          {/* Black Call to Action Pill Button */}
          <Link
            href="/collections/best-sellers"
            className="action-pill-btn"
            style={{
              background: '#111827',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              padding: '9px 18px',
              borderRadius: '9999px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            SHOP BESTSELLERS
          </Link>
        </div>
      </div>

      {/* Mobile Search Bar Row (Front Page & Header) */}
      <div
        className="mobile-search-bar-row"
        ref={mobileSearchRef}
        style={{
          padding: '0 16px 10px 16px',
          position: 'relative',
        }}
      >
        <form action="/collections/all" method="get" role="search" style={{ display: 'flex', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '8px 14px',
              width: '100%',
              border: '1.5px solid #e5e7eb',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s ease-in-out',
              position: 'relative',
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="#4b5563" style={{ width: '16px', height: '16px', marginRight: '8px', flexShrink: 0, zIndex: 2 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>

            {!searchQuery && (
              <span
                className={`animated-placeholder ${animating ? 'fade-out' : 'fade-in'}`}
                style={{
                  position: 'absolute',
                  left: '38px',
                  fontSize: '13px',
                  color: '#9ca3af',
                  fontWeight: 500,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                  transform: animating ? 'translateY(-5px)' : 'translateY(0)',
                  opacity: animating ? 0 : 1,
                  zIndex: 1,
                }}
              >
                {SEARCH_SUGGESTIONS[placeholderIdx]}
              </span>
            )}

            <input
              type="text"
              name="q"
              aria-label="Search vegetables"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              autoComplete="off"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '13px',
                color: '#111827',
                fontWeight: 500,
                position: 'relative',
                zIndex: 2,
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  margin: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  zIndex: 3,
                }}
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Mobile Live Search Dropdown */}
        {searchQuery.trim() && isFocused && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: '16px',
              right: '16px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e5e7eb',
              zIndex: 9999,
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '12px',
            }}
          >
            <div
              style={{
                padding: '4px 8px 8px',
                borderBottom: '1px solid #f3f4f6',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Products ({searchResults.length})
              </span>
              {searchResults.length > 0 && (
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Tap to view</span>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {searchResults.slice(0, 5).map((product) => (
                  <Link
                    key={product.id || product.slug}
                    href={`/products/${product.slug}`}
                    onClick={() => {
                      setSearchQuery('');
                      setIsFocused(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <img
                      src={product.primaryImage}
                      alt={product.title}
                      style={{
                        width: '42px',
                        height: '42px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #f3f4f6',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                          {product.price}
                        </span>
                        {product.compareAtPrice && (
                          <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                            {product.compareAtPrice}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2d451e', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
                      View →
                    </span>
                  </Link>
                ))}

                {searchResults.length > 5 && (
                  <Link
                    href={`/collections/all?q=${encodeURIComponent(searchQuery)}`}
                    onClick={() => setIsFocused(false)}
                    style={{
                      marginTop: '6px',
                      padding: '10px',
                      width: '100%',
                      background: '#2d451e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    View all {searchResults.length} results
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ padding: '16px 10px', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No products found for "{searchQuery}"</p>
                <Link
                  href="/collections/all"
                  onClick={() => {
                    setSearchQuery('');
                    setIsFocused(false);
                  }}
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    padding: '6px 14px',
                    background: '#2d451e',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Explore All Products
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Redesigned Mobile Drawer Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          visibility: drawerOpen ? 'visible' : 'hidden',
        }}
      >
        {/* Dark Backdrop Overlay */}
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(4px)',
            opacity: drawerOpen ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />

        {/* Side Drawer Panel */}
        <div
          ref={drawerRef}
          className="mobile-navigation-panel"
          role="dialog"
          aria-modal={drawerOpen ? true : undefined}
          aria-label="Main menu"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '84%',
            maxWidth: '330px',
            background: '#ffffff',
            boxShadow: '8px 0 30px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
            overflowY: 'auto',
            zIndex: 10000,
          }}
        >
          {/* Polished Drawer Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #f3f4f6',
              background: '#fafbfc',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1.2px', color: '#111827', textTransform: 'uppercase' }}>
              MENU
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#111827',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Search Field */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <form action="/collections/all" method="get" role="search" onSubmit={() => setDrawerOpen(false)}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f3f4f6',
                  borderRadius: '9999px',
                  padding: '8px 14px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="#6b7280" style={{ width: '15px', height: '15px', marginRight: '8px', flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  name="q"
                  aria-label="Search vegetables"
                  enterKeyHint="search"
                  placeholder={SEARCH_SUGGESTIONS[placeholderIdx]}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#111827',
                  }}
                />
              </div>
            </form>
          </div>

          {/* Polished Navigation List with Chevrons */}
          <div style={{ flex: 1, padding: '8px 0' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
              {menuItems.map((item) => {
                if (item.id === 'HeaderMenu-all-products') return <VegetableNavigation key={item.id} mobile onNavigate={() => setDrawerOpen(false)} />;
                const active = isItemActive(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: active ? 800 : 700,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        color: active ? '#111827' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '13px 20px',
                        borderBottom: '1px solid #f9fafb',
                        background: active ? '#f4f8f2' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>{item.name}</span>
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke={active ? '#111827' : '#9ca3af'} style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
              <li>
                <details className="mobile-more-menu">
                  <summary style={{ padding: '13px 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: '#374151', cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}>
                    MORE
                  </summary>
                  <ul style={{ listStyle: 'none', padding: '8px 0', margin: 0, background: '#fafbfc' }}>
                    {moreDropdownItems.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={isItemActive(item.href) ? 'page' : undefined}
                          onClick={(event) => {
                            setDrawerOpen(false);
                            event.currentTarget.closest('details')?.removeAttribute('open');
                          }}
                          style={{ display: 'block', padding: '11px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: isItemActive(item.href) ? '#15803d' : '#374151', background: isItemActive(item.href) ? '#f0fdf4' : 'transparent', textDecoration: 'none' }}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            </ul>
          </div>

          {/* Drawer Bottom Action Section */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #f3f4f6',
              background: '#fafbfc',
            }}
          >
            <Link
              href={user ? '/account' : '/account/login'}
              onClick={() => setDrawerOpen(false)}
              style={{
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '9999px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {user ? 'YOUR ACCOUNT' : 'LOG IN / SIGN UP'}
            </Link>
          </div>
        </div>
      </div>

    </header>
  );
};
