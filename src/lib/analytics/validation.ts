import { z } from 'zod'

export const dateRange = z.union([
  z.object({ mode: z.literal('relative'), value: z.enum(['today','7d','30d','qtd','ytd']) }),
  z.object({ mode: z.literal('absolute'), from: z.string().datetime(), to: z.string().datetime() })
])

export const filter = z.object({
  field: z.string().min(1).max(64),
  op: z.enum(['eq','neq','gt','lt','gte','lte','contains','in']),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
})

export const reportSpec = z.object({
  metric: z.string().min(1).max(64),
  dimension: z.string().min(1).max(64).optional(),
  breakdown: z.string().min(1).max(64).optional(),
  dateRange,
  filters: z.array(filter).max(20),
  limit: z.number().int().min(1).max(1000).optional(),
  orderBy: z.object({ field: z.string().min(1).max(64), dir: z.enum(['asc','desc']) }).optional()
})

export const presentation = z.object({
  viz: z.enum(['auto','table','bar','line','pie','kpi']),
  columns: z.array(z.string()).max(50).optional(),
  sort: z.object({ field: z.string(), dir: z.enum(['asc','desc']) }).optional(),
  format: z.record(z.string()).optional(),
  drilldownEnabled: z.boolean().optional(),
  titleOverride: z.string().max(128).optional()
})

export type DateRange = z.infer<typeof dateRange>
export type ReportSpec = z.infer<typeof reportSpec>
export type Presentation = z.infer<typeof presentation>
