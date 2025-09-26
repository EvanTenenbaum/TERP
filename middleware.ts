import { NextResponse, NextRequest } from 'next/server'
import { rateLimit, rateKeyFromRequest } from '@/lib/rateLimit'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // If RBAC enabled and header missing, default to READ_ONLY
  const enable = process.env.ENABLE_RBAC === 'true'
  const roleHeader = req.headers.get('x-user-role')
  if (enable && !roleHeader) {
    res.headers.set('x-user-role', 'READ_ONLY')
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
