import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  History,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Target,
} from "lucide-react";
import { useLocation } from "wouter";

/**
 * Potential Buyers Widget
 * Shows all potential buyers for this batch:
 * - Clients with active matching needs
 * - Historical buyers who purchased similar products
 * - Predicted reorder opportunities
 */

interface PotentialBuyersWidgetProps {
  batchId: number;
  productData?: {
    strain?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
  };
}

export function PotentialBuyersWidget({
  batchId,
  productData,
}: PotentialBuyersWidgetProps) {
  const [, setLocation] = useLocation();

  // Fetch active need matches
  const { data: matchesData, isLoading: matchesLoading } =
    trpc.matching.findBuyersForInventory.useQuery({
      batchId,
    });

  // Fetch historical buyers (only if we have product data)
  const { data: historicalData, isLoading: historicalLoading } =
    trpc.matching.findHistoricalBuyers.useQuery(
      {
        batchId,
      },
      {
        enabled: !!(productData?.strain || productData?.category),
      }
    );

  // Fetch predictive reorders (next 30 days)
  const { data: predictionsData, isLoading: predictionsLoading } =
    trpc.matching.getPredictiveReorderOpportunities.useQuery({
      lookAheadDays: 30,
      minOrderCount: 2,
    });

  const isLoading = matchesLoading || historicalLoading || predictionsLoading;

  const activeMatches = matchesData?.data || [];
  const historicalBuyers = historicalData?.data || [];
  const predictions = predictionsData?.data || [];

  // Filter predictions to only show those relevant to this product
  const relevantPredictions = predictions.filter(p => {
    if (!productData) return false;
    const matchesStrain =
      !productData.strain ||
      !p.strain ||
      p.strain.toLowerCase().includes(productData.strain.toLowerCase()) ||
      productData.strain.toLowerCase().includes(p.strain.toLowerCase());
    const matchesCategory =
      !productData.category ||
      !p.category ||
      p.category.toLowerCase() === productData.category.toLowerCase();
    return matchesStrain || matchesCategory;
  });

  const totalOpportunities =
    activeMatches.length + historicalBuyers.length + relevantPredictions.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Potential Buyers</h3>
        </div>
        <Card className="p-4">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  if (totalOpportunities === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Potential Buyers</h3>
        </div>
        <Card className="p-4">
          <div className="text-center text-sm text-muted-foreground py-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No potential buyers identified</p>
            <p className="text-xs mt-1">
              No active needs, historical buyers, or predicted reorders
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 90) return "default";
    if (confidence >= 75) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Potential Buyers</h3>
        </div>
        <Badge variant="secondary">{totalOpportunities} opportunities</Badge>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="text-xs">
            Active ({activeMatches.length})
          </TabsTrigger>
          <TabsTrigger value="historical" className="text-xs">
            Historical ({historicalBuyers.length})
          </TabsTrigger>
          <TabsTrigger value="predicted" className="text-xs">
            Predicted ({relevantPredictions.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Needs Tab */}
        <TabsContent value="active" className="space-y-2 mt-3">
          {activeMatches.length === 0 ? (
            <Card className="p-4">
              <div className="text-center text-sm text-muted-foreground py-2">
                <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p>No active needs match this batch</p>
              </div>
            </Card>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeMatches.slice(0, 5).map((match: any, idx: number) => (
              <Card
                key={`match-${match.clientId}-${match.needId || idx}`}
                className="p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() =>
                  setLocation(`/clients/${match.clientId}?tab=needs`)
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {match.clientName || "Unknown Client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.strain || "Any strain"}{" "}
                      {match.grade && `• ${match.grade}`}
                    </p>
                  </div>
                  <Badge variant={getConfidenceBadgeVariant(match.confidence)}>
                    {match.confidence}%
                  </Badge>
                </div>
                {match.reasons && match.reasons.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {match.reasons[0]}
                  </p>
                )}
              </Card>
            ))
          )}
          {activeMatches.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLocation(`/matchmaking`)}
            >
              View all {activeMatches.length} active matches
            </Button>
          )}
        </TabsContent>

        {/* Historical Buyers Tab */}
        <TabsContent value="historical" className="space-y-2 mt-3">
          {historicalBuyers.length === 0 ? (
            <Card className="p-4">
              <div className="text-center text-sm text-muted-foreground py-2">
                <History className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p>No historical buyers found</p>
              </div>
            </Card>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            historicalBuyers.slice(0, 5).map((buyer: any, idx: number) => (
              <Card
                key={`buyer-${buyer.sourceData?.client?.id || idx}`}
                className="p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() =>
                  setLocation(`/clients/${buyer.sourceData?.client?.id}`)
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {buyer.sourceData?.client?.name || "Unknown Client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {buyer.pattern?.purchaseCount}x purchases •{" "}
                      {buyer.pattern?.daysSinceLastPurchase} days ago
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={getConfidenceBadgeVariant(buyer.confidence)}
                    >
                      {buyer.confidence}%
                    </Badge>
                    {buyer.isLapsedBuyer && (
                      <Badge variant="outline" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Lapsed
                      </Badge>
                    )}
                  </div>
                </div>
                {buyer.reasons && buyer.reasons.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {buyer.reasons[0]}
                  </p>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Predicted Reorders Tab */}
        <TabsContent value="predicted" className="space-y-2 mt-3">
          {relevantPredictions.length === 0 ? (
            <Card className="p-4">
              <div className="text-center text-sm text-muted-foreground py-2">
                <TrendingUp className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p>No predicted reorders for this product</p>
              </div>
            </Card>
          ) : (
            relevantPredictions
              .slice(0, 5)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((prediction: any, idx: number) => (
                <Card
                  key={`prediction-${prediction.clientId}-${prediction.id || idx}`}
                  className={`p-3 hover:bg-accent cursor-pointer transition-colors ${
                    prediction.daysUntilPredictedOrder < 0
                      ? "border-destructive/30"
                      : ""
                  }`}
                  onClick={() => setLocation(`/clients/${prediction.clientId}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {prediction.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prediction.strain || prediction.category} • Every{" "}
                        {prediction.orderFrequencyDays} days
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          prediction.daysUntilPredictedOrder < 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {prediction.daysUntilPredictedOrder < 0
                          ? `${Math.abs(prediction.daysUntilPredictedOrder)}d overdue`
                          : `${prediction.daysUntilPredictedOrder}d`}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {prediction.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  {prediction.reasons && prediction.reasons.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {prediction.reasons[0]}
                    </p>
                  )}
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
