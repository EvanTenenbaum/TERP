import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success:false, error:'posting_locked' }, { status:423 }) }
  const rl = rateLimit(`${rateKeyFromRequest(req)}:credits-memo`, 60, 60_000)
  if (!rl.allowed) return NextResponse.json({ success:false, error:'rate_limited' }, { status:429 })
  const body = await req.json().catch(()=>null)
  if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status:400 })
  const arId = String(body.arId||'')
  const amountCents = Math.round(Number(body.amountCents))
  const reason = String(body.reason||'').slice(0,256)
  if (!arId || !Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ success:false, error:'invalid_input' }, { status:400 })

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

    return NextResponse.json({ success:true, data: out })
  } catch (e:any) {
    const code = e?.message || 'server_error'
    const status = code === 'ar_not_found' ? 404 : 500
    return NextResponse.json({ success:false, error: code }, { status })
  }
}
