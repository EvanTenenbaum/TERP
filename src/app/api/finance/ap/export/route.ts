import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const role = getCurrentRole()
  if (!(role === 'SUPER_ADMIN' || role === 'ACCOUNTING')) {
    return new NextResponse('forbidden', { status: 403 })
  }
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
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ap_export_${Date.now()}.csv"`
    }
  })
}
