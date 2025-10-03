'use client';
import React from 'react';
import { apiGet, apiPost } from '@/lib/fetcher';

export default function DiscrepanciesPage() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(()=>{ load(); }, []);
  async function load() {
    const res = await apiGet<{ok:true; data:any[]}>('/api/inventory/adjustments/list');
    setRows(res.data);
  }
  async function undo(id: string) {
    await apiPost('/api/inventory/discrepancies/resolve', { adjustmentId: id, confirm: false });
    await load();
  }
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Inventory Discrepancies</h1>
      <table className="w-full border">
        <thead><tr className="bg-gray-50"><th className="p-2 text-left">ID</th><th className="p-2 text-left">Product</th><th className="p-2">Delta</th><th className="p-2">Reason</th><th className="p-2"></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.id.slice(0,8)}</td>
              <td className="p-2">{r.productId}</td>
              <td className="p-2 text-center">{r.quantityDelta}</td>
              <td className="p-2">{r.reason}</td>
              <td className="p-2 text-right"><button className="border px-3 py-1 rounded" onClick={()=>undo(r.id)}>Undo</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
