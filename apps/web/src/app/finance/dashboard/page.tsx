'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function FinanceDashboard() {
  const [kpis, setKpis] = useState({ ar: 0, ap: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/ar/aging').then(r => r.json()),
      fetch('/api/finance/ap/aging').then(r => r.json()),
    ]).then(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-c-ink mb-6">Finance Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-c-mid mb-2">Accounts Receivable</div>
          <div className="text-3xl font-bold text-c-brand">${kpis.ar.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-c-mid mb-2">Accounts Payable</div>
          <div className="text-3xl font-bold text-c-brand">${kpis.ap.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-c-mid mb-2">Revenue (MTD)</div>
          <div className="text-3xl font-bold text-c-brand">${kpis.revenue.toLocaleString()}</div>
        </Card>
      </div>
    </div>
  );
}
