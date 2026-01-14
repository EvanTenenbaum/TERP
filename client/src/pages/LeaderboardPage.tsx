/**
 * Leaderboard Page
 * Main leaderboard view for internal users with metric categories,
 * filters, weight customization, and ranking display.
 */

import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Medal,
  Award,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { useLocation } from "wouter";
import { ExportButton, WeightCustomizer } from "@/components/leaderboard";

// Types
type ClientType = "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
type MetricCategory = "MASTER" | "FINANCIAL" | "ENGAGEMENT" | "RELIABILITY" | "GROWTH";
type SortOrder = "asc" | "desc";

interface LeaderboardFilters {
  clientType: ClientType;
  metricCategory: MetricCategory;
  search: string;
  sortBy: string;
  sortOrder: SortOrder;
}

// Constants
const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "ALL", label: "All Clients" },
  { value: "CUSTOMER", label: "Customers Only" },
  { value: "SUPPLIER", label: "Suppliers Only" },
  { value: "DUAL", label: "Dual (Both)" },
];

const METRIC_CATEGORIES: { value: MetricCategory; label: string; description: string }[] = [
  { value: "MASTER", label: "Master Score", description: "Overall weighted ranking" },
  { value: "FINANCIAL", label: "Financial", description: "Revenue, LTV, margins" },
  { value: "ENGAGEMENT", label: "Engagement", description: "Order frequency, recency" },
  { value: "RELIABILITY", label: "Reliability", description: "Payment behavior" },
  { value: "GROWTH", label: "Growth", description: "YoY trends" },
];

const PAGE_SIZE = 25;

// Helper components
const RankBadge = React.memo(function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <span className="font-bold text-yellow-600">1st</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1">
        <Medal className="h-5 w-5 text-gray-400" />
        <span className="font-bold text-gray-500">2nd</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1">
        <Award className="h-5 w-5 text-amber-600" />
        <span className="font-bold text-amber-700">3rd</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
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
        <span className="text-xs">+{amount}</span>
      </div>
    );
  }
  if (trend === "down") {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs">-{Math.abs(amount)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      <span className="text-xs">—</span>
    </div>
  );
});

// Main component
export const LeaderboardPage = React.memo(function LeaderboardPage() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<LeaderboardFilters>({
    clientType: "ALL",
    metricCategory: "MASTER",
    search: "",
    sortBy: "master_score",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(0);
  const [showWeightCustomizer, setShowWeightCustomizer] = useState(false);

  // Fetch leaderboard data
  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = trpc.leaderboard.list.useQuery({
    clientType: filters.clientType,
    metricCategory: filters.metricCategory,
    search: filters.search || undefined,
    sortBy: filters.sortBy as "master_score" | "ytd_revenue",
    sortOrder: filters.sortOrder,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Handlers
  const handleFilterChange = useCallback(
    <K extends keyof LeaderboardFilters>(key: K, value: LeaderboardFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(0); // Reset to first page on filter change
    },
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilterChange("search", e.target.value);
    },
    [handleFilterChange]
  );

  const handleClientClick = useCallback(
    (clientId: number) => {
      navigate(`/clients/${clientId}`);
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Pagination
  const totalPages = useMemo(() => {
    if (!leaderboardData) return 0;
    return Math.ceil(leaderboardData.totalCount / PAGE_SIZE);
  }, [leaderboardData]);

  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            Track and compare client performance across key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWeightCustomizer(!showWeightCustomizer)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Customize Weights
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ExportButton clientType={filters.clientType} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Client Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.clientType}
                onValueChange={(value) =>
                  handleFilterChange("clientType", value as ClientType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Client Type" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or TERI code..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort Order */}
            <Select
              value={filters.sortOrder}
              onValueChange={(value) =>
                handleFilterChange("sortOrder", value as SortOrder)
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Highest First</SelectItem>
                <SelectItem value="asc">Lowest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weight Customizer Panel */}
      {showWeightCustomizer && (
        <WeightCustomizer
          clientType={filters.clientType}
          onClose={() => setShowWeightCustomizer(false)}
          onSave={() => refetch()}
        />
      )}

      {/* Metric Category Tabs */}
      <Tabs
        value={filters.metricCategory}
        onValueChange={(value) =>
          handleFilterChange("metricCategory", value as MetricCategory)
        }
      >
        <TabsList className="grid w-full grid-cols-5">
          {METRIC_CATEGORIES.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {METRIC_CATEGORIES.map((category) => (
          <TabsContent key={category.value} value={category.value}>
            <Card>
              <CardHeader>
                <CardTitle>{category.label} Rankings</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Loading State */}
                {isLoading && (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={`skeleton-${i}`} className="h-16 w-full" />
                    ))}
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-8 text-red-600">
                    <p>Error loading leaderboard: {error.message}</p>
                    <Button variant="outline" onClick={handleRefresh} className="mt-4">
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Data Table */}
                {!isLoading && !error && leaderboardData && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Master Score</TableHead>
                          <TableHead className="text-right">Percentile</TableHead>
                          <TableHead className="text-center">Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.clients.map((client) => (
                          <TableRow
                            key={client.clientId}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleClientClick(client.clientId)}
                          >
                            <TableCell>
                              <RankBadge rank={client.rank} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{client.clientName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {client.teriCode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{client.clientType}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {client.masterScore?.toFixed(1) ?? "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  client.percentile >= 75
                                    ? "default"
                                    : client.percentile >= 50
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                Top {(100 - client.percentile).toFixed(0)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <TrendIndicator
                                trend={client.trend}
                                amount={client.trendAmount}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {page * PAGE_SIZE + 1} -{" "}
                        {Math.min((page + 1) * PAGE_SIZE, leaderboardData.totalCount)} of{" "}
                        {leaderboardData.totalCount} clients
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p - 1)}
                          disabled={!canGoBack}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {page + 1} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!canGoForward}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata */}
                    {leaderboardData.metadata && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        Last calculated:{" "}
                        {new Date(leaderboardData.metadata.calculatedAt).toLocaleString()}
                        {leaderboardData.metadata.cacheHit && " (cached)"}
                      </div>
                    )}
                  </>
                )}

                {/* Empty State */}
                {!isLoading && !error && leaderboardData?.clients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No clients found matching your criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
});

export default LeaderboardPage;
