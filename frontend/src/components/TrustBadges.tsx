'use client';

import { useState } from 'react';
import { Sprout, Leaf, PackageCheck, Pause, Play } from 'lucide-react';
import styles from './TrustBadges.module.css';

const badges = [
  { title: 'Original Product', description: 'Fresh vegetables and herbs for your everyday kitchen.', image: '/illustrations/vegetable-basket.svg', icon: null },
  { title: 'Rooted in Nature', description: 'Organic produce at the heart of what we do.', icon: Sprout },
  { title: 'Seasonal Variety', description: 'Discover new favourites as the harvest changes.', icon: Leaf },
  { title: 'Everyday Goodness', description: 'A thoughtful basket for the meals you love to make.', icon: PackageCheck },
];

export const TrustBadges = () => {
  const [paused, setPaused] = useState(false);
  return (
    <section className={styles.section} aria-labelledby="produce-promise-title">
      <div className={styles.header}>
        <h2 id="produce-promise-title">GOOD PRODUCE. EVERYDAY CARE.</h2>
        <button className={styles.pauseButton} type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play produce highlights' : 'Pause produce highlights'} aria-pressed={paused}>
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          <span>{paused ? 'Play' : 'Pause'}</span>
        </button>
      </div>
      <div className={styles.viewport} onTouchStart={() => setPaused(true)}>
        <div className={`${styles.track} ${paused ? styles.paused : ''}`}>
          {[false, true].map(duplicate => (
            <ul key={String(duplicate)} className={`${styles.group} ${duplicate ? styles.duplicate : ''}`} aria-hidden={duplicate || undefined}>
              {badges.map(badge => (
                <li key={badge.title} className={styles.badge}>
                  <div className={styles.visual}>
                    {badge.image ? <img src={badge.image} width={86} height={86} alt="" loading="lazy" /> : badge.icon && <badge.icon size={42} strokeWidth={1.5} aria-hidden="true" />}
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
