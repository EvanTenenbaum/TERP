import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || 'auth_token';
const REQUIRE_AUTH = (process.env.REQUIRE_AUTH ?? 'true') !== 'false';
const ALLOW_DEV_BYPASS = process.env.ALLOW_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production';

async function verifyJwt(token: string) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error('AUTH_JWT_SECRET not set');
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload as { sub?: string; role?: string };
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Public assets and health
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/health' ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  let userId: string | undefined;
  let role: string | undefined;

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token) {
    try {
      const payload = await verifyJwt(token);
      userId = payload.sub ? String(payload.sub) : undefined;
      role = payload.role ? String(payload.role) : undefined;
    } catch { /* invalid token */ }
  }

  if (!userId && ALLOW_DEV_BYPASS) {
    userId = process.env.DEV_BYPASS_USER || 'dev-user';
    role = process.env.DEV_BYPASS_ROLE || 'SUPER_ADMIN';
  }

  const isApi = pathname.startsWith('/api');

  if (REQUIRE_AUTH && (!userId || !role)) {
    if (isApi) {
      return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    const login = new URL('/login', url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  // Forward identity via request headers to route handlers
  const requestHeaders = new Headers(req.headers);
  if (userId) requestHeaders.set('x-user-id', userId);
  if (role) requestHeaders.set('x-user-role', role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
