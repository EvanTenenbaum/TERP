import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('posting_locked', 423) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:credits-memo`, 60, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)
  const body = await req.json().catch(()=>null)
  if (!body) return err('bad_json', 400)
  const arId = String(body.arId||'')
  const amountCents = Math.round(Number(body.amountCents))
  const reason = String(body.reason||'').slice(0,256)
  if (!arId || !Number.isFinite(amountCents) || amountCents <= 0) return err('invalid_input', 400)

  try {
    const out = await prisma.$transaction(async (tx)=>{
      const ar = await tx.accountsReceivable.findUnique({ where:{ id: arId } })
      if (!ar) throw new Error('ar_not_found')
      const applyAmt = Math.min(amountCents, Math.max(0, ar.balanceRemaining))
      const memo = await tx.creditMemo.create({ data: { arId, amount: applyAmt, reason } })
      if (applyAmt > 0) {
        await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: applyAmt } } })
      }
      let cc = await tx.customerCredit.findFirst({ where: { customerId: ar.customerId } })
      if (!cc) cc = await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: applyAmt, balanceCents: applyAmt } })
      else cc = await tx.customerCredit.update({ where: { id: cc.id }, data: { amountCents: { increment: applyAmt }, balanceCents: { increment: applyAmt } } })
      return { memo, customerCredit: cc }
    })

    return ok({ data: out })
  } catch (e:any) {
    const code = e?.message || 'server_error'
    const status = code === 'ar_not_found' ? 404 : 500
    return err(code, status)
  }
}
