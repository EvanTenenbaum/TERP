import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { NextRequest, NextResponse } from 'next/server'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('forbidden', { status: 403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return new NextResponse('posting_locked', { status: 423 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:credit-memo`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  const body = await req.json()
  const { arId, amountCents, reason } = body || {}
  const amt = Math.round(Number(amountCents))
  if (!arId || !Number.isFinite(amt) || amt <= 0 || !reason) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })

  return await prisma.$transaction(async (tx) => {
    const ar = await tx.accountsReceivable.findUnique({ where: { id: arId } })
    if (!ar) return NextResponse.json({ error: 'ar_not_found' }, { status: 404 })

    await tx.creditMemo.create({ data: { arId, amount: amt, reason: String(reason).slice(0,256) } })

    if (ar.balanceRemaining > 0) {
      const dec = Math.min(amt, ar.balanceRemaining)
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: dec } } })
      const leftover = amt - dec
      if (leftover > 0) {
        await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: leftover, balanceCents: leftover, notes: `CreditMemo remainder for ${ar.invoiceNumber}` } })
      }
    } else {
      await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: amt, balanceCents: amt, notes: `CreditMemo for ${ar.invoiceNumber}` } })
    }

    return NextResponse.json({ ok: true })
  })
}
