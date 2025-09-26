import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || ''
  const customerId = searchParams.get('customerId') || undefined
  const role = searchParams.get('role') || undefined
  if (!productId) return NextResponse.json({ success:false, error:'missing_productId' }, { status:400 })

  // Fetch active books by precedence
  const books = await prisma.priceBook.findMany({ where: { isActive: true }, select: { id:true, type:true, customerId:true, roleId:true } })
  const entries = await prisma.priceBookEntry.findMany({ where: { productId }, orderBy: { effectiveDate:'desc' } })

  function pick(source: 'CUSTOMER'|'ROLE'|'GLOBAL'): { price?: number } {
    const eligibleBooks = books.filter(b => b.type === (source as any) && (source!=='CUSTOMER' || b.customerId===customerId) && (source!=='ROLE' || (role && b.roleId===role)))
    const ids = new Set(eligibleBooks.map(b=>b.id))
    const e = entries.find(en => ids.has(en.priceBookId))
    return e ? { price: en.unitPrice } : {}
  }

  const customer = customerId ? pick('CUSTOMER') : {}
  const rolePick = role ? pick('ROLE') : {}
  const global = pick('GLOBAL')

  const chosen = customer.price != null ? { unitPriceCents: customer.price, source:'CUSTOMER' } : rolePick.price != null ? { unitPriceCents: rolePick.price, source:'ROLE' } : global.price != null ? { unitPriceCents: global.price, source:'GLOBAL' } : null

  return NextResponse.json({ success:true, data: chosen })
}
