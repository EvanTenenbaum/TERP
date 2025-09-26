import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') || undefined
  const entityId = searchParams.get('entityId') || undefined
  const where: any = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  const attachments = await prisma.attachment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ success: true, attachments })
}
