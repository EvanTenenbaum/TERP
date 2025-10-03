import { z } from 'zod';
import { api } from '@/lib/api';
import { applyPaymentFIFO } from '@/lib/finance/payments';

export const POST = api(z.object({ paymentId: z.string().uuid(), customerId: z.string().uuid() }), async ({ paymentId, customerId }) => {
  return await applyPaymentFIFO({ paymentId, customerId });
}, ['SUPER_ADMIN','ACCOUNTING']);
