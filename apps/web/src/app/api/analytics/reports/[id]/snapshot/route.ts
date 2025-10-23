import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { evaluateSpec } from '@/lib/analyticsEvaluator';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const rep = await prisma.report.findUniqueOrThrow({ where: { id } });
  const data = await evaluateSpec(rep.spec as any);
  const snap = await prisma.reportSnapshot.create({ data: { reportId: rep.id, data } });
  return { ok: true, data: snap };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
