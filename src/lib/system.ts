import prisma from '@/lib/prisma'
import { getCurrentRole, UserRole } from '@/lib/auth'

export async function ensurePostingUnlocked(allowRoles: UserRole[] = ['SUPER_ADMIN']) {
  try {
    const sys = await prisma.systemStatus?.findUnique?.({ where: { id: 'singleton' } })
    if (sys?.postingLocked) {
      const role = getCurrentRole()
      if (!allowRoles.includes(role)) {
        const err: any = new Error('posting_locked')
        err.reason = sys.lastReason || 'locked'
        throw err
      }
    }
  } catch {
    // In test or when SystemStatus is unavailable, do not block
    return
  }
}
