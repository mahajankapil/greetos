import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Journal / blog posts (storefront /blogs/news, admin → Blog).
 *
 * Public routes only ever return published posts whose publish date has
 * passed, so a post can be scheduled by giving it a future date.
 */
const router = Router();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const text = (label: string, max: number) =>
  z.string({ invalid_type_error: `${label} must be text` }).trim().max(max, `${label} is too long (max ${max} characters)`);
const optionalText = (label: string, max: number) =>
  text(label, max)
    .nullish()
    .transform((v) => (v ? v : null));
const paragraphs = (label: string, maxItems: number) =>
  z
    .array(text(label, 6000))
    .max(maxItems, `Too many ${label.toLowerCase()} (max ${maxItems})`)
    .default([])
    .transform((list) => list.filter(Boolean));

/**
 * Cover pictures are links, never uploads (house rule: no images stored on our
 * server). Accept an https address or a path on the storefront (the bundled
 * /blog/... photos); refuse things that are not a photo (video, SVG, PDF, HEIC).
 */
const NOT_A_PICTURE = /\.(svg|svgz|mp4|mov|webm|m4v|avi|pdf|heic|heif|tif|tiff|psd|zip)(\?|#|$)/i;
const pictureLink = optionalText('Cover image link', 1000).refine(
  (v) => !v || ((/^https:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s]*$/.test(v)) && !NOT_A_PICTURE.test(v)),
  'Cover image must be an https:// link to a JPG, PNG, WebP, AVIF or GIF picture',
);

const sectionSchema = z.object({
  title: text('Section heading', 200).min(1, 'Every section needs a heading'),
  paragraphs: paragraphs('Section paragraphs', 40),
  bullets: z
    .array(text('Bullet point', 600))
    .max(40, 'Too many bullet points in one section (max 40)')
    .default([])
    .transform((list) => list.filter(Boolean)),
});

const sourceSchema = z.object({
  title: text('Further-reading title', 200).min(1, 'Further-reading links need a title'),
  url: text('Further-reading link', 500).url('Further-reading links must be full URLs (https://…)'),
});

const blogInputSchema = z.object({
  title: text('Title', 200).min(3, 'Title must be at least 3 characters'),
  slug: text('Web address', 100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Web address can only use lowercase letters, numbers and hyphens')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  cardTitle: optionalText('Card headline', 200),
  excerpt: text('Summary', 400).min(10, 'Summary must be at least 10 characters'),
  category: optionalText('Category', 60),
  author: optionalText('Author', 100),
  coverImage: pictureLink,
  coverAlt: optionalText('Image description', 300),
  coverPosition: optionalText('Image focus', 40),
  photoCredit: optionalText('Photo credit', 150),
  photoCreditUrl: optionalText('Photo credit link', 500).refine((v) => !v || /^https?:\/\//.test(v), 'Photo credit link must start with http:// or https://'),
  introduction: paragraphs('Introduction paragraphs', 20),
  sections: z.array(sectionSchema).max(30, 'Too many sections (max 30)').default([]),
  takeaway: optionalText('Takeaway', 1500),
  sources: z.array(sourceSchema).max(20, 'Too many further-reading links (max 20)').default([]),
  published: z.boolean().default(false),
  publishedAt: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Publish date is not a valid date')
    .nullish(),
});

type BlogInput = z.infer<typeof blogInputSchema>;

/** Gives each section a unique anchor id for the table of contents. */
function withSectionIds(sections: BlogInput['sections']) {
  const used = new Set<string>();
  return sections.map((section, i) => {
    const base = slugify(section.title) || `section-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return { id, title: section.title, paragraphs: section.paragraphs, bullets: section.bullets };
  });
}

/** `previous` is the stored publish date when updating, so re-saving a live
 *  post without sending a date keeps its original date. */
function toData(input: BlogInput, previous: Date | null = null) {
  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : input.published ? previous ?? new Date() : null;
  return {
    title: input.title,
    cardTitle: input.cardTitle,
    excerpt: input.excerpt,
    category: input.category,
    author: input.author,
    coverImage: input.coverImage,
    coverAlt: input.coverAlt,
    coverPosition: input.coverPosition,
    photoCredit: input.photoCredit,
    photoCreditUrl: input.photoCreditUrl,
    introduction: input.introduction,
    sections: withSectionIds(input.sections) as unknown as Prisma.InputJsonValue,
    takeaway: input.takeaway,
    sources: input.sources as unknown as Prisma.InputJsonValue,
    published: input.published,
    publishedAt,
  };
}

/** Rough reading time at 200 words a minute. */
function readingMinutes(post: { introduction: string[]; sections: unknown; takeaway: string | null }): number {
  const sections = Array.isArray(post.sections) ? (post.sections as { title?: string; paragraphs?: string[]; bullets?: string[] }[]) : [];
  const words = [
    ...post.introduction,
    ...sections.flatMap((s) => [s.title ?? '', ...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
    post.takeaway ?? '',
  ]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const withReading = <T extends { introduction: string[]; sections: unknown; takeaway: string | null }>(post: T) => ({
  ...post,
  readingMinutes: readingMinutes(post),
});

const livePostFilter = () => ({ published: true, publishedAt: { lte: new Date() } });

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || 'story';
  for (let n = 1; n < 500; n += 1) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
  }
  throw new HttpError(409, 'Could not find a free web address for this post');
}

// ── Public ──────────────────────────────────────────────────────────

/** Published posts, newest first. ?limit=n caps the list (home page uses 4). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? ''), 10) || 100, 1), 100);
    const posts = await prisma.blogPost.findMany({
      where: livePostFilter(),
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    res.json(posts.map(withReading));
  }),
);

// ── Admin (declared before /:slug so "admin" is not read as a slug) ─

router.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const posts = await prisma.blogPost.findMany({ orderBy: [{ updatedAt: 'desc' }] });
    res.json(posts.map(withReading));
  }),
);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = blogInputSchema.parse(req.body);
    const slug = await uniqueSlug(input.slug || slugify(input.title));
    const post = await prisma.blogPost.create({ data: { slug, ...toData(input) } });
    res.status(201).json(withReading(post));
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Post not found');
    const input = blogInputSchema.parse(req.body);
    const wanted = input.slug || existing.slug;
    if (wanted !== existing.slug) {
      const clash = await prisma.blogPost.findUnique({ where: { slug: wanted }, select: { id: true } });
      if (clash) throw new HttpError(409, `Another post already uses the web address "${wanted}"`);
    }
    try {
      const post = await prisma.blogPost.update({ where: { id: existing.id }, data: { slug: wanted, ...toData(input, existing.publishedAt) } });
      res.json(withReading(post));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new HttpError(409, `Another post already uses the web address "${wanted}"`);
      }
      throw e;
    }
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'Post not found');
    await prisma.blogPost.delete({ where: { id: existing.id } });
    res.json({ ok: true, id: existing.id });
  }),
);

/** One published post by its web address. */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, ...livePostFilter() } });
    if (!post) throw new HttpError(404, 'Post not found');
    res.json(withReading(post));
  }),
);

export default router;
