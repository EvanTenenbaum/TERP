import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
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
  return NextResponse.json({ success: true, attachments })
}
