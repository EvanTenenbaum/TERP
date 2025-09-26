import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  await ensurePostingUnlocked()

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })

  const productId = String(body.productId || '')
  const sourceLotId = String(body.sourceLotId || '')
  const destLotId = String(body.destLotId || '')
  const qtyNum = Number(body.quantity)
  const reason = body.reason ? String(body.reason) : undefined
  const notes = body.notes ? String(body.notes) : undefined

  if (!productId || !sourceLotId || !destLotId) {
    return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 })
  }
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return NextResponse.json({ success: false, error: 'invalid_quantity' }, { status: 400 })
  }

  try {
    const userId = getCurrentUserId()

    const [src, dst] = await Promise.all([
      prisma.inventoryLot.findUnique({ where: { id: sourceLotId }, include: { batch: true } }),
      prisma.inventoryLot.findUnique({ where: { id: destLotId }, include: { batch: true } })
    ])

    if (!src || !dst) return NextResponse.json({ success: false, error: 'lot_not_found' }, { status: 404 })
    if (!src.batch || !dst.batch) return NextResponse.json({ success: false, error: 'batch_missing' }, { status: 500 })
    if (src.batch.productId !== productId || dst.batch.productId !== productId) {
      return NextResponse.json({ success: false, error: 'product_mismatch' }, { status: 400 })
    }

    const available = src.quantityAvailable - (src.reservedQty ?? 0)
    if (available < qtyNum) return NextResponse.json({ success: false, error: 'insufficient_on_hand' }, { status: 409 })

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.inventoryLot.findUnique({ where: { id: sourceLotId } })
      if (!fresh) throw new Error('lot_not_found')
      const effAvail = fresh.quantityAvailable - (fresh.reservedQty ?? 0)
      if (effAvail < qtyNum) throw new Error('insufficient_on_hand')

      const updatedSource = await tx.inventoryLot.update({
        where: { id: sourceLotId },
        data: { quantityAvailable: { decrement: qtyNum }, lastMovementDate: now }
      })

      const updatedDest = await tx.inventoryLot.update({
        where: { id: destLotId },
        data: { quantityAvailable: { increment: qtyNum }, lastMovementDate: now }
      })

      const transfer = await tx.inventoryTransfer.create({
        data: {
          createdBy: userId,
          productId,
          sourceLotId,
          destLotId,
          quantity: qtyNum,
          reason,
          notes,
        }
      })

      return { transfer, updatedSource, updatedDest }
    })

    return NextResponse.json({ success: true, transfer: result.transfer })
  } catch (e: any) {
    const code = e?.message === 'insufficient_on_hand' ? 'insufficient_on_hand' : e?.message === 'lot_not_found' ? 'lot_not_found' : 'server_error'
    const status = code === 'insufficient_on_hand' ? 409 : code === 'lot_not_found' ? 404 : 500
    return NextResponse.json({ success: false, error: code }, { status })
  }
}
