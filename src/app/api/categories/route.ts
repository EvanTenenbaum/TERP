import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const categories = await prisma.productCategory.findMany({ orderBy: [{ parentId: 'asc' }, { name: 'asc' }] })
  return NextResponse.json({ success: true, categories })
}

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const body = await req.json()
  const { name, parentId } = body || {}
  const nm = typeof name === 'string' ? name.trim() : ''
  if (!nm) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
  if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
    return NextResponse.json({ success: false, error: 'invalid_parent' }, { status: 400 })
  }
  const category = await prisma.productCategory.create({ data: { name: nm, parentId: parentId ? String(parentId) : null } })
  return NextResponse.json({ success: true, category })
}
