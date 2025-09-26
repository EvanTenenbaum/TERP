import { headers } from 'next/headers'

export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'ACCOUNTING' | 'READ_ONLY'

export function getCurrentRole(): UserRole {
  if (process.env.ENABLE_RBAC !== 'true') return 'SUPER_ADMIN'
  const h = headers()
  const role = (h.get('x-user-role') || '').toUpperCase() as UserRole
  if (role === 'SUPER_ADMIN' || role === 'SALES' || role === 'ACCOUNTING' || role === 'READ_ONLY') return role
  return 'READ_ONLY'
}

export function requireRole(allowed: UserRole[]) {
  const role = getCurrentRole()
  if (!allowed.includes(role)) {
    const err: any = new Error('forbidden')
    err.code = 'forbidden'
    throw err
  }
}

export function getCurrentUserId(): string {
  try {
    const h = headers()
    const v = h.get('x-user-id') || h.get('x-user-email') || ''
    return v || 'system'
  } catch {
    return 'system'
  }
}
