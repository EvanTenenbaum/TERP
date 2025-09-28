import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ arId:string; amountCents:number; reason:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'credits-memo', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const arId = String(json!.arId||'')
  const amountCents = Math.round(Number(json!.amountCents))
  const reason = String(json!.reason||'').slice(0,256)
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
    const httpStatus = code === 'ar_not_found' ? 404 : 500
    return err(code, httpStatus)
  }
})
