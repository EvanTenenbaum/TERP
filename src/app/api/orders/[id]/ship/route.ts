import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';
import { logAudit } from '@/lib/audit';
import { startSpan } from '@/lib/observability';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  return startSpan('order.ship', async () => {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new ERPError('NOT_FOUND', 'order_not_found');
      if ((order as any).status === 'SHIPPED') throw new ERPError('CONFLICT', 'already_shipped');

      const reservations = await tx.reservation.findMany({ where: { orderId: id } });
      // Decrement inventory from reserved lots
      for (const r of reservations as any[]) {
        await tx.inventoryLot.update({
          where: { id: r.lotId },
          data: {
            onHandQty: { decrement: r.quantity },
            allocatedQty: { decrement: r.quantity },
          },
        });
      }
      await tx.order.update({ where: { id }, data: { status: 'SHIPPED', shippedAt: new Date() } });
      await logAudit('ORDER_SHIPPED', 'Order', id, { reservations: reservations.map((r:any)=>({lotId:r.lotId,qty:r.quantity})) });
    });
    return { ok: true };
  }, { orderId: id });
}, ['SALES','SUPER_ADMIN','ACCOUNTING']);
