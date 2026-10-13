import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Sprout, PackageCheck } from 'lucide-react';
import { COLLECTIONS } from '@/data/collections';
import { SITE } from '@/lib/site';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: `About Us | ${SITE.name}`,
  description:
    'Old Spice Agro Fresh LLP grows 100% organic, pesticide-free vegetables and herbs and delivers them from farm to table.',
  alternates: { canonical: '/about-us' },
};

const PROMISES = [
  {
    icon: Leaf,
    title: '100% organic',
    text: 'We believe in sustainable organic farming. Every harvest is pure and pesticide-free.',
  },
  {
    icon: Sprout,
    title: 'Farm to table',
    text: 'Vegetables and herbs travel directly from our farm to your kitchen, with nothing in between.',
  },
  {
    icon: PackageCheck,
    title: 'Packed for freshness',
    text: 'Each vegetable is carefully harvested and packed to keep its peak freshness and nutrition for your family.',
  },
];

const FEATURED = COLLECTIONS[0];

export default function AboutUsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <div>
            <p className={styles.eyebrow}>{SITE.name}</p>
            <h1 id="about-title" className={styles.title}>
              About Us
            </h1>
            <p className={styles.lead}>
              Your trusted source for 100% organic farm fresh vegetables, herbs, and natural agricultural produce.
              We deliver pure, pesticide-free harvest directly from farm to table.
            </p>
            <div className={styles.heroActions}>
              <Link href="/collections/all" className={styles.primaryBtn}>
                Explore our products
              </Link>
              <Link href="/contact" className={styles.ghostBtn}>
                Contact us
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <Image
              src={"products/vege backet.png"}
              alt={FEATURED.title}
              fill
              priority
              sizes="(max-width: 860px) 100vw, 480px"
            />
          </div>
        </div>
      </section>

      <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="promise-title">
        <div className={styles.sectionHead}>
          <h2 id="promise-title" className={styles.sectionTitle}>
            What we stand for
          </h2>
        </div>
        <div className={styles.promises}>
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.promise}>
              <span className={styles.promiseIcon} aria-hidden="true">
                <Icon size={24} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="grow-title">
        <div className={styles.sectionHead}>
          <h2 id="grow-title" className={styles.sectionTitle}>
            What we grow
          </h2>
          <p className={styles.sectionIntro}>
            Farm fresh leafy greens, gourds, root vegetables, daily veggies, and fresh culinary herbs.
          </p>
        </div>
        <div className={styles.grow}>
          {COLLECTIONS.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className={styles.growCard}>
              <div className={styles.growImage}>
                <Image src={c.image} alt="" fill sizes="(max-width: 560px) 100vw, (max-width: 860px) 50vw, 360px" />
              </div>
              <div className={styles.growBody}>
                <h3>{c.title}</h3>
                <p>{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* <div className={styles.wrap}>
        <section className={styles.cta}>
          <h2>Fresh from our farm to your family</h2>
          <p>Pick your vegetables and herbs and we will harvest and pack them at peak freshness.</p>
          <Link href="/collections/all" className={styles.primaryBtn}>
            Shop vegetables
          </Link>
        </section>
      </div> */}
    </div>
  );
}
