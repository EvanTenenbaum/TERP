'use client';

import useSWR, { mutate as swrMutate } from 'swr';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

import { fetcher } from '@/lib/fetcher';

type Lot = { id: string; quantityAvailable: number };

type Product = { id: string; sku: string; name: string };

export default function InventoryTransfersPage() {
  const { data: productsData } = useSWR<{ success: boolean; products: Product[] }>("/api/products", fetcher);
  const [productId, setProductId] = useState('');
  const lotsKey = productId ? `/api/inventory/lots?productId=${encodeURIComponent(productId)}` : null;
  const { data: lotsData } = useSWR<{ success: boolean; lots: Lot[] }>(lotsKey, fetcher);

  const [sourceLotId, setSourceLotId] = useState('');
  const [destLotId, setDestLotId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const { data: history, isLoading: historyLoading, error: historyError } = useSWR<{ success: boolean; transfers: any[] }>('/api/inventory/transfers/list', fetcher);
  const { push } = useToast();

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();

    const qty = Number(quantity);
    if (!productId || !sourceLotId || !destLotId || !Number.isFinite(qty) || qty <= 0) {
      alert('Please fill product, lots, and a positive quantity.');
      return;
    }

    const key = lotsKey!;
    const prevLots = lotsData?.lots ?? [];
    let reverted = false;
    try {
      const nextLots = prevLots.map(l => {
        if (l.id === sourceLotId) return { ...l, quantityAvailable: Number(l.quantityAvailable) - qty };
        if (l.id === destLotId) return { ...l, quantityAvailable: Number(l.quantityAvailable) + qty };
        return l;
      });
      swrMutate(key, { success: true, lots: nextLots }, false);

      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, sourceLotId, destLotId, quantity: qty, notes, reason }),
      });

      if (!res.ok) {
        reverted = true;
        swrMutate(key);
        const j = await res.json().catch(() => ({}));
        push({ message: `Transfer failed: ${j?.error ?? res.status}` });
        return;
      }

      await Promise.all([swrMutate(key), swrMutate('/api/inventory/transfers/list')]);
      setNotes('');
      setQuantity('');
      setDestLotId('');
      push({ message: 'Transfer completed' });
    } catch (err) {
      if (!reverted) swrMutate(key);
      push({ message: 'Unexpected error performing transfer' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Inventory Transfers"
        actions={<Link href="/inventory" className="text-primary-600 underline">Back to Inventory</Link>}
      />

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-md border border-border shadow-card">
        <div className="col-span-2">
          <label className="block text-sm font-medium">Product</label>
          <select value={productId} onChange={e => setProductId(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500">
            <option value="">Select product…</option>
            {productsData?.products?.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Source Lot</label>
          <select value={sourceLotId} onChange={e => setSourceLotId(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" disabled={!lotsData?.lots?.length}>
            <option value="">Select source lot…</option>
            {lotsData?.lots?.map(l => <option key={l.id} value={l.id}>{l.id} — avail {Number(l.quantityAvailable)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Destination Lot</label>
          <select value={destLotId} onChange={e => setDestLotId(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" disabled={!lotsData?.lots?.length}>
            <option value="">Select destination lot…</option>
            {lotsData?.lots?.filter(l => l.id !== sourceLotId).map(l => <option key={l.id} value={l.id}>{l.id} — avail {Number(l.quantityAvailable)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Quantity</label>
          <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="0" step="1" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" required />
        </div>

        <div>
          <label className="block text-sm font-medium">Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g., repackage, move location" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
        </div>

        <div className="col-span-2">
          <Button type="submit">Transfer</Button>
        </div>
      </form>

      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-2">Recent Transfers</h2>
        {historyError ? (
          <ErrorAlert message={historyError.message || 'Failed to load transfers'} />
        ) : historyLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : !history?.transfers?.length ? (
          <div className="text-sm text-gray-500">No transfers yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead><tr className="text-left">
              <th className="p-2">When</th>
              <th className="p-2">Product</th>
              <th className="p-2">From</th>
              <th className="p-2">To</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Reason</th>
            </tr></thead>
            <tbody>
              {history.transfers.map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-2">{productsData?.products?.find(p=>p.id===t.productId)?.name || t.productId}</td>
                  <td className="p-2">{t.sourceLotId}</td>
                  <td className="p-2">{t.destLotId ?? '-'}</td>
                  <td className="p-2">{String(t.quantity)}</td>
                  <td className="p-2">{t.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
