'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import PageHeader from '@/components/ui/PageHeader'

import { fetcher } from '@/lib/fetcher';

export default function VendorSettlementsPage() {
  const { data, isLoading, error } = useSWR('/api/finance/vendor-settlements/list', fetcher);
  const [form, setForm] = useState({ vendorId:'', periodStart:'', periodEnd:'', amount:'', notes:'' , appliedToApId:'' });

  const { push } = useToast();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/finance/vendor-settlements', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        vendorId: form.vendorId,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
        appliedToApId: form.appliedToApId || undefined
      }),
    });
    if(!res.ok) {
      const j = await res.json().catch(()=>({}));
      push({ message: 'Error creating settlement: ' + (j.error || res.status) });
    } else {
      setForm({ vendorId:'', periodStart:'', periodEnd:'', amount:'', notes:'' , appliedToApId:'' });
      push({ message: 'Settlement created' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Vendor Settlements" subtitle="Create and track settlements for vendor statements" />
      <form onSubmit={submit} className="space-y-2 bg-white p-4 rounded border grid md:grid-cols-2 gap-3">
        <input placeholder="Vendor ID" value={form.vendorId} onChange={e=>setForm({...form,vendorId:e.target.value})} className="border p-2 rounded"/>
        <input placeholder="AP Id (optional)" value={form.appliedToApId} onChange={e=>setForm({...form,appliedToApId:e.target.value})} className="border p-2 rounded"/>
        <input type="date" value={form.periodStart} onChange={e=>setForm({...form,periodStart:e.target.value})} className="border p-2 rounded"/>
        <input type="date" value={form.periodEnd} onChange={e=>setForm({...form,periodEnd:e.target.value})} className="border p-2 rounded"/>
        <input placeholder="Amount (dollars)" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="border p-2 rounded"/>
        <textarea placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="border p-2 rounded md:col-span-2"/>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded md:col-span-2">Create Settlement</button>
      </form>
      <div>
        <h2 className="text-lg font-semibold">Recent Settlements</h2>
        {error ? (
          <ErrorAlert message={error.message || 'Failed to load settlements'} />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">{JSON.stringify(data,null,2)}</pre>
        )}
      </div>
    </div>
  );
}
