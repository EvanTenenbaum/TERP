import { useState } from "react";
import { Play, Pause, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KPICard } from "@/components/data/KPICard";

interface CountItem {
  id: string;
  sku: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
}

export default function CycleCount() {
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<CountItem[]>([
    { id: "1", sku: "WGT-001", location: "A-12-3", systemQty: 150, countedQty: null, variance: null },
    { id: "2", sku: "WGT-002", location: "A-12-4", systemQty: 89, countedQty: null, variance: null },
    { id: "3", sku: "WGT-003", location: "B-05-1", systemQty: 234, countedQty: null, variance: null },
  ]);

  const handleStartSession = () => {
    setSessionActive(true);
    setCurrentIndex(0);
  };

  const handleResumeSession = () => {
    const nextIndex = counts.findIndex(c => c.countedQty === null);
    setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
    setSessionActive(true);
  };

  const handleReset = () => {
    setCounts(counts.map(c => ({ ...c, countedQty: null, variance: null })));
    setCurrentIndex(0);
    setSessionActive(false);
  };

  const completed = counts.filter(c => c.countedQty !== null).length;
  const total = counts.length;
  const hasVariances = counts.some(c => c.variance && Math.abs(c.variance) > 0);

  if (!sessionActive && completed === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="mb-2">Cycle Count</h1>
          <p className="text-muted-foreground">Zone A scheduled for today</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KPICard title="Items to Count" value={total} />
          <KPICard title="Estimated Time" value="15 min" />
          <KPICard title="Zone" value="A" />
        </div>

        <Card className="p-8 text-center">
          <h3 className="mb-4">Ready to Start Count?</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            This will guide you through counting {total} items in Zone A. You can pause at any time.
          </p>
          <Button onClick={handleStartSession}>
            <Play className="h-4 w-4 mr-2" />
            Start Session
          </Button>
        </Card>
      </div>
    );
  }

  if (!sessionActive && completed > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="mb-2">Count Complete</h1>
          <p className="text-muted-foreground">Review results and commit</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KPICard title="Items Counted" value={completed} variant={hasVariances ? "warning" : "success"} />
          <KPICard title="Variances Found" value={counts.filter(c => c.variance && Math.abs(c.variance) > 0).length} variant={hasVariances ? "warning" : "default"} />
          <KPICard title="Accuracy" value={`${Math.round((counts.filter(c => c.variance === 0).length / completed) * 100)}%`} />
        </div>

        <Card className="p-6">
          <h3 className="mb-4">Count Results</h3>
          <div className="space-y-3">
            {counts.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-md bg-panel">
                <div className="flex-1">
                  <p className="font-medium">{item.sku}</p>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">System: {item.systemQty}</p>
                    <p className="text-sm">Counted: {item.countedQty}</p>
                  </div>
                  {item.variance !== null && item.variance !== 0 ? (
                    <StatusBadge status="warning" label={`${item.variance > 0 ? '+' : ''}${item.variance}`} />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={() => alert('Count committed!')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Commit Count
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentItem = counts[currentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Counting in Progress</h1>
          <p className="text-muted-foreground">Item {currentIndex + 1} of {total}</p>
        </div>
        <Button variant="outline" onClick={() => setSessionActive(false)}>
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      </div>

      <div className="w-full bg-panel rounded-full h-2">
        <div className="bg-brand h-2 rounded-full transition-fast" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
      </div>

      <Card className="p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Location</p>
            <h2>{currentItem.location}</h2>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">SKU</p>
            <h3>{currentItem.sku}</h3>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">System Quantity</p>
            <p className="text-2xl font-semibold">{currentItem.systemQty}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter Counted Quantity</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('qty') as HTMLInputElement;
              const qty = parseInt(input.value);
              const updated = [...counts];
              updated[currentIndex].countedQty = qty;
              updated[currentIndex].variance = qty - updated[currentIndex].systemQty;
              setCounts(updated);
              
              if (currentIndex < counts.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                setSessionActive(false);
              }
            }}>
              <div className="flex gap-2">
                <Input
                  type="number"
                  name="qty"
                  placeholder="0"
                  autoFocus
                  required
                />
                <Button type="submit">
                  Next
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
