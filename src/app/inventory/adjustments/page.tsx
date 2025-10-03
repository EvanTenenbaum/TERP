'use client';
import React from 'react';
import { apiPost } from '@/lib/fetcher';

export default function AdjustmentsPage() {
  const [form, setForm] = React.useState<any>({ quantityDelta: 0, reason: '' });
  async function submit() {
    await apiPost('/api/inventory/adjustments', form);
    alert('Adjustment applied');
  }
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Adjustments</h1>
      <div className="space-y-2 max-w-xl">
        <input className="border p-2 w-full" placeholder="Product ID" onChange={e=>setForm({...form, productId: e.target.value})} />
        <input className="border p-2 w-full" placeholder="Lot ID (optional)" onChange={e=>setForm({...form, lotId: e.target.value})} />
        <input className="border p-2 w-full" type="number" onChange={e=>setForm({...form, quantityDelta: parseInt(e.target.value||'0',10)})} />
        <input className="border p-2 w-full" placeholder="Reason" onChange={e=>setForm({...form, reason: e.target.value})} />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={submit}>Apply</button>
      </div>
    </div>
  );
}
