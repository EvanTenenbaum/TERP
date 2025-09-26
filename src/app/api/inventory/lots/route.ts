import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'],
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || ''
  if (!productId) return err('missing_productId', 400)

  const lots = await prisma.inventoryLot.findMany({
    where: { batch: { productId } },
    select: { id: true, quantityAvailable: true, reservedQty: true },
    orderBy: { id: 'asc' }
  })
  const mapped = lots.map(l => ({ id: l.id, quantityAvailable: Math.max(0, (l.quantityAvailable - (l.reservedQty ?? 0))) }))
  return ok({ lots: mapped })
})
