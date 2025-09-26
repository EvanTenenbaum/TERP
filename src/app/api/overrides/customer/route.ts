import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'posting_locked' }, { status: 423 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req as any)}:override-customer`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })

  try {
    const body = await req.json().catch(()=>null) as any
    if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status:400 })
    const productId = String(body.productId||'')
    const customerId = String(body.customerId||'')
    const unitPrice = Math.round(Number(body.unitPrice))
    const reason = String(body.reason||'').slice(0,256)
    if (!productId || !customerId || !Number.isFinite(unitPrice) || unitPrice <= 0 || !reason) {
      return NextResponse.json({ success:false, error:'invalid_input' }, { status:400 })
    }

    const now = new Date()
    const userId = getCurrentUserId()

    const out = await prisma.$transaction(async (tx)=>{
      let book = await tx.priceBook.findFirst({ where: { type: 'CUSTOMER', customerId, isActive: true } })
      if (!book) {
        book = await tx.priceBook.create({ data: { name: `CUSTOMER_${customerId}_OVERRIDES`, type: 'CUSTOMER', customerId, effectiveDate: now, isActive: true } })
      }
      const entry = await tx.priceBookEntry.create({ data: { priceBookId: book.id, productId, unitPrice, effectiveDate: now } })
      await tx.overrideAudit.create({ data: { userId, quoteId: null, oldPrice: 0, newPrice: unitPrice, reason, overrideType: 'CUSTOMER' } })
      return { book, entry }
    })

    return NextResponse.json({ success:true, override: { priceBookId: out.book.id, entryId: out.entry.id } })
  } catch (e) {
    Sentry.captureException(e)
    return NextResponse.json({ success:false, error:'server_error' }, { status:500 })
  }
}
