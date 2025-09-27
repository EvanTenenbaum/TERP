import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { getActiveBatchCostDb } from '@/lib/cogs'
import { ok, err } from '@/lib/http'

export const POST = api<{ type:string; lotId:string; quantity:number; reason?:string; notes?:string; defect?:boolean; increase?:boolean }>({
  roles: ['ACCOUNTING','SUPER_ADMIN'],
  postingLock: false,
  rate: { key: 'inventory-return', limit: 120 },
  parseJson: true,
})(async ({ json }) => {
  // preserve original semantics: only SUPER_ADMIN can post while locked
  await ensurePostingUnlocked()

  const type = String(json!.type||'')
  const lotId = String(json!.lotId||'')
  const qtyNum = Number(json!.quantity)
  const reason = json!.reason ? String(json!.reason) : undefined
  const notes = json!.notes ? String(json!.notes) : undefined
  const defect = json!.defect === true
  const increase = json!.increase === true
  const userId = getCurrentUserId()

  if (!lotId || !Number.isFinite(qtyNum) || qtyNum <= 0) return err('invalid_input', 400)

  try {
    const out = await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({ where: { id: lotId }, include: { batch: { include: { product: true, vendor: true } } } })
      if (!lot) throw new Error('lot_not_found')
      const now = new Date()
      const cost = await getActiveBatchCostDb(tx, lot.batchId, now)

      if (type === 'customer') {
        if (defect) {
          await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: qtyNum, reason: reason || 'customer_defect' } })
          await tx.sampleTransaction.create({ data: { productId: lot.batch.product.id, batchId: lot.batchId, customerId: null, vendorId: null, transactionType: 'CLIENT_RETURN', quantity: 0, unitCostSnapshot: cost?.unitCost ?? 0, transactionDate: now, notes } })
          return { mode:'customer_defect' }
        }
        const newOnHand = lot.quantityOnHand + qtyNum
        const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
        await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: now } })
        await tx.sampleTransaction.create({ data: { productId: lot.batch.product.id, batchId: lot.batchId, customerId: null, vendorId: null, transactionType: 'CLIENT_RETURN', quantity: qtyNum, unitCostSnapshot: cost?.unitCost ?? 0, transactionDate: now, notes } })
        return { mode:'customer', newOnHand, newAvailable }
      }

      if (type === 'vendor') {
        if (lot.quantityOnHand < qtyNum) throw new Error('insufficient_on_hand')
        const newOnHand = lot.quantityOnHand - qtyNum
        const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
        await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: now } })
        await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: qtyNum, reason: reason || 'vendor_return' } })
        await tx.sampleTransaction.create({ data: { productId: lot.batch.product.id, batchId: lot.batchId, vendorId: lot.batch.vendorId, transactionType: 'VENDOR_RETURN', quantity: qtyNum, unitCostSnapshot: cost?.unitCost ?? 0, transactionDate: now, notes } })
        return { mode:'vendor', newOnHand, newAvailable }
      }

      if (type === 'internal') {
        if (increase) {
          const newOnHand = lot.quantityOnHand + qtyNum
          const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
          await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: now } })
          return { mode:'internal_increase', newOnHand, newAvailable }
        } else {
          if (lot.quantityOnHand < qtyNum) throw new Error('insufficient_on_hand')
          const newOnHand = lot.quantityOnHand - qtyNum
          const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
          await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: now } })
          await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: qtyNum, reason: reason || 'internal' } })
          return { mode:'internal_decrease', newOnHand, newAvailable }
        }
      }

      throw new Error('invalid_type')
    })

    return ok({ data: out })
  } catch (e: any) {
    const code = e?.message || 'server_error'
    const httpStatus = code === 'lot_not_found' ? 404 : code === 'insufficient_on_hand' ? 409 : code === 'invalid_type' ? 400 : 500
    return err(code, httpStatus)
  }
})
