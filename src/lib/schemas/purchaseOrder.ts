import { z } from 'zod'

export const PurchaseOrderCreate = z.object({
  vendorId: z.string().min(1),
  expectedAt: z.string().datetime().optional(),
  poNumber: z.string().max(64).optional(),
})

export const PurchaseOrderUpdate = z.object({
  status: z.enum(['OPEN','APPROVED','CLOSED','CANCELLED']).optional(),
  expectedAt: z.string().datetime().optional(),
})

export type PurchaseOrderCreateT = z.infer<typeof PurchaseOrderCreate>
export type PurchaseOrderUpdateT = z.infer<typeof PurchaseOrderUpdate>
