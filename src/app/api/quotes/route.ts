import { api } from '@/lib/api'
import { ok } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const quotes = await prisma.salesQuote.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      quoteNumber: true,
      quoteDate: true,
      expirationDate: true,
      status: true,
      totalAmount: true,
      customer: { select: { id: true, companyName: true } },
    },
  })
  const result = quotes.map(q => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    quoteDate: q.quoteDate,
    expirationDate: q.expirationDate,
    status: q.status,
    totalAmount: q.totalAmount,
    customer: { id: q.customer.id, name: q.customer.companyName },
  }))
  return ok({ quotes: result })
})
