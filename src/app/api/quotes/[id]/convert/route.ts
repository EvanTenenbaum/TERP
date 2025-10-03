import { z } from 'zod';
import { api } from '@/lib/api';
import { convertQuoteToOrder } from '@/actions/quotes/convert';
import { getCurrentRole } from '@/lib/auth';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const role = getCurrentRole();
  const res = await convertQuoteToOrder({ quoteId: id, userRole: role as any });
  return res;
}, ['SUPER_ADMIN','SALES','ACCOUNTING']);
