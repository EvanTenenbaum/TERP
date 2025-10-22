'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

export default function DashboardDetailPage({ params }: { params: { id: string } }) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics/dashboards/${params.id}`)
      .then(res => res.json())
      .then(data => { setDashboard(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (!dashboard) return <div className="p-6"><ErrorState message="Dashboard not found" /></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-c-ink">{dashboard.name || 'Dashboard'}</h1>
        <Button variant="primary">+ Add Widget</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-6">
            <h3 className="font-semibold text-c-ink mb-2">Widget {i}</h3>
            <div className="text-3xl font-bold text-c-brand">$0</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
