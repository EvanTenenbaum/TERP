import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ productId:string; qty:number; customerId?:string; vendorId?:string; batchId?:string; notes?:string }>({
  roles: ['SUPER_ADMIN','SALES','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'sample-return', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { productId, qty, customerId, vendorId, batchId } = json as any
  const notes = (json as any)?.notes ? String((json as any).notes).slice(0,512) : undefined
  if (!productId || !Number.isFinite(qty) || qty <= 0) return err('invalid_input', 400)

  try {
    const type = customerId ? 'CLIENT_RETURN' : 'VENDOR_RETURN'
    const cost = batchId ? await prisma.batchCost.findFirst({ where: { batchId }, orderBy: { effectiveFrom: 'desc' } }) : null
    const sample = await prisma.sampleTransaction.create({
      data: {
        productId,
        customerId,
        vendorId,
        batchId,
        quantity: qty,
        unitCostSnapshot: cost?.unitCost ?? 0,
        transactionType: type,
        transactionDate: new Date(),
        notes,
      },
    })
    return ok({ data: sample })
  } catch {
    return err('server_error', 500)
  }
})
