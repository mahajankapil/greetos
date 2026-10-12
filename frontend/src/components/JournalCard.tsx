import Link from 'next/link';
import { articleHref, type Article } from '@/lib/blog';
import styles from './Journal.module.css';

export type JournalCardPost = Pick<
  Article,
  'slug' | 'title' | 'cardTitle' | 'excerpt' | 'category' | 'date' | 'publishedAt' | 'image' | 'imageAlt' | 'imagePosition' | 'readingMinutes'
>;

export function JournalCard({ post, headingLevel = 3 }: { post: JournalCardPost; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className={styles.card}>
      <Link href={articleHref(post.slug)} className={styles.cardLink}>
        <div className={styles.cardImage}>
          <img src={post.image} alt={post.imageAlt} width={800} height={600} loading="lazy" decoding="async" style={{ objectPosition: post.imagePosition }} />
          <span className={styles.imageArrow} aria-hidden="true">↗</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <span className={styles.category}>{post.category}</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <Heading className={styles.cardTitle}>{post.cardTitle}</Heading>
          {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
          <div className={styles.cardFooter}>
            <time dateTime={post.publishedAt}>{post.date}</time>
            <span className={styles.readLink}>Read the story <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** The newest story, shown large at the top of the journal. */
export function FeaturedJournalCard({ post }: { post: JournalCardPost }) {
  return (
    <article className={styles.featured}>
      <Link href={articleHref(post.slug)} className={styles.featuredLink}>
        <div className={styles.featuredImage}>
          <img src={post.image} alt={post.imageAlt} width={1200} height={800} fetchPriority="high" decoding="async" style={{ objectPosition: post.imagePosition }} />
        </div>
        <div className={styles.featuredBody}>
          <p className={styles.featuredLabel}>Latest story</p>
          <div className={styles.cardMeta}>
            <span className={styles.category}>{post.category}</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h2 className={styles.featuredTitle}>{post.title}</h2>
          <p className={styles.featuredExcerpt}>{post.excerpt}</p>
          <div className={styles.featuredFooter}>
            <time dateTime={post.publishedAt}>{post.date}</time>
            <span className={styles.readLink}>Read the story <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
