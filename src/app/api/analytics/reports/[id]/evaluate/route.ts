import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { evaluateSpec } from '@/lib/analyticsEvaluator';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const rep = await prisma.report.findUniqueOrThrow({ where: { id } });
  const result = await evaluateSpec(rep.spec as any);
  return { ok: true, data: result };
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);
