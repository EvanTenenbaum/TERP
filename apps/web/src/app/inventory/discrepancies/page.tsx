'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface Discrepancy {
  id: string;
  productId: string;
  productName: string;
  expected: number;
  actual: number;
  variance: number;
  status: string;
  reason?: string;
}

export default function DiscrepanciesPage() {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/discrepancies');
      if (!res.ok) throw new Error('Failed to fetch discrepancies');
      const data = await res.json();
      setDiscrepancies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await fetch(`/api/inventory/discrepancies/${id}/resolve`, { method: 'POST' });
      await fetchDiscrepancies();
    } catch (err) {
      console.error('Failed to resolve discrepancy', err);
    }
  };

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
        <ErrorState title="Failed to load discrepancies" message={error} retry={fetchDiscrepancies} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">Inventory Discrepancies</h1>
          <p className="text-c-mid mt-1">Review and resolve inventory count discrepancies</p>
        </div>
      </div>

      <Card>
        {discrepancies.length === 0 ? (
          <EmptyState
            title="No discrepancies found"
            description="All inventory counts match expected values"
          />
        ) : (
          <DataTable
            data={discrepancies}
            columns={[
              { key: 'id', label: 'ID', render: (row) => row.id.slice(0, 8) },
              { key: 'productName', label: 'Product' },
              { key: 'expected', label: 'Expected' },
              { key: 'actual', label: 'Actual' },
              { 
                key: 'variance', 
                label: 'Variance',
                render: (row) => {
                  const variance = row.variance || (row.actual - row.expected);
                  return (
                    <span className={variance < 0 ? 'text-c-error font-semibold' : 'text-c-success font-semibold'}>
                      {variance > 0 ? '+' : ''}{variance}
                    </span>
                  );
                }
              },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => {
                  const variant = row.status === 'resolved' ? 'success' : 'warning';
                  return <Badge variant={variant}>{row.status}</Badge>;
                }
              },
              { 
                key: 'actions', 
                label: '',
                render: (row) => (
                  row.status !== 'resolved' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(row.id);
                      }}
                    >
                      Resolve
                    </Button>
                  )
                )
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
