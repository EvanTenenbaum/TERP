'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quotes/${params.id}`)
      .then(res => res.json())
      .then(data => { setQuote(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (!quote) return <div className="p-6">Quote not found</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-c-ink">{quote.quoteNumber}</h1>
          <p className="text-c-mid">{quote.customerName}</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="success">{quote.status}</Badge>
          <Button variant="primary">Convert to Order</Button>
        </div>
      </div>
      <Card className="p-6">
        <div className="space-y-4">
          <div><strong>Total:</strong> ${(quote.totalCents / 100).toFixed(2)}</div>
          <div><strong>Valid Until:</strong> {quote.validUntil}</div>
        </div>
      </Card>
    </div>
  );
}
