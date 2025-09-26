import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES']) } catch { return err('forbidden', 403) }
  await ensurePostingUnlocked()

  const rl = rateLimit(`${rateKeyFromRequest(req)}:cart-add`, 240, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)

  const body = await req.json().catch(() => null)
  if (!body) return err('bad_json', 400)

  const productId = String(body.productId || '')
  const inventoryLotId = body.inventoryLotId ? String(body.inventoryLotId) : undefined
  const quantity = Number(body.quantity)
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) return err('invalid_input', 400)

  const lots = await prisma.inventoryLot.findMany({ where: { batch: { productId } }, select: { id: true, quantityAvailable: true, reservedQty: true } })
  if (lots.length === 0) return err('no_lots_for_product', 404)

  let lotIdToUse: string
  if (lots.length === 1) {
    lotIdToUse = lots[0].id
  } else {
    if (!inventoryLotId) return err('lot_required', 400)
    const exists = lots.find(l => l.id === inventoryLotId)
    if (!exists) return err('invalid_lot', 400)
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

    return ok({ reservation: out.reservation })
  } catch (e: any) {
    const code = e?.message || 'server_error'
    const status = code === 'invalid_lot' ? 400 : code === 'insufficient_on_hand' ? 409 : 500
    return err(code, status)
  }
}
