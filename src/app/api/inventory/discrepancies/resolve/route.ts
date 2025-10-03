import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';

const Input = z.object({
  adjustmentId: z.string().uuid(),
  confirm: z.boolean(),
});

export const POST = api(Input, async ({ adjustmentId, confirm }) => {
  const adj = await prisma.inventoryAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!adj) throw new ERPError('NOT_FOUND', 'adjustment_not_found');

  if (confirm) {
    return { ok: true, confirmed: true };
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryAdjustment.create({
        data: { productId: adj.productId, lotId: adj.lotId, quantityDelta: -adj.quantityDelta, reason: 'UNDO' },
      });
      const lot = await tx.inventoryLot.findFirst({ where: { productId: adj.productId }, orderBy: { createdAt: 'asc' } });
      if (lot) {
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: { onHandQty: { decrement: adj.quantityDelta }, availableQty: { decrement: adj.quantityDelta } },
        });
      }
    });
    return { ok: true, confirmed: false };
  }
}, ['SUPER_ADMIN','ACCOUNTING']);
