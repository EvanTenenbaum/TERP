'use client';

import { downloadQuotePDF } from '@/lib/pdf/quote';
import { getVendorDisplayName } from '@/lib/vendorDisplay';

interface SharedQuoteViewProps {
  quote: any; // Using any for now since the full type is complex
}

export default function SharedQuoteView({ quote }: SharedQuoteViewProps) {
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

  const handleDownloadPDF = () => {
    try {
      downloadQuotePDF(quote, `quote-${quote.quoteNumber}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF');
    }
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

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg mb-4">
            <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-blue-800 font-medium">Sales Quote</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quote #{quote.quoteNumber}</h1>
            <p className="text-gray-600 mt-1">
              Created {formatDate(quote.createdAt)}
              {quote.validUntil && ` • Valid until ${formatDate(quote.validUntil)}`}
            </p>
            {isExpired && (
              <p className="text-red-600 text-sm font-medium mt-1">
                ⚠️ This quote has expired
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(quote.status)}
          </div>
        </div>

        {/* Download PDF Button */}
        <div className="flex justify-center">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Bill To</h2>
          <div className="space-y-2">
            <p className="font-medium text-lg">{quote.customer.companyName}</p>
            <p>{quote.customer.contactName}</p>
            <p>{quote.customer.email}</p>
            {quote.customer.phone && <p>{quote.customer.phone}</p>}
            {quote.customer.address && (
              <div className="mt-3">
                <p>{quote.customer.address}</p>
                <p>
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
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Items:</span>
              <span className="font-medium">{quote.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Quantity:</span>
              <span className="font-medium">{quote.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-3 border-t">
              <span>Total Amount:</span>
              <span className="text-blue-600">{formatPrice(quote.totalAmount)}</span>
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
              {quote.items.map((item: any, index: number) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4">
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
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right text-base font-medium text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">
                  {formatPrice(quote.totalAmount)}
                </td>
              </tr>
            </tfoot>
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

      {/* Footer */}
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">
          This quote is valid until the date specified above. Prices and availability subject to change.
        </p>
        {!isExpired && quote.status === 'sent' && (
          <p className="text-sm text-blue-600 mt-2 font-medium">
            Please contact us to accept this quote or if you have any questions.
          </p>
        )}
      </div>
    </div>
  );
}

