import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';

const Input = z.object({ id: z.string().uuid(), countedQty: z.number().int() });

export const POST = api(Input, async ({ id, countedQty }) => {
  const task = await prisma.cycleCountTask.findUnique({ where: { id } });
  if (!task) throw new ERPError('NOT_FOUND', 'task_not_found');
  const updated = await prisma.cycleCountTask.update({
    where: { id },
    data: { countedQty, status: 'SUBMITTED' },
  });
  return { ok: true, task: updated };
}, ['SUPER_ADMIN','ACCOUNTING']);
