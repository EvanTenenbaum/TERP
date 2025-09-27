'use client';

import { useEffect, useState, useCallback } from 'react'

export default function AuditLogPage() {
  const [items, setItems] = useState<any[]>([])
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (entityType) params.set('entityType', entityType)
    if (entityId) params.set('entityId', entityId)
    const res = await fetch(`/api/audit?${params.toString()}`)
    const j = await res.json()
    if (j.success) setItems(j.data)
  }, [entityType, entityId])

  useEffect(()=>{ load() }, [load])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium">Entity Type</label>
          <select value={entityType} onChange={e=>setEntityType(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Any</option>
            <option value="product">Product</option>
            <option value="vendor">Vendor</option>
            <option value="order">Order</option>
            <option value="quote">Quote</option>
            <option value="lot">Lot</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Entity ID</label>
          <input value={entityId} onChange={e=>setEntityId(e.target.value)} className="border rounded px-2 py-1" placeholder="optional" />
        </div>
        <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Search</button>
      </div>

      <div className="bg-white border rounded">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">When</th><th className="p-2">Type</th><th className="p-2">Summary</th></tr></thead>
          <tbody>
            {items.map((i:any, idx:number)=> (
              <tr key={idx} className="border-t">
                <td className="p-2">{new Date(i.when).toLocaleString()}</td>
                <td className="p-2">{i.type}</td>
                <td className="p-2">{i.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
