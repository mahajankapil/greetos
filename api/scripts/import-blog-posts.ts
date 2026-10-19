/**
 * Adds the starter journal posts (prisma/seed-data/blog-posts.json) to the
 * BlogPost table.
 *
 * Insert-only: a post whose slug already exists is skipped, never updated, so
 * running this again can't overwrite anything edited in admin → Blog.
 *
 *   npx tsx scripts/import-blog-posts.ts
 *
 * Back up the database first (house rule), and check DATABASE_URL points at the
 * GREETOS database — this refuses Poshanful's.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import '../src/config/config'; // loads .env

for (const url of [process.env.DATABASE_URL ?? '', process.env.DIRECT_URL ?? '']) {
  if (url.includes('rzpjeynwqauwxbwukpge')) {
    console.error("Refusing: DATABASE_URL/DIRECT_URL points at Poshanful's live database.");
    process.exit(1);
  }
}

interface SeedPost {
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
  sections: { title: string; paragraphs: string[]; bullets: string[] }[];
  takeaway: string | null;
  sources: { title: string; url: string }[];
  published: boolean;
  publishedAt: string;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  const prisma = new PrismaClient();
  const posts: SeedPost[] = JSON.parse(readFileSync(path.resolve(__dirname, '../prisma/seed-data/blog-posts.json'), 'utf-8'));
  let added = 0;
  for (const p of posts) {
    if (await prisma.blogPost.findUnique({ where: { slug: p.slug }, select: { id: true } })) {
      console.log(`skip  ${p.slug} (already exists)`);
      continue;
    }
    const used = new Set<string>();
    const sections = p.sections.map((s, i) => {
      let id = slugify(s.title) || `section-${i + 1}`;
      for (let n = 2; used.has(id); n += 1) id = `${slugify(s.title)}-${n}`;
      used.add(id);
      return { id, ...s };
    });
    await prisma.blogPost.create({
      data: {
        ...p,
        sections: sections as unknown as Prisma.InputJsonValue,
        sources: p.sources as unknown as Prisma.InputJsonValue,
        publishedAt: new Date(p.publishedAt),
      },
    });
    added += 1;
    console.log(`added ${p.slug}`);
  }
  console.log(`done: ${added} added, ${posts.length - added} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
