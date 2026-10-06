export interface Collection {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "leafy-greens",
    title: "Leafy Greens",
    subtitle: "Spinach, Fenugreek & More",
    description: "Farm-fresh leafy greens harvested daily — spinach, fenugreek, coriander, dill and colocasia leaves packed with nutrients.",
    image: "/products/spinach.webp"
  },
  {
    slug: "root-vegetables",
    title: "Root Vegetables",
    subtitle: "Beetroot, Carrot & More",
    description: "Organic root vegetables straight from our farms — beetroot, carrot, radish, potato, ginger, garlic and onion.",
    image: "/products/carrot.jpg"
  },
  {
    slug: "beans-peas",
    title: "Beans & Peas",
    subtitle: "French Beans, Green Peas & More",
    description: "Protein-rich fresh legumes — french beans, cluster beans, broad beans, green peas and spicy green chilli.",
    image: "/products/french-beans.jpg"
  },
  {
    slug: "gourds-squash",
    title: "Gourds & Squash",
    subtitle: "Lauki, Karela & More",
    description: "Tender seasonal gourds — bottle gourd, ridge gourd (dodka), bitter gourd, pumpkin, cucumber and ivy gourd (tendli).",
    image: "/products/bottle-gourd.webp"
  },
  {
    slug: "other-vegetables",
    title: "Other Vegetables",
    subtitle: "Tomato, Cabbage & More",
    description: "Everyday farm essentials — brinjal, cabbage, cauliflower, drumstick and juicy red tomatoes.",
    image: "/products/tomato.jpg"
  },
  {
    slug: "organic-baskets",
    title: "Organic Baskets",
    subtitle: "Complete Weekly Combos",
    description: "Curated weekly vegetable & herb baskets — save more when you buy a complete organic farm basket.",
    image: "/products/spinach.webp"
  }
];

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find(c => c.slug === slug);
}
