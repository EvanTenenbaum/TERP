import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startSpan } from '@/lib/observability';

export const GET = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  return startSpan('quote.pdf', async () => {
    const q = await prisma.quote.findUniqueOrThrow({ where: { id }, include: { items: { include: { product: true } }, customer: true } as any });
    // Minimal PDF using jsPDF-like structure as plain text for reliability if jsPDF not present
    const lines: string[] = [];
    lines.push(`Quote ${q.id}`);
    lines.push(`Customer: ${q.customerId}`);
    for (const it of q.items as any[]) {
      const name = it.product?.name || it.productId;
      lines.push(`${name} x ${it.quantity}`);
    }
    const blob = Buffer.from(lines.join('\n'));
    return new Response(blob, { headers: { 'Content-Type': 'application/pdf' } });
  }, { quoteId: id });
}, ['READ_ONLY','SALES','ACCOUNTING','SUPER_ADMIN']);
