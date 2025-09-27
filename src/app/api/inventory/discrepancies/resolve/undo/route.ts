import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ lotId:string }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'inventory-discrepancy-undo', limit: 60 }, parseJson: true })(async ({ json }) => {
  const lotId = String(json!.lotId||'')
  if (!lotId) return err('invalid_input', 400)
  const since = new Date(Date.now() - 10*60*1000)
  const last = await prisma.writeOffLedger.findFirst({ where: { lotId, reason: 'recount_adjustment', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' } })
  if (!last) return err('nothing_to_undo', 404)
  const now = new Date()
  const out = await prisma.$transaction(async (tx) => {
    const lot = await tx.inventoryLot.findUnique({ where: { id: lotId } })
    if (!lot) throw new Error('lot_not_found')
    const newOnHand = lot.quantityOnHand + last.qty
    await tx.inventoryLot.update({ where: { id: lotId }, data: { quantityOnHand: newOnHand, lastMovementDate: now } })
    await tx.writeOffLedger.create({ data: { lotId, qty: -last.qty, reason: 'undo_recount_adjustment' } })
    return { newOnHand }
  })
  return ok({ undone: true, data: out })
})
