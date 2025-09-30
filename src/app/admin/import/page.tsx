'use client'
import { useState } from 'react'
import { postJson } from '@/lib/fetcher'

function parseCsv(text: string) {
  const rows: any[] = []
  const lines = text.split(/\r?\n/).filter(l=> l.trim().length>0)
  if (!lines.length) return rows
  const headers = lines[0].split(',').map(h=> h.replace(/^\"|\"$/g,'').trim())
  for (let i=1;i<lines.length;i++) {
    const cols = [] as string[]
    let cur = ''
    let inQ = false
    const s = lines[i]
    for (let j=0;j<s.length;j++) {
      const c = s[j]
      if (c === '"') {
        if (inQ && s[j+1] === '"') { cur += '"'; j++; }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        cols.push(cur); cur=''
      } else cur += c
    }
    cols.push(cur)
    const rec: any = {}
    headers.forEach((h,idx)=> rec[h] = cols[idx]?.trim?.())
    rows.push(rec)
  }
  return rows
}

export default function ImportAdminPage() {
  const [type, setType] = useState<'products'|'customers'|'pricebook'>('products')
  const [text, setText] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [results, setResults] = useState<any[]|null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (f: File) => {
    const t = await f.text()
    setText(t)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  const submit = async () => {
    setBusy(true)
    try {
      const rows = parseCsv(text)
      const res = await postJson<{ data:{ results:any[] } }>("/api/admin/import", { type, dryRun, rows })
      setResults(res.data.results)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CSV Importer</h1>
      <div className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm">Type</label>
          <select className="border rounded px-2 py-1 text-sm" value={type} onChange={e=> setType(e.target.value as any)}>
            <option value="products">Products</option>
            <option value="customers">Customers</option>
            <option value="pricebook">Price Book Entries</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm ml-4">
            <input type="checkbox" checked={dryRun} onChange={e=> setDryRun(e.target.checked)} /> Dry run
          </label>
          <button onClick={submit} disabled={busy} className="ml-auto px-3 py-1.5 rounded bg-indigo-600 text-white text-sm">{busy?'Processing...':'Run Import'}</button>
        </div>
        <div
          className="border rounded p-3 text-sm text-gray-600 bg-gray-50"
          onDragOver={(e)=> e.preventDefault()}
          onDrop={onDrop}
        >
          Drag & drop a CSV file here, or paste below.
        </div>
        <textarea value={text} onChange={e=> setText(e.target.value)} className="w-full h-48 border rounded p-2 font-mono text-xs" placeholder="sku,name,defaultPrice\nSKU-1,Product 1,1299" />
      </div>
      {results && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-medium mb-2">Results</h2>
          <table className="min-w-full text-sm">
            <thead><tr><th className="text-left p-2">Key</th><th className="text-left p-2">Status</th><th className="text-left p-2">Details</th></tr></thead>
            <tbody>
              {results.map((r,i)=> (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.key}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r.diff || r.reason || {}, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
