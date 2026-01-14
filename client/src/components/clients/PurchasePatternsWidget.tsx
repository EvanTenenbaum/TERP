import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Clock,
  AlertCircle,
  Calendar,
  Package,
  DollarSign,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface PurchasePatternsWidgetProps {
  clientId: number;
}

export function PurchasePatternsWidget({
  clientId,
}: PurchasePatternsWidgetProps) {
  // Fetch purchase history patterns
  const { data: historyData, isLoading: historyLoading } =
    trpc.matching.analyzeClientPurchaseHistory.useQuery({
      clientId,
      minPurchases: 1,
    });

  // Fetch all reorder predictions and filter for this client
  const { data: predictionsData, isLoading: predictionsLoading } =
    trpc.matching.getPredictiveReorderOpportunities.useQuery({
      lookAheadDays: 60,
      minOrderCount: 2,
    });

  const purchasePatterns = historyData?.data || [];
  const allPredictions = predictionsData?.data || [];

  // Filter predictions for this specific client
  const clientPredictions = allPredictions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pred: any) => pred.clientId === clientId
  );

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-600">High ({confidence}%)</Badge>;
    } else if (confidence >= 60) {
      return <Badge variant="secondary">Medium ({confidence}%)</Badge>;
    } else {
      return <Badge variant="outline">Low ({confidence}%)</Badge>;
    }
  };

  // Get urgency badge for predictions
  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return (
        <Badge variant="destructive">Overdue by {Math.abs(daysUntil)}d</Badge>
      );
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-600">Due in {daysUntil}d</Badge>;
    } else if (daysUntil <= 14) {
      return <Badge variant="secondary">Due in {daysUntil}d</Badge>;
    } else {
      return <Badge variant="outline">Due in {daysUntil}d</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Purchase Patterns & Predictions
        </CardTitle>
        <CardDescription>
          Historical purchase behavior and predicted reorder opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patterns" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns">
              Purchase History ({purchasePatterns.length})
            </TabsTrigger>
            <TabsTrigger value="predictions">
              Reorder Predictions ({clientPredictions.length})
            </TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Purchase History Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : purchasePatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No purchase history</p>
                <p className="text-sm text-muted-foreground">
                  Purchase patterns will appear after client makes orders
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {purchasePatterns.map((pattern, idx) => (
                  <Card key={`pattern-${pattern.productName || pattern.sku}-${idx}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            {pattern.strain ||
                              pattern.category ||
                              "Unknown Product"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>Purchased {pattern.purchaseCount} times</span>
                            {pattern.lastPurchaseDate && (
                              <>
                                <span>•</span>
                                <span>
                                  Last: {formatDate(pattern.lastPurchaseDate)}
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        {pattern.subcategory && (
                          <Badge variant="outline">{pattern.subcategory}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span className="text-xs">Total Quantity</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {pattern.totalQuantity?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-xs">Avg Price</span>
                          </div>
                          <p className="text-lg font-semibold">
                            ${pattern.avgPrice?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span className="text-xs">Purchase Count</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {pattern.purchaseCount}x
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">Days Since</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {pattern.daysSinceLastPurchase || 0}d
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reorder Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            {predictionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clientPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No predictions available</p>
                <p className="text-sm text-muted-foreground">
                  Predictions require at least 2 orders of the same item
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overdue Predictions Alert */}
                {clientPredictions.some(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (p: any) => p.daysUntilPredictedOrder < 0
                ) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {
                        clientPredictions.filter(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (p: any) => p.daysUntilPredictedOrder < 0
                        ).length
                      }{" "}
                      overdue reorder(s) detected. Contact client proactively!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4">
                  {clientPredictions
                    .sort(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (a: any, b: any) =>
                        a.daysUntilPredictedOrder - b.daysUntilPredictedOrder
                    )
                    .map(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (prediction: any, idx: number) => (
                        <Card
                          key={`prediction-${prediction.productName || prediction.sku}-${idx}`}
                          className={
                            prediction.daysUntilPredictedOrder < 0
                              ? "border-red-500"
                              : ""
                          }
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-base">
                                  {prediction.strain ||
                                    prediction.category ||
                                    "Unknown Product"}
                                </CardTitle>
                                <CardDescription>
                                  Frequent reorder pattern
                                </CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getUrgencyBadge(
                                  prediction.daysUntilPredictedOrder
                                )}
                                {getConfidenceBadge(prediction.confidence)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Days Since Last
                                </p>
                                <p className="text-sm font-medium">
                                  {prediction.daysSinceLastOrder}d ago
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Predicted Date
                                </p>
                                <p className="text-sm font-medium">
                                  {formatDate(
                                    prediction.predictedNextOrderDate
                                  )}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Order Frequency
                                </p>
                                <p className="text-sm font-medium">
                                  Every {prediction.orderFrequencyDays}d
                                </p>
                              </div>
                            </div>

                            {/* Prediction Reasons */}
                            {prediction.reasons &&
                              prediction.reasons.length > 0 && (
                                <div className="space-y-2 pt-3 border-t">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Prediction Factors:
                                  </p>
                                  <ul className="space-y-1">
                                    {prediction.reasons.map(
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      (reason: any, ridx: number) => (
                                        <li
                                          key={`reason-${ridx}-${String(reason).substring(0, 20)}`}
                                          className="text-xs flex items-start gap-2"
                                        >
                                          <ArrowRight className="h-3 w-3 text-muted-foreground mt-0.5" />
                                          <span>{reason}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      )
                    )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Purchase Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Purchase Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Unique Products
                    </span>
                    <span className="text-2xl font-bold">
                      {purchasePatterns.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Orders
                    </span>
                    <span className="text-2xl font-bold">
                      {purchasePatterns.reduce(
                        (sum, p) => sum + (p.purchaseCount || 0),
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Units
                    </span>
                    <span className="text-2xl font-bold">
                      {purchasePatterns
                        .reduce(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (sum: number, p: any) => sum + (p.totalQuantity || 0),
                          0
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Prediction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Predicted Items
                    </span>
                    <span className="text-2xl font-bold">
                      {clientPredictions.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Overdue
                    </span>
                    <span className="text-2xl font-bold text-red-600">
                      {
                        clientPredictions.filter(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (p: any) => p.daysUntilPredictedOrder < 0
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Due Soon (7d)
                    </span>
                    <span className="text-2xl font-bold text-orange-600">
                      {
                        clientPredictions.filter(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (p: any) =>
                            p.daysUntilPredictedOrder >= 0 &&
                            p.daysUntilPredictedOrder <= 7
                        ).length
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Products by Purchase Count */}
            {purchasePatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Top Products by Frequency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {purchasePatterns
                      .sort(
                        (a, b) =>
                          (b.purchaseCount || 0) - (a.purchaseCount || 0)
                      )
                      .slice(0, 5)
                      .map((pattern, idx) => (
                        <div
                          key={`top-pattern-${pattern.productName || pattern.sku}-${idx}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {pattern.strain || pattern.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pattern.subcategory &&
                                `${pattern.subcategory} • `}
                              Avg ${pattern.avgPrice?.toFixed(2)}/unit
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {pattern.purchaseCount}x
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
