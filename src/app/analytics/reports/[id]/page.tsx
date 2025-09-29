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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{report?.data?.name || 'Report'}</h1>
        <div className="text-sm text-gray-500">Domain: {report?.data?.domain}</div>
      </div>
      <ReportRenderer data={data?.data || null} onDrill={(p)=> console.log('drill', p)} />
    </div>
  )
}
