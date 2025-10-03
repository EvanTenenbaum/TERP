import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SignJWT } from 'jose';

const Input = z.object({ userId: z.string().min(1), role: z.enum(['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY']) });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN_ENABLED !== 'true') {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 });
  }
  const body = await req.json();
  const { userId, role } = Input.parse(body);
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'AUTH_JWT_SECRET missing' }, { status: 500 });

  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));

  const cookie = `${process.env.AUTH_COOKIE_NAME || 'auth_token'}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`;
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', cookie);
  return res;
}
