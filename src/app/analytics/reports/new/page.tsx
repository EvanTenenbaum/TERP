'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BuilderWizard from '@/components/analytics/BuilderWizard'
import ReportRenderer from '@/components/analytics/ReportRenderer'
import { postJson } from '@/lib/fetcher'

export default function NewReportPage() {
  const [catalog, setCatalog] = useState<any>(null)
  const [spec, setSpec] = useState({ metric:'sales_total', dateRange:{ mode:'relative', value:'30d' }, filters:[] as any[] })
  const [presentation, setPresentation] = useState({ viz:'auto' as const, drilldownEnabled: true })
  const [preview, setPreview] = useState<{ rows:any[]; meta:any }|null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('New Report')

  useEffect(()=>{ fetch('/api/analytics/catalog').then(r=>r.json()).then(d=> setCatalog(d.data)).catch(()=>{}) },[])

  const onChange = useCallback((v:any)=>{
    setSpec(v.spec); setPresentation(v.presentation)
  },[])

  useEffect(()=>{
    let alive = true
    const body = { spec }
    fetch('/api/analytics/evaluate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      .then(r=>r.json()).then(d=> { if (alive) setPreview(d.data) }).catch(()=>{})
    return ()=>{ alive = false }
  }, [spec])

  const onSave = async () => {
    setSaving(true)
    try {
      const metric = catalog?.metrics?.find((m:any)=> m.id === spec.metric)
      const domain = metric?.domain || 'OPERATIONS'
      const res = await postJson<{ data:{ id:string } }>('/api/analytics/reports', { name, domain, spec, presentation })
      location.href = `/analytics/reports/${res.data.id}`
    } finally { setSaving(false) }
  }

  const initial = useMemo(()=> ({ spec, presentation }), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New Report</h1>
        <div className="flex items-center gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          <button onClick={onSave} disabled={saving} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">{saving?'Saving...':'Save'}</button>
        </div>
      </div>
      {catalog ? (
        <BuilderWizard catalog={catalog} value={initial} onChange={onChange} />
      ) : (
        <div className="text-sm text-gray-500">Loading catalog...</div>
      )}
      <div>
        <h3 className="font-medium mb-2">Preview</h3>
        <ReportRenderer data={preview} onDrill={(p)=> console.log('drill', p)} />
      </div>
    </div>
  )
}
