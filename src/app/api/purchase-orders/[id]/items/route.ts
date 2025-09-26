import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const body = await req.json()
  const { productId, quantity, unitCost } = body || {}
  if (!productId || !quantity || !unitCost) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
  const item = await prisma.purchaseOrderItem.create({ data: { poId: params.id, productId, quantity: Number(quantity), unitCost: Number(unitCost) }, include: { product: true } })
  return NextResponse.json({ success: true, item })
}
