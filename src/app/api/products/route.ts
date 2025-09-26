import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function GET() {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true }, orderBy: { sku: 'asc' } })
  return NextResponse.json({ success: true, products })
}

export async function POST(request: Request) {
  try {
    try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
    const key = `${rateKeyFromRequest(request as any)}:products-create`
    const rl = rateLimit(key, 60, 60_000)
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })

    const body = await request.json()
    const sku = String(body.sku || '').trim()
    const name = String(body.name || '').trim()
    const category = String(body.category || '').trim()
    const unit = String(body.unit || '').trim() || 'each'
    const defaultPriceDollars = Number(body.defaultPrice)
    if (!sku || !name || !category) return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 })
    const defaultPrice = Math.round((Number.isFinite(defaultPriceDollars) ? defaultPriceDollars : 0) * 100)

    const product = await prisma.product.create({
      data: {
        sku: sku.slice(0,64),
        name: name.slice(0,128),
        category: category.slice(0,64),
        unit: unit.slice(0,32),
        defaultPrice,
        isActive: true
      }
    })
    return NextResponse.json({ success: true, product })
  } catch (e: any) {
    const msg = e?.code === 'P2002' ? 'duplicate_sku' : 'server_error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
