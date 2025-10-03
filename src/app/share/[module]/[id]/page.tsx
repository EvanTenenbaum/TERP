'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

interface ShareData {
  title: string;
  status: string;
  data: Record<string, any>;
}

export default function SharePage({
  params,
}: {
  params: { module: string; id: string };
}) {
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShareData();
  }, [params.module, params.id]);

  const fetchShareData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/share/${params.module}/${params.id}`);
      if (!res.ok) throw new Error('Failed to load shared content');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{data?.title}</h1>
          <Badge variant="info">{params.module}</Badge>
        </div>

        {/* Content */}
        <Card>
          <div className="space-y-6">
            {data?.status && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--c-mid)]">Status:</span>
                <Badge variant={data.status === 'OPEN' ? 'success' : 'default'}>
                  {data.status}
                </Badge>
              </div>
            )}

            <div className="border-t border-[var(--c-border)] pt-6">
              <pre className="text-sm text-[var(--c-mid)] whitespace-pre-wrap">
                {JSON.stringify(data?.data, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[var(--c-mid)]">
          <p>This is a read-only shared view</p>
          <p className="mt-2">Powered by ERPv3</p>
        </div>
      </div>
    </div>
  );
}
