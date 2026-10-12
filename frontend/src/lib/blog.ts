/**
 * Journal articles for /blogs/news, the article pages and the home page section.
 *
 * Posts come from the API (written in admin → Blog). The bundled posts in
 * data/blogs.ts are only a fallback for when the API cannot be reached — an
 * API that answers with no posts means there are no posts, so deleting
 * everything in admin really does empty the journal.
 *
 * Server-side only. Fetched fresh on every request so a post published in
 * admin appears immediately.
 */
import { BLOG_POSTS, getReadingMinutes, type BlogPost as BundledPost } from '@/data/blogs';

const API_BASE = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');
export const FALLBACK_IMAGE = '/illustrations/vegetable-basket.svg';
export const DEFAULT_AUTHOR = 'Old Spice Agro Fresh LLP';

export interface ArticleSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
}

export interface Article {
  slug: string;
  title: string;
  cardTitle: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  author: string;
  /** e.g. "31 August 2026" */
  date: string;
  /** ISO timestamp for <time dateTime> */
  publishedAt: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  photoCredit?: { name: string; url?: string };
  introduction: string[];
  sections: ArticleSection[];
  takeaway?: string;
  sources: { title: string; url: string }[];
  readingMinutes: number;
}

interface ApiBlogPost {
  slug: string;
  title: string;
  cardTitle: string | null;
  excerpt: string;
  category: string | null;
  author: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  coverPosition: string | null;
  photoCredit: string | null;
  photoCreditUrl: string | null;
  introduction: string[];
  sections: { id?: string; title: string; paragraphs?: string[]; bullets?: string[] }[];
  takeaway: string | null;
  sources: { title: string; url: string }[];
  publishedAt: string | null;
  createdAt: string;
  readingMinutes: number;
}

export const categorySlug = (category: string) =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journal';

export const formatArticleDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function fromApi(p: ApiBlogPost): Article {
  const publishedAt = p.publishedAt ?? p.createdAt;
  const category = p.category || 'From the journal';
  return {
    slug: p.slug,
    title: p.title,
    cardTitle: p.cardTitle || p.title,
    excerpt: p.excerpt,
    category,
    categorySlug: categorySlug(category),
    author: p.author || DEFAULT_AUTHOR,
    date: formatArticleDate(publishedAt),
    publishedAt,
    image: p.coverImage || FALLBACK_IMAGE,
    imageAlt: p.coverAlt || '',
    imagePosition: p.coverPosition || undefined,
    photoCredit: p.photoCredit ? { name: p.photoCredit, url: p.photoCreditUrl || undefined } : undefined,
    introduction: p.introduction ?? [],
    sections: (Array.isArray(p.sections) ? p.sections : []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      title: s.title,
      paragraphs: s.paragraphs ?? [],
      bullets: s.bullets ?? [],
    })),
    takeaway: p.takeaway || undefined,
    sources: Array.isArray(p.sources) ? p.sources : [],
    readingMinutes: p.readingMinutes || 1,
  };
}

function fromBundled(p: BundledPost): Article {
  const publishedAt = `${p.publishedAt}T00:00:00+05:30`;
  return {
    slug: p.slug,
    title: p.title,
    cardTitle: p.cardTitle || p.title,
    excerpt: p.excerpt,
    category: p.category,
    categorySlug: categorySlug(p.category),
    author: p.author,
    date: formatArticleDate(publishedAt),
    publishedAt,
    image: p.image,
    imageAlt: p.imageAlt,
    imagePosition: p.imagePosition,
    photoCredit: p.photoCredit ? { name: `${p.photoCredit.name} / Pexels`, url: p.photoCredit.url } : undefined,
    introduction: p.introduction,
    sections: p.sections.map((s) => ({ ...s, bullets: s.bullets ?? [] })),
    takeaway: p.takeaway,
    sources: p.sources ?? [],
    readingMinutes: getReadingMinutes(p),
  };
}

const bundled = () =>
  BLOG_POSTS.map(fromBundled).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

type Fetched<T> = { ok: true; data: T } | { ok: false; status: number | null };

async function fetchJson<T>(path: string): Promise<Fetched<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: null };
  }
}

/** All live articles, newest first. */
export async function getArticles(): Promise<Article[]> {
  const res = await fetchJson<ApiBlogPost[]>('/blogs');
  if (res.ok && Array.isArray(res.data)) return res.data.map(fromApi);
  return bundled(); // API unreachable
}

/** One live article, or null if there is no such (published) post. */
export async function getArticle(slug: string): Promise<Article | null> {
  const res = await fetchJson<ApiBlogPost>(`/blogs/${encodeURIComponent(slug)}`);
  if (res.ok) return fromApi(res.data);
  if (res.status === 404) return null;
  return bundled().find((a) => a.slug === slug) ?? null; // API unreachable
}

export const articleHref = (slug: string) => `/blogs/news/${slug}`;
