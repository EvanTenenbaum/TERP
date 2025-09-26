import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return err('forbidden', 403) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:credits-apply`, 120, 60_000)
  if (!rl.allowed) return err('rate_limited', 429)
  const body = await req.json().catch(()=>null)
  if (!body) return err('bad_json', 400)
  const arId = String(body.arId||'')
  const creditId = String(body.creditId||'')
  const amountCents = Math.round(Number(body.amountCents))
  if (!arId || !creditId || !Number.isFinite(amountCents) || amountCents <= 0) return err('invalid_input', 400)

  try {
    await prisma.$transaction(async (tx)=>{
      const ar = await tx.accountsReceivable.findUnique({ where:{ id: arId } })
      const cc = await tx.customerCredit.findUnique({ where: { id: creditId } })
      if (!ar) throw new Error('ar_not_found')
      if (!cc) throw new Error('credit_not_found')
      if (cc.customerId !== ar.customerId) throw new Error('customer_mismatch')
      const maxApply = Math.min(amountCents, Math.max(0, cc.balanceCents), Math.max(0, ar.balanceRemaining))
      if (maxApply <= 0) throw new Error('insufficient_credit')
      await tx.customerCredit.update({ where: { id: cc.id }, data: { balanceCents: { decrement: maxApply } } })
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: maxApply } } })
    })
    return ok()
  } catch (e:any) {
    const code = e?.message || 'server_error'
    const status = code === 'ar_not_found' || code === 'credit_not_found' ? 404 : code === 'insufficient_credit' || code === 'customer_mismatch' ? 400 : 500
    return err(code, status)
  }
}
