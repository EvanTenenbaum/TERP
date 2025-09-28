'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import PageHeader from '@/components/ui/PageHeader'

import { fetcher } from '@/lib/fetcher';

export default function VendorRebatesPage() {
  const { data, isLoading, error } = useSWR('/api/finance/vendor-rebates/list', fetcher);
  const [form, setForm] = useState({ vendorId:'', basis:'', amount:'', notes:'' , appliedToApId:'' });

  const { push } = useToast();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/finance/vendor-rebates', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        vendorId: form.vendorId,
        basis: form.basis,
        amount: parseFloat(form.amount),
        notes: form.notes || undefined,
        appliedToApId: form.appliedToApId || undefined
      }),
    });
    if(!res.ok) {
      const j = await res.json().catch(()=>({}));
      push({ message: 'Error creating rebate: ' + (j.error || res.status) });
    } else {
      setForm({ vendorId:'', basis:'', amount:'', notes:'' , appliedToApId:'' });
      push({ message: 'Rebate created' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Vendor Rebates" subtitle="Record vendor rebate credits and review recent activity" />
      <form onSubmit={submit} className="space-y-2 bg-white p-4 rounded border grid md:grid-cols-2 gap-3">
        <input placeholder="Vendor ID" value={form.vendorId} onChange={e=>setForm({...form,vendorId:e.target.value})} className="border p-2 rounded"/>
        <input placeholder="AP Id (optional)" value={form.appliedToApId} onChange={e=>setForm({...form,appliedToApId:e.target.value})} className="border p-2 rounded"/>
        <input placeholder="Basis" value={form.basis} onChange={e=>setForm({...form,basis:e.target.value})} className="border p-2 rounded"/>
        <input placeholder="Amount (dollars)" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="border p-2 rounded"/>
        <textarea placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="border p-2 rounded md:col-span-2"/>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded md:col-span-2">Create Rebate</button>
      </form>
      <div>
        <h2 className="text-lg font-semibold">Recent Rebates</h2>
        {error ? (
          <ErrorAlert message={error.message || 'Failed to load rebates'} />
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
