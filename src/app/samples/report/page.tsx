'use client'

import { useEffect, useState, useCallback } from 'react'

export default function SamplesReportPage() {
  const [summary, setSummary] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const resp = await fetch(`/api/samples/report?${params.toString()}`)
    const data = await resp.json()
    setSummary(data.summary)
    setRows(data.rows || [])
    setLoading(false)
  }, [from, to])

  useEffect(()=>{ load() },[load])

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
        <button onClick={load} className="h-9 px-3 rounded bg-blue-600 text-white">Run</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total" value={summary?.total} />
            <Stat label="Outgoing" value={summary?.outgoing} />
            <Stat label="Incoming" value={summary?.incoming} />
            <Stat label="Client Returns" value={summary?.clientReturn} />
          </div>
          <div className="overflow-x-auto bg-white rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Vendor</th>
                <th className="p-2 text-left">Notes</th>
              </tr></thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{new Date(r.date).toLocaleString()}</td>
                    <td className="p-2">{r.type}</td>
                    <td className="p-2">{r.product}</td>
                    <td className="p-2 text-right">{r.qty}</td>
                    <td className="p-2">{r.customer ?? '-'}</td>
                    <td className="p-2">{r.vendor ?? '-'}</td>
                    <td className="p-2">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value ?? 0}</div>
    </div>
  )
}
