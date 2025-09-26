import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ok, err } from '@/lib/http'

export async function GET() {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return err('forbidden', 403) }
  const data = await prisma.inventoryTransfer.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return ok({ transfers: data })
}
