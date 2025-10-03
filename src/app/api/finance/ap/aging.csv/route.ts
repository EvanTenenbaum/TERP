import { prisma } from '@/lib/prisma';

export async function GET() {
  const rows = await prisma.vendorInvoice.findMany({ orderBy: { dueAt: 'asc' } });
  const lines = ['invoiceNumber,vendorId,dueAt,balanceCents'];
  for (const r of rows) {
    lines.push(`${r.invoiceNumber},${r.vendorId},${r.dueAt?.toISOString()||''},${r.balanceCents}`);
  }
  const buf = Buffer.from(lines.join('\n'));
  return new Response(buf, { headers: { 'Content-Type': 'text/csv' } });
}
