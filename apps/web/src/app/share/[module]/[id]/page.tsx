'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

interface ShareData {
  title: string;
  subtitle: string;
  status: string;
  date: string;
  amount?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  details: Record<string, string>;
}

export default function SharePage({ params }: { params: { module: string; id: string } }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShareData();
  }, [params.module, params.id]);

  const fetchShareData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch based on module type
      let endpoint = '';
      switch (params.module) {
        case 'quotes':
          endpoint = `/api/quotes/${params.id}`;
          break;
        case 'orders':
          endpoint = `/api/orders/${params.id}`;
          break;
        case 'invoices':
          endpoint = `/api/finance/invoices/${params.id}`;
          break;
        default:
          throw new Error('Invalid module type');
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      
      // Transform to ShareData format
      const transformed: ShareData = {
        title: result.quoteNumber || result.orderNumber || result.invoiceNumber || 'Unknown',
        subtitle: result.customerName || 'Unknown Customer',
        status: result.status,
        date: result.createdAt || result.orderDate || result.invoiceDate,
        amount: result.totalCents ? result.totalCents / 100 : undefined,
        items: result.lines || result.items || [],
        details: {
          'Created': new Date(result.createdAt || Date.now()).toLocaleDateString(),
          'Status': result.status,
          ...(result.validUntil && { 'Valid Until': result.validUntil }),
          ...(result.dueDate && { 'Due Date': result.dueDate }),
        },
      };

      setData(transformed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-c-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-c-bg p-4">
        <ErrorState message={error || 'Data not found'} retry={fetchShareData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c-bg">
      {/* Header */}
      <div className="bg-c-panel border-b border-c-border p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-c-ink mb-2">{data.title}</h1>
              <p className="text-xl text-c-mid">{data.subtitle}</p>
            </div>
            <Badge variant="success">{data.status}</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Amount Card */}
        {data.amount !== undefined && (
          <Card className="p-6">
            <div className="text-sm text-c-mid mb-2">Total Amount</div>
            <div className="text-4xl font-bold text-c-brand">
              ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </Card>
        )}

        {/* Details Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-c-ink mb-4">Details</h2>
          <div className="space-y-3">
            {Object.entries(data.details).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-c-border last:border-0">
                <span className="text-c-mid font-medium">{key}</span>
                <span className="text-c-ink">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Items Card */}
        {data.items && data.items.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-c-ink mb-4">Line Items</h2>
            <div className="space-y-2">
              {data.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-c-border last:border-0">
                  <div className="flex-1">
                    <div className="font-medium text-c-ink">{item.name || 'Item'}</div>
                    <div className="text-sm text-c-mid">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-c-ink">
                      ${((item.price || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-c-mid">
                      Total: ${(((item.price || 0) * item.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-c-mid text-sm py-8">
          <p>This is a shared view. For full access, please contact the sender.</p>
        </div>
      </div>
    </div>
  );
}
