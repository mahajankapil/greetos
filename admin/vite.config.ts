import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  /**
   * Where the built app is served from.
   *
   * Locally that is the root of its own dev server. On the demo box it is
   * mounted under /admin on the storefront's domain, and the built HTML has to
   * ask for /admin/assets/... — with the default base it asks for /assets/...,
   * nginx hands that to the Next.js storefront, and the panel renders a blank
   * page. Set VITE_BASE=/admin/ when building for that deployment.
   */
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
});
