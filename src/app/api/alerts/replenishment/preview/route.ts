import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = api(z.object({}), async () => {
  const rules = await prisma.replenishmentRule.findMany({});
  const items: Array<{ productId: string; currentQty: number; targetQty: number; toOrder: number; }> = [];
  for (const r of rules) {
    const agg = await prisma.inventoryLot.aggregate({ where: { productId: r.productId }, _sum: { onHandQty: true } });
    const current = agg._sum.onHandQty ?? 0;
    const toOrder = Math.max(0, r.targetQty - current);
    if (current < r.minQty && toOrder > 0) items.push({ productId: r.productId, currentQty: current, targetQty: r.targetQty, toOrder });
  }
  return { items };
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING','SALES']);
