import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import { z } from 'zod'

const querySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
})

export const GET = api<{},{ entityType?: string; entityId?: string }>({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'], querySchema })(async ({ query }) => {
  const where: any = {}
  if (query?.entityType) where.entityType = query.entityType
  if (query?.entityId) where.entityId = query.entityId
  const attachments = await prisma.attachment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id:true, entityType:true, entityId:true, fileName:true, mimeType:true, fileSize:true, archived:true, createdAt:true }
  })
  return ok({ attachments })
})
