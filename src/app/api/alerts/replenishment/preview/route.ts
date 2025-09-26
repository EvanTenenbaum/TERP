import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const body = await req.json().catch(()=>({}))
  const thresholdDefault = Number(body.thresholdDefault || 10)

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

  return NextResponse.json({ success:true, data: { items } })
}
