import Link from 'next/link';
import type { Article } from '@/lib/blog';
import { JournalCard } from './JournalCard';
import styles from './Journal.module.css';

/** Home page journal section: the newest published articles (admin → Blog). */
export const NewsInsights = ({ posts }: { posts: Article[] }) => {
  if (posts.length === 0) return null;

  return (
    <section className={styles.homeSection} aria-labelledby="farm-journal-title">
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true" /> BLOGS &amp; ORGANIC FARMING NEWS</p>
            <h2 id="farm-journal-title" className={styles.sectionTitle}>Fresh from the farm.</h2>
            <p className={styles.sectionIntro}>Good food, thoughtful choices, and a little everyday inspiration.</p>
          </div>
          <Link href="/blogs/news" className={styles.outlineLink}>Explore all stories <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.grid}>
          {posts.map((post) => <JournalCard key={post.slug} post={post} />)}
        </div>
      </div>
    </section>
  );
};
