'use client'
import { useEffect, useState } from 'react'

export default function NewReportPage() {
  const [catalog, setCatalog] = useState<any>(null)
  useEffect(()=>{ fetch('/api/analytics/catalog').then(r=>r.json()).then(setCatalog).catch(()=>{}) },[])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Report</h1>
      <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">{JSON.stringify(catalog, null, 2)}</pre>
    </div>
  )
}
