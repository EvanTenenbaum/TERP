"use server";
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'

export async function applyPaymentFIFO(customerId: string, amountCents: number, method='ach', reference?: string) {
  await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
  await ensurePostingUnlocked()
  if (amountCents <= 0) throw new Error('invalid_amount')

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: { customerId, amount: amountCents, paymentMethod: method, referenceNumber: reference ?? null, paymentDate: new Date() } })
    let remaining = amountCents
    const invoices = await tx.accountsReceivable.findMany({ where: { customerId, balanceRemaining: { gt: 0 } }, orderBy: { createdAt: 'asc' }, select: { id: true, balanceRemaining: true } })
    for (const inv of invoices) {
      if (remaining <= 0) break
      const pay = Math.min(remaining, inv.balanceRemaining)
      if (pay > 0) {
        await tx.paymentApplication.create({ data: { paymentId: payment.id, arId: inv.id, appliedAmount: pay, applicationDate: new Date() } })
        await tx.accountsReceivable.update({ where: { id: inv.id }, data: { balanceRemaining: { decrement: pay } } })
        remaining -= pay
      }
    }
    if (remaining > 0) {
      await tx.customerCredit.create({ data: { customerId, amountCents: remaining, balanceCents: remaining } })
    }
    return { success: true, paymentId: payment.id, overpayCents: remaining }
  })
}
