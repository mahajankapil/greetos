/**
 * One buyable pack size — "Pack of 1", "Pack of 2". Price is an integer number
 * of rupees so the cart can do arithmetic without parsing "₹1,050".
 */
export interface ProductPackOption {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  savings?: string | null;
  stock: number;
  /** Optional pill on the pack picker, e.g. "Most popular". */
  badge?: string | null;
  /** Optional line under the pack name, e.g. "Family pack". */
  subtitle?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  price: string;
  compareAtPrice?: string | null;
  discount?: string;
  primaryImage: string;
  hoverImage?: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  unitsSold?: string;
  description: string;
  shortDescription?: string;
  buttonText?: string;
  /**
   * Category slug. A plain string rather than a union: the client renames and
   * adds categories from the admin panel, and a union here would mean a code
   * change (and a build) every time they did.
   */
  category: string;
  ingredients?: string[];
  howToUse?: string;
  inStock: boolean;
  isBestSeller?: boolean;
  isCombo?: boolean;

  // ── Filled in from the API ──────────────────────────────────────
  // Optional because the bundled fallback catalogue below has none of them.
  // Every consumer must handle their absence, which is also what keeps a
  // half-completed admin listing from rendering an empty spec row.
  benefits?: string[];
  netQuantity?: string;
  suitableFor?: string;
  storage?: string;
  shelfLifeMonths?: number;
  countryOfOrigin?: string;
  manufacturedBy?: string;
  marketedBy?: string;
  form?: string;
  concerns?: { id: string; name: string; slug: string }[];
  bundleItems?: {
    id: string;
    quantity: number;
    componentId: string;
    title: string;
    handle: string;
    image: string;
    netQuantity: string | null;
  }[];
  labels?: string[];
  /** Every pack size on sale, in display order. Empty for the offline fallback rows. */
  options?: ProductPackOption[];
}

/**
 * OFFLINE FALLBACK ONLY.
 *
 * The catalogue lives in the database and is served by the API; see
 * lib/api.ts. This array is what renders when the API cannot be reached, so
 * that a backend outage degrades the shop rather than blanking it. It is not
 * kept in sync — anything here that disagrees with the admin is stale.
 */
export const PRODUCTS: Product[] = [
  {
    id: "spinach-palak",
    slug: "spinach",
    title: "Fresh Organic Spinach (Palak)",
    price: "₹25",
    compareAtPrice: "₹35",
    discount: "28% off",
    primaryImage: "/products/spinach.webp",
    rating: 4.9,
    reviewCount: 34,
    category: "leafy-vegetables",
    isBestSeller: true,
    description: "Nutrient-rich, crisp green spinach leaves packed with iron, folate, and vitamins. Ideal for dal palak, smoothies, and palak paneer.",
    shortDescription: "Harvested fresh daily from organic farms",
    buttonText: "Add to cart",
    ingredients: ["Fresh Spinach Leaves"],
    howToUse: "Wash thoroughly in clean water before cooking or blending.",
    inStock: true
  },
  {
    id: "carrot-gajar",
    slug: "carrot",
    title: "Fresh Crunchy Carrots",
    price: "₹40",
    compareAtPrice: "₹55",
    discount: "27% off",
    primaryImage: "/products/carrot.jpg",
    rating: 4.9,
    reviewCount: 45,
    category: "root-vegetables",
    isBestSeller: true,
    description: "Crisp red/orange carrots filled with Beta-Carotene and Vitamin A. Great for gajar halwa, salads, and daily cooking.",
    shortDescription: "Crunchy & sweet naturally grown carrots",
    buttonText: "Add to cart",
    ingredients: ["Fresh Orange Carrots"],
    inStock: true
  },
  {
    id: "onion-kanda",
    slug: "onion",
    title: "Fresh Red Onions (Kanda)",
    price: "₹40",
    compareAtPrice: "₹50",
    discount: "20% off",
    primaryImage: "/products/onion.jpg",
    rating: 4.8,
    reviewCount: 54,
    category: "root-vegetables",
    isBestSeller: true,
    description: "Crisp, flavorful Nashik red onions. Perfect foundation for gravy curries, tadka, and fresh garden salads.",
    shortDescription: "Daily staple fresh red onions",
    buttonText: "Add to cart",
    ingredients: ["Organic Red Onions"],
    inStock: true
  },
  {
    id: "green-chilli",
    slug: "green-chilli",
    title: "Fresh Spicy Green Chilli",
    price: "₹25",
    compareAtPrice: "₹35",
    discount: "28% off",
    primaryImage: "/products/green-chilli.jpg",
    rating: 4.8,
    reviewCount: 29,
    category: "beans-peas",
    isBestSeller: true,
    description: "Fresh, spicy green chillies full of natural capsaicin and spice. Adds quick kick to temperings and chutneys.",
    shortDescription: "Fresh, fiery green chillies",
    buttonText: "Add to cart",
    ingredients: ["Fresh Green Chillies"],
    inStock: true
  },
  {
    id: "organic-family-basket",
    slug: "organic-family-basket",
    title: "Weekly Organic Farm Fresh Basket",
    price: "₹399",
    compareAtPrice: "₹520",
    discount: "23% off",
    primaryImage: "http://localhost:5002/uploads/products/Spinach-%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A4%95.webp",
    rating: 5.0,
    reviewCount: 48,
    category: "other-vegetables",
    isCombo: true,
    isBestSeller: true,
    description: "Includes Spinach (250g), Fenugreek (250g), Coriander (100g), Carrot (500g), Beetroot (500g), French Beans (250g), Lauki (1 pc), Tomato (1kg), Onion (1kg), Potato (1kg).",
    shortDescription: "All-in-one weekly vegetable & herb basket",
    buttonText: "Add to cart",
    ingredients: ["Assorted Organic Vegetables & Herbs"],
    inStock: true
  }
];


export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  if (categorySlug === 'all') return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === categorySlug || (categorySlug === 'best-sellers' && p.isBestSeller) || (categorySlug === 'super-saver-combos' && p.isCombo));
}
