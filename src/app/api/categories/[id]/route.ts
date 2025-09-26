import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const body = await req.json()
  const { name, parentId, isActive } = body || {}
  const category = await prisma.productCategory.update({ where: { id: params.id }, data: { name, parentId: parentId || null, isActive } })
  return NextResponse.json({ success: true, category })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  await prisma.productCategory.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
