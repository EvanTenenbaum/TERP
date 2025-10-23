import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';

export async function POST() {
  // Simple stub that logs count of rules; real apply would call replenishment apply
  const count = await prisma.replenishmentRule.count();
  return NextResponse.json({ ok: true, rules: count });
}
