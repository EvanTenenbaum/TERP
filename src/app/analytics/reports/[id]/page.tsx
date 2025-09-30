'use client'
import { useEffect, useState } from 'react'
import ReportRenderer from '@/components/analytics/ReportRenderer'

export default function ReportViewPage({ params }: { params: { id: string } }) {
  const id = params.id
  const [report, setReport] = useState<any>(null)
  const [data, setData] = useState<any>(null)

  useEffect(()=>{ fetch(`/api/analytics/reports/${id}`).then(r=>r.json()).then(setReport).catch(()=>{}) },[id])
  useEffect(()=>{
    if (!report?.data?.spec) return
    fetch('/api/analytics/evaluate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ spec: report.data.spec }) })
      .then(r=>r.json()).then(setData).catch(()=>{})
  },[report])

  const duplicate = async () => {
    const res = await fetch(`/api/analytics/reports/${id}/duplicate`, { method: 'POST' })
    const j = await res.json()
    if (j?.data?.id) location.href = `/analytics/reports/${j.data.id}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{report?.data?.name || 'Report'}</h1>
          <div className="text-sm text-gray-500">Domain: {report?.data?.domain}</div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/analytics/reports/${id}/export?format=csv`} className="px-3 py-1.5 rounded border text-sm">Export CSV</a>
          <button onClick={duplicate} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">Duplicate</button>
        </div>
      </div>
      <ReportRenderer data={data?.data || null} onDrill={(p)=> console.log('drill', p)} />
    </div>
  )
}
