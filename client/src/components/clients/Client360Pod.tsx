/**
 * Sprint 4 Track B - 4.B.1: ENH-002 - Client 360 Pod
 *
 * Comprehensive Client 360 view component displaying:
 * - Client name, contact info, status, tags
 * - Purchase history summary
 * - Order history summary
 * - Balance/credit information
 * - Notes section
 * - Recent activity timeline
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  ShoppingCart,
  Clock,
  Tag,
  Users,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  CreditCard,
  Package,
  Edit,
  UserPlus,
  Search,
  Calendar,
} from "lucide-react";

interface Client360PodProps {
  clientId: number;
  onEdit?: () => void;
  compact?: boolean;
}

/**
 * Client 360 Pod - Comprehensive client information display
 */
export const Client360Pod = React.memo(function Client360Pod({
  clientId,
  onEdit,
  compact = false,
}: Client360PodProps) {
  const [referrerDialogOpen, setReferrerDialogOpen] = useState(false);
  const [referrerSearch, setReferrerSearch] = useState("");
  const utils = trpc.useUtils();

  // Fetch comprehensive client data
  const { data, isLoading, error } = trpc.client360.getClient360.useQuery(
    {
      clientId,
      includePurchaseHistory: !compact,
      includeOrderHistory: true,
      includeActivity: !compact,
      includeWants: true,
    },
    { enabled: !!clientId }
  );

  // Search for potential referrers
  const { data: referrerSuggestions } = trpc.clients.list.useQuery(
    { search: referrerSearch, limit: 10 },
    { enabled: referrerSearch.length >= 2 }
  );

  // Set referrer mutation
  const setReferrerMutation = trpc.client360.setReferrer.useMutation({
    onSuccess: () => {
      utils.client360.getClient360.invalidate({ clientId });
      setReferrerDialogOpen(false);
      setReferrerSearch("");
    },
  });

  // Format currency
  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get client type badges
  const getClientTypeBadges = () => {
    if (!data?.client) return [];
    const badges: {
      label: string;
      variant: "default" | "secondary" | "outline";
    }[] = [];
    if (data.client.isBuyer)
      badges.push({ label: "Buyer", variant: "default" });
    if (data.client.isSeller)
      badges.push({ label: "Supplier", variant: "secondary" });
    if (data.client.isBrand)
      badges.push({ label: "Brand", variant: "outline" });
    if (data.client.isReferee)
      badges.push({ label: "Referee", variant: "secondary" });
    if (data.client.isContractor)
      badges.push({ label: "Contractor", variant: "outline" });
    return badges;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load client data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    client,
    orderSummary,

    communicationsSummary,
    recentOrders,
    recentActivity,
    purchaseHistory,
    activeWantsCount,
  } = data;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{client.teriCode}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {getClientTypeBadges().map((badge, _idx) => (
                    <Badge key={`badge-${badge.label}`} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <CardDescription className="text-base font-medium text-foreground">
                {client.name}
              </CardDescription>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Info */}
            <div className="space-y-2">
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{client.address}</span>
                </div>
              )}
            </div>

            {/* Referrer Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">
                  Referred By
                </Label>
              </div>
              {client.referrer ? (
                <p className="text-sm font-medium">
                  {client.referrer.name} ({client.referrer.teriCode})
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-muted-foreground"
                  onClick={() => setReferrerDialogOpen(true)}
                >
                  Set referrer
                </Button>
              )}
              {client.referralCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Has referred {client.referralCount} client
                  {client.referralCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">Tags</Label>
              </div>
              <div className="flex flex-wrap gap-1">
                {client.tags &&
                Array.isArray(client.tags) &&
                client.tags.length > 0 ? (
                  (client.tags as string[]).slice(0, 5).map((tag, _idx) => (
                    <Badge
                      key={`tag-${tag}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
                {client.tags &&
                  Array.isArray(client.tags) &&
                  (client.tags as string[]).length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{(client.tags as string[]).length - 5} more
                    </Badge>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Spent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(client.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {orderSummary.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        {/* Total Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(client.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {parseFloat(String(client.avgProfitMargin || "0")).toFixed(1)}%
              margin
            </p>
          </CardContent>
        </Card>

        {/* Amount Owed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owed</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${parseFloat(String(client.totalOwed || "0")) > 0 ? "text-destructive" : ""}`}
            >
              {formatCurrency(client.totalOwed)}
            </div>
            {client.oldestDebtDays && client.oldestDebtDays > 0 ? (
              <p className="text-xs text-muted-foreground">
                Oldest: {client.oldestDebtDays} days
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No outstanding</p>
            )}
          </CardContent>
        </Card>

        {/* Active Wants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wants</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWantsCount}</div>
            <p className="text-xs text-muted-foreground">Product requests</p>
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <>
          {/* Recent Orders & Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders && recentOrders.length > 0 ? (
                  <div className="space-y-2">
                    {recentOrders.slice(0, 5).map(order => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                      >
                        <div>
                          <span className="font-medium">
                            {order.orderNumber || `#${order.id}`}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(order.total)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {order.fulfillmentStatus || "Draft"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No orders yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.slice(0, 5).map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 text-sm border-b pb-2 last:border-0"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {activity.activityType.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.userName || "System"} -{" "}
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          {purchaseHistory && purchaseHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Purchase History (Top Products)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {purchaseHistory.slice(0, 6).map((item, idx) => (
                    <div
                      key={`purchase-${item.productId || item.productName || idx}`}
                      className="flex items-center justify-between text-sm border rounded-lg p-2"
                    >
                      <span className="truncate flex-1">
                        {item.productName}
                      </span>
                      <span className="font-medium ml-2">
                        {formatCurrency(item.totalSpent)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communications Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    {communicationsSummary.totalCommunications}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total interactions
                  </p>
                </div>
                {communicationsSummary.lastCommunicationAt && (
                  <div>
                    <p className="text-sm font-medium">Last Contact</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(communicationsSummary.lastCommunicationAt)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Set Referrer Dialog */}
      <Dialog open={referrerDialogOpen} onOpenChange={setReferrerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Referrer</DialogTitle>
            <DialogDescription>
              Search for and select the client who referred {client.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={referrerSearch}
                onChange={e => setReferrerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {referrerSuggestions?.items &&
            referrerSuggestions.items.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {referrerSuggestions.items
                  .filter((c: { id: number }) => c.id !== clientId)
                  .map((c: { id: number; name: string; teriCode: string }) => (
                    <Button
                      key={c.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setReferrerMutation.mutate({
                          clientId,
                          referrerClientId: c.id,
                        });
                      }}
                      disabled={setReferrerMutation.isPending}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {c.name} ({c.teriCode})
                    </Button>
                  ))}
              </div>
            ) : referrerSearch.length >= 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients found
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Type at least 2 characters to search
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReferrerDialogOpen(false)}
            >
              Cancel
            </Button>
            {client.referrer && (
              <Button
                variant="destructive"
                onClick={() => {
                  setReferrerMutation.mutate({
                    clientId,
                    referrerClientId: null,
                  });
                }}
                disabled={setReferrerMutation.isPending}
              >
                Remove Referrer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default Client360Pod;
