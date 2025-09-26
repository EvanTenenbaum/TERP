import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  await ensurePostingUnlocked()

  const rl = rateLimit(`${rateKeyFromRequest(req)}:inventory-transfer`, 120, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)

  const body = await req.json().catch(() => null)
  if (!body) return err('bad_json', 400)

  const productId = String(body.productId || '')
  const sourceLotId = String(body.sourceLotId || '')
  const destLotId = String(body.destLotId || '')
  const qtyNum = Number(body.quantity)
  const reason = body.reason ? String(body.reason) : undefined
  const notes = body.notes ? String(body.notes) : undefined

  if (!productId || !sourceLotId || !destLotId) {
    return err('missing_fields', 400)
  }
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return err('invalid_quantity', 400)
  }

  try {
    const userId = getCurrentUserId()

    const [src, dst] = await Promise.all([
      prisma.inventoryLot.findUnique({ where: { id: sourceLotId }, include: { batch: true } }),
      prisma.inventoryLot.findUnique({ where: { id: destLotId }, include: { batch: true } })
    ])

    if (!src || !dst) return err('lot_not_found', 404)
    if (!src.batch || !dst.batch) return err('batch_missing', 500)
    if (src.batch.productId !== productId || dst.batch.productId !== productId) {
      return err('product_mismatch', 400)
    }

    const available = src.quantityAvailable - (src.reservedQty ?? 0)
    if (available < qtyNum) return err('insufficient_on_hand', 409)

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

    return ok({ transfer: result.transfer })
  } catch (e: any) {
    const code = e?.message === 'insufficient_on_hand' ? 'insufficient_on_hand' : e?.message === 'lot_not_found' ? 'lot_not_found' : 'server_error'
    const status = code === 'insufficient_on_hand' ? 409 : code === 'lot_not_found' ? 404 : 500
    return err(code, status)
  }
}
