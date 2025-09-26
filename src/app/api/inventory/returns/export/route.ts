import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  const { searchParams } = new URL(req.url)
  const lotId = searchParams.get('lotId') || undefined
  const limit = Number(searchParams.get('limit') || '500')

  const lot = lotId ? await prisma.inventoryLot.findUnique({ where: { id: lotId } }) : null
  const batchId = lot?.batchId

  const client = await prisma.sampleTransaction.findMany({ where: { transactionType: 'CLIENT_RETURN', ...(batchId ? { batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit })
  const vendor = await prisma.sampleTransaction.findMany({ where: { transactionType: 'VENDOR_RETURN', ...(batchId ? { batchId } : {}) }, orderBy:{ transactionDate:'desc' }, take: limit })
  const writeoffs = await prisma.writeOffLedger.findMany({ where: lotId ? { lotId } : undefined, orderBy:{ createdAt:'desc' }, take: limit })

  const header = ['type','batchId','lotId','quantity','when','reason']
  const rows = [header]
  for (const c of client) rows.push(['CLIENT_RETURN', c.batchId||'', '', String(c.quantity), new Date(c.transactionDate).toISOString(), c.notes||''])
  for (const v of vendor) rows.push(['VENDOR_RETURN', v.batchId||'', '', String(v.quantity), new Date(v.transactionDate).toISOString(), v.notes||''])
  for (const w of writeoffs) rows.push(['WRITE_OFF', '', w.lotId, String(w.qty), new Date(w.createdAt).toISOString(), w.reason])

  const csv = rows.map(r => r.map(f => /[",\n]/.test(f) ? `"${f.replace(/"/g,'""')}"` : f).join(',')).join('\n')
  return new NextResponse(csv, { status:200, headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="returns_${Date.now()}.csv"` } })
}
