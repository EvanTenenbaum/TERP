import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'export-ap', limit: 30 },
})(async () => {
  const aps = await prisma.accountsPayable.findMany({ include: { vendor: true }, orderBy: { invoiceDate: 'desc' } })
  const rows = [['invoiceNumber','vendor','invoiceDate','dueDate','amountCents','balanceCents']]
  for (const ap of aps) {
    rows.push([
      ap.invoiceNumber,
      ap.vendor?.companyName || '',
      new Date(ap.invoiceDate).toISOString(),
      new Date(ap.dueDate).toISOString(),
      String(ap.amount),
      String(ap.balanceRemaining),
    ])
  }
  const csv = rows.map(r => r.map(field => /[",\n]/.test(field) ? `"${field.replace(/"/g,'""')}"` : field).join(',')).join('\n')
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ap_export_${Date.now()}.csv"`
    }
  })
})
