"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClientLink } from '@/components/client/ClientLink'

export default function PurchaseOrdersPage() {
  const [list, setList] = useState<any[]>([])

  const load = async () => {
    const res = await fetch('/api/purchase-orders')
    const data = await res.json()
    if (data.success) setList(data.purchaseOrders)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage and track vendor purchase orders.</p>
        </div>
        <Link href="/inventory/purchase-orders/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New PO</Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.map((po)=> (
                <tr key={po.id}>
                  <td className="px-4 py-2">{po.poNumber}</td>
                  <td className="px-4 py-2">{po.vendor ? (<ClientLink partyId={po.vendor.partyId || po.vendor.party?.id} fallbackHref="/clients">{po.vendor.party?.name || po.vendor.companyName || po.vendor.vendorCode}</ClientLink>) : null}</td>
                  <td className="px-4 py-2">{po.status}</td>
                  <td className="px-4 py-2">{po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2">{po.items?.length || 0}</td>
                  <td className="px-4 py-2"><Link className="text-blue-600 hover:text-blue-800" href={`/inventory/purchase-orders/${po.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
