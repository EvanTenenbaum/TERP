import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import * as Sentry from '@sentry/nextjs'
import { ok, err } from '@/lib/http'

export const POST = api<{ arId:string; amountCents:number; reason:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'bad-debt', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { arId, amountCents, reason } = json as any
  if (!arId || !Number.isFinite(amountCents) || amountCents <= 0 || !reason) return err('invalid_input', 400)

  try {
    const userId = getCurrentUserId()
    const result = await prisma.$transaction(async (tx) => {
      const ar = await tx.accountsReceivable.findUnique({ where: { id: arId } })
      if (!ar) throw new Error('ar_not_found')
      if (ar.balanceRemaining <= 0) throw new Error('already_closed')
      const clampAmount = Math.min(amountCents, ar.balanceRemaining)

      const memo = await tx.creditMemo.create({ data: { arId, amount: clampAmount, reason: String(reason).slice(0,256) } })
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: clampAmount } } })
      return memo
    })

    Sentry.captureMessage('Bad debt recorded', { level: 'info', extra: { arId, amountCents } } as any)
    return ok({ data: result })
  } catch (e:any) {
    const m = e?.message
    if (m === 'ar_not_found') return err('ar_not_found', 404)
    if (m === 'already_closed') return err('already_closed', 400)
    return err('server_error', 500)
  }
})
