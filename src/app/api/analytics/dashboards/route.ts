import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({}), async () => {
  const rows = await prisma.dashboard.findMany();
  return { ok: true, data: rows };
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);

export const POST = api(z.object({ name: z.string().min(1), description: z.string().optional() }), async ({ name, description }) => {
  const d = await prisma.dashboard.create({ data: { name, description: description ?? null } });
  return { ok: true, data: d };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
