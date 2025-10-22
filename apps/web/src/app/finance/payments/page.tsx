'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface Payment {
  id: string;
  customerName: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      setPayments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
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
        <ErrorState title="Failed to load payments" message={error} retry={fetchPayments} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-c-ink">Payments</h1>
          <p className="text-c-mid mt-1">Record and manage customer payments</p>
        </div>
        <Button variant="primary">+ Record Payment</Button>
      </div>

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Start recording customer payments to track cash flow"
          />
        ) : (
          <DataTable
            data={payments}
            columns={[
              { key: 'id', label: 'Payment #' },
              { key: 'customerName', label: 'Customer' },
              { 
                key: 'amount', 
                label: 'Amount',
                render: (row) => (
                  <span className="font-semibold">
                    ${row.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                  </span>
                )
              },
              { key: 'method', label: 'Method' },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => {
                  const variant = row.status === 'completed' ? 'success' : 
                                 row.status === 'pending' ? 'warning' : 'default';
                  return <Badge variant={variant}>{row.status}</Badge>;
                }
              },
              { 
                key: 'paymentDate', 
                label: 'Date',
                render: (row) => new Date(row.paymentDate).toLocaleDateString()
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
