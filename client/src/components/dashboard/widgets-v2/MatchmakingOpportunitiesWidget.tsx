import { memo } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";
import { Target, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

/** Match item from the matching API */
interface MatchItem {
  clientId: number;
  clientName: string;
  batchId?: number;
  strain?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  confidence: number;
  type?: string;
  reasons?: string[];
}

/** Prediction item from the predictive reorder API */
interface PredictionItem {
  clientId: number;
  clientName: string;
  strain?: string;
  category?: string;
  predictedReorderDate?: Date | string;
  reasons?: string[];
}

/** Processed prediction item with calculated days */
interface ProcessedPredictionItem extends PredictionItem {
  daysUntilPredictedOrder: number;
}

export const MatchmakingOpportunitiesWidget = memo(
  function MatchmakingOpportunitiesWidget() {
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

    // Get top 5 high-confidence matches from the flat list returned by API
    const allMatches = (matchesData?.data || []) as MatchItem[];
    const topMatches = allMatches
      .filter((m: MatchItem) => m.confidence >= 75)
      .sort((a: MatchItem, b: MatchItem) => b.confidence - a.confidence)
      .slice(0, 5);

    // Get urgent needs (high priority with low confidence)
    const urgentNeeds = allMatches
      .filter(
        (m: MatchItem) => m.priority === "URGENT" || m.priority === "HIGH"
      )
      .filter((m: MatchItem) => m.confidence < 60)
      .slice(0, 5);

    // Get overdue predicted reorders - calculate days from predictedReorderDate
    const predictions = (predictionsData?.data || []) as PredictionItem[];
    const overdueReorders: ProcessedPredictionItem[] = predictions
      .map((p: PredictionItem): ProcessedPredictionItem => {
        const predictedDate = p.predictedReorderDate
          ? new Date(p.predictedReorderDate)
          : null;
        const daysUntil = predictedDate
          ? Math.floor(
              (predictedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : 0;
        return { ...p, daysUntilPredictedOrder: daysUntil };
      })
      .filter((p: ProcessedPredictionItem) => p.daysUntilPredictedOrder < 0)
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
                Client Outreach Opportunities
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
            {totalOpportunities} likely reorder or match opportunities •{" "}
            {urgentNeeds.length} urgent gaps
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
            <EmptyState
              variant="generic"
              size="sm"
              title="No matchmaking opportunities"
              description="Opportunities will appear when client needs match inventory"
            />
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
                    {topMatches.map(match => (
                      <div
                        key={`${match.clientId}-${match.batchId}-${match.type}-${match.confidence}`}
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
                              {match.priority &&
                                ` • ${match.priority} priority`}
                            </p>
                          </div>
                          <Badge
                            variant={getConfidenceBadgeVariant(
                              match.confidence
                            )}
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
                    {overdueReorders.map(prediction => (
                      <div
                        key={`${prediction.clientId}-${prediction.strain || prediction.category || "regular"}-${prediction.daysUntilPredictedOrder}`}
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
                    {urgentNeeds.map(need => (
                      <div
                        key={`${need.clientId}-${need.strain || "any"}-${need.priority || "none"}`}
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
                          {need.confidence < 30
                            ? "No good matches found - consider sourcing"
                            : `Only ${need.confidence}% confidence match`}
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
);
