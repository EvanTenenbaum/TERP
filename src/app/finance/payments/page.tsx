'use client';
import React from 'react';
import { apiPost } from '@/lib/fetcher';

export default function PaymentsPage() {
  const [paymentId, setPaymentId] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [result, setResult] = React.useState<any>(null);

  async function apply() {
    const res = await apiPost('/api/finance/payments/apply', { paymentId, customerId });
    setResult(res);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Apply Payment (FIFO)</h1>
      <div className="space-y-2">
        <input className="border p-2 block w-96" placeholder="Payment ID" value={paymentId} onChange={e=>setPaymentId(e.target.value)} />
        <input className="border p-2 block w-96" placeholder="Customer ID" value={customerId} onChange={e=>setCustomerId(e.target.value)} />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={apply}>Apply</button>
      </div>
      {result && <pre className="bg-gray-50 p-3 rounded border">{JSON.stringify(result,null,2)}</pre>}
    </div>
  );
}
