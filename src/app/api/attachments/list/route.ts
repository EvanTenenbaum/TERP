import { api } from '@/lib/api';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const GET = api(z.object({ entity: z.string().optional(), entityId: z.string().optional(), limit: z.number().int().max(500).optional() }), async ({ entity, entityId, limit }) => {
  const where: any = { archived: false };
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  const rows = await prisma.attachment.findMany({
    where, orderBy: { createdAt: 'desc' }, take: limit ?? 100, select: { id: true, key: true, name: true, contentType: true, createdAt: true }
  });
  return { ok: true, data: rows };
}, ['READ_ONLY','SUPER_ADMIN','ACCOUNTING','SALES']);
