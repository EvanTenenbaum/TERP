import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING','READ_ONLY'],
  rate: { key: 'sample-list', limit: 120 },
})(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId') || undefined
  const vendorId = searchParams.get('vendorId') || undefined
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

  if (customerId && vendorId) return err('invalid_filters', 400)

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (vendorId) where.vendorId = vendorId
  if (from || to) {
    where.transactionDate = {}
    if (from) where.transactionDate.gte = from
    if (to) where.transactionDate.lte = to
  }

  try {
    const list = await prisma.sampleTransaction.findMany({
      where,
      include: { product: true, customer: true, vendor: true, batch: true },
      orderBy: { transactionDate: 'desc' },
    })
    return ok({ data: list })
  } catch {
    return err('server_error', 500)
  }
})
