import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const GET = api(z.object({ planId: z.string().uuid() }), async ({ planId }) => {
  const tasks = await prisma.cycleCountTask.findMany({ where: { planId }, orderBy: { createdAt: 'asc' } });
  return { ok: true, data: tasks };
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING']);
