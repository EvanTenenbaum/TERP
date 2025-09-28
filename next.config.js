/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const cspDev = "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:"
const cspProd = "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:"

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: "geolocation=(), microphone=(), camera=()" },
  { key: 'Content-Security-Policy', value: isProd ? cspProd : cspDev },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir is now default in Next.js 14
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

const { withSentryConfig } = require('@sentry/nextjs')
const useSentry = !!(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)
module.exports = useSentry
  ? withSentryConfig(
      nextConfig,
      { silent: true },
      {}
    )
  : nextConfig
