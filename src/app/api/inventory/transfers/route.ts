import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';

const Input = z.object({
  productId: z.string().uuid(),
  fromLotId: z.string().uuid(),
  toLotId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const POST = api(Input, async ({ productId, fromLotId, toLotId, quantity }) => {
  return prisma.$transaction(async (tx) => {
    const from = await tx.inventoryLot.findUnique({ where: { id: fromLotId } });
    const to = await tx.inventoryLot.findUnique({ where: { id: toLotId } });
    if (!from || !to) throw new ERPError('NOT_FOUND', 'lot_not_found');
    if (from.productId !== productId || to.productId !== productId) throw new ERPError('BAD_REQUEST', 'product_mismatch');
    if (from.onHandQty < quantity) throw new ERPError('CONFLICT', 'insufficient_from_lot_qty');

    await tx.inventoryLot.update({ where: { id: fromLotId }, data: { onHandQty: { decrement: quantity }, availableQty: { decrement: quantity } } });
    await tx.inventoryLot.update({ where: { id: toLotId }, data: { onHandQty: { increment: quantity }, availableQty: { increment: quantity } } });
    await tx.inventoryTransfer.create({ data: { productId, fromLotId, toLotId, quantity } });
    return { ok: true };
  });
}, ['SUPER_ADMIN','ACCOUNTING']);
