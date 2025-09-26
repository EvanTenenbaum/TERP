import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { getCurrentRole, getCurrentUserId, requireRole } from '@/lib/auth'
import { getEffectiveUnitPrice } from '@/lib/pricing'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return NextResponse.json({ success: false, error: 'posting_locked' }, { status: 423 }) }
  try {
    const body = await req.json()
    const { newUnitPrice, reason, adminFreeform } = body || {}
    const id = params.id
    if (!id || typeof newUnitPrice !== 'number') return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })

    const item = await prisma.salesQuoteItem.findUnique({ where: { id }, include: { quote: true } })
    if (!item) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })

    const newLineTotal = newUnitPrice * item.quantity

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.salesQuoteItem.update({ where: { id }, data: { unitPrice: newUnitPrice, lineTotal: newLineTotal } })
      const totals = await tx.salesQuoteItem.aggregate({ where: { quoteId: item.quoteId }, _sum: { lineTotal: true } })
      const totalAmount = totals._sum.lineTotal || 0
      await tx.salesQuote.update({ where: { id: item.quoteId }, data: { totalAmount } })
      return updatedItem
    })

    const eff = await getEffectiveUnitPrice(prisma as any, item.productId, { customerId: item.quote.customerId })
    const role = getCurrentRole()
    const overrideType = adminFreeform && role === 'SUPER_ADMIN' ? 'ADMIN_FREEFORM' : 'LINE'
    await prisma.overrideAudit.create({ data: { userId: getCurrentUserId(), quoteId: item.quoteId, lineItemId: item.id, oldPrice: eff, newPrice: newUnitPrice, reason: reason || (overrideType === 'ADMIN_FREEFORM' ? 'ADMIN_FREEFORM' : 'LINE_PRICE_OVERRIDE'), overrideType } })

    return NextResponse.json({ success: true, item: result })
  } catch (error) {
    console.error('update quote item price error', error)
    Sentry.captureException(error)
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 })
  }
}
