/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'roviqueherbal.com',
      },
      {
        protocol: 'http',
        hostname: 'roviqueherbal.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'fonts.shopifycdn.com',
      }
    ],
    unoptimized: true
  },
};

module.exports = nextConfig;
