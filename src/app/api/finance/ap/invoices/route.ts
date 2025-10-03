import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({ vendorId: z.string().uuid().optional() }), async ({ vendorId }) => {
  const where = vendorId ? { vendorId } : {};
  const rows = await prisma.vendorInvoice.findMany({ where, orderBy: { issuedAt: 'desc' } });
  return { ok: true, data: rows };
}, ['READ_ONLY','ACCOUNTING','SUPER_ADMIN']);

const Create = z.object({ vendorId: z.string().uuid(), invoiceNumber: z.string().min(1), totalCents: z.number().int().nonnegative(), dueAt: z.string().optional() });
export const POST = api(Create, async ({ vendorId, invoiceNumber, totalCents, dueAt }) => {
  const row = await prisma.vendorInvoice.create({ data: { vendorId, invoiceNumber, totalCents, balanceCents: totalCents, dueAt: dueAt ? new Date(dueAt) : null } });
  return { ok: true, data: row };
}, ['ACCOUNTING','SUPER_ADMIN']);
