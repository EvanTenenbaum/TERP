/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
    OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT,
  },
};

module.exports = nextConfig;
