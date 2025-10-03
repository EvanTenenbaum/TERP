'use client';
import React from 'react';
import { apiGet, apiPost } from '@/lib/fetcher';

export default function CycleCountPage() {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = React.useState<string>('');
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [name, setName] = React.useState('');

  async function load() {
    const p = await apiGet<{plans:any[]}>('/api/inventory/cycle-count/plan');
    setPlans(p.plans);
  }
  React.useEffect(()=>{ load(); }, []);

  async function createPlan() {
    await apiPost('/api/inventory/cycle-count/plan', { name });
    setName(''); await load();
  }
  async function loadTasks() {
    if (!selectedPlan) return;
    const res = await apiGet<{ok:true; data:any[]}>('/api/inventory/cycle-count/tasks?planId='+selectedPlan);
    setTasks(res.data);
  }
  async function submitTask(id: string, counted: number) {
    await apiPost('/api/inventory/cycle-count/task/'+id+'/submit', { id, countedQty: counted });
    await loadTasks();
  }
  async function applyPlan() {
    await apiPost('/api/inventory/cycle-count/apply', { planId: selectedPlan });
    await loadTasks();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cycle Counts</h1>
      <div className="flex gap-2 items-center">
        <input className="border p-2" placeholder="Plan name" value={name} onChange={e=>setName(e.target.value)} />
        <button className="border px-3 py-1 rounded" onClick={createPlan}>Create Plan</button>
      </div>
      <div>
        <select className="border p-2" value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)}>
          <option value="">Select plan...</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="ml-2 border px-3 py-1 rounded" onClick={loadTasks}>Load Tasks</button>
        <button className="ml-2 border px-3 py-1 rounded" onClick={applyPlan} disabled={!selectedPlan}>Apply</button>
      </div>
      <div className="space-y-2">
        {tasks.map(t => (
          <div key={t.id} className="border p-3 rounded flex items-center gap-3">
            <div className="grow">
              <div className="font-medium">Product {t.productId}</div>
              <div className="text-sm text-gray-600">Expected: {t.expectedQty} • Counted: {t.countedQty ?? '-'}</div>
            </div>
            <input type="number" placeholder="Counted" className="border p-2 w-28" onBlur={(e)=>submitTask(t.id, parseInt(e.target.value||'0',10))} />
            <span className="text-xs px-2 py-1 border rounded">{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
