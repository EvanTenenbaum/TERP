"use client";

import { useEffect, useState } from 'react'

export default function CategoriesPage() {
  const [cats, setCats] = useState<any[]>([])
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')

  const load = async () => {
    const resp = await fetch('/api/categories')
    const res = await resp.json()
    if (res.success) setCats(res.categories as any[])
  }
  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const resp = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), parentId: parentId || undefined }) })
    if (!resp.ok) { alert('Failed'); return }
    setName(''); setParentId(''); await load()
  }

  const toggle = async (id: string, active: boolean) => {
    const c = cats.find(x=>x.id===id)
    if (!c) return
    await fetch(`/api/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: c.name, parentId: c.parentId || undefined, isActive: !active }) })
    await load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete category?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
        <p className="text-gray-600">Organize products with hierarchical categories.</p>
      </div>

      <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Parent</label>
            <select className="w-full border rounded px-3 py-2" value={parentId} onChange={(e)=>setParentId(e.target.value)}>
              <option value="">None</option>
              {cats.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Existing Categories</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cats.map(c=> (
                <tr key={c.id}>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{cats.find(x=>x.id===c.parentId)?.name || '-'}</td>
                  <td className="px-4 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 space-x-3">
                    <button onClick={()=>toggle(c.id, c.isActive)} className="text-blue-600 hover:text-blue-800">{c.isActive? 'Deactivate' : 'Activate'}</button>
                    <button onClick={()=>remove(c.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
