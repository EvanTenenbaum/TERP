import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST() {
  // Expire reservations older than N days (e.g., 7) not tied to an active order
  const threshold = new Date(Date.now() - 7*24*3600*1000);
  const removed = await prisma.reservation.deleteMany({ where: { createdAt: { lt: threshold } as any } });
  return NextResponse.json({ ok: true, expired: removed.count });
}
