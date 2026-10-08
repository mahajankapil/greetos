'use client';

import React, { useEffect, useState } from 'react';

export const AnnouncementBar: React.FC = () => {
  const [customItems, setCustomItems] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');
        const res = await fetch(`${apiBase}/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.announcement_text && data.announcement_text.trim().length > 0) {
            const items = data.announcement_text
              .split('|')
              .map((s: string) => s.trim())
              .filter(Boolean);
            if (items.length > 0) {
              setCustomItems(items);
            }
          }
        }
      } catch {
        // Silently use defaults
      }
    };
    fetchAnnouncement();
  }, []);

  const defaultAnnouncements = [
    'Free delivery on farm fresh orders above ₹499',
    '100% Organic & Naturally Grown · Harvested Daily',
    'Direct from local organic farms to your doorstep',
  ];

  const announcements = customItems && customItems.length > 0 ? customItems : defaultAnnouncements;

  return (
    <section
      className="announcement-bar"
      style={{
        background: '#111827',
        color: '#f9fafb',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        padding: '7px 0',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        className="announcement-wrapper"
        style={{
          display: 'flex',
          overflow: 'hidden',
          width: '100%',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          className="announcement-track"
          style={{
            display: 'flex',
            flexDirection: 'row',
            whiteSpace: 'nowrap',
            animation: 'announcement-scroll 32s linear infinite',
          }}
        >
          {[...announcements, ...announcements].map((text, idx) => (
            <div
              className="announcement-item"
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 36px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>{text}</span>
              <span style={{ marginLeft: '36px', color: '#9ca3af', opacity: 0.5 }}>•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
