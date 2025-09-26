import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { getEffectiveUnitPrice } from '@/lib/pricing'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('posting_locked', 423) }
  try {
    const body = await req.json()
    const { productId, unitPrice, reason } = body || {}
    if (!productId || typeof unitPrice !== 'number') {
      return err('invalid_input', 400)
    }
    const now = new Date()

    let book = await prisma.priceBook.findFirst({ where: { type: 'GLOBAL', name: 'ADMIN_GLOBAL_OVERRIDE' } })
    if (!book) {
      book = await prisma.priceBook.create({ data: { name: 'ADMIN_GLOBAL_OVERRIDE', type: 'GLOBAL', effectiveDate: now, isActive: true } })
    } else if (!book.isActive) {
      await prisma.priceBook.update({ where: { id: book.id }, data: { isActive: true } })
    }

    const oldPrice = await getEffectiveUnitPrice(prisma as any, productId, {})

    const entry = await prisma.priceBookEntry.create({ data: { priceBookId: book.id, productId, unitPrice, effectiveDate: now } })

    await prisma.overrideAudit.create({ data: { userId: getCurrentUserId(), oldPrice, newPrice: unitPrice, reason: reason || 'GLOBAL_PRICE_OVERRIDE', overrideType: 'GLOBAL' } })

    return ok({ entry })
  } catch (error) {
    Sentry.captureException(error)
    return err('failed', 500)
  }
}
