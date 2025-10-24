import { WidgetContainer } from "../WidgetContainer";
import { TrendingUp } from "lucide-react";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

// Mock data - in production, this would come from tRPC
const mockData: MonthlyRevenue[] = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
];

export function RevenueChartWidget() {
  const maxRevenue = Math.max(...mockData.map((d) => d.revenue));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <WidgetContainer title="Revenue Trend">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span>Last 6 months</span>
        </div>
        
        <div className="space-y-3">
          {mockData.map((item) => {
            const heightPercent = (item.revenue / maxRevenue) * 100;
            return (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-xs font-medium w-8 text-muted-foreground">
                  {item.month}
                </span>
                <div className="flex-1 relative">
                  <div className="h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${heightPercent}%` }}
                    >
                      {heightPercent > 30 && (
                        <span className="text-xs font-medium text-primary-foreground">
                          {formatCurrency(item.revenue)}
                        </span>
                      )}
                    </div>
                  </div>
                  {heightPercent <= 30 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                      {formatCurrency(item.revenue)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetContainer>
  );
}

