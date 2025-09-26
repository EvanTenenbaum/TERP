import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { ensurePostingUnlocked } from '@/lib/system'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { getEffectiveUnitPrice } from '@/lib/pricing'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'posting_locked' }, { status: 423 }) }
  try {
    const body = await req.json()
    const { productId, unitPrice, reason } = body || {}
    if (!productId || typeof unitPrice !== 'number') {
      return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
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

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('global override error', error)
    Sentry.captureException(error)
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 })
  }
}
