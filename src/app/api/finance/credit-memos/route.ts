import prisma from '@/lib/prisma'
import { ensurePostingUnlocked } from '@/lib/system'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const POST = api<{ arId:string; amountCents:number; reason:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'credit-memo', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const arId = String(json!.arId || '')
  const amt = Math.round(Number(json!.amountCents))
  const reason = String(json!.reason || '')
  if (!arId || !Number.isFinite(amt) || amt <= 0 || !reason) return err('invalid_input', 400)

  await prisma.$transaction(async (tx) => {
    const ar = await tx.accountsReceivable.findUnique({ where: { id: arId } })
    if (!ar) throw new Error('ar_not_found')

    await tx.creditMemo.create({ data: { arId, amount: amt, reason: reason.slice(0,256) } })

    if (ar.balanceRemaining > 0) {
      const dec = Math.min(amt, ar.balanceRemaining)
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: dec } } })
      const leftover = amt - dec
      if (leftover > 0) await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: leftover, balanceCents: leftover, notes: `CreditMemo remainder for ${ar.invoiceNumber}` } })
    } else {
      await tx.customerCredit.create({ data: { customerId: ar.customerId, amountCents: amt, balanceCents: amt, notes: `CreditMemo for ${ar.invoiceNumber}` } })
    }
  })

  return ok()
})
