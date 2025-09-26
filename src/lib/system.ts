import prisma from '@/lib/prisma'
import { getCurrentRole, UserRole } from '@/lib/auth'

export async function ensurePostingUnlocked(allowRoles: UserRole[] = ['SUPER_ADMIN']) {
  try {
    const status = await prisma.systemStatus?.findUnique?.({ where: { id: 'singleton' } })
    if (status?.postingLocked) {
      const role = getCurrentRole()
      if (!allowRoles.includes(role)) {
        const err: any = new Error('posting_locked')
        err.reason = status.lastReason || 'locked'
        throw err
      }
    }
  } catch {
    // In test or when SystemStatus is unavailable, do not block
    return
  }
}
