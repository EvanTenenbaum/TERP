import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const role = getCurrentRole()
  if (!(role === 'SUPER_ADMIN' || role === 'ACCOUNTING')) {
    return new NextResponse('forbidden', { status: 403 })
  }
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
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ar_export_${Date.now()}.csv"`
    }
  })
}
