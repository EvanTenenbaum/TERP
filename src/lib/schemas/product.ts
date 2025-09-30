import { z } from 'zod'

export const ProductCreate = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  category: z.string().min(1).max(64),
  unit: z.string().min(1).max(32).default('each').optional(),
  defaultPrice: z.number().nonnegative().optional(), // dollars
})

export type ProductCreateT = z.infer<typeof ProductCreate>
