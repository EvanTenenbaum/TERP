import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.ENABLE_QA_CRONS !== 'true') {
    return NextResponse.json({ success: false, error: 'disabled' }, { status: 404 })
  }
  // Lightweight nightly: generate suggest events for all low-effective products at default threshold 10
  const lots = await prisma.inventoryLot.findMany({ include: { batch: { include: { product: true } } } })
  const byProduct: Record<string, { productId:string; effective:number }> = {}
  for (const l of lots) {
    const pid = l.batch.product.id
    if (!byProduct[pid]) byProduct[pid] = { productId: pid, effective: 0 }
    byProduct[pid].effective += Math.max(0, l.quantityAvailable - (l.reservedQty || 0))
  }
  const threshold = 10
  const low = Object.values(byProduct).filter(p => p.effective < threshold)
  if (low.length) {
    await prisma.eventLog.createMany({ data: low.map(p => ({ eventType: 'replenishment.nightly', data: { productId: p.productId, effective: p.effective, threshold } })) })
  }
  return NextResponse.json({ success:true, count: low.length })
}
