'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboards')
      .then(res => res.json())
      .then(data => { setDashboards(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-c-ink">Dashboards</h1>
        <Button variant="primary">+ Create Dashboard</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dash: any) => (
          <Card key={dash.id} className="p-6 cursor-pointer hover:border-c-brand" onClick={() => window.location.href = `/analytics/dashboards/${dash.id}`}>
            <h3 className="font-semibold text-c-ink mb-2">{dash.name}</h3>
            <p className="text-sm text-c-mid">{dash.description || 'No description'}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
