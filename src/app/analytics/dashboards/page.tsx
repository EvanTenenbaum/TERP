'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { postJson } from '@/lib/fetcher'

export default function DashboardsListPage() {
  const [items, setItems] = useState<any[] | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    fetch('/api/analytics/dashboards').then(r=>r.json()).then(d=> setItems(d.data)).catch(()=> setItems([]))
  }
  useEffect(()=>{ load() }, [])

  const onCreate = async () => {
    setCreating(true)
    try {
      const name = `Dashboard ${new Date().toLocaleDateString()}`
      const res = await postJson<{ data:any }>("/api/analytics/dashboards", { name, layout:{}, visibility:'PRIVATE' })
      location.href = `/analytics/dashboards/${res.data.id}`
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboards</h1>
        <button className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm" onClick={onCreate} disabled={creating}>{creating?'Creating...':'New Dashboard'}</button>
      </div>
      {!items && <div className="text-sm text-gray-500">Loading...</div>}
      {items && items.length === 0 && <div className="text-sm text-gray-500">No dashboards yet. Create one to get started.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items?.map(d => (
          <Link key={d.id} href={`/analytics/dashboards/${d.id}`} className="block border rounded bg-white p-4 hover:shadow">
            <div className="font-medium">{d.name}</div>
            {d.description ? <div className="text-sm text-gray-500">{d.description}</div> : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
