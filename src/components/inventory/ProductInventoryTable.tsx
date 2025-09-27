"use client"

import { useEffect, useMemo, useState } from 'react'

type IntakeGroup = { date: string; onHand: number; allocated: number; available: number; batchCount: number }

type Row = {
  productId: string
  sku: string
  name: string
  category: string
  defaultPrice: number
  totals: { onHand: number; allocated: number; available: number }
  intake: { latest: string | null; oldest: string | null; groups: IntakeGroup[] }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString()
}

export default function ProductInventoryTable() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'intake'|'sku'|'name'>('intake')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/inventory/products/summary')
      .then(r => r.json())
      .then(json => {
        if (!mounted) return
        if (json?.success) setRows(json.data as Row[])
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const base = term
      ? rows.filter(r => r.sku.toLowerCase().includes(term) || r.name.toLowerCase().includes(term) || r.category.toLowerCase().includes(term))
      : rows
    const sorted = [...base].sort((a,b) => {
      if (sort === 'sku') return a.sku.localeCompare(b.sku)
      if (sort === 'name') return a.name.localeCompare(b.name)
      const aInt = a.intake.latest ? new Date(a.intake.latest).getTime() : 0
      const bInt = b.intake.latest ? new Date(b.intake.latest).getTime() : 0
      return bInt - aInt
    })
    return sorted
  }, [rows, q, sort])

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading inventory…</div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-medium text-gray-900">Product Inventory</h3>
          <div className="flex items-center gap-3">
            <input value={q} onChange={(e)=>setQ(e.target.value)} type="text" placeholder="Search by SKU, name, category…" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            <select value={sort} onChange={e=>setSort(e.target.value as any)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="intake">Sort: Latest Intake</option>
              <option value="sku">Sort: SKU</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Intake</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">On Hand</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No products found.</td>
              </tr>
            )}
            {filtered.map(row => {
              const isOpen = !!expanded[row.productId]
              return [
                (
                  <tr key={`${row.productId}-main`} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <button aria-label={isOpen? 'Collapse' : 'Expand'} onClick={()=>setExpanded(prev=>({ ...prev, [row.productId]: !isOpen }))} className="p-1 rounded hover:bg-gray-100 border">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${isOpen ? '' : 'rotate-[-90deg]'} transition-transform`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                        </button>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <span>{row.name}</span>
                            <button onClick={async()=>{if(!confirm('Deactivate this product?')) return; const resp=await fetch('/api/products',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:row.productId,isActive:false})}); if(resp.ok){ location.reload() } else { const j=await resp.json().catch(()=>({})); alert(j.error||'Failed') }}} className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-50">Deactivate</button>
                          </div>
                          <div className="text-xs text-gray-500">SKU: {row.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{row.category || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{formatDate(row.intake.latest)}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.totals.onHand}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.totals.allocated}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.totals.available}</td>
                  </tr>
                ),
                (
                  isOpen ? (
                    <tr key={`${row.productId}-detail`}>
                      <td colSpan={6} className="px-6 py-3 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700 mb-2">Intake groups</div>
                        {row.intake.groups.length === 0 ? (
                          <div className="text-sm text-gray-500">No intakes yet.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intake Date</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">On Hand</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Batches</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {row.intake.groups.map(g => (
                                  <tr key={`${row.productId}-${g.date}`}>
                                    <td className="px-4 py-2">{new Date(g.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{g.onHand}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{g.allocated}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{g.available}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{g.batchCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500">Lots and batches are tracked under the hood; this view organizes inventory by product and intake date for simplicity.</div>
                      </td>
                    </tr>
                  ) : null
                )
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
