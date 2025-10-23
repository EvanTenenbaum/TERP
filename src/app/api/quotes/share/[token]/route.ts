import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const row = await prisma.quoteShareToken.findUnique({ where: { token } });
  if (!row || row.revokedAt) return NextResponse.json({ error: 'invalid_or_revoked' }, { status: 404 });
  const q = await prisma.quote.findUnique({ where: { id: row.quoteId }, include: { items: { include: { product: true } }, customer: true } as any });
  if (!q) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Read-only payload; no PII beyond names/ids
  return NextResponse.json({ id: q.id, items: q.items, customerId: q.customerId, createdAt: q.createdAt });
}
