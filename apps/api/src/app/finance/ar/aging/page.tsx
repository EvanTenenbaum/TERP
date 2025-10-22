'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface ARAgingRow {
  customer: string;
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyPlusDays: number;
  total: number;
}

export default function ARAgingPage() {
  const [data, setData] = useState<ARAgingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/finance/ar/aging');
      if (!response.ok) throw new Error('Failed to fetch AR aging data');
      const result = await response.json();
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
    window.location.href = '/api/finance/ar/aging.csv';
  };

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
        <ErrorState title="Error loading AR aging" message={error || 'Unknown error'} retry={fetchData} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-c-ink">AR Aging Report</h1>
        <Button variant="primary" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>
      <Card className="p-6">
        {data.length === 0 ? (
          <EmptyState
            title="No AR aging data"
            description="No accounts receivable aging data is available."
          />
        ) : (
          <DataTable
            data={data}
            columns={[
              { key: 'customer', label: 'Customer' },
              { key: 'current', label: 'Current' },
              { key: 'thirtyDays', label: '30 Days' },
              { key: 'sixtyDays', label: '60 Days' },
              { key: 'ninetyPlusDays', label: '90+ Days' },
              { key: 'total', label: 'Total' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
