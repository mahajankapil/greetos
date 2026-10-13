'use client';

import { useState } from 'react';
import { Sprout, Leaf, PackageCheck, ShieldCheck } from 'lucide-react';
import styles from './TrustBadges.module.css';

// All four are the same line-icon family, so the row reads as one set.
const badges = [
  { title: 'Original Product', description: 'Fresh vegetables and herbs for your everyday kitchen.', icon: ShieldCheck },
  { title: 'Rooted in Nature', description: 'Organic produce at the heart of what we do.', icon: Sprout },
  { title: 'Seasonal Variety', description: 'Discover new favourites as the harvest changes.', icon: Leaf },
  { title: 'Everyday Goodness', description: 'A thoughtful basket for the meals you love to make.', icon: PackageCheck },
];

export const TrustBadges = () => {
  // There is no pause button. The strip still stops on hover, on touch, and for
  // anyone who prefers reduced motion (see the CSS).
  const [paused, setPaused] = useState(false);
  return (
    <section className={styles.section} aria-label="Why shop with us">
      <div className={styles.viewport} onTouchStart={() => setPaused(true)}>
        <div className={`${styles.track} ${paused ? styles.paused : ''}`}>
          {[false, true].map(duplicate => (
            <ul key={String(duplicate)} className={`${styles.group} ${duplicate ? styles.duplicate : ''}`} aria-hidden={duplicate || undefined}>
              {badges.map(badge => (
                <li key={badge.title} className={styles.badge}>
                  <div className={styles.visual}>
                    <badge.icon size={42} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div><h3>{badge.title}</h3><p>{badge.description}</p></div>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
};
