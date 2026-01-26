import { memo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "@/components/needs/MatchBadge";
import { Lightbulb, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Smart Opportunities Widget
 * Dashboard widget showing top matching opportunities
 */

interface SmartOpportunitiesWidgetProps {
  limit?: number;
}

// LINT-005: Define badge variant type
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const SmartOpportunitiesWidget = memo(function SmartOpportunitiesWidget({
  limit = 5,
}: SmartOpportunitiesWidgetProps) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = trpc.clientNeeds.getSmartOpportunities.useQuery({
    limit,
  });

  const opportunities = data?.data || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle>Smart Opportunities</CardTitle>
            </div>
          </div>
          <CardDescription>
            Top matching opportunities for your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle>Smart Opportunities</CardTitle>
            </div>
          </div>
          <CardDescription>
            Top matching opportunities for your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No opportunities found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create client needs to see matching opportunities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: string) => {
    // LINT-005: Use proper Badge variant type
    const variants: Record<string, BadgeVariant> = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return (
      <Badge variant={variants[priority] || "outline"} className="text-xs">
        {priority}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle>Smart Opportunities</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/needs")}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <CardDescription>
          Top matching opportunities for your clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* LINT-005: Let TypeScript infer types from API response */}
          {/* LINT-004: Use unique clientId instead of array index */}
          {opportunities.map(opp => (
            <div
              key={`opp-${opp.clientId}`}
              className="flex items-start justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setLocation(`/clients/${opp.clientId}?tab=needs`)}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">
                    {opp.clientName || `Client #${opp.clientId}`}
                  </p>
                  {opp.priority && getPriorityBadge(opp.priority)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {opp.needDescription || "Looking for products"}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {(opp.matchCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {opp.matchCount}{" "}
                      {opp.matchCount === 1 ? "match" : "matches"}
                    </span>
                  )}
                  {opp.bestConfidence && (
                    <span>Best: {opp.bestConfidence}% confidence</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {opp.bestMatchType && opp.bestConfidence && (
                  <MatchBadge
                    matchType={
                      opp.bestMatchType as "EXACT" | "CLOSE" | "HISTORICAL"
                    }
                    confidence={opp.bestConfidence}
                    size="sm"
                    showIcon={false}
                  />
                )}
                {opp.potentialRevenue && (
                  <p className="text-xs font-medium text-green-600">
                    ${parseFloat(opp.potentialRevenue).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {opportunities.length >= limit && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setLocation("/needs")}
          >
            View All Opportunities
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
