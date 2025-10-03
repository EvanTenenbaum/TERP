import { api } from '@/lib/api';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { deleteObject } from '@/lib/storage';
import { ERPError } from '@/lib/errors';

export const POST = api(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) throw new ERPError('NOT_FOUND', 'attachment_not_found');
  await deleteObject(att.key);
  await prisma.attachment.update({ where: { id }, data: { archived: true } });
  return { ok: true };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
