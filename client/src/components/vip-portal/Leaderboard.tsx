import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, TrendingUp, RefreshCw, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface LeaderboardProps {
  clientId: number;
  config: any;
}

export function Leaderboard({ clientId, config }: LeaderboardProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch leaderboard data
  const { data, isLoading, error, refetch } = trpc.vipPortal.leaderboard.getLeaderboard.useQuery({
    clientId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "Unable to load leaderboard data"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { leaderboardType, displayMode, clientRank, totalClients, entries, suggestions, lastUpdated } = data;

  // Get leaderboard type display name
  const getTypeName = () => {
    switch (leaderboardType) {
      case 'ytd_spend': return 'YTD Spend';
      case 'payment_speed': return 'Payment Speed';
      case 'order_frequency': return 'Order Frequency';
      case 'credit_utilization': return 'Credit Utilization';
      case 'ontime_payment_rate': return 'On-Time Payment Rate';
      default: return 'Leaderboard';
    }
  };

  // Get medal emoji
  const getMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  // Format metric value
  const formatValue = (value: number) => {
    switch (leaderboardType) {
      case 'ytd_spend':
        return `$${value.toLocaleString()}`;
      case 'payment_speed':
        return `${Math.round(value)} days`;
      case 'order_frequency':
        return `${Math.round(value)} orders`;
      case 'credit_utilization':
      case 'ontime_payment_rate':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  // Get rank suffix
  const getRankSuffix = (rank: number) => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {getTypeName()} Leaderboard
              </CardTitle>
              <CardDescription className="text-sm">
                Your ranking among VIP clients
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Your Rank Display */}
          <div className="text-center p-6 bg-primary/5 rounded-lg border-2 border-primary/20">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
              {getMedal(clientRank)} {clientRank}{getRankSuffix(clientRank)}
            </div>
            <div className="text-sm text-muted-foreground">
              out of {totalClients} VIP clients
            </div>
            {displayMode === 'transparent' && (
              <div className="mt-3 text-lg font-semibold">
                {formatValue(entries.find(e => e.isCurrentClient)?.metricValue || 0)}
              </div>
            )}
          </div>

          {/* Display Mode Badge */}
          <div className="mt-4 flex justify-center">
            <Badge variant={displayMode === 'transparent' ? 'default' : 'secondary'}>
              {displayMode === 'transparent' ? 'Transparent Mode' : 'Black Box Mode'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rankings List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Rankings</CardTitle>
          <CardDescription className="text-sm">
            {displayMode === 'blackbox' 
              ? 'Ranks only (values hidden)' 
              : 'Ranks with performance values'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map((entry: any) => (
              <div
                key={entry.rank}
                className={`
                  flex items-center justify-between p-3 rounded-lg border
                  ${entry.isCurrentClient 
                    ? 'bg-primary/10 border-primary font-semibold' 
                    : 'bg-card border-border'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">
                    {getMedal(entry.rank)}
                  </span>
                  <div>
                    <div className="text-sm md:text-base">
                      {entry.rank}{getRankSuffix(entry.rank)} Place
                      {entry.isCurrentClient && (
                        <span className="ml-2 text-primary">(You)</span>
                      )}
                    </div>
                  </div>
                </div>
                {displayMode === 'transparent' && (
                  <div className="text-sm md:text-base font-mono">
                    {formatValue(entry.metricValue)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show ellipsis if there are more entries */}
          {totalClients > entries.length && (
            <div className="text-center text-muted-foreground text-sm mt-3">
              ... and {totalClients - entries.length} more
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              How to Improve Your Ranking
            </CardTitle>
            <CardDescription className="text-sm">
              Actionable steps to climb the leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`suggestion-${index}-${suggestion.substring(0, 20)}`}
                  className="flex gap-3 p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}
