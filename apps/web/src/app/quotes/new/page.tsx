'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function NewQuotePage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Submit logic here
    setSaving(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-c-ink mb-6">New Quote</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Customer" placeholder="Select customer" />
          <Input label="Valid Until" type="date" />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => window.history.back()}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Quote'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
