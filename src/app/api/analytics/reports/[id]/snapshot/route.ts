import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'

export const POST = api<{ data:any }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'report-snapshot', limit: 30 } })(async ({ params, json }) => {
  const id = params?.id as string
  const rep = await prisma.reportDefinition.findUnique({ where: { id } })
  if (!rep) return err('not_found', 404)
  const snap = await prisma.reportSnapshot.create({ data: { reportId: id, spec: rep.spec as any, presentation: rep.presentation as any, data: json?.data ?? {}, takenByUserId: getCurrentUserId() } })
  return ok({ data: snap })
})
