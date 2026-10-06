/**
 * Updates every product's image URL to use the Next.js public/products/ folder.
 * These are served at /products/<name> directly by Next.js — no API server needed.
 *
 * Run: npx ts-node scripts/update-product-images.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// /products/<name> is served by Next.js from frontend/public/products/
const PRODUCT_IMAGES: Record<string, { image: string; secondaryImage?: string }> = {
  'spinach':            { image: '/products/spinach.webp' },
  'fenugreek':          { image: '/products/fenugreek.webp' },
  'coriander':          { image: '/products/coriander.webp' },
  'dill':               { image: '/products/dill.webp' },
  'aluche-pan':         { image: '/products/aluche-pan.png' },
  'beetroot':           { image: '/products/beetroot.jpg' },
  'carrot':             { image: '/products/carrot.jpg' },
  'radish-mula':        { image: '/products/mula.jpg' },
  'potato':             { image: '/products/potato.jpg' },
  'suran':              { image: '/products/suran.jpg' },
  'ginger':             { image: '/products/ginger.webp' },
  'garlic':             { image: '/products/garlic.jpg' },
  'onion':              { image: '/products/onion.jpg' },
  'green-onion':        { image: '/products/green-onion.avif' },
  'broad-beans':        { image: '/products/broad-beans.webp' },
  'cluster-beans':      { image: '/products/cluster-beans.webp' },
  'french-beans':       { image: '/products/french-beans.jpg' },
  'green-peas':         { image: '/products/green-peas.jpg' },
  'green-chilli':       { image: '/products/green-chilli.jpg' },
  'capsicum':           { image: '/products/capsicum.avif' },
  'bottle-gourd':       { image: '/products/bottle-gourd.webp' },
  'dodka-ridge-gourd':  { image: '/products/dodka.jpg' },
  'karela':             { image: '/products/karela.jpg' },
  'pumpkin':            { image: '/products/pumpkin.webp' },
  'cucumber':           { image: '/products/cucumber.jpg' },
  'tendli':             { image: '/products/tendli.webp' },
  'brinjal':            { image: '/products/brinjal.jpg' },
  'cabbage':            { image: '/products/cabbage.jpg' },
  'cauliflower':        { image: '/products/cauliflower.jpg' },
  'drumstick':          { image: '/products/drumstick.webp' },
  'tomato':             { image: '/products/tomato.jpg' },
  'daily-vegetable-combo': {
    image: '/products/onion.jpg',
    secondaryImage: '/products/tomato.jpg',
  },
  'organic-family-basket': {
    image: '/products/spinach.webp',
    secondaryImage: '/products/coriander.webp',
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [handle, imgs] of Object.entries(PRODUCT_IMAGES)) {
    const product = await prisma.product.findUnique({ where: { handle } });
    if (!product) {
      console.warn(`⚠  "${handle}" not found in DB — skipping.`);
      skipped++;
      continue;
    }
    await prisma.product.update({
      where: { handle },
      data: {
        image: imgs.image,
        secondaryImage: imgs.secondaryImage ?? imgs.image,
      },
    });
    console.log(`✓  ${handle}  →  ${imgs.image}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
