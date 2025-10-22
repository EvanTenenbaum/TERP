import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const rows = await prisma.dashboardWidget.findMany({ where: { dashboardId: id } });
  return { ok: true, data: rows };
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);

const Upsert = z.object({ id: z.string().uuid(), title: z.string().min(1), reportId: z.string().uuid().optional(), viz: z.string().optional(), position: z.any().optional() });
export const POST = api(Upsert, async ({ id, title, reportId, viz, position }) => {
  const w = await prisma.dashboardWidget.upsert({ where: { id }, update: { title, reportId: reportId ?? null, viz: viz ?? 'auto', position: (position as any) ?? {} }, create: { id, title, dashboardId: id, reportId: reportId ?? null, viz: viz ?? 'auto', position: (position as any) ?? {} } });
  return { ok: true, data: w };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
