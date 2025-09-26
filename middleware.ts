import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const res = NextResponse.next()

  // If RBAC enabled and header missing, default to READ_ONLY
  const enable = process.env.ENABLE_RBAC === 'true'
  const roleHeader = req.headers.get('x-user-role')
  if (enable && !roleHeader) {
    res.headers.set('x-user-role', 'READ_ONLY')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next|.*\..*).*)'],
}
