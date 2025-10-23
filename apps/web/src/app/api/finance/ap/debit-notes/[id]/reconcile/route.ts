import { z } from 'zod';
export const dynamic = 'force-dynamic';
import { api } from '@/lib/api';
import prisma from '@/lib/prisma';

const Input = z.object({ id: z.string().uuid(), amountCents: z.number().int().nonnegative() });

export const POST = api(Input, async ({ id, amountCents }) => {
  await prisma.vendorDebitNote.update({ where: { id }, data: { amountCents, status: 'CLOSED' } });
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
