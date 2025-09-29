import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'dashboards-list', limit: 60 } })(async () => {
  const userId = getCurrentUserId()
  const data = await prisma.dashboard.findMany({ where: { OR: [ { ownerUserId: userId }, { visibility: { in: ['SHARED','ORG_DEFAULT'] as any } } ] }, orderBy: { updatedAt: 'desc' } })
  return ok({ data })
})

export const POST = api<{ name:string; description?:string; layout?:any; visibility?:'PRIVATE'|'SHARED'|'ORG_DEFAULT' }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'dashboards-create', limit: 30 } })(async ({ json }) => {
  if (!json) return err('bad_json', 400)
  const userId = getCurrentUserId()
  const d = await prisma.dashboard.create({ data: { ownerUserId: userId, name: String(json.name).slice(0,128), description: json.description ? String(json.description).slice(0,512) : null, layout: json.layout ?? {}, visibility: (json.visibility ?? 'PRIVATE') as any } })
  return ok({ data: d })
})
