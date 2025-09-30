import type { PrismaClient } from '@prisma/client'

// Get effective unit price given product and optional customer
export async function getEffectiveUnitPrice(
  db: Pick<PrismaClient, any> | any,
  productId: string,
  opts?: { customerId?: string; roleId?: string }
): Promise<number> {
  const now = new Date()

  if (opts?.customerId) {
    const customerPrice = await db.priceBookEntry.findFirst({
      where: {
        productId,
        priceBook: {
          type: 'CUSTOMER',
          customerId: opts.customerId,
          isActive: true,
          effectiveDate: { lte: now },
        },
        effectiveDate: { lte: now },
      },
      orderBy: { effectiveDate: 'desc' },
    })
    if (customerPrice) return customerPrice.unitPrice
  }

  // Role price (if provided)
  if (opts?.roleId) {
    const rolePrice = await db.priceBookEntry.findFirst({
      where: {
        productId,
        priceBook: {
          type: 'ROLE',
          roleId: opts.roleId,
          isActive: true,
          effectiveDate: { lte: now },
        },
        effectiveDate: { lte: now },
      },
      orderBy: { effectiveDate: 'desc' },
    })
    if (rolePrice) return rolePrice.unitPrice
  }

  const globalPrice = await db.priceBookEntry.findFirst({
    where: {
      productId,
      priceBook: { type: 'GLOBAL', isActive: true, effectiveDate: { lte: now } },
      effectiveDate: { lte: now },
    },
    orderBy: { effectiveDate: 'desc' },
  })
  const base = globalPrice ? globalPrice.unitPrice : (await db.product.findUnique({ where: { id: productId }, select: { defaultPrice: true, category: true } }))
  if (!base || typeof (base as any).defaultPrice === 'undefined') throw new Error('product_not_found')

  // Apply discount rules (product/category/customer)
  const { applicableDiscounts, applyDiscounts } = await import('@/lib/discounts')
  const rules = await applicableDiscounts({ productId, category: (base as any).category, customerId: opts?.customerId })
  return applyDiscounts((globalPrice ? base as any : (base as any).defaultPrice) as number, rules)
}
