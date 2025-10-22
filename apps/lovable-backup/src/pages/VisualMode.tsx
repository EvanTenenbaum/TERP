import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface KPIData {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  trend: { value: string; direction: "up" | "down" };
  details: { label: string; value: string }[];
}

export default function VisualMode() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const kpis: KPIData[] = [
    {
      id: "1",
      title: "Outstanding AR",
      value: "$247,500",
      subtitle: "Accounts Receivable",
      trend: { value: "8.2%", direction: "down" },
      details: [
        { label: "Due This Week", value: "$45,800" },
        { label: "Overdue", value: "$12,300" },
        { label: "Total Invoices", value: "34" },
      ],
    },
    {
      id: "2",
      title: "Active Quotes",
      value: "34",
      subtitle: "Open Sales Quotes",
      trend: { value: "12 new", direction: "up" },
      details: [
        { label: "Total Value", value: "$1.2M" },
        { label: "Avg. Quote", value: "$35.3K" },
        { label: "Conversion Rate", value: "56%" },
      ],
    },
    {
      id: "3",
      title: "Low Stock Items",
      value: "7",
      subtitle: "Below Reorder Point",
      trend: { value: "3 critical", direction: "up" },
      details: [
        { label: "Total SKUs", value: "1,234" },
        { label: "In Stock", value: "1,189" },
        { label: "On Order", value: "38" },
      ],
    },
  ];

  const current = kpis[currentIndex];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-panel">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <h1 className="mb-2">Visual Mode</h1>
          <p className="text-sm text-muted-foreground">Swipe for key metrics</p>
        </div>

        <Card className="p-8 text-center space-y-6 min-h-[400px] flex flex-col justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{current.subtitle}</p>
            <h2 className="mb-4">{current.title}</h2>
            <p className="text-5xl font-bold mb-4">{current.value}</p>
            <div className={`flex items-center justify-center gap-2 ${current.trend.direction === "up" ? "text-success" : "text-warning"}`}>
              {current.trend.direction === "up" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              <span className="text-sm font-medium">{current.trend.value}</span>
            </div>
          </div>

          {expanded && (
            <div className="space-y-3 pt-6 border-t border-border">
              {current.details.map((detail, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{detail.label}</span>
                  <span className="font-semibold">{detail.value}</span>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide" : "Show"} Details
          </Button>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            {kpis.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-fast ${i === currentIndex ? "w-8 bg-brand" : "w-2 bg-border"}`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex(Math.min(kpis.length - 1, currentIndex + 1))}
            disabled={currentIndex === kpis.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
