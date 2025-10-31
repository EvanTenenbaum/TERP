import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Target, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function MatchmakingOpportunitiesWidget() {
  const [, setLocation] = useLocation();

  // Get top matches from all active needs
  const { data: matchesData, isLoading: matchesLoading } =
    trpc.matching.getAllActiveNeedsWithMatches.useQuery(
      undefined,
      { refetchInterval: 300000 } // Refresh every 5 minutes
    );

  // Get predictive reorder opportunities
  const { data: predictionsData, isLoading: predictionsLoading } =
    trpc.matching.getPredictiveReorderOpportunities.useQuery(
      { lookAheadDays: 14, minOrderCount: 3 },
      { refetchInterval: 3600000 } // Refresh every hour
    );

  const isLoading = matchesLoading || predictionsLoading;

  // Get top 5 high-confidence matches
  const topMatches = (matchesData?.data || [])
    .filter(m => m.matches.length > 0)
    .flatMap(m =>
      m.matches.map(match => ({
        ...match,
        clientNeedId: m.clientNeedId,
        clientId: m.clientId,
        clientName: m.clientName || "Unknown",
        strain: m.strain,
        priority: m.priority,
      }))
    )
    .filter(m => m.confidence >= 75)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  // Get urgent needs (no matches or low confidence)
  const urgentNeeds = (matchesData?.data || [])
    .filter(m => m.priority === "URGENT" || m.priority === "HIGH")
    .filter(
      m =>
        m.matches.length === 0 ||
        m.matches.every(match => match.confidence < 60)
    )
    .slice(0, 5);

  // Get overdue predicted reorders
  const overdueReorders = (predictionsData?.data || [])
    .filter(p => p.daysUntilPredictedOrder < 0)
    .slice(0, 5);

  const totalOpportunities = topMatches.length + overdueReorders.length;

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 90) return "default";
    if (confidence >= 75) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">
              Matchmaking Opportunities
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/matchmaking")}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <CardDescription>
          {totalOpportunities} high-priority opportunities •{" "}
          {urgentNeeds.length} urgent needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : totalOpportunities === 0 && urgentNeeds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No matchmaking opportunities at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Matches Section */}
            {topMatches.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Matches
                </h4>
                <div className="space-y-2">
                  {topMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() =>
                        setLocation(`/clients/${match.clientId}?tab=needs`)
                      }
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {match.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.strain || "Any strain"}
                            {match.priority && ` • ${match.priority} priority`}
                          </p>
                        </div>
                        <Badge
                          variant={getConfidenceBadgeVariant(match.confidence)}
                        >
                          {match.confidence}% {match.type}
                        </Badge>
                      </div>
                      {match.reasons && match.reasons.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {match.reasons[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Reorders Section */}
            {overdueReorders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Reorders
                </h4>
                <div className="space-y-2">
                  {overdueReorders.map((prediction, idx) => (
                    <div
                      key={idx}
                      className="border border-destructive/30 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() =>
                        setLocation(`/clients/${prediction.clientId}`)
                      }
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {prediction.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {prediction.strain ||
                              prediction.category ||
                              "Regular order"}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {Math.abs(prediction.daysUntilPredictedOrder)}d
                          overdue
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prediction.reasons && prediction.reasons[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Urgent Needs Section */}
            {urgentNeeds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  Urgent Needs - No Good Matches
                </h4>
                <div className="space-y-2">
                  {urgentNeeds.map((need, idx) => (
                    <div
                      key={idx}
                      className="border border-orange-300/30 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() =>
                        setLocation(`/clients/${need.clientId}?tab=needs`)
                      }
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {need.clientName || "Unknown Client"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {need.strain || "Any strain"}
                            {need.priority && ` • ${need.priority} priority`}
                          </p>
                        </div>
                        <Badge variant="destructive">{need.priority}</Badge>
                      </div>
                      <p className="text-xs text-orange-600">
                        {need.matches.length === 0
                          ? "No matches found - consider sourcing"
                          : `Only ${need.matches[0].confidence}% confidence match`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
