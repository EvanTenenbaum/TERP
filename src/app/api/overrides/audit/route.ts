import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING'] })(async () => {
  try {
    const rows = await prisma.overrideAudit.findMany({ orderBy: { timestamp: 'desc' }, take: 100 })
    return ok({ audits: rows })
  } catch (e) {
    return err('failed', 500)
  }
})
