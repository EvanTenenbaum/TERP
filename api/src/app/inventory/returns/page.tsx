'use client';
import React from 'react';
import { apiPost } from '@/lib/fetcher';

export default function ReturnsPage() {
  const [mode, setMode] = React.useState<'customer'|'vendor'>('customer');
  const [form, setForm] = React.useState<any>({ quantity: 1 });

  async function submit() {
    if (mode === 'customer') {
      await apiPost('/api/inventory/returns/customer', form);
      alert('Customer return recorded');
    } else {
      await apiPost('/api/inventory/returns/vendor', form);
      alert('Vendor return recorded');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Returns</h1>
      <div className="flex gap-2">
        <button className={`border px-3 py-1 rounded ${mode==='customer'?'bg-black text-white':''}`} onClick={()=>setMode('customer')}>Customer</button>
        <button className={`border px-3 py-1 rounded ${mode==='vendor'?'bg-black text-white':''}`} onClick={()=>setMode('vendor')}>Vendor</button>
      </div>
      <div className="space-y-2 max-w-xl">
        <input className="border p-2 w-full" placeholder={mode==='customer'?'Customer ID':'Vendor ID'} onChange={e=>setForm({...form, [mode==='customer'?'customerId':'vendorId']: e.target.value})} />
        <input className="border p-2 w-full" placeholder={mode==='customer'?'Order ID (optional)':'PO ID (optional)'} onChange={e=>setForm({...form, [mode==='customer'?'orderId':'poId']: e.target.value})} />
        <input className="border p-2 w-full" placeholder="Product ID" onChange={e=>setForm({...form, productId: e.target.value})} />
        <input className="border p-2 w-full" placeholder="Lot ID (optional)" onChange={e=>setForm({...form, lotId: e.target.value})} />
        <input className="border p-2 w-full" type="number" min={1} defaultValue={1} onChange={e=>setForm({...form, quantity: parseInt(e.target.value||'1',10)})} />
        <input className="border p-2 w-full" placeholder="Reason" onChange={e=>setForm({...form, reason: e.target.value})} />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={submit}>Submit</button>
      </div>
    </div>
  );
}
