/**
 * Client Leaderboard Card
 * Shows a client's ranking context on their profile page
 */

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ChevronRight,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";

interface ClientLeaderboardCardProps {
  clientId: number;
  className?: string;
}

// Helper components
const RankDisplay = React.memo(function RankDisplay({
  rank,
  totalClients,
  percentile,
}: {
  rank: number;
  totalClients: number;
  percentile: number;
}) {
  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-8 w-8 text-gray-400" />;
    if (rank === 3) return <Award className="h-8 w-8 text-amber-600" />;
    return <Target className="h-8 w-8 text-muted-foreground" />;
  };

  const getRankSuffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    switch (n % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  return (
    <div className="flex items-center gap-4">
      {getRankIcon()}
      <div>
        <div className="text-3xl font-bold">
          {rank}
          <span className="text-lg text-muted-foreground">{getRankSuffix(rank)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          of {totalClients} clients
        </div>
      </div>
      <Badge
        variant={percentile >= 75 ? "default" : percentile >= 50 ? "secondary" : "outline"}
        className="ml-auto"
      >
        Top {(100 - percentile).toFixed(0)}%
      </Badge>
    </div>
  );
});

const TrendIndicator = React.memo(function TrendIndicator({
  trend,
  amount,
}: {
  trend: "up" | "down" | "stable";
  amount: number;
}) {
  if (trend === "up") {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm">Up {amount} positions</span>
      </div>
    );
  }
  if (trend === "down") {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span className="text-sm">Down {Math.abs(amount)} positions</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span className="text-sm">Stable</span>
    </div>
  );
});

const CategoryRankBar = React.memo(function CategoryRankBar({
  label,
  rank,
  totalClients,
}: {
  label: string;
  rank: number | null;
  totalClients: number;
}) {
  if (rank === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground">N/A</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  const percentile = ((totalClients - rank) / totalClients) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">#{rank}</span>
      </div>
      <Progress value={percentile} className="h-2" />
    </div>
  );
});

export const ClientLeaderboardCard = React.memo(function ClientLeaderboardCard({
  clientId,
  className = "",
}: ClientLeaderboardCardProps) {
  const [, navigate] = useLocation();

  // Fetch client ranking data
  const { data, isLoading, error } = trpc.leaderboard.getForClient.useQuery({
    clientId,
  });

  const handleViewLeaderboard = () => {
    navigate("/leaderboard");
  };

  // Format gap information
  const gapMessage = useMemo(() => {
    if (!data?.gapToNextRank) return null;
    const { metric, gap, nextRank } = data.gapToNextRank;
    
    const formatGap = (value: number, metricType: string): string => {
      switch (metricType) {
        case "ytd_revenue":
        case "lifetime_value":
        case "average_order_value":
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(value);
        case "average_days_to_pay":
        case "recency":
          return `${Math.round(value)} days`;
        case "order_frequency":
          return `${Math.ceil(value)} orders`;
        default:
          return `${value.toFixed(1)}%`;
      }
    };

    return `${formatGap(gap, metric)} away from #${nextRank}`;
  }, [data?.gapToNextRank]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Leaderboard Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load ranking data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Leaderboard Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Not enough data to calculate ranking
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Leaderboard Ranking
        </CardTitle>
        <CardDescription>
          Performance compared to other clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Rank Display */}
        <RankDisplay
          rank={data.rank}
          totalClients={data.totalClients}
          percentile={data.percentile}
        />

        {/* Trend */}
        <div className="flex items-center justify-between py-2 border-y">
          <span className="text-sm text-muted-foreground">30-day trend</span>
          <TrendIndicator trend={data.trend} amount={data.trendAmount} />
        </div>

        {/* Master Score */}
        {data.masterScore !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Master Score</span>
            <span className="text-2xl font-bold">{data.masterScore.toFixed(1)}</span>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Category Rankings</h4>
          <CategoryRankBar
            label="Financial"
            rank={data.categoryRanks.financial}
            totalClients={data.totalClients}
          />
          <CategoryRankBar
            label="Engagement"
            rank={data.categoryRanks.engagement}
            totalClients={data.totalClients}
          />
          <CategoryRankBar
            label="Reliability"
            rank={data.categoryRanks.reliability}
            totalClients={data.totalClients}
          />
          <CategoryRankBar
            label="Growth"
            rank={data.categoryRanks.growth}
            totalClients={data.totalClients}
          />
        </div>

        {/* Gap to Next Rank */}
        {gapMessage && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              <span>{gapMessage}</span>
            </div>
          </div>
        )}

        {/* View Full Leaderboard */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleViewLeaderboard}
        >
          View Full Leaderboard
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
});

export default ClientLeaderboardCard;
