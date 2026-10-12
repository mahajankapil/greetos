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

/** The newest story: a wide photo banner with the title laid over it. */
export function FeaturedJournalCard({ post }: { post: JournalCardPost }) {
  return (
    <article className={styles.banner}>
      <Link href={articleHref(post.slug)} className={styles.bannerLink}>
        <img className={styles.bannerImage} src={post.image} alt={post.imageAlt} width={1600} height={900} fetchPriority="high" decoding="async" style={{ objectPosition: post.imagePosition }} />
        <span className={styles.bannerShade} aria-hidden="true" />
        <div className={styles.bannerBody}>
          <p className={styles.bannerMeta}>
            <span className={styles.bannerLabel}>Latest story</span>
            <span>{post.category}</span>
          </p>
          <h2 className={styles.bannerTitle}>{post.title}</h2>
          {post.excerpt && <p className={styles.bannerExcerpt}>{post.excerpt}</p>}
          <div className={styles.bannerFooter}>
            <span><time dateTime={post.publishedAt}>{post.date}</time> · {post.readingMinutes} min read</span>
            <span className={styles.bannerButton}>Read the story <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
