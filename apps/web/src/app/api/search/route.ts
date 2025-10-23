import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export const GET = api(z.object({ q: z.string().min(1) }), async ({ q }) => {
  const [products, customers, quotes, orders] = await Promise.all([
    prisma.product.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] }, take: 10, select: { id: true, name: true, sku: true } }),
    prisma.customer.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }, take: 10, select: { id: true, name: true, code: true } }),
    prisma.quote.findMany({ where: { id: { contains: q } as any }, take: 5, select: { id: true, customerId: true } }),
    prisma.order.findMany({ where: { id: { contains: q } as any }, take: 5, select: { id: true, customerId: true, status: true } }),
  ]);
  return { ok: true, data: { products, customers, quotes, orders } };
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);
