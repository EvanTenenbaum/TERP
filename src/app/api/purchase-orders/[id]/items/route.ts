import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:po-add-item`, 240, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  const body = await req.json()
  const { productId, quantity, unitCost } = body || {}
  if (!productId || !quantity || !unitCost) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
  const item = await prisma.purchaseOrderItem.create({ data: { poId: params.id, productId, quantity: Number(quantity), unitCost: Number(unitCost) }, include: { product: true } })
  return NextResponse.json({ success: true, item })
}
