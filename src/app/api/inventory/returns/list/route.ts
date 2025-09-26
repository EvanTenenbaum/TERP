import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const { searchParams } = new URL(req.url)
  const lotId = searchParams.get('lotId') || undefined
  const limit = Number(searchParams.get('limit') || '100')

  const [client, vendor, internal] = await Promise.all([
    prisma.sampleTransaction.findMany({ where: { transactionType: 'CLIENT_RETURN', ...(lotId ? { batchId: (await prisma.inventoryLot.findUnique({ where: { id: lotId } }))?.batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit }),
    prisma.sampleTransaction.findMany({ where: { transactionType: 'VENDOR_RETURN', ...(lotId ? { batchId: (await prisma.inventoryLot.findUnique({ where: { id: lotId } }))?.batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit }),
    prisma.writeOffLedger.findMany({ where: lotId ? { lotId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
  ])

  return NextResponse.json({ success:true, data: { client, vendor, writeoffs: internal } })
}
