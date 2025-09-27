'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function DiscrepanciesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { push } = useToast()

  useEffect(()=>{
    ;(async()=>{
      try {
        const resp = await fetch('/api/inventory/discrepancies')
        const data = await resp.json()
        setRows(data.rows || [])
      } finally { setLoading(false) }
    })()
  },[])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Discrepancies</h1>
        <p className="text-sm text-gray-600">Compares on-hand vs allocated+available; non-zero differences indicate issues.</p>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">No discrepancies found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">On Hand</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancy</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Movement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r:any)=> (
                <tr key={r.lotId}>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.lotId}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.productName}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.vendorName}</td>
                  <td className="px-3 py-2 text-sm text-right">{r.quantityOnHand}</td>
                  <td className="px-3 py-2 text-sm text-right">{r.quantityAllocated}</td>
                  <td className="px-3 py-2 text-sm text-right">{r.quantityAvailable}</td>
                  <td className="px-3 py-2 text-sm text-right font-semibold"><span className={r.discrepancy !== 0 ? 'text-red-600' : ''}>{r.discrepancy}</span></td>
                  <td className="px-3 py-2 text-sm text-gray-600">{new Date(r.lastMovementDate).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm">
                    <Button onClick={async()=>{
                      const resp = await fetch('/api/inventory/discrepancies/resolve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lotId:r.lotId})})
                      const data = await resp.json().catch(()=>({}))
                      if(resp.ok){
                        push({ message: 'Discrepancy resolved', actionText: 'Undo', onAction: async ()=>{
                          const u = await fetch('/api/inventory/discrepancies/resolve/undo',{ method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ lotId: r.lotId }) })
                          if (u.ok) location.reload()
                        } })
                        setTimeout(()=> location.reload(), 1200)
                      } else {
                        push({ message: data.error || 'Failed to resolve' })
                      }
                    }} className="px-2 py-1">Resolve</Button>
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
