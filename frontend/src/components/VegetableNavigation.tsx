'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLLECTIONS } from '@/data/collections';

const vegetableLinks = [
  { title: 'All Vegetables', href: '/collections/all' },
  { title: 'Weekly Vegetable Planner', href: '/weekly-planner' },
  ...COLLECTIONS.filter((collection) => collection.slug !== 'organic-baskets').map((collection) => ({
    title: collection.title,
    href: `/collections/${collection.slug}`,
  })),
];

export function VegetableNavigation({ mobile = false, label = 'Shop vegetables', onNavigate }: { mobile?: boolean; label?: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const active = vegetableLinks.some((item) => pathname === item.href);
  const panelId = mobile ? 'mobile-vegetable-links' : 'desktop-vegetable-links';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <li
      ref={containerRef}
      className={`vegetable-nav ${mobile ? 'mobile' : ''} ${active ? 'active' : ''}`}
      onMouseEnter={() => { if (!mobile) setOpen(true); }}
      onMouseLeave={() => { if (!mobile && !containerRef.current?.contains(document.activeElement)) setOpen(false); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        id={mobile ? 'MobileMenu-all-products' : 'HeaderMenu-all-products'}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>{label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      <ul id={panelId} hidden={!open} className="vegetable-links">
        {vegetableLinks.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              onClick={() => { setOpen(false); onNavigate?.(); }}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .vegetable-nav { position: relative; }
        button {
          display: flex; align-items: center; gap: 4px; padding: 8px 0;
          background: none; border: none; cursor: pointer; white-space: nowrap;
          /* same as .site-nav-link in globals.css */
          font-family: var(--font-nav), system-ui, sans-serif; font-size: 14px;
          font-weight: 500; letter-spacing: 0.06em; line-height: 1.4;
          text-transform: uppercase; color: #4b5563; transition: color 0.2s ease;
        }
        button:hover { color: #2d451e; }
        .active > button { color: #111827; }
        .active:not(.mobile) > button { box-shadow: 0 2px 0 #111827; }
        svg { width: 14px; height: 14px; transition: transform 0.2s ease; }
        .vegetable-links {
          position: absolute; top: 100%; left: 0; min-width: 220px;
          margin: 0; padding: 8px 0; list-style: none; background: #fff;
          border: 1px solid #f3f4f6; border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); z-index: 110;
        }
        .vegetable-links :global(a) {
          display: block; padding: 10px 18px; text-decoration: none;
          font-family: var(--font-nav), system-ui, sans-serif; font-size: 13.5px;
          font-weight: 500; color: #374151; letter-spacing: 0.06em; text-transform: uppercase;
        }
        .vegetable-links :global(a:hover), .vegetable-links :global(a[aria-current='page']) {
          background: #f0fdf4; color: #15803d;
        }
        button:focus-visible, .vegetable-links :global(a:focus-visible) {
          outline: 2px solid #15803d; outline-offset: 2px; border-radius: 4px;
        }
        .mobile > button {
          width: 100%; justify-content: space-between; padding: 13px 20px;
          border-bottom: 1px solid #f9fafb; color: #374151;
        }
        .mobile.active > button { background: #f4f8f2; color: #111827; }
        .mobile .vegetable-links {
          position: static; min-width: 0; border: none; border-radius: 0;
          box-shadow: none; background: #fafbfc;
        }
        .mobile .vegetable-links :global(a) { padding: 11px 32px; }
        @media (min-width: 1024px) and (max-width: 1150px) {
          .vegetable-nav:not(.mobile) > button { font-size: 13px; letter-spacing: 0.04em; }
        }
      `}</style>
    </li>
  );
}
