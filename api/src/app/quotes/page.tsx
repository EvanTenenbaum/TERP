'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/Badge';

interface Quote {
  id: string;
  customerName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error('Failed to fetch quotes');
      const data = await res.json();
      setQuotes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
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
        <ErrorState 
          title="Failed to load quotes" 
          message={error} 
          retry={fetchQuotes} 
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">Sales Quotes</h1>
          <p className="text-c-mid mt-1">Manage quotes and convert them to orders</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => router.push('/quotes/new')}
          aria-label="Create new quote"
        >
          + New Quote
        </Button>
      </div>

      <Card>
        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Get started by creating your first sales quote"
            action={{
              label: 'Create Quote',
              onClick: () => router.push('/quotes/new')
            }}
          />
        ) : (
          <DataTable
            data={quotes}
            columns={[
              { 
                key: 'id', 
                label: 'Quote #',
                render: (row) => (
                  <span className="font-mono text-sm">{row.id}</span>
                )
              },
              { 
                key: 'customerName', 
                label: 'Customer',
                render: (row) => (
                  <span className="font-medium">{row.customerName}</span>
                )
              },
              { 
                key: 'amount', 
                label: 'Amount',
                render: (row) => (
                  <span className="font-semibold">
                    ${row.amount?.toLocaleString() || '0.00'}
                  </span>
                )
              },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => {
                  const statusMap: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
                    draft: 'default',
                    sent: 'warning',
                    approved: 'success',
                    rejected: 'error',
                  };
                  return (
                    <Badge variant={statusMap[row.status?.toLowerCase()] || 'default'}>
                      {row.status || 'Draft'}
                    </Badge>
                  );
                }
              },
              { 
                key: 'createdAt', 
                label: 'Created',
                render: (row) => {
                  const date = new Date(row.createdAt);
                  return (
                    <span className="text-sm text-c-mid">
                      {date.toLocaleDateString()}
                    </span>
                  );
                }
              },
            ]}
            onRowClick={(row) => router.push(`/quotes/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
