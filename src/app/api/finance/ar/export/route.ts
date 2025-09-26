import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'export-ar', limit: 30 },
})(async () => {
  const ars = await prisma.accountsReceivable.findMany({ include: { customer: true }, orderBy: { invoiceDate: 'desc' } })
  const rows = [['invoiceNumber','customer','invoiceDate','dueDate','amountCents','balanceCents']]
  for (const ar of ars) {
    rows.push([
      ar.invoiceNumber,
      ar.customer?.companyName || '',
      new Date(ar.invoiceDate).toISOString(),
      new Date(ar.dueDate).toISOString(),
      String(ar.amount),
      String(ar.balanceRemaining),
    ])
  }
  const csv = rows.map(r => r.map(field => /[",\n]/.test(field) ? `"${field.replace(/"/g,'""')}"` : field).join(',')).join('\n')
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ar_export_${Date.now()}.csv"`
    }
  })
})
