import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true, defaultPrice: true },
    orderBy: { sku: 'asc' },
  })
  return ok({ products })
})
