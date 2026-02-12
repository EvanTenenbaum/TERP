/**
 * Leaderboard Widget
 * Compact leaderboard display for the dashboard showing top/bottom performers
 */

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

// Types
type MetricOption = "master_score" | "ytd_revenue" | "order_frequency" | "on_time_payment_rate";
type ModeOption = "top" | "bottom";
type ClientType = "ALL" | "CUSTOMER" | "SUPPLIER";

interface LeaderboardWidgetProps {
  className?: string;
  defaultMetric?: MetricOption;
  defaultMode?: ModeOption;
  defaultClientType?: ClientType;
  limit?: number;
}

const METRIC_OPTIONS: { value: MetricOption; label: string }[] = [
  { value: "master_score", label: "Master Score" },
  { value: "ytd_revenue", label: "YTD Revenue" },
  { value: "order_frequency", label: "Order Frequency" },
  { value: "on_time_payment_rate", label: "Payment Rate" },
];

// Helper components
const RankIcon = React.memo(function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="w-4 text-center text-xs text-muted-foreground">{rank}</span>;
});

const TrendIcon = React.memo(function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
});

export const LeaderboardWidget = React.memo(function LeaderboardWidget({
  className = "",
  defaultMetric = "master_score",
  defaultMode = "top",
  defaultClientType = "ALL",
  limit = 5,
}: LeaderboardWidgetProps) {
  const [, navigate] = useLocation();
  const [metric, setMetric] = useState<MetricOption>(defaultMetric);
  const [mode, setMode] = useState<ModeOption>(defaultMode);

  // Fetch widget data
  const { data, isLoading, error } = trpc.leaderboard.getWidgetData.useQuery({
    metric,
    mode,
    limit,
    clientType: defaultClientType,
  });

  const handleClientClick = useCallback(
    (clientId: number) => {
      navigate(`/clients/${clientId}`);
    },
    [navigate]
  );

  const handleViewAll = useCallback(() => {
    navigate("/leaderboard");
  }, [navigate]);

  const formatScore = (score: number): string => {
    if (metric === "ytd_revenue") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(score);
    }
    if (metric === "on_time_payment_rate") {
      return `${score.toFixed(0)}%`;
    }
    return score.toFixed(1);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {mode === "top" ? "Top Performers" : "Needs Attention"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricOption)}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setMode(mode === "top" ? "bottom" : "top")}
            >
              {mode === "top" ? "Show Bottom" : "Show Top"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={`leaderboard-skeleton-${i}`} className="h-10 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>Unable to load leaderboard</span>
          </div>
        )}

        {/* Data */}
        {!isLoading && !error && data && (
          <>
            <div className="space-y-1">
              {data.entries.map((entry) => (
                <div
                  key={entry.clientId}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleClientClick(entry.clientId)}
                >
                  <RankIcon rank={entry.rank} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {entry.clientName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {formatScore(entry.score)}
                    </span>
                    <TrendIcon trend={entry.trend} />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {data.totalClients} total clients
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleViewAll}
              >
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.entries.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No clients found
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default LeaderboardWidget;
