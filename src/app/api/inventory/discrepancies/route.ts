import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING'] })(async () => {
  const lots = await prisma.inventoryLot.findMany({
    include: {
      batch: { include: { product: true, vendor: { include: { party: true } } } },
    },
    orderBy: { lastMovementDate: 'desc' }
  })
  const rows = [] as any[]
  for (const lot of lots) {
    const expected = (lot.quantityAllocated || 0) + (lot.quantityAvailable || 0)
    const discrepancy = (lot.quantityOnHand || 0) - expected
    if (discrepancy !== 0) {
      rows.push({
        lotId: lot.id,
        productId: lot.batch.productId,
        productName: lot.batch.product.name,
        vendorId: lot.batch.vendorId,
        vendorName: lot.batch.vendor.party?.name || lot.batch.vendor.companyName,
        quantityOnHand: lot.quantityOnHand,
        quantityAllocated: lot.quantityAllocated,
        quantityAvailable: lot.quantityAvailable,
        discrepancy,
        lastMovementDate: lot.lastMovementDate
      })
    }
  }
  return ok({ rows })
})
