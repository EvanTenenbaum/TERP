import type { PrismaClient } from '@prisma/client'

export interface Allocation { lotId: string; batchId: string; qty: number }

function now() { return new Date() }

export async function allocateFromSpecificLot(db: PrismaClient, lotId: string, qty: number): Promise<Allocation> {
  const res = await db.inventoryLot.updateMany({
    where: { id: lotId, quantityAvailable: { gte: qty } },
    data: {
      quantityAllocated: { increment: qty },
      quantityAvailable: { decrement: qty },
      lastMovementDate: now(),
    },
  })
  if (res.count === 0) throw new Error('insufficient_stock')
  const lot = await db.inventoryLot.findUnique({ where: { id: lotId }, include: { batch: true } })
  return { lotId, batchId: lot!.batchId, qty }
}

export async function allocateFIFOByProduct(db: PrismaClient, productId: string, qty: number): Promise<Allocation[]> {
  let remaining = Math.round(qty)
  const allocations: Allocation[] = []
  if (remaining <= 0) return allocations

  const lots = await db.inventoryLot.findMany({
    where: { quantityAvailable: { gt: 0 }, batch: { productId } },
    orderBy: [{ lastMovementDate: 'asc' }, { createdAt: 'asc' }],
    include: { batch: true },
  })

  for (const lot of lots) {
    if (remaining <= 0) break
    const take = Math.min(remaining, lot.quantityAvailable)
    if (take <= 0) continue
    const res = await db.inventoryLot.updateMany({
      where: { id: lot.id, quantityAvailable: { gte: take } },
      data: {
        quantityAllocated: { increment: take },
        quantityAvailable: { decrement: take },
        lastMovementDate: now(),
      },
    })
    if (res.count === 0) continue
    allocations.push({ lotId: lot.id, batchId: lot.batchId, qty: take })
    remaining -= take
  }
  if (remaining > 0) throw new Error('insufficient_stock')
  return allocations
}

export async function shipAllocated(db: PrismaClient, lotId: string, qty: number) {
  const res = await db.inventoryLot.updateMany({
    where: { id: lotId, quantityOnHand: { gte: qty }, quantityAllocated: { gte: qty } },
    data: {
      quantityOnHand: { decrement: qty },
      quantityAllocated: { decrement: qty },
      lastMovementDate: now(),
    },
  })
  if (res.count === 0) throw new Error('insufficient_allocated')
}
