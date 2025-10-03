import { api } from '@/lib/api';
import { z } from 'zod';
import { putObject, hashName } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

const Input = z.object({
  name: z.string().min(1),
  contentBase64: z.string().min(1),
  contentType: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  size: z.number().int().optional(),
});

export const POST = api(Input, async ({ name, contentBase64, contentType, entity, entityId, size }) => {
  const buf = Buffer.from(contentBase64, 'base64');
  const key = `${entity || 'misc'}/${entityId || 'general'}/${hashName(name)}`;
  await putObject(key, buf, contentType || 'application/octet-stream');
  const att = await prisma.attachment.create({
    data: { key, name, contentType: contentType || null, entity: entity || null, entityId: entityId || null, size: size ?? buf.length },
  });
  return { ok: true, key, id: att.id };
}, ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']);
