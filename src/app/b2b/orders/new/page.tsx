'use client';

import { useEffect, useState } from 'react'
import { createB2BSale } from '@/actions/b2bSale'
import { getProductsForDropdown } from '@/actions/products'
import { getVendors } from '@/actions/inventory'
import { getCustomersForDropdown } from '@/actions/customers'

export default function NewB2BOrderPage() {
  const [type, setType] = useState<'outgoing'|'incoming'>('outgoing')
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [items, setItems] = useState([{ productId: '', unitCount: 1, unitPrice: 0 }])
  const [saving, setSaving] = useState(false)

  const [products, setProducts] = useState<{id:string,name:string}[]>([])
  const [vendors, setVendors] = useState<{id:string,vendorCode:string,companyName:string}[]>([])
  const [customers, setCustomers] = useState<{id:string,displayName:string}[]>([])

  useEffect(()=>{
    ;(async()=>{
      const [p,v,c] = await Promise.all([
        getProductsForDropdown(),
        getVendors(),
        getCustomersForDropdown(),
      ])
      if (p.success) setProducts(p.products || [])
      if (v.success) setVendors(v.vendors || [])
      if (c.success) setCustomers(c.customers || [])
    })()
  },[])

  const addItem = () => setItems([...items, { productId: '', unitCount: 1, unitPrice: 0 }])
  const updateItem = (idx:number, patch:any) => setItems(items.map((it,i)=> i===idx? { ...it, ...patch }: it))
  const removeItem = (idx:number) => setItems(items.filter((_,i)=> i!==idx))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const filtered = items.filter(it=> it.productId && it.unitCount>0 && it.unitPrice>=0)
      const payload = { type, sourceId: type==='incoming'? sourceId : '', targetId: type==='outgoing'? targetId : '', items: filtered }
      const res = await createB2BSale(payload as any)
      if (res && res.success && (res as any).sale) {
        window.location.href = `/b2b/orders/${(res as any).sale.id}`
      } else {
        alert('Failed to create order')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">New B2B Order</h1>
      <form onSubmit={submit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="w-full border rounded px-3 py-2" value={type} onChange={e=>setType(e.target.value as any)}>
              <option value="outgoing">Outgoing (Sale)</option>
              <option value="incoming">Incoming (Purchase)</option>
            </select>
          </div>
          {type==='incoming' && (
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <select className="w-full border rounded px-3 py-2" value={sourceId} onChange={e=>setSourceId(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map(v=> <option key={v.id} value={v.id}>{v.vendorCode} · {v.companyName}</option>)}
              </select>
            </div>
          )}
          {type==='outgoing' && (
            <div>
              <label className="block text-sm font-medium mb-1">Customer</label>
              <select className="w-full border rounded px-3 py-2" value={targetId} onChange={e=>setTargetId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map(c=> <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="font-semibold">Items</div>
          {items.map((it, idx)=> (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <select className="border rounded px-3 py-2" value={it.productId} onChange={e=>updateItem(idx,{productId:e.target.value})}>
                <option value="">Select product…</option>
                {products.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="border rounded px-3 py-2" placeholder="Qty" value={it.unitCount} onChange={e=>updateItem(idx,{unitCount: Number(e.target.value)})} />
              <input type="number" className="border rounded px-3 py-2" placeholder="Unit Price (cents)" value={it.unitPrice} onChange={e=>updateItem(idx,{unitPrice: Number(e.target.value)})} />
              <button type="button" onClick={()=>removeItem(idx)} className="text-red-600">Remove</button>
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-blue-600">+ Add Item</button>
        </div>

        <div className="pt-4">
          <button disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">{saving? 'Saving...' : 'Create Order'}</button>
        </div>
      </form>
    </div>
  )
}
