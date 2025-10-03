import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = api(z.object({ limit: z.number().int().positive().max(200).optional() }), async ({ limit }) => {
  const items = await prisma.inventoryAdjustment.findMany({ orderBy: { createdAt: 'desc' }, take: limit ?? 50 });
  return { ok: true, data: items };
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING']);
