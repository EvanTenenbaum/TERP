import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';

export async function POST() {
  // Example: compute total revenue - COGS for shipped orders today (placeholder metric)
  const orders = await prisma.order.findMany({ where: { status: 'SHIPPED' }, include: { items: true } as any });
  let profit = 0;
  for (const o of orders as any[]) {
    for (const it of o.items) {
      const rev = (it.unitPriceCents || 0) * (it.quantity || 0);
      const cogs = (it.cogsCents || 0) * (it.quantity || 0);
      profit += (rev - cogs);
    }
  }
  return NextResponse.json({ ok: true, profitCents: profit });
}
