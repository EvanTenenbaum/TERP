import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import { shipAllocated } from '@/lib/inventoryAllocator'

export const POST = api({ roles: ['SUPER_ADMIN','SALES'], postingLock: true, rate: { key: 'orders-ship', limit: 60 } })(async ({ params }) => {
  const id = String(params!.id)
  const order = await prisma.order.findUnique({ where: { id }, include: { orderItems: true } })
  if (!order) return err('not_found', 404)
  if (order.status !== 'ALLOCATED' && order.status !== 'CONFIRMED') return err('invalid_status', 400)

  for (const it of order.orderItems) {
    if (!it.batchId) continue
    let remaining = it.quantity
    const lots = await prisma.inventoryLot.findMany({ where: { batchId: it.batchId, quantityAllocated: { gt: 0 } }, orderBy: { createdAt: 'asc' } })
    for (const lot of lots) {
      if (remaining <= 0) break
      const take = Math.min(remaining, lot.quantityAllocated)
      if (take > 0) {
        await shipAllocated(prisma as any, lot.id, take)
        remaining -= take
      }
    }
    if (remaining > 0) return err('insufficient_allocated', 400)
  }

  await prisma.order.update({ where: { id }, data: { status: 'SHIPPED' } })
  return ok()
})
