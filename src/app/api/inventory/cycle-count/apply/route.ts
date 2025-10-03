import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';

const Input = z.object({ planId: z.string().uuid() });

export const POST = api(Input, async ({ planId }) => {
  const tasks = await prisma.cycleCountTask.findMany({ where: { planId, status: 'SUBMITTED' } });
  if (!tasks.length) throw new ERPError('NOT_FOUND', 'no_submitted_tasks');

  await prisma.$transaction(async (tx) => {
    for (const t of tasks) {
      const diff = (t.countedQty ?? t.expectedQty) - t.expectedQty;
      if (diff !== 0) {
        await tx.inventoryAdjustment.create({
          data: { productId: t.productId, lotId: t.lotId, quantityDelta: diff, reason: 'CYCLE_COUNT' },
        });
        const lot = await tx.inventoryLot.findFirst({ where: { productId: t.productId }, orderBy: { createdAt: 'asc' } });
        if (lot) {
          await tx.inventoryLot.update({
            where: { id: lot.id },
            data: { onHandQty: { increment: diff }, availableQty: { increment: diff } },
          });
        }
      }
      await tx.cycleCountTask.update({ where: { id: t.id }, data: { status: 'APPLIED' } });
    }
  });

  return { ok: true, applied: tasks.length };
}, ['SUPER_ADMIN','ACCOUNTING']);
