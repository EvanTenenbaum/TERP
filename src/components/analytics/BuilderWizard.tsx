"use client";
import { useEffect, useMemo, useState } from 'react'

type Catalog = {
  metrics: { id:string; label:string; domain:'SALES'|'FINANCE'|'INVENTORY'|'OPERATIONS'; defaultViz:string }[]
  dimensions: { id:string; label:string }[]
  breakdowns: { id:string; label:string }[]
  filters: { field:string; label:string; type:'select'|'text'|'number' }[]
  options: { customers:{id:string; label:string}[]; vendors:{id:string; label:string}[]; products:{id:string; label:string}[] }
}

type ReportSpec = {
  metric: string
  dimension?: string
  breakdown?: string
  dateRange: { mode:'relative'|'absolute'; value?: 'today'|'7d'|'30d'|'qtd'|'ytd'; from?: string; to?: string }
  filters: { field:string; op:'eq'|'neq'|'gt'|'lt'|'gte'|'lte'|'contains'|'in'; value:string|number|(string|number)[] }[]
  limit?: number
  orderBy?: { field:string; dir:'asc'|'desc' }
}

type Presentation = { viz:'auto'|'table'|'bar'|'line'|'pie'|'kpi'; columns?:string[]; sort?:{field:string;dir:'asc'|'desc'}; format?:Record<string,string>; drilldownEnabled?:boolean; titleOverride?:string }

export default function BuilderWizard({ catalog, value, onChange }: { catalog: Catalog; value: { spec: ReportSpec; presentation: Presentation }; onChange: (v:{ spec: ReportSpec; presentation: Presentation }) => void }) {
  const [spec, setSpec] = useState<ReportSpec>(value.spec)
  const [pres, setPres] = useState<Presentation>(value.presentation)

  useEffect(()=>{ onChange({ spec, presentation: pres }) }, [spec, pres, onChange])

  const metricDef = useMemo(()=> catalog.metrics.find(m => m.id === spec.metric), [catalog, spec.metric])

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded p-4">
        <h3 className="font-medium mb-2">1. Metric</h3>
        <select className="border rounded px-2 py-1" value={spec.metric} onChange={e=> setSpec(s=> ({...s, metric: e.target.value}))}>
          {catalog.metrics.map(m=> <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div className="text-xs text-gray-500 mt-1">Domain: {metricDef?.domain || '-'}</div>
      </section>

      <section className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">2. Dimension & Breakdown</h3>
          <label className="block text-sm text-gray-700 mb-1">Dimension</label>
          <select className="border rounded px-2 py-1 w-full" value={spec.dimension || ''} onChange={e=> setSpec(s=> ({...s, dimension: e.target.value || undefined}))}>
            <option value="">(none)</option>
            {catalog.dimensions.map(d=> <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <label className="block text-sm text-gray-700 mt-3 mb-1">Breakdown</label>
          <select className="border rounded px-2 py-1 w-full" value={spec.breakdown || ''} onChange={e=> setSpec(s=> ({...s, breakdown: e.target.value || undefined}))}>
            <option value="">(none)</option>
            {catalog.breakdowns.map(b=> <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <h3 className="font-medium mb-2">3. Date Range</h3>
          <div className="flex flex-wrap gap-2">
            {['today','7d','30d','qtd','ytd'].map(v=> (
              <button key={v} className={`px-2 py-1 rounded border ${spec.dateRange.mode==='relative'&&spec.dateRange.value===v?'bg-blue-600 text-white':'bg-white'}`} onClick={()=> setSpec(s=> ({...s, dateRange: { mode:'relative', value: v as any }}))}>{v}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border rounded p-4">
        <h3 className="font-medium mb-2">4. Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Customer</label>
            <select multiple className="border rounded px-2 py-1 w-full h-24" value={(spec.filters.find(f=>f.field==='customerId')?.value as string[])||[]} onChange={e=>{
              const vals = Array.from(e.target.selectedOptions).map(o=>o.value)
              setSpec(s=> ({...s, filters: upsertFilter(s.filters, { field:'customerId', op:'in', value: vals })}))
            }}>
              {catalog.options.customers.map(c=> <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Vendor</label>
            <select multiple className="border rounded px-2 py-1 w-full h-24" value={(spec.filters.find(f=>f.field==='vendorId')?.value as string[])||[]} onChange={e=>{
              const vals = Array.from(e.target.selectedOptions).map(o=>o.value)
              setSpec(s=> ({...s, filters: upsertFilter(s.filters, { field:'vendorId', op:'in', value: vals })}))
            }}>
              {catalog.options.vendors.map(v=> <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Product</label>
            <select multiple className="border rounded px-2 py-1 w-full h-24" value={(spec.filters.find(f=>f.field==='productId')?.value as string[])||[]} onChange={e=>{
              const vals = Array.from(e.target.selectedOptions).map(o=>o.value)
              setSpec(s=> ({...s, filters: upsertFilter(s.filters, { field:'productId', op:'in', value: vals })}))
            }}>
              {catalog.options.products.map(p=> <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">5. Visualization</h3>
          <select className="border rounded px-2 py-1" value={pres.viz} onChange={e=> setPres(p=> ({...p, viz: e.target.value as any}))}>
            {['auto','table','bar','line','pie','kpi'].map(v=> <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <h3 className="font-medium mb-2">6. Options</h3>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={pres.drilldownEnabled!==false} onChange={e=> setPres(p=> ({...p, drilldownEnabled: e.target.checked}))}/> Enable drilldown</label>
        </div>
      </section>
    </div>
  )
}

function upsertFilter(filters: ReportSpec['filters'], f: ReportSpec['filters'][number]) {
  const i = filters.findIndex(x => x.field === f.field)
  if (i === -1) return [...filters, f]
  const next = filters.slice(); next[i] = f; return next
}
