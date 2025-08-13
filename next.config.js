/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir is now default in Next.js 14
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

