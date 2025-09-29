import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'snapshot-get', limit: 60 } })(async ({ params }) => {
  const id = params?.id as string
  const snap = await prisma.reportSnapshot.findUnique({ where: { id } })
  if (!snap) return err('not_found', 404)
  return ok({ data: snap })
})
