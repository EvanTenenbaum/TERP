import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ productId:string; sourceLotId:string; destLotId:string; quantity:number; reason?:string; notes?:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'inventory-transfer', limit: 120 },
  parseJson: true,
  onError: (e) => {
    const msg = e?.message
    if (msg === 'insufficient_on_hand') return { code: 'insufficient_on_hand', status: 409 }
    if (msg === 'lot_not_found') return { code: 'lot_not_found', status: 404 }
    return undefined
  }
})(async ({ json }) => {
  const productId = String(json!.productId || '')
  const sourceLotId = String(json!.sourceLotId || '')
  const destLotId = String(json!.destLotId || '')
  const qtyNum = Number(json!.quantity)
  const reason = json!.reason ? String(json!.reason) : undefined
  const notes = json!.notes ? String(json!.notes) : undefined

  if (!productId || !sourceLotId || !destLotId) return err('missing_fields', 400)
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) return err('invalid_quantity', 400)

  const userId = getCurrentUserId()

  const [src, dst] = await Promise.all([
    prisma.inventoryLot.findUnique({ where: { id: sourceLotId }, include: { batch: true } }),
    prisma.inventoryLot.findUnique({ where: { id: destLotId }, include: { batch: true } })
  ])
  if (!src || !dst) return err('lot_not_found', 404)
  if (!src.batch || !dst.batch) return err('batch_missing', 500)
  if (src.batch.productId !== productId || dst.batch.productId !== productId) return err('product_mismatch', 400)

  const available = src.quantityAvailable - (src.reservedQty ?? 0)
  if (available < qtyNum) return err('insufficient_on_hand', 409)

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.inventoryLot.findUnique({ where: { id: sourceLotId } })
    if (!fresh) throw new Error('lot_not_found')
    const effAvail = fresh.quantityAvailable - (fresh.reservedQty ?? 0)
    if (effAvail < qtyNum) throw new Error('insufficient_on_hand')

    const updatedSource = await tx.inventoryLot.update({ where: { id: sourceLotId }, data: { quantityAvailable: { decrement: qtyNum }, lastMovementDate: now } })
    const updatedDest = await tx.inventoryLot.update({ where: { id: destLotId }, data: { quantityAvailable: { increment: qtyNum }, lastMovementDate: now } })
    const transfer = await tx.inventoryTransfer.create({ data: { createdBy: userId, productId, sourceLotId, destLotId, quantity: qtyNum, reason, notes } })
    return { transfer, updatedSource, updatedDest }
  })

  return ok({ transfer: result.transfer })
})
