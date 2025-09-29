import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import prisma from '@/lib/prisma'

export const PATCH = api<{ title?:string; position?:any }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'widget-update', limit: 60 } })(async ({ params, json }) => {
  const { widgetId } = params as any
  const data: any = {}
  if (json?.title !== undefined) data.title = json.title ? String(json.title).slice(0,128) : null
  if (json?.position !== undefined) data.position = json.position
  const w = await prisma.reportWidget.update({ where: { id: widgetId }, data })
  return ok({ data: w })
})

export const DELETE = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], rate: { key: 'widget-delete', limit: 60 } })(async ({ params }) => {
  const { widgetId } = params as any
  await prisma.reportWidget.delete({ where: { id: widgetId } })
  return ok({})
})
