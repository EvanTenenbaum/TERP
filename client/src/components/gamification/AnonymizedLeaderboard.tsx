/**
 * Anonymized Leaderboard Component
 * Sprint 5 Track B: MEET-044
 *
 * Displays VIP member rankings without revealing identities.
 * Supports weekly, monthly, and all-time views.
 */

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Medal,
  Award,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Crown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type LeaderboardPeriod =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "ALL_TIME";
type LeaderboardType =
  | "TOTAL_SPENT"
  | "ORDER_COUNT"
  | "REFERRALS"
  | "ACTIVITY"
  | "ACHIEVEMENTS";

interface AnonymizedLeaderboardProps {
  clientId?: number; // If provided, highlights user's position
  showMyPosition?: boolean;
  defaultPeriod?: LeaderboardPeriod;
  defaultType?: LeaderboardType;
  compact?: boolean;
}

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "WEEKLY", label: "This Week" },
  { value: "MONTHLY", label: "This Month" },
  { value: "QUARTERLY", label: "This Quarter" },
  { value: "YEARLY", label: "This Year" },
  { value: "ALL_TIME", label: "All Time" },
];

const TYPE_OPTIONS: {
  value: LeaderboardType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "TOTAL_SPENT",
    label: "Total Spent",
    icon: <Trophy className="h-4 w-4" />,
  },
  { value: "ORDER_COUNT", label: "Orders", icon: <Star className="h-4 w-4" /> },
  {
    value: "REFERRALS",
    label: "Referrals",
    icon: <Crown className="h-4 w-4" />,
  },
  {
    value: "ACHIEVEMENTS",
    label: "Achievements",
    icon: <Award className="h-4 w-4" />,
  },
];

const PAGE_SIZE = 10;

// Helper component for rank display
const RankBadge = React.memo(function RankBadge({
  rank,
  isCurrentUser,
}: {
  rank: number;
  isCurrentUser?: boolean;
}) {
  const baseClasses = cn(
    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
    isCurrentUser && "ring-2 ring-primary ring-offset-2"
  );

  if (rank === 1) {
    return (
      <div className={cn(baseClasses, "bg-yellow-100 text-yellow-700")}>
        <Trophy className="h-4 w-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className={cn(baseClasses, "bg-gray-100 text-gray-600")}>
        <Medal className="h-4 w-4" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className={cn(baseClasses, "bg-amber-100 text-amber-700")}>
        <Award className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className={cn(baseClasses, "bg-muted text-muted-foreground")}>
      {rank}
    </div>
  );
});

// Helper component for rank change
const RankChange = React.memo(function RankChange({
  change,
}: {
  change: number | null | undefined;
}) {
  if (change === null || change === undefined || change === 0) {
    return (
      <span className="text-muted-foreground">
        <Minus className="h-4 w-4" />
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="text-green-600 flex items-center gap-1">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs">+{change}</span>
      </span>
    );
  }
  return (
    <span className="text-red-600 flex items-center gap-1">
      <TrendingDown className="h-4 w-4" />
      <span className="text-xs">{change}</span>
    </span>
  );
});

export const AnonymizedLeaderboard = React.memo(function AnonymizedLeaderboard({
  clientId,
  showMyPosition = true,
  defaultPeriod = "MONTHLY",
  defaultType = "TOTAL_SPENT",
  compact = false,
}: AnonymizedLeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(defaultPeriod);
  const [type, setType] = useState<LeaderboardType>(defaultType);
  const [page, setPage] = useState(0);

  // Fetch leaderboard data
  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = trpc.gamification.leaderboard.getAnonymized.useQuery({
    period,
    type,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Fetch user's position if clientId provided
  const { data: myPosition } =
    trpc.gamification.leaderboard.getMyPosition.useQuery(
      { clientId: clientId ?? 0, period, type },
      { enabled: !!clientId && showMyPosition }
    );

  const handlePeriodChange = useCallback((value: string) => {
    setPeriod(value as LeaderboardPeriod);
    setPage(0);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setType(value as LeaderboardType);
    setPage(0);
  }, []);

  const formatScore = useCallback(
    (score: number) => {
      if (type === "TOTAL_SPENT") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(score);
      }
      return score.toLocaleString();
    },
    [type]
  );

  const totalPages = Math.ceil((leaderboardData?.totalCount ?? 0) / PAGE_SIZE);

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={compact ? "px-0 pt-0" : ""}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              VIP Leaderboard
            </CardTitle>
            <CardDescription>
              See how you rank among VIP members
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={type} onValueChange={handleTypeChange}>
            <TabsList>
              {TYPE_OPTIONS.map(opt => (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="gap-1"
                >
                  {opt.icon}
                  <span className="hidden sm:inline">{opt.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className={compact ? "px-0" : ""}>
        {/* My Position Card */}
        {showMyPosition && myPosition && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <RankBadge rank={myPosition.rank} isCurrentUser />
                  <div>
                    <div className="font-semibold">Your Position</div>
                    <div className="text-sm text-muted-foreground">
                      Top {(100 - myPosition.percentile).toFixed(0)}% of{" "}
                      {myPosition.totalParticipants} members
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatScore(myPosition.score)}
                  </div>
                  <RankChange change={myPosition.rankChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={`anon-leaderboard-skeleton-${i}`} className="h-14 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Error loading leaderboard: {error.message}</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Leaderboard Table */}
        {!isLoading && !error && leaderboardData && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center w-[80px]">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.entries.map(
                  (
                    entry: {
                      rank: number;
                      previousRank: number | null;
                      rankChange: number | null;
                      anonymizedName: string;
                      score: number;
                      percentile: number;
                      showTierBadge: boolean;
                      showAchievementCount: boolean;
                    },
                    index: number
                  ) => {
                    const _absoluteRank = page * PAGE_SIZE + index + 1;
                    return (
                      <TableRow key={`entry-${entry.rank}-${entry.anonymizedName}`}>
                        <TableCell>
                          <RankBadge rank={entry.rank} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {entry.anonymizedName}
                            </span>
                            {entry.showTierBadge && entry.rank <= 3 && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.rank === 1
                                  ? "Gold"
                                  : entry.rank === 2
                                    ? "Silver"
                                    : "Bronze"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatScore(entry.score)}
                        </TableCell>
                        <TableCell className="text-center">
                          <RankChange change={entry.rankChange} />
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>

            {/* Empty State */}
            {leaderboardData.entries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No leaderboard data available for this period.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1} -{" "}
                  {Math.min((page + 1) * PAGE_SIZE, leaderboardData.totalCount)}{" "}
                  of {leaderboardData.totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default AnonymizedLeaderboard;
