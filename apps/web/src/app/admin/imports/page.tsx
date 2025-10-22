'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ImportsPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-c-ink mb-6">Bulk Import</h1>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex gap-4 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 text-center py-2 border-b-2 ${step === s ? 'border-c-brand text-c-brand' : 'border-c-border text-c-mid'}`}>
                Step {s}
              </div>
            ))}
          </div>
          
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-c-ink mb-4">Select Entity Type</h2>
              <div className="space-y-2">
                {['Quotes', 'Products', 'Customers'].map(type => (
                  <Button key={type} variant="ghost" className="w-full justify-start">{type}</Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Previous</Button>
            <Button variant="primary" disabled={step === 4} onClick={() => setStep(step + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
