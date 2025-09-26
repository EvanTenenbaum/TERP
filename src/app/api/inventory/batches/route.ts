import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ensurePostingUnlocked } from '@/lib/system'
import { ok, err } from '@/lib/http'

export async function POST(request: Request) {
  try {
    try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
    try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('posting_locked', 423) }
    const key = `${rateKeyFromRequest(request as any)}:batches-create`
    const rl = rateLimit(key, 60, 60_000)
    if (!rl.allowed) return err('rate_limited', 429)
    const body = await request.json()
    const productId = String(body.productId || '')
    const vendorId = String(body.vendorId || '')
    const lotNumber = String(body.lotNumber || body.batchNumber || '').trim()
    const receivedDate = new Date(body.receivedDate || Date.now())
    const expirationDate = body.expirationDate ? new Date(body.expirationDate) : null
    const quantityReceived = Math.round(Number(body.quantityReceived ?? body.quantity))
    const initialCostDollars = Number(body.initialCost)

    if (!productId || !vendorId || !lotNumber || !Number.isFinite(quantityReceived) || quantityReceived <= 0) {
      return err('invalid_input', 400)
    }

    const initialUnitCost = Math.round((Number.isFinite(initialCostDollars) ? initialCostDollars : 0) * 100)

    const batch = await prisma.batch.create({
      data: {
        productId,
        vendorId,
        lotNumber: lotNumber.slice(0,64),
        receivedDate,
        expirationDate: expirationDate ?? undefined,
        quantityReceived,
        quantityAvailable: quantityReceived,
        batchCosts: {
          create: {
            effectiveFrom: receivedDate,
            unitCost: initialUnitCost
          }
        }
      },
      include: { product: true, vendor: true, batchCosts: true }
    })

    return ok({ batch })
  } catch (e) {
    return err('server_error', 500)
  }
}
