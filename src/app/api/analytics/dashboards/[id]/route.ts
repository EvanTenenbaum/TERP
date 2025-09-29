import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'dashboard-get', limit: 60 } })(async ({ params }) => {
  const id = params?.id as string
  const d = await prisma.dashboard.findUnique({ where: { id }, include: { widgets: true } })
  if (!d) return err('not_found', 404)
  return ok({ data: d })
})

export const PATCH = api<{ name?:string; description?:string; layout?:any; visibility?:'PRIVATE'|'SHARED'|'ORG_DEFAULT' }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'dashboard-update', limit: 30 } })(async ({ params, json }) => {
  const id = params?.id as string
  const data: any = {}
  if (json?.name) data.name = String(json.name).slice(0,128)
  if (json?.description !== undefined) data.description = json.description ? String(json.description).slice(0,512) : null
  if (json?.layout !== undefined) data.layout = json.layout
  if (json?.visibility) data.visibility = json.visibility as any
  const d = await prisma.dashboard.update({ where: { id }, data })
  return ok({ data: d })
})

export const DELETE = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], rate: { key: 'dashboard-delete', limit: 30 } })(async ({ params }) => {
  const id = params?.id as string
  await prisma.dashboard.delete({ where: { id } })
  return ok({})
})
