import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({})(async () => {
  if (process.env.ENABLE_QA_CRONS !== 'true') return err('disabled', 404)
  const now = new Date()
  let released = 0
  await prisma.$transaction(async (tx) => {
    const expired = await tx.reservation.findMany({ where: { releasedAt: null, expiresAt: { lt: now } } })
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
