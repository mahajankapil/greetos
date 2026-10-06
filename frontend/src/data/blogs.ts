export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
  category: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "guide-to-storing-fresh-organic-leafy-greens",
    title: "Guide to Storing Fresh Organic Leafy Greens at Home",
    excerpt: "Discover simple farm-fresh storage tips for keeping spinach, coriander, and methi crisp and nutrient-rich for up to 10 days.",
    content: `Organic leafy greens taste best when handled with care after harvest. Storing farm-fresh spinach, coriander, and methi correctly preserves their crisp texture and essential vitamins.

### 1. Dry Before Storing
Never wash leafy greens before refrigeration unless thoroughly dried. Excess surface moisture causes leaves to wilt prematurely.

### 2. Wrap in Damp Cloth or Paper Towels
Wrapping unwashed bunches of Spinach or Methi in breathable paper towels absorbs moisture while keeping them hydrated.

### 3. Store in Airtight Containers
Placing wrapped greens inside airtight glass or BPA-free containers extends freshness by up to 7–10 days!`,
    author: "Old Spice Agro Fresh LLP",
    date: "August 31, 2026",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800&auto=format&fit=crop",
    category: "Organic Farming"
  },
  {
    slug: "health-benefits-of-eating-seasonally-harvested-produce",
    title: "Health Benefits of Eating Seasonally Harvested Produce",
    excerpt: "Learn why eating seasonal root vegetables, gourds, and organic peppers delivers superior flavor and peak nutrition.",
    content: `Eating seasonal vegetables ensures you receive maximum nutritional value directly from local organic farms.

### Peak Nutrition & Flavor
Vegetables harvested at natural maturity contain higher levels of antioxidants, vitamins, and minerals compared to artificially stored produce.

### Chemical-Free Farm Practices
Seasonal crops thrive naturally without aggressive chemical pesticides or synthetic growth boosters.

### Supporting Local Agro Ecology
Choosing seasonal harvest supports local farming families and reduces carbon emissions from long-distance transport.`,
    author: "Old Spice Agro Fresh LLP",
    date: "August 31, 2026",
    image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop",
    category: "Farm Fresh"
  },
  {
    slug: "100-percent-organic-vegetables-from-farm-to-table",
    title: "100% Organic Produce: From Our Local Farms to Your Kitchen",
    excerpt: "Explore how Old Spice Agro Fresh LLP grows, harvests, and delivers pure pesticide-free vegetables to your doorstep.",
    content: `Pure nutrition begins at the soil level. At Old Spice Agro Fresh LLP, we prioritize organic composting, crop rotation, and natural pest control to bring you 100% farm-fresh produce daily.`,
    author: "Old Spice Agro Fresh LLP",
    date: "April 22, 2026",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop",
    category: "Organic Produce"
  }
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(b => b.slug === slug);
}
