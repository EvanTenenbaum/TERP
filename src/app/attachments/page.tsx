"use client";

import { useEffect, useState, useCallback } from 'react'

export default function AttachmentsPage() {
  const [entityType, setEntityType] = useState('product')
  const [entityId, setEntityId] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const qs = new URLSearchParams()
    if (entityType) qs.set('entityType', entityType)
    if (entityId) qs.set('entityId', entityId)
    const resp = await fetch(`/api/attachments/list?${qs.toString()}`)
    const data = await resp.json()
    if (data.success) setList(data.attachments)
  }, [entityType, entityId])

  const toggleArchive = async (id: string, archived: boolean) => {
    await fetch(`/api/attachments/${id}/archive`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: !archived }) })
    await load()
  }

  useEffect(() => { load() }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files || files.length === 0) return
    setLoading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('entityType', entityType)
        fd.set('entityId', entityId)
        const resp = await fetch('/api/attachments/upload', { method: 'POST', body: fd })
        const data = await resp.json()
        if (!resp.ok || !data.ok) throw new Error('upload_failed')
      }
      await load()
      setFiles(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attachments</h1>
        <p className="text-gray-600">Upload and manage file attachments linked to any entity.</p>
      </div>

      <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Upload</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <select className="w-full border rounded px-3 py-2" value={entityType} onChange={(e)=>setEntityType(e.target.value)}>
              <option>product</option>
              <option>batch</option>
              <option>order</option>
              <option>invoice</option>
              <option>vendor</option>
              <option>customer</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Entity ID</label>
            <input className="w-full border rounded px-3 py-2" value={entityId} onChange={(e)=>setEntityId(e.target.value)} placeholder="Enter the entity ID to link" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Files</label>
            <input type="file" multiple onChange={(e)=>setFiles(e.target.files)} className="w-full" />
          </div>
        </div>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading? 'Uploading...' : 'Upload'}</button>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Attachments</h2>
          <button onClick={load} className="text-blue-600 hover:text-blue-800">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-2">Open</th>
                <th className="px-4 py-2">Archive</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((a)=> (
                <tr key={a.id}>
                  <td className="px-4 py-2">{a.entityType}</td>
                  <td className="px-4 py-2">{a.entityId}</td>
                  <td className="px-4 py-2">{a.fileName}</td>
                  <td className="px-4 py-2">{Math.round(a.fileSize/1024)} KB</td>
                  <td className="px-4 py-2"><a className="text-blue-600 hover:text-blue-800" href={`/api/attachments/file?id=${a.id}`} target="_blank" rel="noreferrer">View</a></td>
                  <td className="px-4 py-2"><button onClick={()=>toggleArchive(a.id, a.archived)} className={a.archived? 'text-green-700' : 'text-gray-600 hover:text-gray-800'}>{a.archived? 'Unarchive' : 'Archive'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
