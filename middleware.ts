import { NextResponse, NextRequest } from 'next/server'
import { rateLimit, rateKeyFromRequest } from '@/lib/rateLimit'

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const isApi = url.pathname.startsWith('/api/')

  // CORS allow-list via env CORS_ALLOW_ORIGINS (comma-separated). Supports wildcards like https://*.vercel.app
  const allowList = (process.env.CORS_ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  const origin = req.headers.get('origin')
  const originMatches = (o: string, entries: string[]) => entries.some((e) => {
    if (e === '*') return true
    if (e.includes('*')) {
      const escaped = e.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      const pattern = '^' + escaped.replace(/\*/g, '.*') + '$'
      return new RegExp(pattern).test(o)
    }
    return e === o
  })
  const isAllowedOrigin = !!(origin && originMatches(origin, allowList))

  // Preflight handling for API
  if (isApi && req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': (process.env.CORS_ALLOW_METHODS || 'GET,OPTIONS'),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
    if (isAllowedOrigin && origin) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Vary'] = 'Origin'
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
    return new NextResponse(null, { status: 204, headers })
  }

  const res = NextResponse.next()

  // If RBAC enabled, allow configurable default via RBAC_DEFAULT_ROLE; if unset, do not override
  const enable = process.env.ENABLE_RBAC === 'true'
  const roleHeader = req.headers.get('x-user-role')
  const defaultRole = process.env.RBAC_DEFAULT_ROLE
  if (enable && !roleHeader && defaultRole) {
    res.headers.set('x-user-role', defaultRole)
  }

  // Basic rate limiting for non-GET requests
  if (req.method !== 'GET') {
    const key = rateKeyFromRequest(req as any)
    const { allowed, remaining } = rateLimit(key)
    if (!allowed) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) } })
    }
    res.headers.set('X-RateLimit-Remaining', String(remaining))
  }

  // Set CORS headers on API responses for allowed origins
  if (isApi && isAllowedOrigin && origin) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Vary', 'Origin')
  }

  // Cache headers for API GETs (tunable via env)
  if (isApi && req.method === 'GET') {
    const maxAge = Number(process.env.CACHE_MAX_AGE || '30')
    const swr = Number(process.env.CACHE_STALE_WHILE_REVALIDATE || '120')
    res.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${swr}`)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next|.*\..*).*)'],
}
