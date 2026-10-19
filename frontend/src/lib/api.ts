/**
 * Server-side data access for the storefront.
 *
 * Every one of these runs on the server (the pages that call them are server
 * components), so the catalogue is rendered into the HTML rather than fetched
 * by the browser. That matters for more than speed: a crawler — Google's
 * included — sees the products, prices and copy in the initial response
 * instead of an empty shell.
 *
 * If the API is down these return empty/null rather than throwing, so the
 * storefront degrades to an "out of stock"-shaped page instead of a 500.
 */

const API_BASE = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5002/api').replace(/\/$/, '');

/** Seconds before a cached catalogue response is refetched. */
const REVALIDATE = 60;

// The API product shape and the mapping onto the storefront's `Product` live
// in productAdapter.ts, so there is exactly one definition of each.
export type { ApiProduct } from './productAdapter';
import type { ApiProduct } from './productAdapter';

export interface ApiConcern {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  productCount: number;
}

export interface ApiCategoryNode {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  productCount: number;
  children: ApiCategoryNode[];
}

async function get<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      ...options,
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // The storefront must still render if the API is unreachable.
    return fallback;
  }
}

export async function getProducts(): Promise<ApiProduct[]> {
  const data = await get<ApiProduct[] | { items?: ApiProduct[] }>('/products', []);
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function getProduct(handle: string): Promise<ApiProduct | null> {
  return get<ApiProduct | null>(`/products/${encodeURIComponent(handle)}`, null);
}

export async function getConcerns(): Promise<ApiConcern[]> {
  return get<ApiConcern[]>('/concerns', []);
}

export async function getConcern(slug: string): Promise<(ApiConcern & { products: ApiProduct[] }) | null> {
  return get<(ApiConcern & { products: ApiProduct[] }) | null>(`/concerns/${encodeURIComponent(slug)}`, null);
}

export async function getCategories(): Promise<ApiCategoryNode[]> {
  return get<ApiCategoryNode[]>('/categories', []);
}

export async function getCategory(slug: string): Promise<{ name: string; slug: string; products: ApiProduct[] } | null> {
  return get<{ name: string; slug: string; products: ApiProduct[] } | null>(`/categories/${encodeURIComponent(slug)}`, null);
}

export interface ApiSettings {
  announcement_text?: string;
  hero_banners?: string;
  hero_banners_enabled?: string;
  hero_banner_desktop?: string;
  hero_banner_mobile?: string;
  homepage_gallery?: string;
  homepage_feature_banner?: string;
  welcome_popup?: string;
  [key: string]: string | undefined;
}

export async function getSettings(): Promise<ApiSettings> {
  return get<ApiSettings>('/settings', {}, { cache: 'no-store' });
}

export interface ApiReel {
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
  createdAt?: string;
  updatedAt?: string;
}

export async function getReels(): Promise<ApiReel[]> {
  return get<ApiReel[]>('/reels', [], { cache: 'no-store' });
}


