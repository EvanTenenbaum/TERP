import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'

export const GET = api({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'],
  rate: { key: 'export-inventory', limit: 30 },
})(async ({ req }) => {
  const lots = await prisma.inventoryLot.findMany({
    include: { batch: { include: { product: true, vendor: true } } },
    orderBy: { lastMovementDate: 'desc' }
  })
  const rows = [['product','vendorCode','lotNumber','qtyOnHand','qtyAllocated','qtyAvailable','lastMovement','priceCents']]
  for (const l of lots) {
    const price = l.batch.product.defaultPrice
    rows.push([
      l.batch.product.customerFacingName || l.batch.product.name,
      l.batch.vendor.vendorCode,
      l.batch.lotNumber,
      String(l.quantityOnHand),
      String(l.quantityAllocated),
      String(l.quantityAvailable),
      new Date(l.lastMovementDate).toISOString(),
      String(price)
    ])
  }
  const csv = rows.map(r => r.map(field => /[",\n]/.test(field) ? `"${field.replace(/"/g,'""')}"` : field).join(',')).join('\n')

  try { await prisma.eventLog.create({ data: { eventType: 'EXPORT', data: { route: '/api/inventory/export', userId: getCurrentUserId(), count: lots.length } } }) } catch {}

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inventory_export_${Date.now()}.csv"`
    }
  })
})
