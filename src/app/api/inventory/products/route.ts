import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true, defaultPrice: true },
    orderBy: { sku: 'asc' },
  })
  const products = rows.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    priceCents: p.defaultPrice,
    price: Number((p.defaultPrice / 100).toFixed(2)),
  }))
  return ok({ products })
})
