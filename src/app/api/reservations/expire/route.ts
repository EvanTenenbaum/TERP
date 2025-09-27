import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES'], postingLock: true })(async () => {
  const now = new Date()
  const expired = await prisma.reservation.findMany({ where: { releasedAt: null, expiresAt: { lt: now } } })
  if (expired.length === 0) return ok({ released: 0 })
  let released = 0
  await prisma.$transaction(async (tx) => {
    for (const r of expired) {
      const lot = await tx.inventoryLot.findFirst({ where: { batchId: r.batchId! } })
      if (!lot) continue
      await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { decrement: r.qty }, quantityAvailable: { increment: r.qty }, lastMovementDate: now } })
      await tx.reservation.update({ where: { id: r.id }, data: { releasedAt: now } })
      released += 1
    }
  })
  return ok({ released })
})
