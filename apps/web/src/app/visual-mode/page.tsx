'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function VisualModePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const cards = [
    { id: '1', type: 'quote', title: 'Quote #1001', subtitle: 'Acme Corp', amount: 15000, status: 'SENT' },
    { id: '2', type: 'order', title: 'Order #2001', subtitle: 'TechCo', amount: 25000, status: 'PENDING' },
    { id: '3', type: 'invoice', title: 'Invoice #3001', subtitle: 'BuildIt Inc', amount: 35000, status: 'PAID' },
  ];

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      setSwipeOffset(e.targetTouches[0].clientX - touchStart);
    }
  };

  const onTouchEnd = () => {
    if (swipeOffset > 50 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (swipeOffset < -50 && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    setSwipeOffset(0);
    setTouchStart(null);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-c-bg flex flex-col p-4">
      <h1 className="text-2xl font-bold text-c-ink mb-4">Visual Mode</h1>
      <div
        className="flex-1 flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.3s' : 'none' }}
      >
        <div className="bg-c-panel border-2 border-c-border rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-sm text-c-brand uppercase mb-2">{currentCard.type}</div>
              <h2 className="text-3xl font-bold text-c-ink">{currentCard.title}</h2>
              <p className="text-c-mid">{currentCard.subtitle}</p>
            </div>
            <Badge variant="success">{currentCard.status}</Badge>
          </div>
          <div className="text-5xl font-bold text-c-brand mb-8">
            ${currentCard.amount.toLocaleString()}
          </div>
          <Button variant="primary" className="w-full">View Details</Button>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <Button onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} disabled={currentIndex === 0}>← Previous</Button>
        <span className="text-c-mid">{currentIndex + 1} / {cards.length}</span>
        <Button onClick={() => currentIndex < cards.length - 1 && setCurrentIndex(currentIndex + 1)} disabled={currentIndex === cards.length - 1}>Next →</Button>
      </div>
    </div>
  );
}
