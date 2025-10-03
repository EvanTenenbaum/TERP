'use client';
import React from 'react';
import { apiGet, apiPost } from '@/lib/fetcher';

export default function QuotesPage() {
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [customerId, setCustomerId] = React.useState('');
  const [items, setItems] = React.useState<{ productId: string; quantity: number }[]>([]);
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    apiGet<{ ok: true; data: any[] }>('/api/customers').then(r => setCustomers(r.data));
    apiGet<{ ok: true; data: any[] }>('/api/products').then(r => setProducts(r.data));
    apiGet<{ ok: true; data: any[] }>('/api/quotes').then(r => setQuotes(r.data));
  }, []);

  function addItem() {
    if (!products.length) return;
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  }
  async function createQuote() {
    setLoading(true);
    try {
      const res = await apiPost<{ ok: true; data: any }>('/api/quotes', { customerId, items });
      setQuotes([res.data, ...quotes]);
      setItems([]);
    } finally { setLoading(false); }
  }
  async function convert(id: string) {
    await apiPost('/api/quotes/' + id + '/convert', { id });
    alert('Converted to order');
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Quotes</h1>

      <div className="space-y-3 border p-4 rounded-lg">
        <h2 className="font-medium">New Quote</h2>
        <label className="block">
          Customer
          <select className="border p-2 ml-2" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <select className="border p-2" value={it.productId} onChange={e => {
                const v = e.target.value; setItems(items.map((x,i)=>i===idx?{...x, productId:v}:x));
              }}>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} – {p.name}</option>)}
              </select>
              <input type="number" className="border p-2 w-24" value={it.quantity} onChange={e => {
                const v = parseInt(e.target.value||'0',10); setItems(items.map((x,i)=>i===idx?{...x, quantity:v}:x));
              }} />
            </div>
          ))}
          <button className="border px-3 py-1 rounded" onClick={addItem}>+ Add Item</button>
        </div>

        <button disabled={loading || !customerId || !items.length} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" onClick={createQuote}>
          Create Quote
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Recent Quotes</h2>
        <ul className="space-y-2">
          {quotes.map(q => (
            <li key={q.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <div className="font-medium">Quote {q.id.slice(0,8)}</div>
                <div className="text-sm text-gray-600">{q.items.length} items</div>
              </div>
              <button className="border px-3 py-1 rounded" onClick={()=>convert(q.id)}>Convert to Order</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
