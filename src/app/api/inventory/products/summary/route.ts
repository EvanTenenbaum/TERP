import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET() {
  try {
    try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, sku: true, name: true, category: true, defaultPrice: true,
        batches: {
          select: {
            id: true,
            receivedDate: true,
            inventoryLot: { select: { quantityOnHand: true, quantityAllocated: true, quantityAvailable: true, reservedQty: true } }
          }
        }
      },
      orderBy: { sku: 'asc' }
    })

    const rows = products.map(p => {
      let onHand = 0
      let allocated = 0
      let available = 0
      let latestIntake: Date | null = null
      let oldestIntake: Date | null = null
      const intakeGroups: Record<string, { date: string; onHand: number; allocated: number; available: number; batchCount: number }> = {}

      for (const b of p.batches) {
        const lot = b.inventoryLot
        const qOnHand = lot?.quantityOnHand ?? 0
        const qAlloc = lot?.quantityAllocated ?? 0
        const qAvail = Math.max(0, (lot?.quantityAvailable ?? 0) - (lot?.reservedQty ?? 0))
        onHand += qOnHand
        allocated += qAlloc
        available += qAvail
        const d = b.receivedDate
        if (d) {
          latestIntake = !latestIntake || d > latestIntake ? d : latestIntake
          oldestIntake = !oldestIntake || d < oldestIntake ? d : oldestIntake
          const key = toISODate(d)
          const g = intakeGroups[key] || { date: key, onHand: 0, allocated: 0, available: 0, batchCount: 0 }
          g.onHand += qOnHand
          g.allocated += qAlloc
          g.available += qAvail
          g.batchCount += 1
          intakeGroups[key] = g
        }
      }

      const groups = Object.values(intakeGroups).sort((a,b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        defaultPrice: p.defaultPrice,
        totals: { onHand, allocated, available },
        intake: {
          latest: latestIntake ? latestIntake.toISOString() : null,
          oldest: oldestIntake ? oldestIntake.toISOString() : null,
          groups
        }
      }
    })

    return NextResponse.json({ success: true, data: rows })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
