'use client'

import { useEffect, useState } from 'react'

export default function AdjustmentsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    ;(async()=>{
      try {
        const resp = await fetch('/api/inventory/adjustments')
        const data = await resp.json()
        setRows(data.rows || [])
      } finally { setLoading(false) }
    })()
  },[])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Adjustments Ledger</h1>
        <p className="text-sm text-gray-600">Write-offs and corrections, newest first.</p>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">No adjustments recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r:any)=> (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-sm text-gray-600">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.productName}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.vendorName}</td>
                  <td className="px-3 py-2 text-sm text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
