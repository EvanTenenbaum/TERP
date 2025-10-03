'use client';
import React from 'react';
import { apiGet } from '@/lib/fetcher';

export default function FinanceDashboard() {
  const [buckets, setBuckets] = React.useState<any[]>([]);
  React.useEffect(()=>{
    const asOf = new Date().toISOString();
    apiGet<{ buckets: { bucket: string; amountCents: number }[] }>(`/api/finance/ar/aging?asOf=${encodeURIComponent(asOf)}`).then(r=>setBuckets(r.buckets));
  },[]);
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        {buckets.map(b => (
          <div key={b.bucket} className="border rounded p-4">
            <div className="text-sm text-gray-500">{b.bucket}</div>
            <div className="text-xl font-semibold">${(b.amountCents/100).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
