import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'] })(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId') || undefined
  const credits = await prisma.customerCredit.findMany({ where: customerId ? { customerId } : undefined, orderBy: { updatedAt: 'desc' }, take: 100 })
  return ok({ data: credits })
})
