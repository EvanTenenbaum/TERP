"use server";
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

export async function getKpis() {
  try {
    const [ar, ap, orders] = await Promise.all([
      prisma.accountsReceivable.aggregate({ _sum: { balanceRemaining: true } }),
      prisma.accountsPayable.aggregate({ _sum: { balanceRemaining: true } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { _all: true }, where: { orderDate: { gte: new Date(Date.now() - 30*24*60*60*1000) } } }),
    ])

    const lots = await prisma.inventoryLot.findMany({ include: { batch: { include: { batchCosts: true } } } })
    const now = new Date()
    let inventoryValue = 0
    for (const lot of lots) {
      const costs = lot.batch.batchCosts
        .filter(c => c.effectiveFrom <= now)
        .sort((a,b)=> b.effectiveFrom.getTime()-a.effectiveFrom.getTime())
      const unit = costs[0]?.unitCost ?? 0
      inventoryValue += unit * lot.quantityOnHand
    }

    return {
      success: true,
      data: {
        arOutstanding: ar._sum.balanceRemaining || 0,
        apOutstanding: ap._sum.balanceRemaining || 0,
        salesLast30: orders._sum.totalAmount || 0,
        ordersLast30: orders._count._all || 0,
        inventoryValue,
      }
    }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, data: { arOutstanding: 0, apOutstanding: 0, salesLast30: 0, ordersLast30: 0, inventoryValue: 0 } }
  }
}
