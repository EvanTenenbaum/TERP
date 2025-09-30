'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardGrid, { DashboardWidget, WidgetPosition } from '@/components/analytics/DashboardGrid'
import ReportRenderer from '@/components/analytics/ReportRenderer'
import { deleteJson, fetcher, patchJson, postJson } from '@/lib/fetcher'

export default function DashboardViewPage({ params }: { params: { id: string } }) {
  const id = params.id
  const [dashboard, setDashboard] = useState<any>(null)
  const [widgets, setWidgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [reports, setReports] = useState<any[] | null>(null)

  const load = useCallback(()=>{
    setLoading(true)
    fetch(`/api/analytics/dashboards/${id}`).then(r=>r.json()).then((res)=>{
      setDashboard(res.data)
      setWidgets(res.data.widgets || [])
    }).finally(()=> setLoading(false))
  },[id])

  useEffect(()=>{ load() }, [load])

  useEffect(()=>{
    if (!showPicker || reports) return
    fetch('/api/analytics/reports').then(r=>r.json()).then(d=> setReports(d.data)).catch(()=> setReports([]))
  }, [showPicker, reports])

  const gridWidgets: DashboardWidget[] = useMemo(()=> widgets.map((w:any)=> ({
    id: w.id,
    title: w.title || w.reportId,
    position: toPos(w.position),
    content: <WidgetRenderer key={w.id} reportId={w.reportId} snapshotId={w.snapshotId} vizOverride={toPos(w.position).vizOverride} />
  })), [widgets])

  const onMove = async (wid: string, dir: 'up'|'down') => {
    const ordered = [...widgets].sort((a,b)=> (toPos(a.position).order) - (toPos(b.position).order))
    const idx = ordered.findIndex(w=> w.id === wid)
    const swapWith = dir === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= ordered.length) return
    const a = ordered[idx]; const b = ordered[swapWith]
    const aPos = toPos(a.position); const bPos = toPos(b.position)
    const nextWidgets = widgets.map(w=> w.id===a.id?{...w, position:{...w.position, order:bPos.order}}: w.id===b.id?{...w, position:{...w.position, order:aPos.order}}: w)
    setWidgets(nextWidgets)
    await Promise.all([
      patchJson(`/api/analytics/dashboards/${id}/widgets/${a.id}`, { position: { ...aPos, order: bPos.order } }),
      patchJson(`/api/analytics/dashboards/${id}/widgets/${b.id}`, { position: { ...bPos, order: aPos.order } }),
    ])
  }

  const onResize = async (wid: string, pos: WidgetPosition) => {
    setWidgets(ws => ws.map(w => w.id === wid ? { ...w, position: { ...(w.position||{}), ...pos } } : w))
    await patchJson(`/api/analytics/dashboards/${id}/widgets/${wid}`, { position: pos })
  }

  const onRemove = async (wid: string) => {
    setWidgets(ws => ws.filter(w => w.id !== wid))
    await deleteJson(`/api/analytics/dashboards/${id}/widgets/${wid}`)
  }

  const onRename = async (wid: string, title: string) => {
    setWidgets(ws => ws.map(w => w.id === wid ? { ...w, title } : w))
    await patchJson(`/api/analytics/dashboards/${id}/widgets/${wid}`, { title })
  }

  const onAdd = async (reportId: string) => {
    const order = widgets.length ? Math.max(...widgets.map(w=> toPos(w.position).order)) + 1 : 0
    const res = await postJson<{ data:any }>(`/api/analytics/dashboards/${id}/widgets`, { reportId, position: { order, colSpan:1, rowSpan:1 } })
    setWidgets(ws => [...ws, res.data])
    setShowPicker(false)
  }

  const onMetaChange = async (patch: any) => {
    const next = { ...dashboard, ...patch }
    setDashboard(next)
    await patchJson(`/api/analytics/dashboards/${id}`, patch)
  }

  if (loading) return <div className="text-sm text-gray-500">Loading dashboard...</div>
  if (!dashboard) return <div className="text-sm text-red-600">Dashboard not found</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-[240px]">
          {edit ? (
            <div className="flex flex-col gap-2">
              <input
                className="border rounded px-2 py-1 text-sm"
                value={dashboard.name || ''}
                onChange={(e)=> onMetaChange({ name: e.target.value })}
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                value={dashboard.description || ''}
                onChange={(e)=> onMetaChange({ description: e.target.value })}
                placeholder="Description"
              />
              <select
                className="border rounded px-2 py-1 text-sm"
                value={dashboard.visibility}
                onChange={(e)=> onMetaChange({ visibility: e.target.value })}
              >
                <option value="PRIVATE">PRIVATE</option>
                <option value="SHARED">SHARED</option>
                <option value="ORG_DEFAULT">ORG_DEFAULT</option>
              </select>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-semibold">{dashboard.name}</h1>
              {dashboard.description ? <div className="text-sm text-gray-500">{dashboard.description}</div> : null}
              <div className="text-xs text-gray-500 mt-1">Visibility: {dashboard.visibility}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded border text-sm" onClick={()=> setEdit(e=>!e)}>{edit? 'Done' : 'Edit'}</button>
          <button className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm" onClick={()=> setShowPicker(true)}>Add Widget</button>
        </div>
      </div>

      <DashboardGrid widgets={gridWidgets} editMode={edit} onMove={onMove} onResize={onResize} onRemove={onRemove} onRename={onRename} onVizChange={async (wid, viz)=>{
        setWidgets(ws => ws.map(w => w.id === wid ? { ...w, position: { ...(w.position||{}), vizOverride: viz } } : w))
        const w = widgets.find(x=> x.id===wid)
        const pos = toPos(w?.position)
        await patchJson(`/api/analytics/dashboards/${id}/widgets/${wid}`, { position: { ...pos, vizOverride: viz } })
      }} />

      {showPicker && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={()=> setShowPicker(false)}>
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-4" onClick={(e)=> e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Add Widget</div>
              <button className="text-sm" onClick={()=> setShowPicker(false)}>Close</button>
            </div>
            <div className="max-h-80 overflow-auto divide-y">
              {reports?.map(r => (
                <div key={r.id} className="p-2 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.domain}</div>
                  </div>
                  <button className="px-2 py-1 text-sm border rounded" onClick={()=> onAdd(r.id)}>Add</button>
                </div>
              ))}
              {!reports && <div className="p-2 text-sm text-gray-500">Loading reports...</div>}
              {reports?.length === 0 && <div className="p-2 text-sm text-gray-500">No reports available</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function toPos(p: any): WidgetPosition {
  const d = p || {}
  return { order: typeof d.order === 'number' ? d.order : 0, colSpan: d.colSpan ?? 1, rowSpan: d.rowSpan ?? 1, vizOverride: d.vizOverride }
}

function WidgetRenderer({ reportId, snapshotId, vizOverride }: { reportId: string; snapshotId?: string | null; vizOverride?: WidgetPosition['vizOverride'] }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let alive = true
    async function run() {
      setLoading(true)
      try {
        if (snapshotId) {
          const snap = await fetcher<{ data:any }>(`/api/analytics/snapshots/${snapshotId}`)
          if (!alive) return
          const payload = snap.data.data
          const forced = vizOverride && vizOverride !== 'auto' ? { ...payload, meta: { ...(payload?.meta||{}), viz: vizOverride } } : payload
          setData(forced)
        } else {
          const rep = await fetcher<{ data:any }>(`/api/analytics/reports/${reportId}`)
          const res = await fetcher<{ data:any }>(`/api/analytics/evaluate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ spec: rep.data.spec }) })
          if (!alive) return
          const payload = res.data
          const forced = vizOverride && vizOverride !== 'auto' ? { ...payload, meta: { ...(payload?.meta||{}), viz: vizOverride } } : payload
          setData(forced)
        }
      } catch (e) {
        if (!alive) return
        setData({ rows: [], meta: { viz: 'table', recommendedViz: 'table' } })
      } finally { if (alive) setLoading(false) }
    }
    run()
    return ()=> { alive = false }
  }, [reportId, snapshotId])

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>
  return <ReportRenderer data={data} />
}
