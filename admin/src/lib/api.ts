import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * The storefront (Next.js) serves its public/ folder at localhost:3000.
 * Product & blog images are stored as relative paths like /products/spinach.webp.
 * The admin (Vite, localhost:3001) cannot resolve those paths on its own, so
 * we prepend the storefront origin whenever we render an image in the admin UI.
 */
const STOREFRONT_ORIGIN = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000';

export function resolveImage(url: string | null | undefined): string {
  if (!url) return '';
  // Already absolute — return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Relative path (e.g. /products/spinach.webp) — prefix with storefront origin
  return `${STOREFRONT_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const TOKEN_KEY = 'admin_token';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the admin JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the token and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a readable message from an axios error. */
export function apiError(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string })?.error ?? error.message ?? fallback;
  }
  return fallback;
}
