import { z } from 'zod'

export const ApplyPaymentBody = z.object({
  customerId: z.string().min(1),
  amountCents: z.number().int().positive(),
  method: z.enum(['wire','ach','card','cash','credit']).default('ach'),
  reference: z.string().max(128).optional(),
})

export type ApplyPaymentBodyT = z.infer<typeof ApplyPaymentBody>
