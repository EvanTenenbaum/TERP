import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const Input = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  quantityDelta: z.number().int(),
  reason: z.string().min(2),
});

export const POST = api(Input, async ({ productId, lotId, quantityDelta, reason }) => {
  return prisma.$transaction(async (tx) => {
    await tx.inventoryAdjustment.create({ data: { productId, lotId: lotId ?? null, quantityDelta, reason } });
    if (lotId) {
      await tx.inventoryLot.update({ where: { id: lotId }, data: { onHandQty: { increment: quantityDelta }, availableQty: { increment: quantityDelta } } });
    } else {
      const lot = await tx.inventoryLot.findFirst({ where: { productId }, orderBy: { createdAt: 'asc' } });
      if (lot) await tx.inventoryLot.update({ where: { id: lot.id }, data: { onHandQty: { increment: quantityDelta }, availableQty: { increment: quantityDelta } } });
    }
    return { ok: true };
  });
}, ['SUPER_ADMIN','ACCOUNTING']);
