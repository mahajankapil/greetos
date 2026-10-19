import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles } from '@/lib/blog';
import { FeaturedJournalCard, JournalCard } from '@/components/JournalCard';
import { SITE } from '@/lib/site';
import styles from '@/components/Journal.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'Blogs & Organic Farming News | GREETOS',
  description: 'Practical guides to fresh vegetables, seasonal eating, organic farming and a more thoughtful everyday kitchen.',
  alternates: { canonical: '/blogs/news' },
};

type BlogPageProps = { searchParams: { category?: string | string[] } };

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const articles = await getArticles();

  // Category filter: ?category=<slug>. Counts come from all live articles.
  const categories = Array.from(
    articles.reduce((map, a) => map.set(a.categorySlug, { name: a.category, count: (map.get(a.categorySlug)?.count ?? 0) + 1 }), new Map<string, { name: string; count: number }>()),
  );
  const wanted = Array.isArray(searchParams.category) ? searchParams.category[0] : searchParams.category;
  const active = categories.some(([slug]) => slug === wanted) ? wanted : undefined;
  const shown = active ? articles.filter((a) => a.categorySlug === active) : articles;
  const [featured, ...rest] = shown;

  return (
    <div className={styles.journalPage}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Blogs &amp; Organic Farming News</span></nav>
        <header className={styles.listingHead}>
          <p className={styles.eyebrow}>FROM OUR FARMS TO YOUR KITCHEN</p>
          <h1>Blogs &amp; Organic Farming News</h1>
          <p>Simple ways to choose well, cook with the seasons, and enjoy every basket.</p>
        </header>

        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>New stories are on their way.</h2>
            <p>We&rsquo;re writing up fresh guides from our farms. In the meantime, see what&rsquo;s in season.</p>
            <Link href="/collections/all" className={styles.outlineLink}>Shop fresh produce <span aria-hidden="true">↗</span></Link>
          </div>
        ) : (
          <>
            {categories.length > 1 && (
              <nav className={styles.filters} aria-label="Filter stories by category">
                <Link href="/blogs/news" scroll={false} className={!active ? styles.filterActive : undefined} aria-current={!active ? 'page' : undefined}>
                  All stories
                </Link>
                {categories.map(([slug, { name }]) => (
                  <Link key={slug} href={`/blogs/news?category=${slug}`} scroll={false} className={active === slug ? styles.filterActive : undefined} aria-current={active === slug ? 'page' : undefined}>
                    {name}
                  </Link>
                ))}
              </nav>
            )}

            {featured && <FeaturedJournalCard post={featured} />}

            {rest.length > 0 && (
              <section aria-labelledby="more-stories-title">
                <h2 id="more-stories-title" className={styles.listingTitle}>More stories</h2>
                <div className={`${styles.grid} ${styles.listingGrid}`}>
                  {rest.map((post) => <JournalCard key={post.slug} post={post} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
