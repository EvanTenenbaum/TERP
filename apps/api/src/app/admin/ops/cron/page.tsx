'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function CronJobsPage() {
  const jobs = [
    { name: 'Reservations Expiry', lastRun: '2025-01-03 00:00', status: 'success' },
    { name: 'Profitability Calculation', lastRun: '2025-01-03 02:00', status: 'success' },
    { name: 'Replenishment Recommendations', lastRun: '2025-01-03 03:00', status: 'success' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-c-ink mb-6">Cron Jobs</h1>
      <div className="space-y-4">
        {jobs.map((job, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-c-ink">{job.name}</h3>
                <p className="text-sm text-c-mid">Last run: {job.lastRun}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success">{job.status}</Badge>
                <Button variant="ghost">Trigger Now</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
