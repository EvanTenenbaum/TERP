import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId') || undefined
  const credits = await prisma.customerCredit.findMany({ where: customerId ? { customerId } : undefined, orderBy: { updatedAt: 'desc' }, take: 100 })
  return NextResponse.json({ success:true, data: credits })
}
