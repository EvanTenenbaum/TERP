'use client';

import { useEffect, useState, useCallback } from 'react'

export default function CreditsPage() {
  const [customerId, setCustomerId] = useState('')
  const [credits, setCredits] = useState<any[]>([])
  const [arId, setArId] = useState('')
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (customerId) params.set('customerId', customerId)
    const res = await fetch(`/api/finance/credits/list?${params.toString()}`)
    const j = await res.json()
    if (j.success) setCredits(j.data)
  }, [customerId])

  useEffect(()=>{ load() }, [load])

  const createMemo = async (cid: string) => {
    if (!arId || !amount) return
    const res = await fetch('/api/finance/credits/memos', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ arId, amountCents: Math.round(Number(amount)), reason:'manual' }) })
    if (res.ok) { setArId(''); setAmount(''); await load() }
  }

  const apply = async (creditId: string) => {
    if (!arId || !amount) return
    const res = await fetch('/api/finance/credits/apply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ arId, creditId, amountCents: Math.round(Number(amount)) }) })
    if (res.ok) { setAmount(''); await load() }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Customer Credits</h1>

      <div className="flex items-end gap-2">
        <div>
          <label className="block text-sm font-medium">Customer ID</label>
          <input value={customerId} onChange={e=>setCustomerId(e.target.value)} className="border rounded px-2 py-1" placeholder="optional" />
        </div>
        <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white">Load</button>
      </div>

      <div className="bg-white border rounded p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <input className="border rounded px-2 py-1" placeholder="AR ID" value={arId} onChange={e=>setArId(e.target.value)} />
          <input type="number" className="border rounded px-2 py-1" placeholder="Amount (cents)" value={amount} onChange={e=>setAmount(e.target.value)} />
          <button onClick={()=>createMemo(customerId)} className="px-3 py-2 rounded bg-indigo-600 text-white">Create Memo</button>
        </div>

        <table className="min-w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">Credit</th><th className="p-2">Balance</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {credits.map((c:any)=> (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.id}</td>
                <td className="p-2">{c.balanceCents}</td>
                <td className="p-2"><button onClick={()=>apply(c.id)} className="px-3 py-1.5 rounded bg-green-600 text-white">Apply to AR</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
