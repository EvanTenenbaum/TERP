import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const key = `${rateKeyFromRequest(req)}:attachments-archive`
  const rl = rateLimit(key, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  const { archived } = await req.json()
  const att = await prisma.attachment.update({ where: { id: params.id }, data: { archived: !!archived } })
  return NextResponse.json({ success: true, attachment: att })
}
