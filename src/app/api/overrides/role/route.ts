import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('posting_locked', 423) }
  const rl = rateLimit(`${rateKeyFromRequest(req as any)}:override-role`, 60, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)

  try {
    const body = await req.json().catch(()=>null) as any
    if (!body) return err('bad_json', 400)
    const productId = String(body.productId||'')
    const roleId = String(body.roleId||'')
    const unitPrice = Math.round(Number(body.unitPrice))
    const reason = String(body.reason||'').slice(0,256)
    if (!productId || !roleId || !Number.isFinite(unitPrice) || unitPrice <= 0 || !reason) {
      return err('invalid_input', 400)
    }

    const now = new Date()
    const userId = getCurrentUserId()

    const out = await prisma.$transaction(async (tx)=>{
      let book = await tx.priceBook.findFirst({ where: { type: 'ROLE', roleId, isActive: true } })
      if (!book) {
        book = await tx.priceBook.create({ data: { name: `ROLE_${roleId}_OVERRIDES`, type: 'ROLE', roleId, effectiveDate: now, isActive: true } })
      }
      const entry = await tx.priceBookEntry.create({ data: { priceBookId: book.id, productId, unitPrice, effectiveDate: now } })
      await tx.overrideAudit.create({ data: { userId, quoteId: null, oldPrice: 0, newPrice: unitPrice, reason, overrideType: 'ROLE' } })
      return { book, entry }
    })

    return ok({ override: { priceBookId: out.book.id, entryId: out.entry.id } })
  } catch (e) {
    Sentry.captureException(e)
    return err('server_error', 500)
  }
}
