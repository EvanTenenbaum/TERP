import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  const data = await prisma.inventoryTransfer.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ success: true, transfers: data })
}
