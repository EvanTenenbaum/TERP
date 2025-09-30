import type { PrismaClient } from '@prisma/client'

export interface Allocation { lotId: string; batchId: string; qty: number }

export async function allocateFIFO(db: PrismaClient, productId: string, qty: number): Promise<Allocation[]> {
  if (qty <= 0) throw new Error('invalid_quantity')
  return await (db as any).$transaction(async (tx: PrismaClient) => {
    const lots = await (tx as any).$queryRaw<{ id: string; batchid: string; quantityavailable: number }[]>`
      SELECT "id", "batchId" as batchid, "quantityAvailable" as quantityavailable
      FROM "InventoryLot"
      WHERE "batchId" IN (SELECT id FROM "Batch" WHERE "productId" = ${productId})
        AND "quantityAvailable" > 0
      ORDER BY "createdAt" ASC
      FOR UPDATE
    `
    let remaining = qty
    const allocations: Allocation[] = []
    for (const lot of lots) {
      if (remaining <= 0) break
      const avail = Number(lot.quantityavailable)
      const take = Math.min(remaining, avail)
      if (take > 0) {
        await (tx as any).inventoryLot.update({
          where: { id: lot.id },
          data: {
            quantityAllocated: { increment: take },
            quantityAvailable: { decrement: take },
            lastMovementDate: new Date(),
          },
        })
        allocations.push({ lotId: lot.id, batchId: lot.batchid, qty: take })
        remaining -= take
      }
    }
    if (remaining > 0) throw new Error('insufficient_stock')
    return allocations
  }, { isolationLevel: 'Serializable' } as any)
}

export async function allocateFIFOByProduct(db: PrismaClient, productId: string, qty: number): Promise<Allocation[]> {
  return allocateFIFO(db, productId, qty)
}

export async function allocateFromSpecificLot(db: PrismaClient, lotId: string, qty: number): Promise<Allocation> {
  if (qty <= 0) throw new Error('invalid_quantity')
  return await (db as any).$transaction(async (tx: PrismaClient) => {
    const rows = await (tx as any).$queryRaw<{ id: string; batchid: string; quantityavailable: number }[]>`
      SELECT "id","batchId" as batchid,"quantityAvailable" as quantityavailable
      FROM "InventoryLot" WHERE "id" = ${lotId} FOR UPDATE
    `
    const lot = rows[0]
    if (!lot) throw new Error('lot_not_found')
    if (Number(lot.quantityavailable) < qty) throw new Error('insufficient_stock')

    await (tx as any).inventoryLot.update({
      where: { id: lotId },
      data: {
        quantityAllocated: { increment: qty },
        quantityAvailable: { decrement: qty },
        lastMovementDate: new Date(),
      },
    })
    return { lotId, batchId: lot.batchid, qty }
  }, { isolationLevel: 'Serializable' } as any)
}

export async function shipAllocated(db: PrismaClient, lotId: string, qty: number) {
  const res = await (db as any).inventoryLot.updateMany({
    where: { id: lotId, quantityOnHand: { gte: qty }, quantityAllocated: { gte: qty } },
    data: {
      quantityOnHand: { decrement: qty },
      quantityAllocated: { decrement: qty },
      lastMovementDate: new Date(),
    },
  })
  if (res.count === 0) throw new Error('insufficient_allocated')
}
