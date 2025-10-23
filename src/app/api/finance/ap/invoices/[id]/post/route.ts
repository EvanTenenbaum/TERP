import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { postAPInvoice } from '@/lib/posting';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const inv = await prisma.vendorInvoice.findUniqueOrThrow({ where: { id } });
  await postAPInvoice(id, inv.totalCents as any as number);
  return { ok: true };
}, ['ACCOUNTING','SUPER_ADMIN']);
