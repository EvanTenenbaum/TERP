import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ensurePostingUnlocked } from '@/lib/system'

export const GET = api({})(async () => {
  const pos = await prisma.purchaseOrder.findMany({ include: { vendor: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } })
  return new Response(JSON.stringify({ success: true, purchaseOrders: pos }), { headers: { 'Content-Type':'application/json' } })
})

export const POST = api<{ vendorId:string; expectedAt?:string; poNumber?:string }>({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  postingLock: true,
  rate: { key: 'po-create', limit: 60 },
  parseJson: true,
})(async ({ json }) => {
  const { vendorId, expectedAt, poNumber } = json || ({} as any)
  if (!vendorId) return new Response(JSON.stringify({ success:false, error: 'invalid_input' }), { status: 400, headers: { 'Content-Type':'application/json' } })
  const count = await prisma.purchaseOrder.count()
  const defaultPo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4,'0')}`
  const po = await prisma.purchaseOrder.create({ data: { vendorId, poNumber: poNumber || defaultPo, expectedAt: expectedAt ? new Date(expectedAt) : null } })
  return new Response(JSON.stringify({ success: true, purchaseOrder: po }), { headers: { 'Content-Type':'application/json' } })
})
