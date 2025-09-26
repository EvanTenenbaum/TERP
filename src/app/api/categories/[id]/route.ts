import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const body = await req.json()
  const { name, parentId, isActive } = body || {}
  const data: any = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'invalid_name' }, { status: 400 })
    }
    data.name = name.trim()
  }
  if (parentId !== undefined) {
    if (parentId !== null && typeof parentId !== 'string') {
      return NextResponse.json({ success: false, error: 'invalid_parent' }, { status: 400 })
    }
    data.parentId = parentId ? String(parentId) : null
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'invalid_isActive' }, { status: 400 })
    }
    data.isActive = isActive
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, error: 'no_fields' }, { status: 400 })
  }
  const category = await prisma.productCategory.update({ where: { id: params.id }, data })
  return NextResponse.json({ success: true, category })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  await prisma.productCategory.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
