import { headers } from 'next/headers'

export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'ACCOUNTING' | 'READ_ONLY'

function parseCsvEnv(name: string): string[] {
  const v = process.env[name] || ''
  return v.split(',').map(s => s.trim()).filter(Boolean)
}

function roleFromApiKey(authorization?: string | null): UserRole | null {
  if (!authorization) return null
  const m = authorization.match(/^Bearer\s+(.+)$/i)
  const token = m ? m[1].trim() : authorization.trim()
  if (!token) return null
  if (parseCsvEnv('API_KEY_ADMIN').includes(token)) return 'SUPER_ADMIN'
  if (parseCsvEnv('API_KEY_ACCOUNTING').includes(token)) return 'ACCOUNTING'
  if (parseCsvEnv('API_KEY_SALES').includes(token)) return 'SALES'
  if (parseCsvEnv('API_KEY_READONLY').includes(token)) return 'READ_ONLY'
  return null
}

export function getCurrentRole(): UserRole {
  if (process.env.ENABLE_RBAC !== 'true') return 'SUPER_ADMIN'
  const h = headers()
  // Priority: API key via Authorization header → explicit header → default READ_ONLY
  const keyRole = roleFromApiKey(h.get('authorization'))
  if (keyRole) return keyRole
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
