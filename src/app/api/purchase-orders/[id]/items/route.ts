import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import { ensurePostingUnlocked } from '@/lib/system'

export const POST = api<{ productId:string; quantity:number; unitCost:number }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'po-add-item', limit: 240 },
  parseJson: true,
})(async ({ json, params }) => {
  const { productId, quantity, unitCost } = json || ({} as any)
  if (!productId || !quantity || !unitCost) return err('invalid_input', 400)
  const item = await prisma.purchaseOrderItem.create({ data: { poId: params!.id, productId, quantity: Number(quantity), unitCost: Number(unitCost) }, include: { product: true } })
  return ok({ item })
})
