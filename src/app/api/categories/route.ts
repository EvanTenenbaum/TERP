import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const categories = await prisma.productCategory.findMany({ orderBy: [{ parentId: 'asc' }, { name: 'asc' }] })
  return NextResponse.json({ success: true, categories })
}

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const body = await req.json()
  const { name, parentId } = body || {}
  if (!name) return NextResponse.json({ success: false, error: 'invalid_input' }, { status: 400 })
  const category = await prisma.productCategory.create({ data: { name, parentId: parentId || null } })
  return NextResponse.json({ success: true, category })
}
