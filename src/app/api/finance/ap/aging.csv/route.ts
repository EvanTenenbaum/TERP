import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

function bucket(days: number) {
  if (days >= 90) return '90+'
  if (days >= 60) return '60-89'
  if (days >= 30) return '30-59'
  if (days >= 0) return '0-29'
  return 'not_due'
}

export async function GET(_req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  const rl = rateLimit(`${rateKeyFromRequest(_req)}:export-ap-aging`, 30, 60_000)
  if (!rl.allowed) return new NextResponse('rate_limited', { status: 429 })
  const today = new Date()
  const aps = await prisma.accountsPayable.findMany({ include: { vendor: true } })

  const header = ['invoiceNumber','vendor','dueDate','balanceCents','daysPastDue','bucket']
  const rows = [header]
  for (const ap of aps) {
    const daysPastDue = Math.floor((today.getTime() - new Date(ap.dueDate).getTime())/86400000)
    if (daysPastDue < 0 || ap.balanceRemaining <= 0) continue
    rows.push([
      ap.invoiceNumber,
      ap.vendor?.companyName || ap.vendorId,
      new Date(ap.dueDate).toISOString(),
      String(ap.balanceRemaining),
      String(daysPastDue),
      bucket(daysPastDue),
    ])
  }
  const csv = rows.map(r => r.map(f => /[",\n]/.test(f) ? `"${f.replace(/"/g,'""')}"` : f).join(',')).join('\n')
  return new NextResponse(csv, { status:200, headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="ap_aging_${Date.now()}.csv"` } })
}
