import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { presentation as presentationSchema, reportSpec as reportSpecSchema } from '@/lib/analytics/validation'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'analytics-report-get', limit: 60 } })(async ({ params }) => {
  const id = params?.id as string
  const report = await prisma.reportDefinition.findUnique({ where: { id } })
  if (!report) return err('not_found', 404)
  return ok({ data: report })
})

export const PATCH = api<{ name?:string; description?:string; spec?:any; presentation?:any; visibility?:'PRIVATE'|'SHARED'|'TEMPLATE' }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'analytics-report-update', limit: 30 } })(async ({ params, json }) => {
  const id = params?.id as string
  const data: any = {}
  if (json?.name) data.name = String(json.name).slice(0,128)
  if (json?.description !== undefined) data.description = json.description ? String(json.description).slice(0,512) : null
  if (json?.visibility) data.visibility = json.visibility
  if (json?.spec) { const p = reportSpecSchema.safeParse(json.spec); if (!p.success) return err('validation_error', 400, { issues: p.error.issues }); data.spec = p.data }
  if (json?.presentation) { const p = presentationSchema.safeParse(json.presentation); if (!p.success) return err('validation_error', 400, { issues: p.error.issues }); data.presentation = p.data }
  const report = await prisma.reportDefinition.update({ where: { id }, data })
  return ok({ data: report })
})

export const DELETE = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], rate: { key: 'analytics-report-delete', limit: 30 } })(async ({ params }) => {
  const id = params?.id as string
  await prisma.reportDefinition.delete({ where: { id } })
  return ok({})
})
