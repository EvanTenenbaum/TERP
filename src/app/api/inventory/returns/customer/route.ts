import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const Input = z.object({
  customerId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export const POST = api(Input, async ({ customerId, orderId, productId, lotId, quantity, reason }) => {
  const ret = await prisma.$transaction(async (tx) => {
    const created = await tx.customerReturn.create({ data: { customerId, orderId: orderId ?? null, productId, lotId: lotId ?? null, quantity, reason: reason ?? null } });
    // Increase inventory
    if (lotId) {
      await tx.inventoryLot.update({ where: { id: lotId }, data: { onHandQty: { increment: quantity }, availableQty: { increment: quantity } } });
    } else {
      await tx.inventoryLot.create({ data: { productId, onHandQty: quantity, availableQty: quantity, allocatedQty: 0, batchCreatedAt: new Date() } as any });
    }
    // Finance hook: CustomerCredit model not yet implemented
    // In production, create credit memo here
    return created;
  });
  return { ok: true, data: ret };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
