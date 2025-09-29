import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'
import { presentation as presentationSchema, reportSpec as reportSpecSchema } from '@/lib/analytics/validation'
import { getCurrentUserId } from '@/lib/auth'

export const GET = api({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], rate: { key: 'analytics-reports-list', limit: 60 } })(async ({ req }) => {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  const where: any = q ? { OR: [ { name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } } ] } : {}
  const userId = getCurrentUserId()
  const reports = await prisma.reportDefinition.findMany({ where: { OR: [ { ownerUserId: userId }, { visibility: { in: ['SHARED','TEMPLATE'] as any } } ], ...where }, orderBy: { updatedAt: 'desc' }, take: 200 })
  return ok({ data: reports })
})

export const POST = api<{ name:string; description?:string; domain:'SALES'|'FINANCE'|'INVENTORY'|'OPERATIONS'; spec:any; presentation:any }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING'], parseJson: true, rate: { key: 'analytics-reports-create', limit: 30 } })(async ({ json }) => {
  if (!json) return err('bad_json', 400)
  const specParsed = reportSpecSchema.safeParse(json.spec)
  if (!specParsed.success) return err('validation_error', 400, { issues: specParsed.error.issues })
  const presParsed = presentationSchema.safeParse(json.presentation)
  if (!presParsed.success) return err('validation_error', 400, { issues: presParsed.error.issues })
  const userId = getCurrentUserId()
  const report = await prisma.reportDefinition.create({ data: { ownerUserId: userId, name: String(json.name).slice(0,128), description: json.description ? String(json.description).slice(0,512) : null, domain: json.domain, spec: specParsed.data, presentation: presParsed.data, visibility: 'PRIVATE' } as any })
  return ok({ data: report })
})
