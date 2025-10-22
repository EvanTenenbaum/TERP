'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface APAgingRow {
  vendor: string;
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyPlusDays: number;
  total: number;
}

export default function APAgingPage() {
  const [data, setData] = useState<APAgingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/ap/aging');
      if (!res.ok) throw new Error('Failed to fetch AP aging data');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    window.location.href = '/api/finance/ap/aging.csv';
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
        <ErrorState title="Failed to load AP aging" message={error} retry={fetchData} />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">AP Aging Report</h1>
          <p className="text-c-mid mt-1">Accounts payable aging by vendor</p>
        </div>
        <Button variant="primary" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      <Card>
        {data.length === 0 ? (
          <EmptyState
            title="No AP aging data"
            description="No accounts payable aging data is available"
          />
        ) : (
          <DataTable
            data={data}
            columns={[
              { key: 'vendor', label: 'Vendor' },
              { 
                key: 'current', 
                label: 'Current',
                render: (row) => <span className="font-mono">{formatCurrency(row.current)}</span>
              },
              { 
                key: 'thirtyDays', 
                label: '30 Days',
                render: (row) => <span className="font-mono">{formatCurrency(row.thirtyDays)}</span>
              },
              { 
                key: 'sixtyDays', 
                label: '60 Days',
                render: (row) => <span className="font-mono">{formatCurrency(row.sixtyDays)}</span>
              },
              { 
                key: 'ninetyPlusDays', 
                label: '90+ Days',
                render: (row) => <span className="font-mono text-c-error">{formatCurrency(row.ninetyPlusDays)}</span>
              },
              { 
                key: 'total', 
                label: 'Total',
                render: (row) => <span className="font-mono font-semibold">{formatCurrency(row.total)}</span>
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
