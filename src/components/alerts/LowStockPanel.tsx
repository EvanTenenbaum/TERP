"use client";

import { useState } from 'react'

export default function LowStockPanel() {
  const [threshold, setThreshold] = useState(10)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)

  const preview = async () => {
    setLoading(true)
    setApplied(false)
    const res = await fetch('/api/alerts/replenishment/preview', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ thresholdDefault: threshold })
    })
    const j = await res.json()
    setItems(j?.data?.items || [])
    setLoading(false)
  }

  const apply = async () => {
    const productIds = items.map((i:any)=>i.productId)
    const res = await fetch('/api/alerts/replenishment/apply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ productIds }) })
    setApplied(res.ok)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="number" min={0} value={threshold} onChange={e=>setThreshold(Number(e.target.value)||0)} className="w-24 border rounded px-2 py-1" />
        <button onClick={preview} className="px-3 py-1.5 rounded bg-blue-600 text-white">Preview</button>
        <button onClick={apply} className="px-3 py-1.5 rounded bg-green-600 text-white" disabled={!items.length}>Apply</button>
        {applied && <span className="text-green-700 text-sm">Applied</span>}
      </div>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left"><th className="p-2">Product</th><th className="p-2">On Hand</th><th className="p-2">Reserved</th><th className="p-2">Effective</th><th className="p-2">Threshold</th><th className="p-2">Suggested</th></tr></thead>
            <tbody>
              {items.map((i:any)=> (
                <tr key={i.productId} className="border-t">
                  <td className="p-2">{i.sku} — {i.name}</td>
                  <td className="p-2">{i.onHand}</td>
                  <td className="p-2">{i.reserved}</td>
                  <td className="p-2">{i.effective}</td>
                  <td className="p-2">{i.threshold}</td>
                  <td className="p-2">{i.suggested}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
