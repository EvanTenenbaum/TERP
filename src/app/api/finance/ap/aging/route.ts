import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

function bucketName(days: number) {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

export const GET = api(z.object({ asOf: z.string().optional() }), async ({ asOf }) => {
  const asOfDate = asOf ? new Date(asOf) : new Date();
  const invoices = await prisma.vendorInvoice.findMany({ select: { dueAt: true, balanceCents: true } });
  const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const inv of invoices) {
    if (!inv.dueAt) continue;
    const days = Math.floor((asOfDate.getTime() - new Date(inv.dueAt as any).getTime()) / 86400000);
    const b = bucketName(days);
    buckets[b] += inv.balanceCents as any as number;
  }
  const out = Object.entries(buckets).map(([bucket, amountCents]) => ({ bucket, amountCents }));
  return { buckets: out };
}, ['READ_ONLY','ACCOUNTING','SUPER_ADMIN']);
