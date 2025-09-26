import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'],
  rate: { key: 'export-compliance', limit: 30 },
})(async () => {
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

  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="compliance_${Date.now()}.csv"` } })
})
