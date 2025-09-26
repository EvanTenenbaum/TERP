import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentRole, getCurrentUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const role = getCurrentRole()
  if (!(role === 'SUPER_ADMIN' || role === 'ACCOUNTING' || role === 'READ_ONLY')) return new NextResponse('forbidden', { status: 403 })

  const orders = await prisma.order.findMany({
    include: { orderItems: { include: { batch: true, product: true } }, customer: true },
    orderBy: { orderDate: 'desc' },
  })
  const rows = [["ProductID","VendorID","CustomerID","Qty","PriceCents","Date","BatchID"]]
  for (const o of orders) {
    for (const it of o.orderItems) {
      rows.push([
        it.productId,
        it.batch?.vendorId || '',
        o.customerId,
        String(it.quantity),
        String(it.unitPrice),
        new Date(o.orderDate).toISOString(),
        it.batchId || ''
      ])
    }
  }
  const csv = rows.map(r => r.map(field => /[",\n]/.test(field) ? `"${field.replace(/"/g,'""')}"` : field).join(',')).join('\n')

  try { await prisma.eventLog.create({ data: { eventType: 'EXPORT', data: { route: '/api/compliance/export', userId: getCurrentUserId(), rows: rows.length } } }) } catch {}

  return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="compliance_${Date.now()}.csv"` } })
}
