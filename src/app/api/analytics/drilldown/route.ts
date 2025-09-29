import { api } from '@/lib/api'
import { err, ok } from '@/lib/http'
import { reportSpec as reportSpecSchema } from '@/lib/analytics/validation'
import prisma from '@/lib/prisma'

export const POST = api<{ spec:any; point?:Record<string,any>; page?:number; pageSize?:number }>({ roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'], parseJson: true, rate: { key: 'analytics-drilldown', limit: 120 } })(async ({ json }) => {
  if (!json?.spec) return err('invalid_input', 400)
  const specParsed = reportSpecSchema.safeParse(json.spec)
  if (!specParsed.success) return err('validation_error', 400, { issues: specParsed.error.issues })
  const page = Math.max(1, Math.min(1000, Number(json.page || 1)))
  const pageSize = Math.max(1, Math.min(1000, Number(json.pageSize || 100)))
  // Minimal example: for sales_by_customer drill into orders for that customer
  const spec = specParsed.data
  if (spec.metric === 'sales_by_customer' && json.point?.customerId) {
    const rows = await prisma.order.findMany({ where: { customerId: String(json.point.customerId) }, orderBy: { orderDate: 'desc' }, skip: (page-1)*pageSize, take: pageSize, select: { id:true, orderDate:true, totalAmount:true } })
    return ok({ data: { rows, meta: { rowCount: rows.length, viz:'table', recommendedViz:'table' } } })
  }
  return ok({ data: { rows: [], meta: { rowCount: 0, viz:'table', recommendedViz:'table' } } })
})
