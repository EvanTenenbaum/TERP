"use client";

'use client'
import { useEffect, useState } from 'react'
import LowStockPanel from '@/components/alerts/LowStockPanel'

export default function AlertsPage() {
  const [rules, setRules] = useState<any[]>([])
  const [form, setForm] = useState({ field: 'InventoryAge', operator: '>', value: '', action: 'Alert', priority: 0 })

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/alerts/rules', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json()
        if (j.success) setRules(j.rules as any[])
      }
    })()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await fetch('/api/alerts/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: form.field,
        operator: form.operator,
        value: form.value,
        action: form.action,
        priority: Number(form.priority) || 0,
      }),
    })
    if (r.ok) {
      const res = await fetch('/api/alerts/rules', { cache: 'no-store' })
      if (res.ok) { const j = await res.json(); if (j.success) setRules(j.rules as any[]) }
      setForm({ field: 'InventoryAge', operator: '>', value: '', action: 'Alert', priority: 0 })
    }
  }

  const toggle = async (id: string, active: boolean) => {
    await fetch('/api/alerts/rules', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id, active: !active }) })
    const r = await fetch('/api/alerts/rules', { cache: 'no-store' })
    if (r.ok) { const j = await r.json(); if (j.success) setRules(j.rules as any[]) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete rule?')) return
    await fetch('/api/alerts/rules', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id }) })
    const r = await fetch('/api/alerts/rules', { cache: 'no-store' })
    if (r.ok) { const j = await r.json(); if (j.success) setRules(j.rules as any[]) }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts & Rules</h1>
        <p className="text-gray-600">Define rules to generate alerts or tasks.</p>
      </div>

      <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create Rule</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Field</label>
            <select className="w-full border rounded px-3 py-2" value={form.field} onChange={e=>setForm({...form, field: e.target.value})}>
              <option>InventoryAge</option>
              <option>QtyAvailable</option>
              <option>ARDays</option>
              <option>SalesVolume</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Operator</label>
            <select className="w-full border rounded px-3 py-2" value={form.operator} onChange={e=>setForm({...form, operator: e.target.value})}>
              <option>{'>'}</option>
              <option>{'<'}</option>
              <option>{'>='}</option>
              <option>{'<='}</option>
              <option>{'=='}</option>
              <option>{'!='}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Value</label>
            <input className="w-full border rounded px-3 py-2" value={form.value} onChange={e=>setForm({...form, value: e.target.value})} placeholder="e.g., 30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <select className="w-full border rounded px-3 py-2" value={form.action} onChange={e=>setForm({...form, action: e.target.value})}>
              <option>Alert</option>
              <option>Flag</option>
              <option>CreateTask</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={form.priority} onChange={e=>setForm({...form, priority: Number(e.target.value)})} />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Rule</button>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Existing Rules</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((r)=> (
                <tr key={r.id}>
                  <td className="px-4 py-2"><button onClick={()=>toggle(r.id, r.active)} className={r.active? 'text-green-700' : 'text-gray-500'}>{r.active ? 'On' : 'Off'}</button></td>
                  <td className="px-4 py-2">{r.field}</td>
                  <td className="px-4 py-2">{r.operator}</td>
                  <td className="px-4 py-2">{r.value}</td>
                  <td className="px-4 py-2">{r.action}</td>
                  <td className="px-4 py-2">{r.priority}</td>
                  <td className="px-4 py-2 space-x-3">
                    <button onClick={()=>remove(r.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Low-Stock Replenishment</h2>
        <LowStockPanel />
      </div>
    </div>
  )
}
