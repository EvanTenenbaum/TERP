'use client';

import { useState } from 'react';
import { generateQuotePDF, shareQuote } from '@/actions/quotes';

interface QuoteDetailsProps {
  quote: {
    id: string;
    quoteNumber: string;
    status: string;
    totalAmount: number;
    expirationDate?: Date;
    createdAt: Date;
    customer: {
      id: string;
      companyName: string;
      contactInfo: any;
    };
    quoteItems: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number; // Changed from totalPrice to lineTotal
      product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
        location?: string | null;
      };
    }>;
  };
}

export default function QuoteDetails({ quote }: QuoteDetailsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState<string>('')
  const [reasonInput, setReasonInput] = useState<string>('')
  const [adminFreeform, setAdminFreeform] = useState<boolean>(false)

  const startEdit = (id: string, currentCents: number) => {
    setEditingId(id)
    setPriceInput(String(currentCents))
    setReasonInput('')
    setAdminFreeform(false)
  }

  const submitEdit = async (itemId: string) => {
    const cents = Math.round(Number(priceInput))
    if (!Number.isFinite(cents) || cents < 0) return alert('Enter a valid price in cents')
    const resp = await fetch(`/api/quotes/items/${itemId}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUnitPrice: cents, reason: reasonInput || 'Manual line override', adminFreeform }),
    })
    const res = await resp.json().catch(()=>({ success:false }))
    if (!res.success) {
      alert(res.error || 'Failed to update price')
      return
    }
    window.location.reload()
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const result = await generateQuotePDF(quote.id);
      if (result.success && result.pdfUrl) {
        // Open PDF in new tab
        window.open(result.pdfUrl, '_blank');
      } else {
        alert('Failed to generate PDF: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await shareQuote(quote.id);
      if (result.success && result.shareUrl) {
        setShareUrl(result.shareUrl);
        // Copy to clipboard
        await navigator.clipboard.writeText(result.shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        alert('Failed to create share link: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Sales Sheet #${quote.quoteNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Created on {new Date(quote.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
              {quote.status}
            </span>
            <div className="flex items-center gap-2">
              <select defaultValue={quote.status} onChange={async (e)=>{ await fetch(`/api/quotes/${quote.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) }); window.location.reload() }} className="text-xs border rounded px-2 py-1">
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button onClick={async ()=>{ const r = await fetch(`/api/quotes/${quote.id}/convert`, { method: 'POST' }); const d = await r.json(); if (d.success) window.location.href = '/orders'; else alert(d.error || 'Failed'); }} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Convert to Order</button>
              <button onClick={async ()=>{ const r = await fetch(`/api/quotes/${quote.id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overrideCreditLimit: true }) }); const d = await r.json(); if (d.success) window.location.href = '/orders'; else alert(d.error || 'Failed'); }} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">Override Credit Limit + Convert</button>
            </div>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSharing ? 'Creating...' : 'Share Sales Sheet'}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Customer</dt>
            <dd className="mt-1 text-sm text-gray-900">{quote.customer.companyName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
            <dd className="mt-1 text-sm text-gray-900">${(quote.totalAmount / 100).toFixed(2)}</dd>
          </div>
          {quote.expirationDate && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Valid Until</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(quote.expirationDate).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Quote Items */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <h4 className="text-lg font-medium text-gray-900">Sales Sheet Items</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quote.quoteItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-sm text-gray-500">{item.product.unit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.product.location || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(item.unitPrice / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(item.lineTotal / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" className="border rounded px-2 py-1" value={priceInput} onChange={(e)=>setPriceInput(e.target.value)} placeholder="Price (cents)" />
                          <input className="border rounded px-2 py-1 col-span-2" value={reasonInput} onChange={(e)=>setReasonInput(e.target.value)} placeholder="Reason" />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={adminFreeform} onChange={(e)=>setAdminFreeform(e.target.checked)} /> Admin freeform</label>
                        <div className="flex gap-2">
                          <button onClick={()=>submitEdit(item.id)} className="px-2 py-1 bg-indigo-600 text-white rounded">Save</button>
                          <button onClick={()=>setEditingId(null)} className="px-2 py-1 border rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>startEdit(item.id, item.unitPrice)} className="text-indigo-600 hover:text-indigo-800">Override</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${(quote.totalAmount / 100).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Share URL Display */}
      {shareUrl && (
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Share Link Created
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Share this link with your customer:</p>
                  <code className="mt-1 block bg-white px-2 py-1 rounded text-xs break-all">
                    {shareUrl}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
