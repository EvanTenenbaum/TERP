import { headers } from 'next/headers';
import { ERPError } from '@/lib/errors';

export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'ACCOUNTING' | 'READ_ONLY';

export function getCurrentUserId(): string {
  const h = headers();
  const uid = h.get('x-user-id');
  if (!uid) throw new ERPError('FORBIDDEN', 'auth_required');
  return uid;
}

export function getCurrentRole(): UserRole {
  const h = headers();
  const role = h.get('x-user-role');
  if (!role) throw new ERPError('FORBIDDEN', 'role_required');
  if (!['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'].includes(role)) {
    throw new ERPError('FORBIDDEN', 'invalid_role');
  }
  return role as UserRole;
}

export function requireRole(allowed?: UserRole[]) {
  if (!allowed || !allowed.length) return;
  const role = getCurrentRole();
  if (!allowed.includes(role)) {
    throw new ERPError('FORBIDDEN', 'insufficient_role');
  }
}
