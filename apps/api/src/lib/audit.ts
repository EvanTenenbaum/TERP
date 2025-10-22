import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function logAudit(action: string, entity?: string, entityId?: string, metadata?: any) {
  const h = headers();
  const actorId = h.get('x-user-id') || null;
  const actorRole = h.get('x-user-role') || null;
  await prisma.auditLog.create({ data: { action, entity: entity || null, entityId: entityId || null, metadata, actorId: actorId || undefined, actorRole: actorRole || undefined } });
}
