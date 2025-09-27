'use client';

import { useEffect, useState, useCallback } from 'react'
import { getSale, listSaleEvents, updateSaleStatus } from '@/actions/b2bSale'

export default function B2BOrderDetail({ params }: { params: { id: string } }) {
  const saleId = params.id
  const [sale, setSale] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  const load = useCallback(async () => {
    const s = await getSale(saleId)
    if (s.success) setSale(s.sale)
    const ev = await listSaleEvents(saleId)
    if (ev.success) setEvents(ev.events)
  }, [saleId])

  useEffect(()=> { load() }, [load])

  const setStatus = async (status: any) => {
    await updateSaleStatus(saleId, status)
    load()
  }

  if (!sale) return <div className="container mx-auto px-4 py-8 text-gray-500">Loading…</div>

  const actions = ['COMMITTED','DEPARTED','ARRIVED','ACCEPTED','REJECTED']

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{sale.type.toUpperCase()} · {sale.status}</h1>
            <div className="text-sm text-gray-500">Created {new Date(sale.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            {actions.map(a=> (
              <button key={a} onClick={()=>setStatus(a as any)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Items</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Unit Price</th></tr></thead>
          <tbody className="divide-y divide-gray-200">
            {sale.itemList.map((it:any)=> (
              <tr key={it.id}><td className="px-3 py-2">{it.product?.name || it.productId}</td><td className="px-3 py-2">{it.unitCount}</td><td className="px-3 py-2">${(it.unitPrice/100).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Events</h2>
        <ul className="space-y-2">
          {events.map((e:any)=> (
            <li key={e.id} className="text-sm text-gray-700">{new Date(e.createdAt).toLocaleString()} · {e.eventType}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
