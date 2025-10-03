import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({ q: z.string().optional() }), async ({ q }) => {
  const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as any } }, { sku: { contains: q, mode: 'insensitive' as any } }] } : {};
  const products = await prisma.product.findMany({
    where, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, defaultUnitPriceCents: true }
  });
  return { ok: true, data: products };
}, ['READ_ONLY','SUPER_ADMIN','SALES','ACCOUNTING']);
