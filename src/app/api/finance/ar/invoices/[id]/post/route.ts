import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { postARInvoice } from '@/lib/posting';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  const amount = (inv as any).totalCents ?? (inv as any).amountCents ?? (inv as any).balanceCents;
  await postARInvoice(id, Number(amount || 0));
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
