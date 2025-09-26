import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { vendor: true, items: { include: { product: true } } } })
  if (!po) return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
  return NextResponse.json({ success: true, purchaseOrder: po })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:po-update`, 120, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  const body = await req.json()
  const { status, expectedAt } = body || {}
  const po = await prisma.purchaseOrder.update({ where: { id: params.id }, data: { status, expectedAt: expectedAt ? new Date(expectedAt) : undefined } })
  return NextResponse.json({ success: true, purchaseOrder: po })
}
