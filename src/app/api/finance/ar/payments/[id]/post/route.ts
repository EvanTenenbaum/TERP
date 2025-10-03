import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { postARPayment } from '@/lib/posting';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const pay = await prisma.payment.findUniqueOrThrow({ where: { id } });
  const amt = (pay as any).amountCents ?? 0;
  await postARPayment(id, Number(amt));
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
