'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateQuoteStatus, convertQuoteToOrder } from '@/actions/quotes';
import { downloadQuotePDF } from '@/lib/pdf/quote';
import { getVendorDisplayName } from '@/lib/vendorDisplay';

interface QuoteDetailsProps {
  quote: any; // Using any for now since the full type is complex
}

export default function QuoteDetails({ quote }: QuoteDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareLink, setShowShareLink] = useState(false);

  const formatPrice = (price: number) => {
    return `$${Math.round(price / 100)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateQuoteStatus(quote.id, newStatus as any);
      if (!result.success) {
        setError(result.error || 'Failed to update status');
      } else {
        // Refresh the page to show updated status
        window.location.reload();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!confirm('Are you sure you want to convert this quote to an order? This will allocate inventory and cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await convertQuoteToOrder(quote.id);
      if (!result.success) {
        setError(result.error || 'Failed to convert to order');
      } else {
        alert('Quote successfully converted to order!');
        // Redirect to the new order
        window.location.href = `/orders/${result.order?.id}`;
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      downloadQuotePDF(quote, `quote-${quote.quoteNumber}.pdf`);
    } catch (err) {
      setError('Failed to generate PDF');
    }
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quotes/share/${quote.shareToken}`;
  };

  const copyShareLink = () => {
    const shareLink = getShareLink();
    navigator.clipboard.writeText(shareLink).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy share link');
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quote #{quote.quoteNumber}</h1>
            <p className="text-gray-600 mt-1">
              Created {formatDate(quote.createdAt)}
              {quote.validUntil && ` • Valid until ${formatDate(quote.validUntil)}`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(quote.status)}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>

          <button
            onClick={() => setShowShareLink(!showShareLink)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share Link
          </button>

          {quote.status === 'draft' && (
            <button
              onClick={() => handleStatusUpdate('sent')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Mark as Sent
            </button>
          )}

          {quote.status === 'sent' && (
            <>
              <button
                onClick={() => handleStatusUpdate('accepted')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                Mark as Accepted
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Mark as Rejected
              </button>
            </>
          )}

          {quote.status === 'accepted' && (
            <button
              onClick={handleConvertToOrder}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Convert to Order
            </button>
          )}
        </div>

        {/* Share Link Display */}
        {showShareLink && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Share Link</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={getShareLink()}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This link allows read-only access to the quote without requiring login.
            </p>
          </div>
        )}
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Company:</span> {quote.customer.companyName}</p>
            <p><span className="font-medium">Contact:</span> {quote.customer.contactName}</p>
            <p><span className="font-medium">Email:</span> {quote.customer.email}</p>
            {quote.customer.phone && (
              <p><span className="font-medium">Phone:</span> {quote.customer.phone}</p>
            )}
            {quote.customer.address && (
              <div>
                <p className="font-medium">Address:</p>
                <p className="text-gray-600">
                  {quote.customer.address}<br />
                  {[quote.customer.city, quote.customer.state, quote.customer.zipCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quote Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{quote.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Quantity:</span>
              <span>{quote.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t">
              <span>Total Amount:</span>
              <span>{formatPrice(quote.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Items */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quote Items</h2>
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
                  Vendor
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quote.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                      {item.product.description && (
                        <div className="text-sm text-gray-500">{item.product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getVendorDisplayName(item.batch.vendor, false)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.inventoryLot.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity} {item.product.unit}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPrice(item.unitPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPrice(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Link
          href="/quotes"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Back to Quotes
        </Link>
      </div>
    </div>
  );
}

