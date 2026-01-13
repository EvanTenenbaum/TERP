/**
 * Sprint 4 Track B - 4.B.7: MEET-020 - Suggested Buyer (Purchase History)
 *
 * Component to show suggested buyers based on purchase history:
 * - Analyze purchase patterns
 * - On product page: "Customers who bought this"
 * - On inventory item: "Suggested buyers"
 * - Ranking by purchase frequency/recency
 */

import React from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Mail,
  ShoppingCart,
  Calendar,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

interface SuggestedBuyersProps {
  productId?: number;
  inventoryItemId?: number;
  categoryId?: number;
  limit?: number;
  compact?: boolean;
  onContactClick?: (clientId: number) => void;
  onCreateOrderClick?: (clientId: number) => void;
}

/**
 * SuggestedBuyers - Display suggested buyers for a product or category
 */
export function SuggestedBuyers({
  productId,
  inventoryItemId,
  categoryId,
  limit = 10,
  compact = false,
  onContactClick,
  onCreateOrderClick,
}: SuggestedBuyersProps) {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.client360.getSuggestedBuyers.useQuery(
    { productId, inventoryItemId, categoryId, limit },
    { enabled: !!(productId || inventoryItemId || categoryId) }
  );

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get score badge color
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "outline";
  };

  if (!productId && !inventoryItemId && !categoryId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-destructive">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Failed to load suggested buyers</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const buyers = data?.suggestedBuyers || [];

  if (compact) {
    // Compact view for sidebars/widgets
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Suggested Buyers ({buyers.length})
        </h4>
        {buyers.length > 0 ? (
          <div className="space-y-1">
            {buyers.slice(0, 5).map(buyer => (
              <div
                key={buyer.clientId}
                className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                onClick={() => setLocation(`/clients/${buyer.clientId}`)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(buyer.clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {buyer.clientName}
                  </span>
                </div>
                <Badge
                  variant={getScoreBadgeColor(buyer.score)}
                  className="text-xs"
                >
                  {Math.round(buyer.score)}
                </Badge>
              </div>
            ))}
            {buyers.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{buyers.length - 5} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No suggested buyers found
          </p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Suggested Buyers
        </CardTitle>
        <CardDescription>
          Customers most likely to purchase based on history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {buyers.length > 0 ? (
          <div className="space-y-3">
            {buyers.map((buyer, idx) => (
              <div
                key={buyer.clientId}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0
                        ? "bg-yellow-500 text-yellow-950"
                        : idx === 1
                          ? "bg-gray-300 text-gray-700"
                          : idx === 2
                            ? "bg-orange-400 text-orange-950"
                            : "bg-primary/10 text-primary"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Client Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {buyer.clientName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({buyer.clientCode})
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {buyer.purchaseCount} orders
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(buyer.avgOrderValue)} avg
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(buyer.lastPurchaseDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Score Badge */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={getScoreBadgeColor(buyer.score)}>
                          Score: {Math.round(buyer.score)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on purchase frequency and recency</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    {buyer.clientEmail && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => {
                                e.stopPropagation();
                                if (onContactClick && buyer.clientId) {
                                  onContactClick(buyer.clientId);
                                } else {
                                  window.location.href = `mailto:${buyer.clientEmail}`;
                                }
                              }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Email: {buyer.clientEmail}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {onCreateOrderClick && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => {
                                e.stopPropagation();
                                if (buyer.clientId)
                                  onCreateOrderClick(buyer.clientId);
                              }}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Create order for this client</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              setLocation(`/clients/${buyer.clientId}`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View client profile</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suggested buyers found</p>
            <p className="text-sm mt-1">
              As customers purchase this product, suggestions will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SuggestedBuyers;
