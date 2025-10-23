import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'node:crypto';
import { logAudit } from '@/lib/audit';
import { startSpan } from '@/lib/observability';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  return startSpan('quote.share', async () => {
    const token = crypto.randomBytes(24).toString('hex');
    const row = await prisma.quoteShareToken.create({ data: { quoteId: id, token } });
    await logAudit('QUOTE_SHARE_CREATED', 'Quote', id, { tokenId: row.id });
    const url = `/api/quotes/share/${token}`;
    return { ok: true, token, url };
  }, { quoteId: id });
}, ['SALES','SUPER_ADMIN']);
