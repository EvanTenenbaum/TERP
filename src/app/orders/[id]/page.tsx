import prisma from '@/lib/prisma'
import Link from 'next/link'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const id = params.id
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, orderItems: { include: { product: true, batch: true } } } })
  if (!order) return <div className="container mx-auto px-4 py-8 text-gray-500">Not found</div>

  async function ship() {
    'use server'
    const r = await fetch(`/api/orders/${encodeURIComponent(id)}/ship`, { method: 'POST' })
    if (!r.ok) throw new Error('ship_failed')
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order {id.slice(0,8)}</h1>
          <div className="text-gray-600">{order.customer?.companyName || '—'} · {order.status}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/orders/${id}/pdf`} className="px-4 py-2 rounded border">Packing Slip PDF</Link>
          {(order.status === 'ALLOCATED' || order.status === 'CONFIRMED') && (
            <form action={ship}><button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Ship Order</button></form>
          )}
          <Link href="/orders" className="px-4 py-2 rounded border">Back</Link>
        </div>
      </div>

      <div className="bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr className="text-left"><th className="p-2">Product</th><th className="p-2">Batch</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">COGS</th></tr></thead>
          <tbody>
            {order.orderItems.map((it:any)=>(
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.product?.name || it.productId}</td>
                <td className="p-2">{it.batchId || '-'}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right">${(it.unitPrice/100).toFixed(2)}</td>
                <td className="p-2 text-right">{it.cogsTotalCents != null ? `$${(it.cogsTotalCents/100).toFixed(2)}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
