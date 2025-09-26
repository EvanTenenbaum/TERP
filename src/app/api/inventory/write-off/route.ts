import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('posting_locked', { status: 423 }) }
  const body = await req.json()
  const { lotId, qty, reason } = body || {}
  const q = Math.round(Number(qty))
  if (!lotId || !Number.isFinite(q) || q <= 0 || !reason) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })

  return await prisma.$transaction(async (tx) => {
    const lot = await tx.inventoryLot.findUnique({ where: { id: String(lotId) } })
    if (!lot) return NextResponse.json({ error: 'lot_not_found' }, { status: 404 })
    if (lot.quantityAvailable < q) return NextResponse.json({ error: 'insufficient_available' }, { status: 409 })

    const newOnHand = lot.quantityOnHand - q
    const newAllocated = lot.quantityAllocated
    const newAvailable = Math.max(0, newOnHand - newAllocated)

    await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: new Date() } })
    await tx.writeOffLedger.create({ data: { lotId: lot.id, qty: q, reason: String(reason).slice(0,256) } })

    return NextResponse.json({ ok: true })
  })
}
