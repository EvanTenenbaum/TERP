import { z } from 'zod'

export const ImportType = z.enum(['products','customers','pricebook'])

export const ImportBody = z.object({
  type: ImportType,
  dryRun: z.boolean().default(true),
  rows: z.array(z.record(z.string(), z.any())).min(1),
})

export type ImportTypeT = z.infer<typeof ImportType>
export type ImportBodyT = z.infer<typeof ImportBody>
