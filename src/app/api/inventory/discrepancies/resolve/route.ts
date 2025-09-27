import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ lotId:string }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'inventory-discrepancy-resolve', limit: 60 }, parseJson: true })(async ({ json }) => {
  const lotId = String(json!.lotId||'')
  if (!lotId) return err('invalid_input', 400)
  const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } })
  if (!lot) return err('lot_not_found', 404)
  const expected = (lot.quantityAllocated || 0) + (lot.quantityAvailable || 0)
  const diff = (lot.quantityOnHand || 0) - expected
  if (diff === 0) return ok({ adjusted: 0 })
  await prisma.$transaction(async (tx)=>{
    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: expected, lastMovementDate: new Date() } })
    await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: diff, reason: 'recount_adjustment' } })
  })
  return ok({ adjusted: diff })
})
