import { NextResponse, NextRequest } from 'next/server'
import { rateLimit, rateKeyFromRequest } from '@/lib/rateLimit'

export function middleware(req: NextRequest) {
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

  return res
}

export const config = {
  matcher: ['/((?!_next|.*\..*).*)'],
}
