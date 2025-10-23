import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { postAPPayment } from '@/lib/posting';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const pay = await prisma.vendorPayment.findUniqueOrThrow({ where: { id } });
  const amt = (pay as any).amountCents as number;
  await postAPPayment(id, amt);
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
