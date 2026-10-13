'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M3 10.5L12 3L21 10.5V20A1 1 0 0 1 20 21H4A1 1 0 0 1 3 20V10.5Z" stroke="currentColor" strokeWidth="1.8"></path>
        </svg>
      ),
    },
    {
      label: 'Shop',
      href: '/collections/all',
      matchPrefix: '/collections',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"></rect>
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"></rect>
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"></rect>
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"></rect>
        </svg>
      ),
    },
    {
      label: 'Offers',
      href: '/offers',
      matchPrefix: '/offers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5L14.3 4L17 3.5L18 6L20.5 7L20 9.7L21.5 12L20 14.3L20.5 17L18 18L17 20.5L14.3 20L12 21.5L9.7 20L7 20.5L6 18L3.5 17L4 14.3L2.5 12L4 9.7L3.5 7L6 6L7 3.5L9.7 4L12 2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"></path>
          <path d="M9 15L15 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"></path>
          <circle cx="9" cy="9" r="1.2" fill="currentColor"></circle>
          <circle cx="15" cy="15" r="1.2" fill="currentColor"></circle>
        </svg>
      ),
    },
    {
      label: 'Account',
      href: user ? '/account' : '/account/login',
      matchPrefix: '/account',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"></circle>
          <path d="M4 20C4 16.7 7.1 14 12 14C16.9 14 20 16.7 20 20" stroke="currentColor" strokeWidth="1.8"></path>
        </svg>
      ),
    },
  ];

  return (
    <nav className="rx-mobile-menu" aria-label="Shopping navigation">
      {navItems.map((item) => {
        const isActive = item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`rx-menu-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="rx-menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
