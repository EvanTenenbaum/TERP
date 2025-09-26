import { api } from '@/lib/api'
import prisma from '@/lib/prisma'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'],
  rate: { key: 'ar-aging', limit: 30 },
})(async () => {
  const ars = await prisma.accountsReceivable.findMany({ where: { balanceRemaining: { gt: 0 } }, include: { customer: true } })
  const now = new Date()
  const rows: string[][] = [[ 'Customer', 'InvoiceId', 'BalanceRemaining', 'DaysPastDue', 'Bucket' ]]
  for (const ar of ars) {
    const daysPastDue = ar.dueDate ? Math.floor((now.getTime() - new Date(ar.dueDate).getTime()) / 86400000) : 0
    let bucket = '0-29'
    if (daysPastDue >= 90) bucket = '90+'
    else if (daysPastDue >= 60) bucket = '60-89'
    else if (daysPastDue >= 30) bucket = '30-59'
    rows.push([ ar.customer?.companyName || '', ar.id, String(ar.balanceRemaining), String(daysPastDue), bucket ])
  }
  const csv = rows.map(r => r.map(f => /[",\n]/.test(f) ? `"${f.replace(/"/g,'""')}"` : f).join(',')).join('\n')
  return new Response(csv, { headers: { 'Content-Type':'text/csv', 'Content-Disposition': 'attachment; filename="ar-aging.csv"' } })
})
