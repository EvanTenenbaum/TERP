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
  // VendorInvoice model not yet implemented in schema
  // Return empty CSV for now
  const vendorInvoices: any[] = [];
  const csv = toCsv(vendorInvoices.length > 0 ? vendorInvoices : [{ message: 'VendorInvoice model not yet implemented' }]);
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="ap-aging.csv"' } });
}, ['READ_ONLY','ACCOUNTING','SUPER_ADMIN']);
