import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'] })(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const vendorId = searchParams.get('vendorId') || undefined
  const data = await prisma.vendorRebate.findMany({ where: vendorId ? { vendorId } : undefined, orderBy: { createdAt: 'desc' }, take: 100 })
  return ok({ rebates: data })
})
