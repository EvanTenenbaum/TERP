import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeedForm } from "./NeedForm";
import { MatchCard } from "./MatchCard";
import type { NeedFormPayload } from "./needForm.types";
import { Plus, Package, TrendingUp, Loader2 } from "lucide-react";

/**
 * Client Needs Tab
 * Main component for displaying and managing client needs with matches
 */

/** Match shape — mirrors server Match interface and MatchCard props */
interface MatchEntry {
  type: "EXACT" | "CLOSE" | "HISTORICAL";
  confidence: number;
  reasons: string[];
  source: "INVENTORY" | "VENDOR" | "HISTORICAL";
  sourceId: number;
  sourceData: Record<string, unknown>;
  calculatedPrice?: number;
  availableQuantity?: number;
}

/** Selected need with its matches for display */
interface SelectedNeedState {
  id: number;
  matches: MatchEntry[];
}

interface ClientNeedsTabProps {
  clientId: number;
}

export function ClientNeedsTab({ clientId }: ClientNeedsTabProps) {
  const [needFormOpen, setNeedFormOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<SelectedNeedState | null>(
    null
  );
  const [activeSubTab, setActiveSubTab] = useState("active");
  const { user } = useAuth();

  // Fetch active needs
  const {
    data: activeNeedsData,
    isLoading: needsLoading,
    refetch: refetchNeeds,
  } = trpc.clientNeeds.getActiveByClient.useQuery({ clientId });

  // Fetch purchase history patterns
  const { data: historyData, isLoading: historyLoading } =
    trpc.matching.analyzeClientPurchaseHistory.useQuery({
      clientId,
      minPurchases: 2,
    });

  // Create need mutation
  const createNeedMutation = trpc.clientNeeds.createAndFindMatches.useMutation({
    onSuccess: result => {
      refetchNeeds();
      if (
        result.success &&
        result.matches &&
        result.matches.matches.length > 0 &&
        result.need
      ) {
        setSelectedNeed({
          id: result.need.id,
          matches: result.matches.matches as MatchEntry[],
        });
      }
    },
  });

  // State for finding matches
  const [findingMatchesForNeed, setFindingMatchesForNeed] = useState<
    number | null
  >(null);

  // Find matches for existing need
  const { refetch: refetchMatches } = trpc.clientNeeds.findMatches.useQuery(
    { needId: findingMatchesForNeed ?? 0 },
    { enabled: findingMatchesForNeed !== null }
  );

  // Create quote from match
  const createQuoteMutation = trpc.clientNeeds.createQuoteFromMatch.useMutation(
    {
      onSuccess: () => {
        refetchNeeds();
      },
    }
  );

  const handleCreateNeed = async (data: NeedFormPayload) => {
    await createNeedMutation.mutateAsync(data);
  };

  const handleFindMatches = async (needId: number) => {
    setFindingMatchesForNeed(needId);
    const result = await refetchMatches();
    if (result.data?.success && result.data.data) {
      setSelectedNeed({
        id: needId,
        matches: result.data.data.matches as MatchEntry[],
      });
    }
    setFindingMatchesForNeed(null);
  };

  const handleCreateQuote = async (
    need: { id: number },
    matches: MatchEntry[]
  ) => {
    await createQuoteMutation.mutateAsync({
      clientId,
      clientNeedId: need.id,
      matches: matches as unknown as Record<string, unknown>[],
      userId: user?.id ?? 0,
    });
  };

  const activeNeeds = activeNeedsData?.data || [];
  const purchasePatterns = historyData?.data || [];

  const getPriorityBadge = (priority: string) => {
    const variants: Record<
      string,
      "default" | "destructive" | "secondary" | "outline"
    > = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Client Needs & History</h3>
          <p className="text-sm text-muted-foreground">
            Track what the client is looking for and view purchase patterns
          </p>
        </div>
        <Button onClick={() => setNeedFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Need
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active Needs ({activeNeeds.length})
          </TabsTrigger>
          <TabsTrigger value="history">Purchase History</TabsTrigger>
        </TabsList>

        {/* Active Needs Tab */}
        <TabsContent value="active" className="space-y-4">
          {needsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeNeeds.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No active needs</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a need to start finding matches
                </p>
                <Button onClick={() => setNeedFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Need
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeNeeds.map(need => (
                <Card key={need.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {need.strain || need.category || "General Need"}
                          </CardTitle>
                          {getPriorityBadge(need.priority)}
                        </div>
                        <CardDescription>
                          {[need.category, need.subcategory, need.grade]
                            .filter(Boolean)
                            .join(" • ")}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFindMatches(need.id)}
                        disabled={findingMatchesForNeed === need.id}
                      >
                        {findingMatchesForNeed === need.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Find Matches"
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Need Details */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {need.quantityMin && (
                        <div>
                          <p className="text-muted-foreground">
                            Quantity Range
                          </p>
                          <p className="font-medium">
                            {need.quantityMin}
                            {need.quantityMax && ` - ${need.quantityMax}`} units
                          </p>
                        </div>
                      )}
                      {need.priceMax && (
                        <div>
                          <p className="text-muted-foreground">Max Price</p>
                          <p className="font-medium">${need.priceMax}/unit</p>
                        </div>
                      )}
                      {need.neededBy && (
                        <div>
                          <p className="text-muted-foreground">Needed By</p>
                          <p className="font-medium">
                            {new Date(need.neededBy).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {need.notes && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Notes</p>
                        <p>{need.notes}</p>
                      </div>
                    )}

                    {/* Show matches if selected */}
                    {selectedNeed?.id === need.id && selectedNeed.matches && (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-medium">
                          Found {selectedNeed.matches.length} Matches
                        </h4>
                        <div className="grid gap-3">
                          {selectedNeed.matches.slice(0, 3).map(match => (
                            <MatchCard
                              key={`match-${match.source}-${match.sourceId}`}
                              match={match}
                              onCreateQuote={() =>
                                handleCreateQuote(need, [match])
                              }
                            />
                          ))}
                        </div>
                        {selectedNeed.matches.length > 3 && (
                          <p className="text-sm text-muted-foreground text-center">
                            +{selectedNeed.matches.length - 3} more matches
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Purchase History Tab */}
        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : purchasePatterns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No purchase history</p>
                <p className="text-sm text-muted-foreground">
                  Purchase patterns will appear here after the client makes
                  purchases
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {purchasePatterns.map((pattern, idx) => (
                <Card
                  key={`history-pattern-${pattern.strain || pattern.category || idx}`}
                >
                  <CardHeader>
                    <CardTitle className="text-base">
                      {pattern.strain || pattern.category || "Unknown Product"}
                    </CardTitle>
                    <CardDescription>
                      Purchased {pattern.purchaseCount} times
                      {pattern.lastPurchaseDate && (
                        <>
                          {" "}
                          • Last:{" "}
                          {new Date(
                            pattern.lastPurchaseDate
                          ).toLocaleDateString()}
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Quantity</p>
                        <p className="font-medium">
                          {pattern.totalQuantity} units
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Price</p>
                        <p className="font-medium">
                          ${pattern.avgPrice?.toFixed(2)}/unit
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days Since Last</p>
                        <p className="font-medium">
                          {pattern.daysSinceLastPurchase} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Need Form Dialog */}
      <NeedForm
        open={needFormOpen}
        onOpenChange={setNeedFormOpen}
        clientId={clientId}
        onSubmit={handleCreateNeed}
      />
    </div>
  );
}
