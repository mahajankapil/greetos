export interface ProductOption {
  id?: string;
  name: string;
  sku?: string | null;
  /** Units on hand for this variant. 0 renders the variant as sold out. */
  stock?: number;
  price: number;
  comparePrice?: number;
  memberPrice?: number;
  savings?: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface ConcernRef {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  category: string;
  categories: CategoryRef[];
  usp: string;
  description: string;
  rating: number;
  reviewsCount: number;
  unitsSold?: string | null;
  labels: string[];
  image: string;
  secondaryImage: string;
  /** Extra gallery images beyond image/secondaryImage. */
  images?: string[];
  soldOut?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
  isBestSeller?: boolean;
  bestSellerOrder?: number;
  // ── Product spec ───────────────────────────────────────────
  form?: string | null;
  netQuantity?: string | null;
  keyIngredients?: string[];
  benefits?: string[];
  howToUse?: string | null;
  suitableFor?: string | null;
  shelfLifeMonths?: number | null;
  storage?: string | null;
  countryOfOrigin?: string | null;
  manufacturedBy?: string | null;
  marketedBy?: string | null;
  isCombo?: boolean;
  concerns?: ConcernRef[];
  productCategoryBarId?: string | null;
  options: ProductOption[];
}

export interface OrderItem {
  id: string;
  productTitle: string;
  optionName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNo: string;
  customer: string;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  total: number;
  status: string;
  steps?: unknown;
  items: OrderItem[];
  createdAt: string;
  paymentStatus?: string | null; // pending | paid | failed
  paymentMethod?: string | null; // prepaid | cod
  // Manual fulfilment — typed in when the parcel is handed to a courier.
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  dispatchedAt?: string | null;
}

export interface TrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
}

export interface NormalizedTracking {
  statusText: string;
  courier: string | null;
  awb: string | null;
  expectedDelivery: string | null;
  activities: TrackingActivity[];
  hasActivity: boolean;
  friendlyMessage: string | null;
}

export interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  role: string; // "admin" | "creator"
}

// ── Creator / partner programme ────────────────────────────────

/** What a partner has earned and what they can withdraw. */
export interface CreatorEarnings {
  confirmedOrders: number;
  pendingOrders: number;
  payableCommission: number;
  pendingCommission: number;
  lifetimeEarned: number;
  requestedPayouts: number;
  paidPayouts: number;
  available: number;
}

/** Where a payout should be sent — snapshotted on the request. */
export interface PayoutDestination {
  method: 'upi' | 'bank';
  upiId: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  bankName: string | null;
}

export interface CreatorPayout extends PayoutDestination {
  id: string;
  amount: number;
  status: 'requested' | 'paid' | 'rejected';
  note: string | null;
  adminNote: string | null;
  settledAt: string | null;
  createdAt: string;
}

/** A payout request as the admin sees it, with the partner attached. */
export interface AdminPayout extends CreatorPayout {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  code: string;
}

export interface CreatorProgrammeSettings {
  minPayout: number;
}

export interface BlogSection {
  id?: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
}

export interface BlogPost {
  id: string;
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
  sections: BlogSection[];
  takeaway: string | null;
  sources: { title: string; url: string }[];
  published: boolean;
  publishedAt: string | null;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reel {
  id: string;
  title: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string[];
  instagramUrl: string | null;
  productLink: string | null;
  productName: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

