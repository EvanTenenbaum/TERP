import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return new NextResponse('posting_locked', { status: 423 }) }
  const body = await req.json()
  const { customerId, productId, batchId, qty, expiresAt } = body || {}
  const q = Math.round(Number(qty))
  if (!customerId || !productId || !Number.isFinite(q) || q <= 0) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })

  return await prisma.$transaction(async (tx) => {
    // Choose lot by batch or by product FIFO
    let lot = null as any
    if (batchId) {
      lot = await tx.inventoryLot.findFirst({ where: { batchId } })
    } else {
      lot = await tx.inventoryLot.findFirst({ where: { batch: { productId } }, orderBy: [{ lastMovementDate: 'asc' }, { createdAt: 'asc' }] })
    }
    if (!lot) return NextResponse.json({ error: 'lot_not_found' }, { status: 404 })
    if (lot.quantityAvailable < q) return NextResponse.json({ error: 'insufficient_available' }, { status: 409 })

    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { increment: q }, quantityAvailable: { decrement: q }, lastMovementDate: new Date() } })
    const r = await tx.reservation.create({ data: { customerId, productId, batchId: lot.batchId, qty: q, expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now()+24*3600*1000) } })
    return NextResponse.json({ ok: true, reservation: r })
  })
}

export async function DELETE(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return new NextResponse('posting_locked', { status: 423 }) }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return new NextResponse('bad_request', { status: 400 })
  return await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id } })
    if (!r || r.releasedAt) return new NextResponse('not_found', { status: 404 })
    const lot = await tx.inventoryLot.findFirst({ where: { batchId: r.batchId! } })
    if (!lot) return new NextResponse('lot_not_found', { status: 404 })
    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { decrement: r.qty }, quantityAvailable: { increment: r.qty }, lastMovementDate: new Date() } })
    await tx.reservation.update({ where: { id }, data: { releasedAt: new Date() } })
    return NextResponse.json({ ok: true })
  })
}
