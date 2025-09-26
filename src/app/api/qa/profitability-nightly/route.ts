import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { ok, err } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const GET = api({})(async () => {
  if (process.env.ENABLE_QA_CRONS !== 'true') {
    return err('disabled', 404)
  }
  try {
    const since = new Date(Date.now() - 24*3600*1000)
    const orders = await prisma.order.findMany({
      where: { orderDate: { gte: since } },
      include: { orderItems: true }
    })
    let revenue = 0, cogs = 0
    for (const o of orders) {
      for (const it of o.orderItems) {
        revenue += it.unitPrice * it.quantity
        cogs += (it.cogsTotalCents || 0)
      }
    }
    await prisma.profitabilityLedger.create({ data: { revenue, cogs, margin: Math.max(0, revenue - cogs) } })
    return ok({ ok: true, revenue, cogs })
  } catch (e) {
    Sentry.captureException(e)
    return err('profitability_failed', 500)
  }
})
