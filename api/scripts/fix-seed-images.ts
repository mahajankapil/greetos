/**
 * Replaces all Unsplash image URLs in seed-data/products.json
 * with the correct local product image URLs.
 *
 * Run with: npx ts-node scripts/fix-seed-images.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const BASE = 'http://localhost:5002/uploads/products';

function img(filename: string): string {
  return `${BASE}/${encodeURIComponent(filename)}`;
}

const IMAGE_MAP: Record<string, string> = {
  'spinach': img('Spinach-पालक.webp'),
  'fenugreek': img('Fenugreek-मेथी.webp'),
  'coriander': img('Coriander-कोथिंबीर.webp'),
  'dill': img('Dill-शेपू.webp'),
  'aluche-pan': img('Aluche Pan-अळूची पाने.png'),
  'beetroot': img('Beetroot–बीटरूट.jpg'),
  'carrot': img('Carrot-गाजर.jpg'),
  'radish-mula': img('Mula-मुळा.jpg'),
  'potato': img('Potato-बटाटा.jpg'),
  'suran': img('Suran-सुरण.jpg'),
  'ginger': img('Ginger-आले.webp'),
  'garlic': img('Garlic-लसूण.jpg'),
  'onion': img('Onion-कांदा.jpg'),
  'green-onion': img('Green-onion-कांद्याची पात.avif'),
  'broad-beans': img('Broad beans-घेवडा.webp'),
  'cluster-beans': img('Cluster bean-गवार.webp'),
  'french-beans': img('French beans-फरसबी.jpg'),
  'green-peas': img('Green-Peas-मटार.jpg'),
  'green-chilli': img('Green chili-मिरची.jpg'),
  'capsicum': img('Capsicum-ढोबळी मिरची.avif'),
  'bottle-gourd': img('Bottle Gourd-दुधी भोपळा.webp'),
  'dodka-ridge-gourd': img('Dodaka-दोडका.jpg'),
  'karela': img('Karela-कारले.jpg'),
  'pumpkin': img('Pumpkin-भोपळा.webp'),
  'cucumber': img('Green cucumber-काकडी.jpg'),
  'tendli': img('Tendli-तोंडली.webp'),
  'brinjal': img('Brinjal-वांगी.jpg'),
  'cabbage': img('Cabbage-कोबी.jpg'),
  'cauliflower': img('Cauliflower – फ्लॉवर.jpg'),
  'drumstick': img('Drumstick-शेवगा.webp'),
  'tomato': img('Tomato–टोमॅटो.jpg'),
  'daily-vegetable-combo': img('Onion-कांदा.jpg'),
  'organic-family-basket': img('Spinach-पालक.webp'),
};

const jsonPath = path.resolve(__dirname, '../prisma/seed-data/products.json');
const raw = readFileSync(jsonPath, 'utf-8');
const products = JSON.parse(raw) as Array<Record<string, unknown>>;

let updated = 0;
for (const p of products) {
  const handle = p['handle'] as string;
  const url = IMAGE_MAP[handle];
  if (url) {
    p['image'] = url;
    p['secondaryImage'] = url;
    updated++;
  } else {
    console.warn(`No image mapping for handle: "${handle}"`);
  }
}

writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf-8');
console.log(`Updated ${updated} products in seed-data/products.json`);
