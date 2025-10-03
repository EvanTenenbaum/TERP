import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const Input = z.object({
  vendorId: z.string().uuid(),
  poId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export const POST = api(Input, async ({ vendorId, poId, productId, lotId, quantity, reason }) => {
  const ret = await prisma.$transaction(async (tx) => {
    const created = await tx.vendorReturn.create({ data: { vendorId, poId: poId ?? null, productId, lotId: lotId ?? null, quantity, reason: reason ?? null } });
    // Decrease inventory
    if (lotId) {
      await tx.inventoryLot.update({ where: { id: lotId }, data: { onHandQty: { decrement: quantity }, availableQty: { decrement: quantity } } });
    } else {
      const lot = await tx.inventoryLot.findFirst({ where: { productId }, orderBy: { createdAt: 'asc' } });
      if (lot) await tx.inventoryLot.update({ where: { id: lot.id }, data: { onHandQty: { decrement: quantity }, availableQty: { decrement: quantity } } });
    }
    return created;
  });
  return { ok: true, data: ret };
}, ['SUPER_ADMIN','ACCOUNTING']);
