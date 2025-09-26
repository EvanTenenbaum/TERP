import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function GET() {
  const pos = await prisma.purchaseOrder.findMany({ include: { vendor: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, purchaseOrders: pos })
}

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:po-create`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  const body = await req.json()
  const { vendorId, expectedAt, poNumber } = body || {}
  if (!vendorId) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
  const count = await prisma.purchaseOrder.count()
  const defaultPo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4,'0')}`
  const po = await prisma.purchaseOrder.create({ data: { vendorId, poNumber: poNumber || defaultPo, expectedAt: expectedAt ? new Date(expectedAt) : null } })
  return NextResponse.json({ success: true, purchaseOrder: po })
}
