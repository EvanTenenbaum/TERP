/**
 * PriceHistoryLookup Component (MEET-061, MEET-062)
 * Shows suggested purchase price and last sale price for products
 * Helps with pricing decisions during order creation and purchasing
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  ShoppingCart,
  Truck,
  Info,
  ChevronDown,
} from "lucide-react";

interface PriceHistoryLookupProps {
  productId: number;
  productName?: string;
  clientId?: number;
  supplierId?: number;
  mode: "SALE" | "PURCHASE";
  compact?: boolean;
}

export function PriceHistoryLookup({
  productId,
  productName,
  clientId,
  supplierId,
  mode,
  compact = false,
}: PriceHistoryLookupProps) {
  // Fetch last sale price data
  const { data: saleData, isLoading: saleLoading } =
    trpc.pricing.getLastSalePrice.useQuery(
      { productId, clientId },
      { enabled: mode === "SALE" && productId > 0 }
    );

  // Fetch suggested purchase price data
  const { data: purchaseData, isLoading: purchaseLoading } =
    trpc.pricing.getSuggestedPurchasePrice.useQuery(
      { productId, supplierId },
      { enabled: mode === "PURCHASE" && productId > 0 }
    );

  const isLoading = mode === "SALE" ? saleLoading : purchaseLoading;

  const fmt = (value: number | null | undefined) =>
    value !== null && value !== undefined
      ? `$${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "-";

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-5 w-20" />
    ) : (
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sale Mode UI
  if (mode === "SALE") {
    const hasClientHistory = saleData?.lastPriceToClient !== null;
    const hasOverallHistory = saleData?.lastPriceOverall !== null;

    if (!hasClientHistory && !hasOverallHistory) {
      if (compact) {
        return (
          <Badge variant="outline" className="text-xs">
            No price history
          </Badge>
        );
      }
      return null;
    }

    // Compact mode - inline badge with popover
    if (compact) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
            >
              <History className="h-3 w-3 mr-1" />
              {hasClientHistory
                ? fmt(saleData?.lastPriceToClient)
                : fmt(saleData?.lastPriceOverall)}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Price History: {productName || `Product #${productId}`}
              </p>

              {hasClientHistory && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Last sold to this client
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {fmt(saleData?.lastPriceToClient)}
                    </span>
                    {saleData?.clientPriceHistory[0] && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(saleData.clientPriceHistory[0].date)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {hasOverallHistory && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Last sold overall
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {fmt(saleData?.lastPriceOverall)}
                    </span>
                    {saleData?.overallPriceHistory[0] && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(saleData.overallPriceHistory[0].date)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Recent History */}
              {saleData?.clientPriceHistory &&
                saleData.clientPriceHistory.length > 1 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Recent sales to client
                      </p>
                      {saleData.clientPriceHistory.slice(0, 3).map((h, _i) => (
                        <div
                          key={`history-${h.date}-${h.price}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{formatDate(h.date)}</span>
                          <span>
                            {fmt(h.price)} x {h.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // Full card mode
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Sale Price History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasClientHistory && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Last sold to this client
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">
                  {fmt(saleData?.lastPriceToClient)}
                </span>
                {saleData?.clientPriceHistory[0] && (
                  <Badge variant="outline">
                    {formatDate(saleData.clientPriceHistory[0].date)}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {hasOverallHistory && hasClientHistory && <Separator />}

          {hasOverallHistory && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last sold overall</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">
                  {fmt(saleData?.lastPriceOverall)}
                </span>
                {saleData?.overallPriceHistory[0] && (
                  <Badge variant="secondary">
                    {formatDate(saleData.overallPriceHistory[0].date)}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Purchase Mode UI (MEET-061)
  if (mode === "PURCHASE") {
    const hasHistory = purchaseData && purchaseData.historyCount > 0;

    if (!hasHistory) {
      if (compact) {
        return (
          <Badge variant="outline" className="text-xs">
            No purchase history
          </Badge>
        );
      }
      return null;
    }

    // Calculate price trend
    const priceHistory = purchaseData?.priceHistory || [];
    let priceTrend: "UP" | "DOWN" | "STABLE" = "STABLE";

    if (priceHistory.length >= 2) {
      const recent = priceHistory.slice(0, Math.floor(priceHistory.length / 2));
      const older = priceHistory.slice(Math.floor(priceHistory.length / 2));

      const recentAvg =
        recent.reduce((sum, h) => sum + h.price, 0) / recent.length;
      const olderAvg =
        older.reduce((sum, h) => sum + h.price, 0) / older.length;

      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (changePercent > 5) priceTrend = "UP";
      else if (changePercent < -5) priceTrend = "DOWN";
    }

    // Compact mode
    if (compact) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
            >
              <Truck className="h-3 w-3 mr-1" />
              {fmt(purchaseData?.suggestedPrice)}
              {priceTrend === "UP" && (
                <TrendingUp className="h-3 w-3 ml-1 text-red-500" />
              )}
              {priceTrend === "DOWN" && (
                <TrendingDown className="h-3 w-3 ml-1 text-green-500" />
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Suggested Purchase Price</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        Based on weighted average of recent and historical
                        purchase prices. Recent prices weighted 60%, historical
                        40%.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="text-xl font-bold text-center p-2 bg-muted/50 rounded">
                {fmt(purchaseData?.suggestedPrice)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Last Price</p>
                  <p className="font-medium">{fmt(purchaseData?.lastPrice)}</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                  <p className="font-medium">{fmt(purchaseData?.avgPrice)}</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Min Price</p>
                  <p className="font-medium">{fmt(purchaseData?.minPrice)}</p>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">Max Price</p>
                  <p className="font-medium">{fmt(purchaseData?.maxPrice)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Based on {purchaseData?.historyCount} purchases</span>
                <div className="flex items-center gap-1">
                  {priceTrend === "UP" && (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">Rising</span>
                    </>
                  )}
                  {priceTrend === "DOWN" && (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Falling</span>
                    </>
                  )}
                  {priceTrend === "STABLE" && (
                    <>
                      <Minus className="h-3 w-3" />
                      <span>Stable</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // Full card mode
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Purchase Price History
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Suggested price based on weighted average of recent (60%)
                    and historical (40%) purchase prices.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Suggested Price</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {fmt(purchaseData?.suggestedPrice)}
              </span>
              <div className="flex items-center gap-1">
                {priceTrend === "UP" && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Rising
                  </Badge>
                )}
                {priceTrend === "DOWN" && (
                  <Badge className="flex items-center gap-1 bg-green-600">
                    <TrendingDown className="h-3 w-3" />
                    Falling
                  </Badge>
                )}
                {priceTrend === "STABLE" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Minus className="h-3 w-3" />
                    Stable
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Last</p>
              <p className="font-medium">{fmt(purchaseData?.lastPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg</p>
              <p className="font-medium">{fmt(purchaseData?.avgPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Min</p>
              <p className="font-medium">{fmt(purchaseData?.minPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Max</p>
              <p className="font-medium">{fmt(purchaseData?.maxPrice)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Based on {purchaseData?.historyCount} purchase
            {purchaseData?.historyCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
