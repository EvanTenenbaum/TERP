import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole, getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'

function parseAmountCents(v: any) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new Error('invalid_amount')
  return Math.round(n * 100)
}

export async function POST(req: Request) {
  try { requireRole(['ACCOUNTING','SUPER_ADMIN']) } catch { return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }) }
  await ensurePostingUnlocked()
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })

  const vendorId = String(body.vendorId || '')
  const basis = String(body.basis || '')
  const notes = body.notes ? String(body.notes) : undefined
  const appliedToApId = body.appliedToApId ? String(body.appliedToApId) : undefined
  if (!vendorId || !basis) return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 })

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

    const r = await prisma.$transaction(async (tx) => {
      const rebate = await tx.vendorRebate.create({ data: { vendorId, basis, amount, notes, appliedToApId, createdBy: userId } })
      if (appliedToApId) {
        await tx.accountsPayable.update({ where: { id: appliedToApId }, data: { balanceRemaining: { decrement: amount } } })
      }
      return rebate
    })

    return NextResponse.json({ success: true, rebate: r })
  } catch (e: any) {
    const msg = e?.message && e.message.startsWith('invalid_') ? e.message : 'server_error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
