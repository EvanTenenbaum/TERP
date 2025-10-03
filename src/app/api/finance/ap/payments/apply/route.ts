import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Input = z.object({ paymentId: z.string().uuid(), vendorId: z.string().uuid() });

export const POST = api(Input, async ({ paymentId, vendorId }) => {
  const res = await prisma.$transaction(async (tx) => {
    const pay = await tx.vendorPayment.findUniqueOrThrow({ where: { id: paymentId } });
    let remaining = (pay as any).remainingCents ?? (pay as any).amountCents;
    const invs = await tx.vendorInvoice.findMany({ where: { vendorId, balanceCents: { gt: 0 } }, orderBy: { dueAt: 'asc' } });
    for (const inv of invs as any[]) {
      if (remaining <= 0) break;
      const apply = Math.min(remaining, inv.balanceCents);
      remaining -= apply;
      await tx.vendorInvoice.update({ where: { id: inv.id }, data: { balanceCents: { decrement: apply } } });
    }
    await tx.vendorPayment.update({ where: { id: pay.id }, data: { remainingCents: remaining } });
    return { remaining };
  });
  return { ok: true, ...res };
}, ['ACCOUNTING','SUPER_ADMIN']);
