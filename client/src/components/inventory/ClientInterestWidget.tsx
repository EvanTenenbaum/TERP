import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "../needs/MatchBadge";
import { Users, TrendingUp, Loader2, MessageSquare, FileText } from "lucide-react";
import { useState } from "react";

/**
 * Client Interest Widget
 * Shows which clients need this inventory batch
 */

interface ClientInterestWidgetProps {
  batchId: number;
}

export function ClientInterestWidget({ batchId }: ClientInterestWidgetProps) {
  const [creatingQuote, setCreatingQuote] = useState<number | null>(null);
  const { user } = useAuth();

  // Fetch matches for this batch
  const { data: matchesData, isLoading } = trpc.matching.findMatchesForBatch.useQuery({
    batchId,
  });

  // Create quote mutation
  const createQuoteMutation = trpc.clientNeeds.createQuoteFromMatch.useMutation({
    onSuccess: () => {
      setCreatingQuote(null);
    },
  });

  const matches = matchesData?.data || [];

  const handleCreateQuote = async (match: any) => {
    setCreatingQuote(match.clientId);
    try {
      await createQuoteMutation.mutateAsync({
        clientId: match.clientId,
        clientNeedId: match.clientNeedId,
        matches: [match],
        userId: user?.id ?? 0,
      });
    } catch (error) {
      console.error("Error creating quote:", error);
    } finally {
      setCreatingQuote(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Client Interest</h3>
        </div>
        <Card className="p-4">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Client Interest</h3>
        </div>
        <Card className="p-4">
          <div className="text-center text-sm text-muted-foreground py-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No clients currently need this product</p>
          </div>
        </Card>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return <Badge variant={variants[priority] || "outline"} className="text-xs">{priority}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Client Interest</h3>
        </div>
        <Badge variant="secondary">{matches.length} matches</Badge>
      </div>

      <div className="space-y-3">
        {matches.map((match: any) => (
          <Card key={match.clientNeedId} className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{match.clientName || `Client #${match.clientId}`}</p>
                    {match.priority && getPriorityBadge(match.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Looking for: {match.needDescription || "Similar product"}
                  </p>
                </div>
                <MatchBadge
                  matchType={match.matchType}
                  confidence={match.confidence}
                  size="sm"
                  showIcon={false}
                />
              </div>

              {/* Match Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {match.quantityNeeded && (
                  <div>
                    <p className="text-muted-foreground">Quantity Needed</p>
                    <p className="font-medium">{match.quantityNeeded} units</p>
                  </div>
                )}
                {match.maxPrice && (
                  <div>
                    <p className="text-muted-foreground">Max Price</p>
                    <p className="font-medium">${match.maxPrice}/unit</p>
                  </div>
                )}
                {match.neededBy && (
                  <div>
                    <p className="text-muted-foreground">Needed By</p>
                    <p className="font-medium">{new Date(match.neededBy).toLocaleDateString()}</p>
                  </div>
                )}
                {match.daysSinceCreated !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{match.daysSinceCreated} days ago</p>
                  </div>
                )}
              </div>

              {/* Match Reasons */}
              {match.reasons && match.reasons.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Match reasons:</p>
                  <ul className="space-y-0.5">
                    {match.reasons.slice(0, 3).map((reason: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-green-500">✓</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => handleCreateQuote(match)}
                  disabled={creatingQuote === match.clientId}
                  className="flex-1"
                >
                  {creatingQuote === match.clientId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Quote
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/clients/${match.clientId}`;
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {matches.length > 1 && (
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Potential Revenue:</span>
            </div>
            <span className="font-medium">
              ${matches.reduce((sum: number, m: any) => {
                const qty = parseFloat(m.quantityNeeded || "0");
                const price = parseFloat(m.calculatedPrice || "0");
                return sum + (qty * price);
              }, 0).toFixed(2)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

