import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'

export const POST = api<{ reportId:string; snapshotId?:string; title?:string; position?:any }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'widgets-add', limit: 60 } })(async ({ params, json }) => {
  const id = params?.id as string
  const w = await prisma.reportWidget.create({ data: { dashboardId: id, reportId: String(json!.reportId), snapshotId: json!.snapshotId ? String(json!.snapshotId) : null, title: json!.title ? String(json!.title).slice(0,128) : null, position: json!.position ?? {} } })
  return ok({ data: w })
})

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'widgets-list', limit: 60 } })(async ({ params }) => {
  const id = params?.id as string
  const data = await prisma.reportWidget.findMany({ where: { dashboardId: id } })
  return ok({ data })
})
