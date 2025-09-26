import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'] })(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId') || ''
  const customerId = searchParams.get('customerId') || undefined
  const role = searchParams.get('role') || undefined
  if (!productId) return err('missing_productId', 400)

  const books = await prisma.priceBook.findMany({ where: { isActive: true }, select: { id:true, type:true, customerId:true, roleId:true } })
  const entries = await prisma.priceBookEntry.findMany({ where: { productId }, orderBy: { effectiveDate:'desc' } })

  function pick(source: 'CUSTOMER'|'ROLE'|'GLOBAL'): { price?: number } {
    const eligibleBooks = books.filter(b => b.type === (source as any) && (source!=='CUSTOMER' || b.customerId===customerId) && (source!=='ROLE' || (role && b.roleId===role)))
    const ids = new Set(eligibleBooks.map(b=>b.id))
    const e = entries.find(en => ids.has(en.priceBookId))
    return e ? { price: e.unitPrice } : {}
  }

  const customer = customerId ? pick('CUSTOMER') : {}
  const rolePick = role ? pick('ROLE') : {}
  const global = pick('GLOBAL')
  const chosen = customer.price != null ? { unitPriceCents: customer.price, source:'CUSTOMER' } : rolePick.price != null ? { unitPriceCents: rolePick.price, source:'ROLE' } : global.price != null ? { unitPriceCents: global.price, source:'GLOBAL' } : null
  return ok({ data: chosen })
})
