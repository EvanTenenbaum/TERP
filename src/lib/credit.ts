import prisma from '@/lib/prisma'

export async function assertWithinCreditLimit(customerId: string, orderTotalCents: number) {
  if (orderTotalCents < 0) throw new Error('invalid_total')
  await prisma.$transaction(async (tx) => {
    const cust = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true, creditLimit: true } })
    if (!cust) throw new Error('customer_not_found')
    const ar = await tx.accountsReceivable.aggregate({ _sum: { balanceRemaining: true }, where: { customerId } })
    const bal = Number(ar._sum.balanceRemaining || 0)
    const limit = Number(cust.creditLimit || 0)
    if (bal + orderTotalCents > limit) throw new Error('credit_limit_exceeded')
  }, { isolationLevel: 'Serializable' } as any)
}
