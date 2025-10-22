'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface CustomerReturn {
  id: string;
  customerName: string;
  orderReference: string;
  status: string;
  returnDate: string;
}

export default function CustomerReturnsPage() {
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/inventory/returns/customer');
      if (!response.ok) throw new Error('Failed to fetch returns');
      const data = await response.json();
      setReturns(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Error loading returns" message={error || 'Unknown error'} retry={fetchReturns} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-c-ink">Customer Returns</h1>
        <Button variant="primary">+ New Return</Button>
      </div>
      <Card className="p-6">
        {returns.length === 0 ? (
          <EmptyState
            title="No customer returns"
            description="No customer returns have been recorded yet."
          />
        ) : (
          <DataTable
            data={returns}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'customerName', label: 'Customer' },
              { key: 'orderReference', label: 'Order Ref' },
              { key: 'status', label: 'Status' },
              { key: 'returnDate', label: 'Date' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
