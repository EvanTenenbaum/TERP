import { z } from 'zod';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const QuoteItem = z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() });
const CreateQuote = z.object({ customerId: z.string().uuid(), items: z.array(QuoteItem).min(1), notes: z.string().optional() });

export const GET = api(z.object({ customerId: z.string().uuid().optional() }), async ({ customerId }) => {
  const where = customerId ? { customerId } : {};
  const quotes = await prisma.quote.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true } });
  return { ok: true, data: quotes };
}, ['READ_ONLY','SUPER_ADMIN','SALES','ACCOUNTING']);

export const POST = api(CreateQuote, async ({ customerId, items, notes }) => {
  const q = await prisma.quote.create({
    data: { customerId, notes: notes ?? null, status: 'OPEN', items: { create: items } },
    include: { items: true },
  });
  return { ok: true, data: q };
}, ['SUPER_ADMIN','SALES']);
