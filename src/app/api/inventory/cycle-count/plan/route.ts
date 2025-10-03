import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const CreatePlan = z.object({
  name: z.string().min(1),
  abcClass: z.enum(['A','B','C']).optional(),
});

export const GET = api(z.object({}), async () => {
  const plans = await prisma.cycleCountPlan.findMany({ orderBy: { createdAt: 'desc' } });
  return { plans };
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING','SALES']);

export const POST = api(CreatePlan, async ({ name, abcClass }) => {
  const plan = await prisma.cycleCountPlan.create({ data: { name, abcClass: abcClass ?? null } });
  // Select products by ABC or all products for tasks
  const products = await prisma.product.findMany({
    where: abcClass ? { abcClass } as any : {},
    select: { id: true },
  });
  // Build tasks with expectedQty from sum(onHandQty) across lots
  for (const p of products) {
    const agg = await prisma.inventoryLot.aggregate({
      where: { productId: p.id },
      _sum: { onHandQty: true },
    });
    const expected = agg._sum.onHandQty ?? 0;
    await prisma.cycleCountTask.create({ data: { planId: plan.id, productId: p.id, expectedQty: expected } });
  }
  return { planId: plan.id };
}, ['SUPER_ADMIN','ACCOUNTING']);
