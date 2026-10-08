import React from 'react';
import Link from 'next/link';
import { BLOG_POSTS } from '@/data/blogs';

export interface BlogPostItem {
  id?: string;
  title: string;
  author: string;
  date: string;
  image: string;
  slug: string;
  excerpt?: string;
  category?: string;
}

interface NewsInsightsProps {
  posts?: BlogPostItem[];
}

export const NewsInsights: React.FC<NewsInsightsProps> = ({ posts }) => {
  const displayPosts: BlogPostItem[] = (posts?.length ? posts : BLOG_POSTS).slice(0, 3);

  return (
    <section className="farm-journal" aria-labelledby="farm-journal-title">
      <div className="farm-journal__inner">
        <div className="farm-journal__header">
          <div>
            <p className="farm-journal__eyebrow">BLOGS &amp; ORGANIC FARMING NEWS</p>
            <h2 id="farm-journal-title">Fresh from the Farm</h2>
            <p className="farm-journal__intro">Simple ideas for choosing, storing, and enjoying fresh vegetables.</p>
          </div>
          <Link href="/blogs/news" className="farm-journal__all">Explore More Blogs <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="farm-journal__grid">
          {displayPosts.map((post, index) => {
            const href = post.slug ? (post.slug.startsWith('/') ? post.slug : `/blogs/news#${post.slug}`) : '/blogs/news';
            return (
              <article key={post.id || post.slug || index} className={`farm-journal__card ${index === 0 ? 'farm-journal__card--featured' : ''}`}>
                <Link href={href} className="farm-journal__image" aria-label={post.title}>
                  <img src={post.image} alt="" loading="lazy" />
                </Link>
                <div className="farm-journal__body">
                  <span className="farm-journal__category">{post.category || 'Fresh produce guide'}</span>
                  <h3><Link href={href}>{post.title}</Link></h3>
                  {post.excerpt && <p className="farm-journal__excerpt">{post.excerpt}</p>}
                  <div className="farm-journal__footer">
                    <span className="farm-journal__date">{post.date}</span>
                    <Link href={href} className="farm-journal__read" aria-label={`Read guide: ${post.title}`}>Read guide <span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
