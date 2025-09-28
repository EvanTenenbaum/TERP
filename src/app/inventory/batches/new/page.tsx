'use client';

"use client";
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function NewBatchPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    batchNumber: '',
    productId: '',
    vendorId: '',
    quantity: '',
    receivedDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    initialCost: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { push } = useToast();
  const [products, setProducts] = useState<{id:string; name:string}[]>([])
  const [vendors, setVendors] = useState<{id:string; vendorCode:string; companyName:string}[]>([])

  useEffect(() => {
    (async () => {
      try {
        const [pRes, vRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/vendors')
        ])
        const pData = await pRes.json()
        const vData = await vRes.json()
        if (pData?.success) setProducts(pData.products)
        if (vData?.success) setVendors(vData.vendors)
      } catch (e) {
        console.error('Failed to load options', e)
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.productId,
          vendorId: formData.vendorId,
          batchNumber: formData.batchNumber,
          receivedDate: formData.receivedDate,
          expirationDate: formData.expirationDate || undefined,
          quantity: Number(formData.quantity),
          initialCost: Number(formData.initialCost || 0),
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'create_failed')
      push({ message: 'Batch created' });
      router.push('/inventory/products');
    } catch (error) {
      console.error('Error creating batch:', error);
      push({ message: 'Failed to create batch' })
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Create New Batch</h2>
          <p className="text-sm text-gray-600 mt-1">
            Creating a batch will automatically create an initial BatchCost record
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number *
              </label>
              <input
                type="text"
                id="batchNumber"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., BATCH-2025-001"
              />
            </div>

            <div>
              <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-2">
                Product *
              </label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <select
              id="vendorId"
              name="vendorId"
              value={formData.vendorId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendorCode} — {v.companyName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="initialCost" className="block text-sm font-medium text-gray-700 mb-2">
                Initial Unit Cost ($) *
              </label>
              <input
                type="number"
                id="initialCost"
                name="initialCost"
                value={formData.initialCost}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="receivedDate" className="block text-sm font-medium text-gray-700 mb-2">
                Received Date *
              </label>
              <input
                type="date"
                id="receivedDate"
                name="receivedDate"
                value={formData.receivedDate}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                id="expirationDate"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Additional notes about this batch..."
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Cost History</h4>
            <p className="text-sm text-blue-700">
              An initial BatchCost record will be created with the specified unit cost and today&apos;s date as the effective date. 
              You can add cost changes later that will only affect future allocations.
            </p>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
