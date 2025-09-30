import * as Sentry from '@sentry/nextjs'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { getEffectiveUnitPrice } from '@/lib/pricing'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ overrideCreditLimit?: boolean }>({
  roles: ['SUPER_ADMIN','SALES'],
  postingLock: true,
  rate: { key: 'quotes-convert', limit: 60 },
  parseJson: true,
  onError: (error) => {
    const msg = error?.message
    if (msg === 'insufficient_stock') return { code: 'Insufficient stock to allocate', status: 400 }
    if (msg === 'credit_limit_exceeded') return { code: 'Credit limit exceeded; admin override required', status: 400 }
    return undefined
  }
})(async ({ json, params }) => {
  const overrideCreditLimit = !!json?.overrideCreditLimit
  const quote = await prisma.salesQuote.findUnique({ where: { id: params!.id }, include: { customer: true, quoteItems: { include: { product: true } } } })
  if (!quote) return err('not_found', 404)
  if (quote.status !== 'ACCEPTED') return err('not_accepted', 400)

  const result = await prisma.$transaction(async (tx) => {
    const orderCount = await tx.order.count();
    const orderNumber = `ORD${String(orderCount + 1).padStart(6, '0')}`;
    const allocationDate = new Date();
    let computedTotal = 0;
    const itemsToCreate: any[] = [];

    for (const qi of quote.quoteItems) {
      const unitPrice = await getEffectiveUnitPrice(tx as any, qi.productId, { customerId: quote.customerId });
      const qty = qi.quantity;
      const { allocateFIFOByProduct } = await import('@/lib/inventoryAllocator')
      const allocations = await allocateFIFOByProduct(tx as any, qi.productId, qty)
      for (const alloc of allocations) {
        const { getActiveBatchCostDb } = await import('@/lib/cogs')
        const activeCost = await getActiveBatchCostDb(tx as any, alloc.batchId, allocationDate)
        const cogsUnitCents = activeCost?.unitCost ?? null
        const cogsTotalCents = cogsUnitCents != null ? cogsUnitCents * alloc.qty : null
        itemsToCreate.push({ productId: qi.productId, batchId: alloc.batchId, quantity: alloc.qty, unitPrice, allocationDate, cogsUnitCents: cogsUnitCents ?? undefined, cogsTotalCents: cogsTotalCents ?? undefined })
        computedTotal += unitPrice * alloc.qty
      }
    }

    const order = await tx.order.create({ data: { customerId: quote.customerId, orderDate: new Date(), allocationDate, totalAmount: computedTotal, status: 'ALLOCATED', orderItems: { create: itemsToCreate } }, include: { customer: true, orderItems: { include: { product: true, batch: { include: { vendor: true } } } } } })

    const consignByVendor = new Map<string, number>()
    for (const it of order.orderItems) {
      if (it.batch && (it.batch as any).isConsignment && it.cogsTotalCents) {
        consignByVendor.set(it.batch.vendorId, (consignByVendor.get(it.batch.vendorId) || 0) + (it.cogsTotalCents || 0))
      }
    }
    for (const [vendorId, amount] of consignByVendor) {
      const apCount = await tx.accountsPayable.count({})
      const apNumber = `CONS-${new Date().getFullYear()}-${String(apCount + 1).padStart(4, '0')}`
      const now = new Date()
      await tx.accountsPayable.create({ data: { vendorId, invoiceNumber: apNumber, invoiceDate: now, dueDate: now, terms: 'Consignment', amount, balanceRemaining: amount } })
    }

    const cust = await tx.customer.findUnique({ where: { id: quote.customerId } })
    if (cust?.creditLimit && cust.creditLimit > 0) {
      const openAR = await tx.accountsReceivable.aggregate({ _sum: { balanceRemaining: true }, where: { customerId: quote.customerId, balanceRemaining: { gt: 0 } } })
      const projected = (openAR._sum.balanceRemaining || 0) + computedTotal
      if (projected > cust.creditLimit) {
        if (!overrideCreditLimit) throw new Error('credit_limit_exceeded')
        await tx.overrideAudit.create({ data: { userId: getCurrentUserId(), quoteId: quote.id, oldPrice: cust.creditLimit, newPrice: projected, reason: 'CREDIT_LIMIT_OVERRIDE', overrideType: 'ADMIN_FREEFORM' } })
      }
    }

    const arCount = await tx.accountsReceivable.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(arCount + 1).padStart(4, '0')}`;
    const invoiceDate = new Date();
    const terms = cust?.paymentTerms || 'Net 30';
    const daysMatch = /Net\s+(\d+)/i.exec(terms);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 30;
    const dueDate = new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);
    await tx.accountsReceivable.create({ data: { customerId: order.customerId, orderId: order.id, invoiceNumber, invoiceDate, dueDate, terms, amount: order.totalAmount, balanceRemaining: order.totalAmount } });

    return order
  })

  return ok({ order: result })
})
