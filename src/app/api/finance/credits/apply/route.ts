import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ arId:string; creditId:string; amountCents:number }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  rate: { key: 'credits-apply', limit: 120 },
  parseJson: true,
  onError: (e) => {
    const code = e?.message
    if (code === 'ar_not_found' || code === 'credit_not_found') return { code, status: 404 }
    if (code === 'insufficient_credit' || code === 'customer_mismatch') return { code, status: 400 }
    return undefined
  }
})(async ({ json }) => {
  const arId = String(json!.arId || '')
  const creditId = String(json!.creditId || '')
  const amountCents = Math.round(Number(json!.amountCents))
  if (!arId || !creditId || !Number.isFinite(amountCents) || amountCents <= 0) return err('invalid_input', 400)

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
})
