import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { getActiveBatchCostDb } from '@/lib/cogs'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['ACCOUNTING','SUPER_ADMIN']) } catch { return err('forbidden', 403) }
  await ensurePostingUnlocked()

  const rl = rateLimit(`${rateKeyFromRequest(req)}:inventory-return`, 120, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)

  const body = await req.json().catch(()=>null)
  if (!body) return err('bad_json', 400)

  const type = String(body.type||'')
  const lotId = String(body.lotId||'')
  const qtyNum = Number(body.quantity)
  const reason = body.reason ? String(body.reason) : undefined
  const notes = body.notes ? String(body.notes) : undefined
  const defect = body.defect === true
  const increase = body.increase === true
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
    const status = code === 'lot_not_found' ? 404 : code === 'insufficient_on_hand' ? 409 : code === 'invalid_type' ? 400 : 500
    return err(code, status)
  }
}
