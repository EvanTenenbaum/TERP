import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ customerId:string; productId:string; batchId?:string; qty:number; expiresAt?:string }>({
  roles: ['SUPER_ADMIN','SALES'],
  postingLock: true,
  rate: { key: 'reservations-create', limit: 240 },
  parseJson: true,
})(async ({ json }) => {
  const { customerId, productId, batchId, qty, expiresAt } = json || ({} as any)
  const q = Math.round(Number(qty))
  if (!customerId || !productId || !Number.isFinite(q) || q <= 0) return err('invalid_input', 400)

  const lot = batchId
    ? await prisma.inventoryLot.findFirst({ where: { batchId } })
    : await prisma.inventoryLot.findFirst({ where: { batch: { productId } }, orderBy: [{ lastMovementDate: 'asc' }, { createdAt: 'asc' }] })
  if (!lot) return err('lot_not_found', 404)
  if (lot.quantityAvailable < q) return err('insufficient_available', 409)

  await prisma.$transaction(async (tx) => {
    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { increment: q }, quantityAvailable: { decrement: q }, lastMovementDate: new Date() } })
    await tx.reservation.create({ data: { customerId, productId, batchId: lot.batchId, qty: q, expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now()+24*3600*1000) } })
  })
  return ok()
})

export const DELETE = api({
  roles: ['SUPER_ADMIN','SALES'],
  postingLock: true,
  rate: { key: 'reservations-release', limit: 240 },
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return err('bad_request', 400)

  await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id } })
    if (!r || r.releasedAt) throw new Error('not_found')
    const lot = await tx.inventoryLot.findFirst({ where: { batchId: r.batchId! } })
    if (!lot) throw new Error('lot_not_found')
    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { decrement: r.qty }, quantityAvailable: { increment: r.qty }, lastMovementDate: new Date() } })
    await tx.reservation.update({ where: { id }, data: { releasedAt: new Date() } })
  })
  return ok()
})
