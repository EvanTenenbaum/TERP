import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ productId:string; qty:number; customerId?:string; batchId?:string; notes?:string }>({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'sample-outgoing', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { productId, qty, customerId, batchId } = json as any
  const notes = (json as any)?.notes ? String((json as any).notes).slice(0,512) : undefined
  if (!productId || !Number.isFinite(qty) || qty <= 0) return err('invalid_input', 400)

  try {
    const result = await prisma.$transaction(async (tx) => {
      let lot = null as any
      if (batchId) {
        lot = await tx.inventoryLot.findFirst({ where: { batchId }, orderBy: [{ lastMovementDate: 'asc' }, { createdAt: 'asc' }] })
      } else {
        lot = await tx.inventoryLot.findFirst({ where: { batch: { productId } }, orderBy: [{ lastMovementDate: 'asc' }, { createdAt: 'asc' }] })
      }
      if (!lot) throw new Error('no_lot_available')

      const updatedLot = await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          quantityOnHand: { decrement: qty },
          quantityAvailable: { decrement: qty },
          lastMovementDate: new Date(),
        },
      })
      if (updatedLot.quantityOnHand < 0 || updatedLot.quantityAvailable < 0) throw new Error('insufficient_inventory')

      const cost = await tx.batchCost.findFirst({ where: { batchId: lot.batchId }, orderBy: { effectiveFrom: 'desc' } })

      const sample = await tx.sampleTransaction.create({
        data: {
          productId,
          batchId: lot.batchId,
          customerId,
          quantity: qty,
          unitCostSnapshot: cost?.unitCost ?? 0,
          transactionType: 'CLIENT_OUT',
          transactionDate: new Date(),
          notes,
        },
      })
      return sample
    })

    return ok({ data: result })
  } catch (e:any) {
    const m = e?.message
    if (m === 'no_lot_available') return err('no_lot_available', 404)
    if (m === 'insufficient_inventory') return err('insufficient_inventory', 409)
    return err('server_error', 500)
  }
})
