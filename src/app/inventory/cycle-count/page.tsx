import prisma from '@/lib/prisma'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import React from 'react'

async function getLatestPlanWithTasks() {
  const plan = await prisma.cycleCountPlan.findFirst({ orderBy: { createdAt: 'desc' } as any })
  if (!plan) return { plan: null as any, tasks: [] as any[] }
  const tasks = await prisma.cycleCountTask.findMany({ where: { planId: plan.id } as any, orderBy: { createdAt: 'asc' } as any, include: { lot: { include: { batch: { include: { product: true } } } } } as any })
  return { plan, tasks }
}

export default async function CycleCountPage() {
  const { plan, tasks } = await getLatestPlanWithTasks()

  async function createPlan(formData: FormData) {
    'use server'
    const name = String(formData.get('name') || '').trim() || `Cycle Count ${new Date().toLocaleDateString()}`
    await fetch('/api/inventory/cycle-count/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cycle Counts" subtitle="Create plan, enter counts, apply discrepancies" />

      <form action={createPlan} className="bg-white p-4 rounded border space-y-3">
        <div>
          <label className="block text-sm font-medium">Plan name</label>
          <input name="name" placeholder="Optional" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <Button type="submit">Create ABC Plan</Button>
      </form>

      {!plan ? (
        <div className="text-sm text-gray-600">No plans yet. Create one above.</div>
      ) : (
        <div className="bg-white p-4 rounded border">
          <div className="mb-3 text-sm text-gray-700">Current plan: <span className="font-medium">{plan.name}</span></div>
          <TasksClient tasks={tasks.map(t=>({
            id: t.id,
            lotId: t.lotId,
            product: t.lot.batch.product.name,
            expectedQty: Number(t.expectedQty),
            countedQty: t.countedQty === null ? null : Number(t.countedQty),
            status: t.status,
          }))} />
        </div>
      )}
    </div>
  )
}

function classNames(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' ') }

'use client'
function TasksClient({ tasks }: { tasks: { id:string; lotId:string; product:string; expectedQty:number; countedQty:number|null; status:string }[] }) {
  const [rows, setRows] = React.useState(tasks)
  const [busy, setBusy] = React.useState<string | null>(null)

  async function submit(id: string, counted: number) {
    setBusy(id)
    try {
      const r = await fetch(`/api/inventory/cycle-count/task/${encodeURIComponent(id)}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ countedQty: counted }) })
      if (r.ok) setRows(rows.map(t => t.id === id ? { ...t, countedQty: counted, status: 'COUNTED' } : t))
    } finally { setBusy(null) }
  }
  async function apply(id: string) {
    setBusy(id)
    try {
      const r = await fetch(`/api/inventory/cycle-count/task/${encodeURIComponent(id)}/apply`, { method: 'POST' })
      if (r.ok) setRows(rows.map(t => t.id === id ? { ...t, status: 'APPLIED' } : t))
    } finally { setBusy(null) }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Lot</th>
            <th className="p-2">Product</th>
            <th className="p-2 text-right">Expected</th>
            <th className="p-2 text-right">Counted</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.lotId}</td>
              <td className="p-2">{t.product}</td>
              <td className="p-2 text-right">{t.expectedQty}</td>
              <td className="p-2 text-right">
                <input type="number" defaultValue={t.countedQty ?? ''} min={0} step={1} className="w-24 border rounded px-2 py-1" onBlur={(e)=>{ const v = Number(e.currentTarget.value); if (Number.isFinite(v)) submit(t.id, v) }} disabled={busy===t.id || t.status==='APPLIED'} />
              </td>
              <td className="p-2">
                <span className={classNames('px-2 py-0.5 rounded text-xs', t.status==='APPLIED' ? 'bg-green-100 text-green-800' : t.status==='COUNTED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>{t.status}</span>
              </td>
              <td className="p-2">
                <button className="px-3 py-1.5 rounded border text-sm" onClick={()=>apply(t.id)} disabled={busy===t.id || t.status!=='COUNTED'}>Apply</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
