"use client";

import { useState } from 'react'

export default function EffectiveInspector() {
  const [productId, setProductId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [role, setRole] = useState('')
  const [result, setResult] = useState<any>(null)

  const fetchEffective = async () => {
    if (!productId) return
    const params = new URLSearchParams({ productId })
    if (customerId) params.set('customerId', customerId)
    if (role) params.set('role', role)
    const res = await fetch(`/api/price-books/effective?${params}`)
    const j = await res.json()
    setResult(j.data)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border rounded px-2 py-1" placeholder="Product ID" value={productId} onChange={e=>setProductId(e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder="Customer ID (optional)" value={customerId} onChange={e=>setCustomerId(e.target.value)} />
        <select className="border rounded px-2 py-1" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">Role (optional)</option>
          <option value="SALES">SALES</option>
          <option value="ACCOUNTING">ACCOUNTING</option>
          <option value="READ_ONLY">READ_ONLY</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
        <button onClick={fetchEffective} className="px-3 py-2 rounded bg-blue-600 text-white">Inspect</button>
      </div>
      {result ? (
        <div className="text-sm text-gray-800">Effective: <span className="font-semibold">{result.unitPriceCents}</span> cents from <span className="font-semibold">{result.source}</span></div>
      ) : (
        <div className="text-sm text-gray-500">Enter IDs and Inspect to see effective price.</div>
      )}
    </div>
  )
}
