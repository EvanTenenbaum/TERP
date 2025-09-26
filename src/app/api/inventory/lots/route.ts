import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || ''
  if (!productId) return NextResponse.json({ success: false, error: 'missing_productId' }, { status: 400 })

  const lots = await prisma.inventoryLot.findMany({
    where: { batch: { productId } },
    select: { id: true, quantityAvailable: true, reservedQty: true },
    orderBy: { id: 'asc' }
  })
  const mapped = lots.map(l => ({ id: l.id, quantityAvailable: Math.max(0, (l.quantityAvailable - (l.reservedQty ?? 0))) }))
  return NextResponse.json({ success: true, lots: mapped })
}
