import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING'] })(async () => {
  const rows = await prisma.writeOffLedger.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      lot: {
        include: {
          batch: { include: { product: true, vendor: { include: { party: true } } } }
        }
      }
    }
  })
  const out = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    qty: r.qty,
    reason: r.reason,
    lotId: r.lotId,
    productId: r.lot.batch.productId,
    productName: r.lot.batch.product.name,
    vendorId: r.lot.batch.vendorId,
    vendorName: r.lot.batch.vendor.party?.name || r.lot.batch.vendor.companyName
  }))
  return ok({ rows: out })
})
