import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ensurePostingUnlocked } from '@/lib/system'
import { getCurrentRole, getCurrentUserId } from '@/lib/auth'
import { getEffectiveUnitPrice } from '@/lib/pricing'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const PUT = api<{ newUnitPrice:number; reason?:string; adminFreeform?:boolean }>({
  roles: ['SUPER_ADMIN','SALES'],
  postingLock: true,
  rate: { key: 'quote-item-price', limit: 120 },
  parseJson: true,
})(async ({ json, params }) => {
  try {
    const { newUnitPrice, reason, adminFreeform } = json || ({} as any)
    const id = params!.id
    if (!id || typeof newUnitPrice !== 'number') return err('invalid_input', 400)

    const item = await prisma.salesQuoteItem.findUnique({ where: { id }, include: { quote: true } })
    if (!item) return err('not_found', 404)

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

    return ok({ item: result })
  } catch (error) {
    Sentry.captureException(error)
    return err('failed', 500)
  }
})
