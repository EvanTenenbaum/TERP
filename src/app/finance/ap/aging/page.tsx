'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function APAgingPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance/ap/aging')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    window.location.href = '/api/finance/ap/aging.csv';
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-c-ink">AP Aging</h1>
        <Button variant="primary" onClick={exportCSV}>Export CSV</Button>
      </div>
      <Card className="p-6">
        <DataTable data={data} columns={[]} />
      </Card>
    </div>
  );
}
