'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface CycleCount {
  id: string;
  location: string;
  status: string;
  scheduledDate: string;
  itemsCount: number;
}

export default function CycleCountPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<CycleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/cycle-count');
      if (!res.ok) throw new Error('Failed to fetch cycle counts');
      const data = await res.json();
      setCounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
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
        <ErrorState title="Failed to load cycle counts" message={error} retry={fetchCounts} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">Cycle Counts</h1>
          <p className="text-c-mid mt-1">Plan and execute inventory cycle counts</p>
        </div>
        <Button variant="primary" aria-label="Create new cycle count">
          + New Count
        </Button>
      </div>

      <Card>
        {counts.length === 0 ? (
          <EmptyState
            title="No cycle counts scheduled"
            description="Create a cycle count to verify inventory accuracy"
          />
        ) : (
          <DataTable
            data={counts}
            columns={[
              { key: 'id', label: 'Count #' },
              { key: 'location', label: 'Location' },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => {
                  const variant = row.status === 'completed' ? 'success' : 
                                 row.status === 'in_progress' ? 'warning' : 'default';
                  return <Badge variant={variant}>{row.status}</Badge>;
                }
              },
              { 
                key: 'scheduledDate', 
                label: 'Scheduled',
                render: (row) => new Date(row.scheduledDate).toLocaleDateString()
              },
              { key: 'itemsCount', label: 'Items' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
