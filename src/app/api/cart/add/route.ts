import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status: 403 }) }
  await ensurePostingUnlocked()

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status: 400 })

  const productId = String(body.productId || '')
  const inventoryLotId = body.inventoryLotId ? String(body.inventoryLotId) : undefined
  const quantity = Number(body.quantity)
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ success:false, error:'invalid_input' }, { status: 400 })

  const lots = await prisma.inventoryLot.findMany({ where: { batch: { productId } }, select: { id: true, quantityAvailable: true, reservedQty: true } })
  if (lots.length === 0) return NextResponse.json({ success:false, error:'no_lots_for_product' }, { status: 404 })

  let lotIdToUse: string
  if (lots.length === 1) {
    lotIdToUse = lots[0].id
  } else {
    if (!inventoryLotId) return NextResponse.json({ success:false, error:'lot_required' }, { status: 400 })
    const exists = lots.find(l => l.id === inventoryLotId)
    if (!exists) return NextResponse.json({ success:false, error:'invalid_lot' }, { status: 400 })
    lotIdToUse = inventoryLotId
  }

  try {
    const userId = getCurrentUserId()

    const out = await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({ where: { id: lotIdToUse } , include: { batch: true }})
      if (!lot || !lot.batch || lot.batch.productId !== productId) throw new Error('invalid_lot')
      const effective = (lot.quantityAvailable - (lot.reservedQty ?? 0))
      if (effective < quantity) throw new Error('insufficient_on_hand')

      const updated = await tx.inventoryLot.update({ where: { id: lotIdToUse }, data: { reservedQty: { increment: quantity } } })
      const reservation = await tx.cartReservation.create({ data: { createdBy: userId, productId, inventoryLotId: lotIdToUse, quantity } })
      return { updated, reservation }
    })

    return NextResponse.json({ success:true, reservation: out.reservation })
  } catch (e: any) {
    const code = e?.message || 'server_error'
    const status = code === 'invalid_lot' ? 400 : code === 'insufficient_on_hand' ? 409 : 500
    return NextResponse.json({ success:false, error: code }, { status })
  }
}
