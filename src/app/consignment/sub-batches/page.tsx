'use client'

import { useEffect, useState } from 'react'

export default function ConsignmentSubBatchesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ batchId:'', tierName:'', qtyAllocated:'', unitCostOverrideCents:'' })

  async function load() {
    setLoading(true)
    const resp = await fetch('/api/consignment/sub-batches/list')
    const data = await resp.json()
    setRows(data.data || [])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const body: any = { batchId: form.batchId, tierName: form.tierName, qtyAllocated: Number(form.qtyAllocated) }
    if (form.unitCostOverrideCents) body.unitCostOverrideCents = Math.round(Number(form.unitCostOverrideCents))
    const resp = await fetch('/api/consignment/sub-batches', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
    const data = await resp.json().catch(()=>({}))
    if (!resp.ok) return alert(data.error || 'Failed to create')
    setForm({ batchId:'', tierName:'', qtyAllocated:'', unitCostOverrideCents:'' })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consignment Tier Pricing</h1>
        <p className="text-sm text-gray-600">Create and view sub-batches for consignment lots.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded border p-4 grid md:grid-cols-4 gap-3">
        <input className="border rounded px-2 py-1" placeholder="Batch ID" value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})} required />
        <input className="border rounded px-2 py-1" placeholder="Tier Name" value={form.tierName} onChange={e=>setForm({...form,tierName:e.target.value})} required />
        <input type="number" className="border rounded px-2 py-1" placeholder="Qty" value={form.qtyAllocated} onChange={e=>setForm({...form,qtyAllocated:e.target.value})} required />
        <input type="number" className="border rounded px-2 py-1" placeholder="Unit Cost Override (cents)" value={form.unitCostOverrideCents} onChange={e=>setForm({...form,unitCostOverrideCents:e.target.value})} />
        <div className="md:col-span-4">
          <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white">Create</button>
        </div>
      </form>

      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="p-2 text-left">When</th>
              <th className="p-2 text-left">Batch</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Vendor</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Unit Cost Override</th>
            </tr></thead>
            <tbody>
              {rows.map((r:any)=> (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-2">{r.batchId}</td>
                  <td className="p-2">{r.batch?.product?.name ?? r.batch?.productId}</td>
                  <td className="p-2">{r.batch?.vendor?.companyName ?? r.batch?.vendorId}</td>
                  <td className="p-2 text-right">{r.qtyAllocated}</td>
                  <td className="p-2 text-right">{r.unitCostOverrideCents ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
