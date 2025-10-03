import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { ratelimit } from './src/lib/ratelimit';

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
    pathname.startsWith('/api/quotes/share/') || // public token viewer by design
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Rate limiting for API endpoints
  if (pathname.startsWith('/api/')) {
    const identifier = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: 'too_many_requests', message: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } }
      );
    }
  }

  // Secure cron endpoints with CRON_SECRET header
  if (pathname.startsWith('/api/cron/')) {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return new NextResponse(JSON.stringify({ error: 'cron_not_configured' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
    const provided = req.headers.get('x-cron-key');
    if (provided !== expected) {
      return new NextResponse(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }
    // allow through, no JWT required
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

  const requestHeaders = new Headers(req.headers);
  if (userId) requestHeaders.set('x-user-id', userId);
  if (role) requestHeaders.set('x-user-role', role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
