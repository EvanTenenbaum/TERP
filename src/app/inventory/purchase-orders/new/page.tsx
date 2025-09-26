"use client";

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPOPage() {
  const r = useRouter()
  const [vendors, setVendors] = useState<any[]>([])
  const [vendorId, setVendorId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const v = await fetch('/api/vendors').catch(()=>null)
      let data: any = null
      try { data = v ? await v.json() : null } catch {}
      if (data && data.success) setVendors(data.vendors)
    })()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) return
    setLoading(true)
    const resp = await fetch('/api/purchase-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, expectedAt: expectedAt || undefined, poNumber: poNumber || undefined })
    })
    const data = await resp.json()
    setLoading(false)
    if (data.success) r.push(`/inventory/purchase-orders/${data.purchaseOrder.id}`)
    else alert(data.error || 'Failed to create PO')
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Purchase Order</h1>
      </div>
      <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1">Vendor</label>
          <select className="w-full border rounded px-3 py-2" value={vendorId} onChange={(e)=>setVendorId(e.target.value)} required>
            <option value="">Select vendor…</option>
            {vendors.map((v:any)=> (<option key={v.id} value={v.id}>{v.companyName}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Expected Date</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={expectedAt} onChange={(e)=>setExpectedAt(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">PO Number (optional)</label>
          <input className="w-full border rounded px-3 py-2" value={poNumber} onChange={(e)=>setPoNumber(e.target.value)} />
        </div>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading? 'Creating…' : 'Create PO'}</button>
      </form>
    </div>
  )
}
