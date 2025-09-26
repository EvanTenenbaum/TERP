import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return NextResponse.json({ success:false, error:'forbidden' }, { status:403 }) }
  const body = await req.json().catch(()=>null)
  if (!body) return NextResponse.json({ success:false, error:'bad_json' }, { status:400 })
  const arId = String(body.arId||'')
  const amountCents = Math.round(Number(body.amountCents))
  const reason = String(body.reason||'')
  if (!arId || !Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ success:false, error:'invalid_input' }, { status:400 })

  try {
    const out = await prisma.$transaction(async (tx)=>{
      const ar = await tx.accountsReceivable.findUnique({ where:{ id: arId } })
      if (!ar) throw new Error('ar_not_found')
      const memo = await tx.creditMemo.create({ data: { arId, amount: amountCents, reason } })
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: amountCents } } })
      // Create or top up customer credit balance
      let cc = await tx.customerCredit.findFirst({ where: { customerId: ar.customerId } })
      if (!cc) cc = await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: amountCents, balanceCents: amountCents } })
      else cc = await tx.customerCredit.update({ where: { id: cc.id }, data: { amountCents: { increment: amountCents }, balanceCents: { increment: amountCents } } })
      return { memo, customerCredit: cc }
    })

    return NextResponse.json({ success:true, data: out })
  } catch (e:any) {
    const code = e?.message || 'server_error'
    const status = code === 'ar_not_found' ? 404 : 500
    return NextResponse.json({ success:false, error: code }, { status })
  }
}
