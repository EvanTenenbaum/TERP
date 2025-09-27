"use client";

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

export default function POPage() {
  const params = useParams() as { id: string }
  const id = params.id
  const [po, setPo] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')

  const load = useCallback(async () => {
    const resp = await fetch(`/api/purchase-orders/${id}`)
    const data = await resp.json()
    if (data.success) setPo(data.purchaseOrder)
  }, [id])
  const loadProducts = useCallback(async () => {
    const p = await fetch('/api/products').catch(()=>null)
    let data: any = null
    try { data = p ? await p.json() : null } catch {}
    if (data && data.success) setProducts(data.products)
  }, [])

  useEffect(() => { load(); loadProducts() }, [load, loadProducts])

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const resp = await fetch(`/api/purchase-orders/${id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: Number(quantity), unitCost: Math.round(Number(unitCost)) })
    })
    const data = await resp.json()
    if (data.success) { setProductId(''); setQuantity(''); setUnitCost(''); await load() } else alert(data.error || 'Failed')
  }

  if (!po) return <div className="p-6">Loading…</div>

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PO {po.poNumber}</h1>
          <p className="text-gray-600">Vendor: {po.vendor?.companyName}</p>
        </div>
      </div>

      <form onSubmit={addItem} className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Product</label>
            <select className="w-full border rounded px-3 py-2" value={productId} onChange={(e)=>setProductId(e.target.value)} required>
              <option value="">Select…</option>
              {products.map((p:any)=> (<option key={p.id} value={p.id}>{p.sku} – {p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={quantity} onChange={(e)=>setQuantity(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit Cost (cents)</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={unitCost} onChange={(e)=>setUnitCost(e.target.value)} required />
          </div>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {po.items.map((it:any)=> (
                <tr key={it.id}>
                  <td className="px-4 py-2">{it.product?.name}</td>
                  <td className="px-4 py-2">{it.quantity}</td>
                  <td className="px-4 py-2">${(it.unitCost/100).toFixed(2)}</td>
                  <td className="px-4 py-2">${((it.unitCost*it.quantity)/100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
