import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { NextResponse } from 'next/server'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

function parseAmountCents(v: any) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new Error('invalid_amount')
  return Math.round(n * 100)
}

export async function POST(req: Request) {
  try { requireRole(['ACCOUNTING','SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  await ensurePostingUnlocked()
  const rl = rateLimit(`${rateKeyFromRequest(req)}:vendor-settlement`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success: false, error: 'rate_limited' }, { status: 429 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })

  const vendorId = String(body.vendorId || '')
  const periodStart = body.periodStart ? new Date(String(body.periodStart)) : null
  const periodEnd = body.periodEnd ? new Date(String(body.periodEnd)) : null
  const notes = body.notes ? String(body.notes) : undefined
  const appliedToApId = body.appliedToApId ? String(body.appliedToApId) : undefined
  if (!vendorId || !periodStart || !periodEnd) return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 })
  if (periodEnd < periodStart) return NextResponse.json({ success: false, error: 'invalid_period' }, { status: 400 })

  try {
    const amount = parseAmountCents(body.amount)
    const userId = getCurrentUserId()

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
    if (!vendor) return NextResponse.json({ success: false, error: 'vendor_not_found' }, { status: 404 })

    if (appliedToApId) {
      const ap = await prisma.accountsPayable.findUnique({ where: { id: appliedToApId } })
      if (!ap) return NextResponse.json({ success: false, error: 'ap_not_found' }, { status: 404 })
      if (ap.vendorId !== vendorId) return NextResponse.json({ success: false, error: 'ap_vendor_mismatch' }, { status: 400 })
    }

    const s = await prisma.$transaction(async (tx) => {
      const settlement = await tx.vendorSettlement.create({
        data: { vendorId, periodStart, periodEnd, amount, notes, appliedToApId, createdBy: userId }
      })
      if (appliedToApId) {
        await tx.accountsPayable.update({ where: { id: appliedToApId }, data: { balanceRemaining: { decrement: amount } } })
      }
      return settlement
    })

    return NextResponse.json({ success: true, settlement: s })
  } catch (e: any) {
    const msg = e?.message && e.message.startsWith('invalid_') ? e.message : 'server_error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
