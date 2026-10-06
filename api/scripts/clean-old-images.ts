/**
 * Removes all references to deleted Rovique product images from the database.
 * - Clears blog posts in settings that point to old /blogs/*.png images
 * - Removes products whose image points to any of the deleted JPEG files
 *
 * Run: npx ts-node scripts/clean-old-images.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All deleted filenames (no path prefix — match anywhere in the URL)
const DELETED_FILENAMES = [
  'blog-skin-care-guide.png',
  'blog-hair-care-habits.png',
  'blog-herbal-skincare.png',
  'ubtan-face-mask.jpeg',
  'swami-samarth-showpiece.jpeg',
  'swami-samarth-showpiece-2.jpeg',
  'skin-whitening-soap.jpeg',
  'placeholder-rovique.jpeg',
  'moisturiser.jpeg',
  'hair-oil.jpeg',
  'd-tan-face-wash.jpeg',
  'anti-pigmentation-soap.jpeg',
  'anti-acne-soap-results.jpeg',
];

function containsDeleted(url: string | null | undefined): boolean {
  if (!url) return false;
  return DELETED_FILENAMES.some(f => url.includes(f));
}

async function main() {
  // ── 1. Clean blog_posts setting ──────────────────────────────
  const blogSetting = await prisma.setting.findUnique({ where: { key: 'blog_posts' } });
  if (blogSetting) {
    try {
      const posts: Array<Record<string, unknown>> = JSON.parse(blogSetting.value);
      const cleaned = posts.map((p) => {
        if (containsDeleted(p['image'] as string)) {
          // Replace with a vegetable image instead
          return { ...p, image: '/products/spinach.webp' };
        }
        return p;
      });
      if (JSON.stringify(cleaned) !== blogSetting.value) {
        await prisma.setting.update({
          where: { key: 'blog_posts' },
          data: { value: JSON.stringify(cleaned) },
        });
        console.log(`✓  Cleaned blog_posts setting (${posts.length} posts updated)`);
      } else {
        console.log('   blog_posts — no old images found');
      }
    } catch {
      console.warn('   blog_posts — could not parse JSON, skipping');
    }
  } else {
    console.log('   blog_posts setting does not exist — skipping');
  }

  // ── 2. Clean any other settings that might store old image URLs ─
  const allSettings = await prisma.setting.findMany();
  for (const s of allSettings) {
    if (s.key === 'blog_posts') continue; // Already handled
    if (containsDeleted(s.value)) {
      console.log(`⚠  Setting "${s.key}" contains a deleted image URL — please review manually.`);
    }
  }

  // ── 3. Check products that still use old image paths ─────────
  const products = await prisma.product.findMany({ select: { handle: true, image: true, secondaryImage: true } });
  let productFixed = 0;
  for (const p of products) {
    if (containsDeleted(p.image) || containsDeleted(p.secondaryImage)) {
      await prisma.product.update({
        where: { handle: p.handle },
        data: {
          image: containsDeleted(p.image) ? '/products/spinach.webp' : p.image,
          secondaryImage: containsDeleted(p.secondaryImage) ? '/products/spinach.webp' : p.secondaryImage,
        },
      });
      console.log(`✓  Cleared old image on product: ${p.handle}`);
      productFixed++;
    }
  }
  if (productFixed === 0) console.log('   Products — no old images found');

  console.log('\nDone.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
