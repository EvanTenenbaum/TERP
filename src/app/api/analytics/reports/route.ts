import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const Create = z.object({ name: z.string().min(1), spec: z.any() });
export const POST = api(Create, async ({ name, spec }) => {
  const row = await prisma.report.create({ data: { name, spec } });
  return { ok: true, data: row };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);

export const GET = api(z.object({}), async () => {
  const rows = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  return { ok: true, data: rows };
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);
