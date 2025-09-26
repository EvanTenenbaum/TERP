import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const role = getCurrentRole()
  if (!(role === 'SUPER_ADMIN' || role === 'SALES' || role === 'ACCOUNTING' || role === 'READ_ONLY')) {
    return new NextResponse('forbidden', { status: 403 })
  }
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
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inventory_export_${Date.now()}.csv"`
    }
  })
}
