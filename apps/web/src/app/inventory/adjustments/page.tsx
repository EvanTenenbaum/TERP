'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface Adjustment {
  id: string;
  productName: string;
  quantity: number;
  reason: string;
  adjustedAt: string;
  adjustedBy: string;
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdjustments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/adjustments');
      if (!res.ok) throw new Error('Failed to fetch adjustments');
      const data = await res.json();
      setAdjustments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Failed to load adjustments" message={error} retry={fetchAdjustments} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">Inventory Adjustments</h1>
          <p className="text-c-mid mt-1">Record and track inventory adjustments</p>
        </div>
        <Button variant="primary">+ New Adjustment</Button>
      </div>

      <Card>
        {adjustments.length === 0 ? (
          <EmptyState
            title="No adjustments recorded"
            description="Record inventory adjustments to maintain accurate stock levels"
          />
        ) : (
          <DataTable
            data={adjustments}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'productName', label: 'Product' },
              { 
                key: 'quantity', 
                label: 'Quantity',
                render: (row) => (
                  <span className={row.quantity > 0 ? 'text-c-success' : 'text-c-error'}>
                    {row.quantity > 0 ? '+' : ''}{row.quantity}
                  </span>
                )
              },
              { key: 'reason', label: 'Reason' },
              { 
                key: 'adjustedAt', 
                label: 'Date',
                render: (row) => new Date(row.adjustedAt).toLocaleDateString()
              },
              { key: 'adjustedBy', label: 'Adjusted By' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
