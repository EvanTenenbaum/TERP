import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','READ_ONLY']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const { searchParams } = new URL(req.url)
  const vendorId = searchParams.get('vendorId') || undefined
  const data = await prisma.vendorSettlement.findMany({ where: vendorId ? { vendorId } : undefined, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ success: true, settlements: data })
}
