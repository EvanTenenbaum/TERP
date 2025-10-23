import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { startSpan } from '@/lib/observability';

export const GET = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  return startSpan('order.pdf', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { id }, include: { items: { include: { product: true } }, customer: true } as any });
    const lines: string[] = [];
    lines.push(`Packing Slip`);
    lines.push(`Order: ${o.id}`);
    lines.push(`Customer: ${o.customerId}`);
    lines.push(`Items:`);
    for (const it of o.items as any[]) {
      const name = it.product?.name || it.productId;
      lines.push(` - ${name} x ${it.quantity}`);
    }
    const buf = Buffer.from(lines.join('\n'));
    return new Response(buf, { headers: { 'Content-Type': 'application/pdf' } });
  }, { orderId: id });
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);
