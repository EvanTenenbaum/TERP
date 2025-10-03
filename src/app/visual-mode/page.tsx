'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

interface CardData {
  id: string;
  module: string;
  title: string;
  kpi: string;
  status: string;
  details: Record<string, string>;
}

export default function VisualModePage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch aggregated data for visual mode
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      // Mock data - in production this would aggregate from multiple endpoints
      const mockCards: CardData[] = [
        {
          id: '1',
          module: 'quotes',
          title: 'Acme Corp',
          kpi: '$14,500',
          status: 'OPEN',
          details: { 'Valid Until': '2025-01-15', 'Items': '5' },
        },
        {
          id: '2',
          module: 'inventory',
          title: 'Cycle Count #42',
          kpi: '12 discrepancies',
          status: 'PENDING',
          details: { 'Location': 'Warehouse A', 'Started': '2025-01-03' },
        },
      ];
      setCards(mockCards);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right' && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'left' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (cards.length === 0) {
    return <EmptyState title="No data" description="No items to display in visual mode" />;
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <Card className="mb-6 min-h-[400px]">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-[var(--c-mid)] mb-1">{currentCard.module}</div>
                <h2 className="text-2xl font-bold">{currentCard.title}</h2>
              </div>
              <Badge variant={currentCard.status === 'OPEN' ? 'success' : 'warning'}>
                {currentCard.status}
              </Badge>
            </div>

            <div className="py-8">
              <div className="text-4xl font-bold text-[var(--c-brand)]">{currentCard.kpi}</div>
            </div>

            <div className="space-y-2 border-t border-[var(--c-border)] pt-4">
              {Object.entries(currentCard.details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-[var(--c-mid)]">{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => handleSwipe('left')}
            disabled={currentIndex === 0}
          >
            ← Previous
          </Button>
          <div className="text-sm text-[var(--c-mid)]">
            {currentIndex + 1} / {cards.length}
          </div>
          <Button
            variant="ghost"
            onClick={() => handleSwipe('right')}
            disabled={currentIndex === cards.length - 1}
          >
            Next →
          </Button>
        </div>

        {/* Swipe hint for mobile */}
        <div className="text-center text-sm text-[var(--c-mid)] md:hidden">
          Swipe left or right to navigate
        </div>
      </div>
    </div>
  );
}
