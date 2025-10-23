import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: { token: string } }) {
  const row = await prisma.quoteShareToken.findUnique({ where: { token: params.token } });
  if (!row) return NextResponse.json({ ok: true }); // idempotent
  await prisma.quoteShareToken.update({ where: { token: params.token }, data: { revokedAt: new Date() } });
  await logAudit('QUOTE_SHARE_REVOKED', 'Quote', row.quoteId, { token: params.token });
  return NextResponse.json({ ok: true });
}
