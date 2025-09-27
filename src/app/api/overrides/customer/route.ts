import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { getCurrentUserId } from '@/lib/auth'
import { ok, err } from '@/lib/http'
import { validateOverrideInput } from '@/lib/validation/pricing'

export const POST = api<{ productId:string; customerId:string; unitPrice:number; reason:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'override-customer', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  try {
    const productId = String(json!.productId||'')
    const customerId = String(json!.customerId||'')
    const unitPrice = Math.round(Number(json!.unitPrice))
    const reason = String(json!.reason||'').slice(0,256)
    if (!productId || !customerId) {
      return err('invalid_input', 400)
    }
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } })
    if (!product || !customer) return err('invalid_reference', 400)
    const valid = validateOverrideInput(unitPrice, reason)
    if (!valid.ok) return err(valid.error, 400)

    const now = new Date()
    const userId = getCurrentUserId()

    const out = await prisma.$transaction(async (tx)=>{
      let book = await tx.priceBook.findFirst({ where: { type: 'CUSTOMER', customerId, isActive: true } })
      if (!book) {
        book = await tx.priceBook.create({ data: { name: `CUSTOMER_${customerId}_OVERRIDES`, type: 'CUSTOMER', customerId, effectiveDate: now, isActive: true } })
      }
      const entry = await tx.priceBookEntry.create({ data: { priceBookId: book.id, productId, unitPrice: Math.round(Number(unitPrice)), effectiveDate: now } })
      await tx.overrideAudit.create({ data: { userId, quoteId: null, oldPrice: 0, newPrice: unitPrice, reason, overrideType: 'CUSTOMER' } })
      return { book, entry }
    })

    return ok({ override: { priceBookId: out.book.id, entryId: out.entry.id } })
  } catch (e) {
    Sentry.captureException(e)
    return err('server_error', 500)
  }
})
