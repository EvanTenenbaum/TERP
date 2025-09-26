import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ thresholdDefault?: number }>({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'],
  rate: { key: 'replenishment-preview', limit: 120 },
  parseJson: true,
})(async ({ json }) => {
  const thresholdDefault = Math.max(0, Math.round(Number(json?.thresholdDefault ?? 10)))

  const lots = await prisma.inventoryLot.findMany({ include: { batch: { include: { product: true } } } })
  const byProduct: Record<string, { productId:string; sku:string; name:string; onHand:number; reserved:number }> = {}
  for (const l of lots) {
    const pid = l.batch.product.id
    const key = pid
    if (!byProduct[key]) byProduct[key] = { productId: pid, sku: l.batch.product.sku, name: l.batch.product.name, onHand:0, reserved:0 }
    byProduct[key].onHand += l.quantityAvailable
    byProduct[key].reserved += l.reservedQty || 0
  }
  const items = Object.values(byProduct).map(p => {
    const effective = Math.max(0, p.onHand - p.reserved)
    const threshold = thresholdDefault
    const suggested = Math.max(0, threshold - effective)
    return { ...p, effective, threshold, suggested }
  }).filter(i => i.effective < i.threshold)

  return ok({ data: { items } })
})
