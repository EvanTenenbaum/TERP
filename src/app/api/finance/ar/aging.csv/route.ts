import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
  return lines.join('\n');
}

export const GET = api(z.object({}), async () => {
  const invoices = await prisma.invoice.findMany({
    select: { id: true, customerId: true, totalCents: true, balanceCents: true, dueAt: true },
    orderBy: { dueAt: 'asc' },
  });
  const csv = toCsv(invoices);
  return new Response(csv, { headers: { 'Content-Type': 'text/csv' } });
}, ['READ_ONLY','ACCOUNTING','SUPER_ADMIN']);
