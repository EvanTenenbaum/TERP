import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

function bucket(days: number) {
  if (days >= 90) return '90+'
  if (days >= 60) return '60-89'
  if (days >= 30) return '30-59'
  if (days >= 0) return '0-29'
  return 'not_due'
}

export async function GET(_req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING','READ_ONLY']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const today = new Date()
  const aps = await prisma.accountsPayable.findMany({ include: { vendor: true } })

  const rows = aps.map(ap => {
    const daysPastDue = Math.floor((today.getTime() - new Date(ap.dueDate).getTime())/86400000)
    return {
      vendor: ap.vendor?.companyName || ap.vendorId,
      invoiceNumber: ap.invoiceNumber,
      dueDate: ap.dueDate,
      balanceCents: ap.balanceRemaining,
      daysPastDue,
      bucket: bucket(daysPastDue),
    }
  }).filter(r => r.daysPastDue >= 0 && r.balanceCents > 0)

  const totals: Record<string, number> = { '0-29':0, '30-59':0, '60-89':0, '90+':0 }
  for (const r of rows) { if (totals[r.bucket] != null) totals[r.bucket] += r.balanceCents }

  return NextResponse.json({ success:true, data: { rows, totals } })
}
