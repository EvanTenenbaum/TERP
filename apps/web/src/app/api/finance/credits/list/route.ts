import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({ customerId: z.string().uuid() }), async ({ customerId }) => {
  const credits = await prisma.customerCredit.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } as any });
  return { ok: true, data: credits };
}, ['READ_ONLY','ACCOUNTING','SUPER_ADMIN']);
