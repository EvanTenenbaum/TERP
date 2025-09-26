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
  if (globalPrice) return globalPrice.unitPrice

  const product = await db.product.findUnique({ where: { id: productId }, select: { defaultPrice: true } })
  if (!product) throw new Error('product_not_found')
  return product.defaultPrice
}
