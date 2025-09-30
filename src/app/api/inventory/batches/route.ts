import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const POST = api<{ productId:string; vendorId:string; lotNumber?:string; batchNumber?:string; receivedDate?:string; expirationDate?:string | null; quantityReceived:number; quantity?:number; initialCost?:number }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'batches-create', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  try {
    const productId = String(json!.productId || '')
    const vendorId = String(json!.vendorId || '')
    const lotNumber = String(json!.lotNumber || json!.batchNumber || '').trim()
    const receivedDate = new Date((json as any).receivedDate || Date.now())
    const expirationDate = (json as any).expirationDate ? new Date((json as any).expirationDate) : null
    const quantityReceived = Math.round(Number((json as any).quantityReceived ?? (json as any).quantity))
    const initialCostDollars = Number((json as any).initialCost)

    if (!productId || !vendorId || !lotNumber || !Number.isFinite(quantityReceived) || quantityReceived <= 0) {
      return err('invalid_input', 400)
    }

    const initialUnitCost = Math.round((Number.isFinite(initialCostDollars) ? initialCostDollars : 0) * 100)

    if ((json as any).poId) {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: String((json as any).poId) }, select: { status: true } })
      if (!po || po.status !== 'APPROVED') return err('po_not_approved', 409)
    }

    const batch = await prisma.batch.create({
      data: {
        productId,
        vendorId,
        lotNumber: lotNumber.slice(0,64),
        receivedDate,
        expirationDate: expirationDate ?? undefined,
        quantityReceived,
        quantityAvailable: quantityReceived,
        batchCosts: {
          create: {
            effectiveFrom: receivedDate,
            unitCost: initialUnitCost
          }
        }
      },
      include: { product: true, vendor: true, batchCosts: true }
    })

    return ok({ batch })
  } catch (e) {
    return err('server_error', 500)
  }
})
