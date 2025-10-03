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
  const lots = await prisma.inventoryLot.findMany({
    select: { id: true, productId: true, onHandQty: true, allocatedQty: true, availableQty: true, batchCreatedAt: true },
    orderBy: { productId: 'asc' },
  });
  const csv = toCsv(lots);
  return new Response(csv, { headers: { 'Content-Type': 'text/csv' } });
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING','SALES']);
