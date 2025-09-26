import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ productId:string; vendorId:string; qty:number; batchId?:string; notes?:string }>({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'sample-incoming', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { productId, vendorId, qty, batchId } = json as any
  const notes = (json as any)?.notes ? String((json as any).notes).slice(0,512) : undefined
  if (!productId || !vendorId || !Number.isFinite(qty) || qty <= 0) return err('invalid_input', 400)

  try {
    const cost = batchId ? await prisma.batchCost.findFirst({ where: { batchId }, orderBy: { effectiveFrom: 'desc' } }) : null
    const sample = await prisma.sampleTransaction.create({
      data: {
        productId,
        vendorId,
        batchId,
        quantity: qty,
        unitCostSnapshot: cost?.unitCost ?? 0,
        transactionType: 'VENDOR_IN',
        transactionDate: new Date(),
        notes,
      },
    })
    return ok({ data: sample })
  } catch {
    return err('server_error', 500)
  }
})
