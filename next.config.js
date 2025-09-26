/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir is now default in Next.js 14
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

const { withSentryConfig } = require('@sentry/nextjs')
module.exports = withSentryConfig(nextConfig, { silent: true }, {})
