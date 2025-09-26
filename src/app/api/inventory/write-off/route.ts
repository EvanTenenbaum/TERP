import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ lotId:string; qty:number; reason:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'write-off', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const lotId = String(json!.lotId || '')
  const q = Math.round(Number(json!.qty))
  const reason = String(json!.reason || '').slice(0,256)
  if (!lotId || !Number.isFinite(q) || q <= 0 || !reason) return err('invalid_input', 400)

  const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } })
  if (!lot) return err('lot_not_found', 404)
  if (lot.quantityAvailable < q) return err('insufficient_available', 409)

  const newOnHand = lot.quantityOnHand - q
  const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)

  await prisma.$transaction(async (tx) => {
    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: new Date() } })
    await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: q, reason } })
  })

  return ok()
})
