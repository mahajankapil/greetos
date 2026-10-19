import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle, getArticles } from '@/lib/blog';
import { JournalCard } from '@/components/JournalCard';
import { SITE } from '@/lib/site';
import styles from '@/components/Journal.module.css';

export const dynamic = 'force-dynamic';

type ArticleProps = { params: { slug: string } };

export async function generateMetadata({ params }: ArticleProps): Promise<Metadata> {
  const post = await getArticle(params.slug);
  if (!post) return { title: 'Story not found | GREETOS' };
  return {
    metadataBase: new URL(SITE.url),
    title: `${post.title} | GREETOS`,
    description: post.excerpt,
    alternates: { canonical: `/blogs/news/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.excerpt, publishedTime: post.publishedAt, authors: [post.author], images: [{ url: post.image, alt: post.imageAlt }] },
  };
}

export default async function ArticlePage({ params }: ArticleProps) {
  const [post, all] = await Promise.all([getArticle(params.slug), getArticles()]);
  if (!post) notFound();

  // Up to three more stories, same category first.
  const others = all.filter((a) => a.slug !== post.slug);
  const related = [...others.filter((a) => a.categorySlug === post.categorySlug), ...others.filter((a) => a.categorySlug !== post.categorySlug)].slice(0, 3);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={styles.articlePage}>
      <article className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span>
          <Link href="/blogs/news">Blogs &amp; News</Link><span aria-hidden="true">/</span>
          <Link href={`/blogs/news?category=${post.categorySlug}`}>{post.category}</Link>
        </nav>
        <header className={styles.articleHeader}>
          <div className={styles.articleMeta}><span className={styles.category}>{post.category}</span><span aria-hidden="true">·</span><span>{post.readingMinutes} min read</span></div>
          <h1>{post.title}</h1>
          <p className={styles.articleDek}>{post.excerpt}</p>
          <div className={styles.byline}><span>By {post.author}</span><span aria-hidden="true">·</span><time dateTime={post.publishedAt}>{post.date}</time></div>
        </header>
        <figure className={styles.heroFigure}>
          <img src={post.image} alt={post.imageAlt} width={1600} height={800} fetchPriority="high" style={{ objectPosition: post.imagePosition }} />
          {post.photoCredit && (
            <figcaption>
              Photo:{' '}
              {post.photoCredit.url ? <a href={post.photoCredit.url} target="_blank" rel="noopener noreferrer">{post.photoCredit.name}</a> : post.photoCredit.name}
            </figcaption>
          )}
        </figure>
        <div className={styles.articleLayout}>
          <aside className={styles.contents}>
            {post.sections.length > 0 && (
              <>
                <p className={styles.eyebrow}>IN THIS ARTICLE</p>
                <nav aria-label="Article contents">
                  {post.sections.map((section, index) => <a key={section.id} href={`#${section.id}`}><span aria-hidden="true">{pad(index + 1)}</span>{section.title}</a>)}
                </nav>
              </>
            )}
            <Link className={styles.backLink} href="/blogs/news"><span aria-hidden="true">←</span> All stories</Link>
          </aside>
          <div className={styles.prose}>
            {post.introduction.length > 0 && <div className={styles.introduction}>{post.introduction.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>}
            {post.sections.map((section, index) => (
              <section key={section.id} id={section.id} className={styles.articleSection}>
                <h2><span aria-hidden="true">{pad(index + 1)}</span>{section.title}</h2>
                {section.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
                {section.bullets.length > 0 && <ul>{section.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}</ul>}
              </section>
            ))}
            {post.takeaway && <aside className={styles.takeaway}><p className={styles.eyebrow}>TAKE IT TO YOUR KITCHEN</p><p>{post.takeaway}</p></aside>}
            {post.sources.length > 0 && <div className={styles.sources}><h2>Further reading</h2>{post.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span aria-hidden="true">↗</span></a>)}</div>}
            <div className={styles.articleEnd}><Link className={styles.outlineLink} href="/blogs/news"><span aria-hidden="true">←</span> Back to all stories</Link><Link className={styles.textLink} href="/collections/all">Shop fresh produce <span aria-hidden="true">↗</span></Link></div>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-stories-title">
          <div className={styles.container}>
            <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>KEEP EXPLORING</p><h2 className={styles.sectionTitle} id="related-stories-title">A little more inspiration.</h2></div><Link className={styles.textLink} href="/blogs/news">View all stories <span aria-hidden="true">↗</span></Link></div>
            <div className={`${styles.grid} ${styles.relatedGrid}`}>{related.map((item) => <JournalCard key={item.slug} post={item} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
