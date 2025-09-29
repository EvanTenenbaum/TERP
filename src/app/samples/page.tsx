'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClientLink } from '@/components/client/ClientLink'

export default function SamplesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const resp = await fetch(`/api/samples/list?${params.toString()}`)
    const data = await resp.json()
    setRows(data.data || [])
    setLoading(false)
  }, [from, to])

  useEffect(()=>{ load() },[load])

  async function convert(id: string, mode: 'QUOTE'|'ORDER') {
    const resp = await fetch('/api/samples/convert', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ id, mode }) })
    const data = await resp.json().catch(()=>({}))
    if (!resp.ok) return alert(data.error || 'Failed to convert')
    if (mode === 'QUOTE') window.location.href = `/quotes/${data.quote.id}`
    else window.location.href = `/orders`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <button onClick={load} className="h-9 px-3 rounded bg-blue-600 text-white">Filter</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Vendor</th>
              <th className="p-2">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.transactionDate).toLocaleString()}</td>
                  <td className="p-2">{r.transactionType}</td>
                  <td className="p-2">{r.product?.name ?? r.productId}</td>
                  <td className="p-2 text-right">{r.quantity}</td>
                  <td className="p-2">{r.customer ? (<ClientLink partyId={r.customer.partyId || r.customer.party?.id} fallbackHref="/clients">{r.customer.party?.name || r.customer.companyName}</ClientLink>) : '-'}</td>
                  <td className="p-2">{r.vendor ? (<ClientLink partyId={r.vendor.partyId || r.vendor.party?.id} fallbackHref="/clients">{r.vendor.party?.name || r.vendor.companyName}</ClientLink>) : '-'}</td>
                  <td className="p-2 text-center">
                    {r.transactionType === 'CLIENT_OUT' && r.customerId ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={()=>convert(r.id,'QUOTE')} className="px-2 py-1 rounded bg-amber-600 text-white">Convert to Quote</button>
                        <button onClick={()=>convert(r.id,'ORDER')} className="px-2 py-1 rounded bg-green-600 text-white">Convert to Order</button>
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
