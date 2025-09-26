import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') || undefined
  const entityId = searchParams.get('entityId') || undefined
  const where: any = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  const attachments = await prisma.attachment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id:true, entityType:true, entityId:true, fileName:true, mimeType:true, fileSize:true, archived:true, createdAt:true }
  })
  return ok({ attachments })
})
