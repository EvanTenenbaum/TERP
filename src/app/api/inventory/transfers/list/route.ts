import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'],
})(async () => {
  const data = await prisma.inventoryTransfer.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return ok({ transfers: data })
})
