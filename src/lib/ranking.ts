import prisma from '@/lib/prisma'

export async function recomputeCustomerRanking(weights = { revenue: 0.5, margin: 0.3, ontime: 0.2 }) {
  const customers = await prisma.customer.findMany({ select: { id: true } })
  for (const c of customers) {
    const revenueAgg = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { customerId: c.id } })
    const marginAgg = await prisma.orderItem.aggregate({ _sum: { cogsTotalCents: true, unitPrice: true, quantity: true }, where: { order: { customerId: c.id } } as any })
    const revenue = Number(revenueAgg._sum.totalAmount || 0)
    const cogs = Number(marginAgg._sum.cogsTotalCents || 0)
    const margin = Math.max(0, revenue - cogs)
    const ontime = 0
    const normRevenue = Math.min(100, Math.floor((revenue / 10_000_00) * 100))
    const normMargin = Math.min(100, Math.floor((margin / 5_000_00) * 100))
    const normOnTime = Math.min(100, Math.floor((ontime / 100) * 100))
    const score = Math.floor(normRevenue * weights.revenue + normMargin * weights.margin + normOnTime * weights.ontime)
    await prisma.ranking.upsert({
      where: { entityType_entityId: { entityType: 'CUSTOMER', entityId: c.id } } as any,
      create: { entityType: 'CUSTOMER', entityId: c.id, score } as any,
      update: { score, computedAt: new Date() } as any,
    })
  }
}

export async function productSuggestionsForCustomer(customerId: string, limit = 10) {
  const cats = await prisma.$queryRaw<{ category: string; cnt: number }[]>`
    SELECT p."category" as category, COUNT(*) as cnt
    FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
    WHERE o."customerId" = ${customerId}
    GROUP BY p."category" ORDER BY cnt DESC LIMIT 3
  `
  const rows = await prisma.product.findMany({ where: { category: { in: cats.map(c => c.category) }, isActive: true }, take: limit, orderBy: { defaultPrice: 'asc' } })
  return rows.map(r => ({ productId: r.id, sku: r.sku, name: r.name }))
}
