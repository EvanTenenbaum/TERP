import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { getEffectiveUnitPrice } from '@/lib/pricing'
import { ensurePostingUnlocked } from '@/lib/system'
import { getCurrentRole, getCurrentUserId, requireRole } from '@/lib/auth'

export interface ApplyGlobalOverrideInput {
  productId: string
  unitPrice: number // cents
  reason: string
}

export async function applyGlobalPriceOverride(input: ApplyGlobalOverrideInput) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const now = new Date()
    // Find or create a dedicated global override price book
    let book = await prisma.priceBook.findFirst({ where: { type: 'GLOBAL', name: 'ADMIN_GLOBAL_OVERRIDE' } })
    if (!book) {
      book = await prisma.priceBook.create({ data: { name: 'ADMIN_GLOBAL_OVERRIDE', type: 'GLOBAL', effectiveDate: now, isActive: true } })
    } else if (!book.isActive) {
      await prisma.priceBook.update({ where: { id: book.id }, data: { isActive: true } })
    }

    // Determine current effective price for audit oldPrice
    const oldPrice = await getEffectiveUnitPrice(prisma as any, input.productId, {})

    const entry = await prisma.priceBookEntry.create({
      data: { priceBookId: book.id, productId: input.productId, unitPrice: input.unitPrice, effectiveDate: now },
      include: { product: true },
    })

    // Audit
    const userId = getCurrentUserId()
    await prisma.overrideAudit.create({
      data: {
        userId,
        oldPrice,
        newPrice: input.unitPrice,
        reason: input.reason || 'GLOBAL_PRICE_OVERRIDE',
        overrideType: 'GLOBAL',
      },
    })

    revalidatePath('/price-books')
    return { success: true, entry }
  } catch (error) {
    console.error('applyGlobalPriceOverride error', error)
    Sentry.captureException(error)
    return { success: false, error: 'failed' }
  }
}

export interface UpdateQuoteItemPriceInput {
  quoteItemId: string
  newUnitPrice: number // cents
  reason: string
  adminFreeform?: boolean
}

export async function updateQuoteItemPrice(input: UpdateQuoteItemPriceInput) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const item = await prisma.salesQuoteItem.findUnique({
      where: { id: input.quoteItemId },
      include: { quote: true, product: true },
    })
    if (!item) return { success: false, error: 'not_found' }

    const newLineTotal = input.newUnitPrice * item.quantity

    // Update item and quote totals in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.salesQuoteItem.update({
        where: { id: item.id },
        data: { unitPrice: input.newUnitPrice, lineTotal: newLineTotal },
      })

      const totals = await tx.salesQuoteItem.aggregate({
        where: { quoteId: item.quoteId },
        _sum: { lineTotal: true },
      })
      const totalAmount = totals._sum.lineTotal || 0
      const updatedQuote = await tx.salesQuote.update({ where: { id: item.quoteId }, data: { totalAmount } })
      return { updatedItem, updatedQuote }
    })

    // Determine effective price for audit baseline
    const eff = await getEffectiveUnitPrice(prisma as any, item.productId, { customerId: item.quote.customerId })
    const role = getCurrentRole()
    const overrideType = input.adminFreeform && role === 'SUPER_ADMIN' ? 'ADMIN_FREEFORM' : 'LINE'
    const userId = getCurrentUserId()
    await prisma.overrideAudit.create({
      data: {
        userId,
        quoteId: item.quoteId,
        lineItemId: item.id,
        oldPrice: eff,
        newPrice: input.newUnitPrice,
        reason: input.reason || (overrideType === 'ADMIN_FREEFORM' ? 'ADMIN_FREEFORM' : 'LINE_PRICE_OVERRIDE'),
        overrideType,
      },
    })

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${item.quoteId}`)
    return { success: true, item: result.updatedItem }
  } catch (error) {
    console.error('updateQuoteItemPrice error', error)
    Sentry.captureException(error)
    return { success: false, error: 'failed' }
  }
}
