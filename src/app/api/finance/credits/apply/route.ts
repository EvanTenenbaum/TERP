import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const Input = z.object({ creditId: z.string().uuid(), invoiceId: z.string().uuid(), amountCents: z.number().int().positive() });

export const POST = api(Input, async ({ creditId, invoiceId, amountCents }) => {
  await prisma.$transaction(async (tx) => {
    const credit = await tx.customerCredit.findUniqueOrThrow({ where: { id: creditId } });
    if ((credit as any).remainingCents !== undefined && (credit as any).remainingCents < amountCents) {
      throw new Error('insufficient_credit');
    }
    await tx.invoice.update({ where: { id: invoiceId }, data: { balanceCents: { decrement: amountCents } } });
    if ((credit as any).remainingCents !== undefined) {
      await tx.customerCredit.update({ where: { id: creditId }, data: { remainingCents: { decrement: amountCents } } });
    }
    await logAudit('CREDIT_APPLIED', 'Invoice', invoiceId, { creditId, amountCents });
  });
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
