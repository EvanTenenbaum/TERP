import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Search, Plus, Package, Users, Target, Loader2 } from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton-loaders";
import { BackButton } from "@/components/common/BackButton";
import { useLocation } from "wouter";
import { getProductDisplayName } from "@/lib/displayHelpers";
import { toast } from "sonner";

/**
 * Matchmaking Service Page
 * Unified page showing Client Needs, Vendor Supply, and Suggested Matches
 *
 * This is the central hub for ERP users to:
 * - View all active client needs
 * - View all available vendor supply
 * - See suggested matches based on enhanced matching engine
 * - Take action (create quotes, contact clients, reserve supply)
 */

export default function MatchmakingServicePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(
    undefined
  );
  // FE-QA-010: State for buyers modal and dismissed matches
  const [buyersModalOpen, setBuyersModalOpen] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [dismissedMatches, setDismissedMatches] = useState<Set<number>>(
    new Set()
  );
  // ERR-005: Track which item is being reserved to prevent race conditions
  const [reservingItemId, setReservingItemId] = useState<number | null>(null);
  // UX-002: State for dismiss confirmation dialog
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [matchToDismiss, setMatchToDismiss] = useState<any>(null);

  // ERR-001: Get tRPC utils for proper cache invalidation
  const utils = trpc.useUtils();

  // Fetch client needs with match counts
  const { data: needsData, isLoading: needsLoading } =
    trpc.clientNeeds.getAllWithMatches.useQuery({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: statusFilter as any,
    });

  // Fetch vendor supply
  const { data: supplyData, isLoading: supplyLoading } =
    trpc.vendorSupply.getAllWithMatches.useQuery({
      status: "AVAILABLE",
    });

  // Fetch all active needs with their matches (for suggested matches section)
  const { data: matchesData, isLoading: matchesLoading } =
    trpc.matching.getAllActiveNeedsWithMatches.useQuery();

  // FE-QA-010: Fetch buyers for selected supply item
  const { data: buyersData, isLoading: buyersLoading } =
    trpc.matching.findMatchesForVendorSupply.useQuery(
      { vendorSupplyId: selectedSupplyId ?? 0 },
      { enabled: selectedSupplyId !== null }
    );

  // FE-QA-010: Mutation to reserve a supply item
  // FE-QA-FIX: Use dedicated reserve endpoint instead of generic update
  // ERR-001: Add query invalidation on success using tRPC utils
  const reserveMutation = trpc.vendorSupply.reserve.useMutation({
    onSuccess: () => {
      toast.success("Supply item reserved successfully");
      // ERR-001: Invalidate queries using proper tRPC utils pattern
      utils.vendorSupply.getAll.invalidate();
      utils.vendorSupply.getAllWithMatches.invalidate();
      utils.matching.getAllActiveNeedsWithMatches.invalidate();
      // FE-BUG-004: Add missing invalidations for related queries
      utils.matching.findMatchesForVendorSupply.invalidate();
      utils.clientNeeds.getAllWithMatches.invalidate();
      setReservingItemId(null);
    },
    onError: error => {
      toast.error(error.message || "Failed to reserve supply item");
      setReservingItemId(null);
    },
  });

  const needs = needsData?.data || [];
  const supply = supplyData?.data || [];
  const allMatches = matchesData?.data || [];

  // Get top suggested matches (sorted by confidence)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const topMatches = allMatches
    .filter((m: any) => m.confidence > 0)
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, 10);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Filter needs based on search and priority
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredNeeds = needs.filter((need: any) => {
    const matchesSearch =
      !searchQuery ||
      need.strain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = !priorityFilter || need.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Filter supply based on search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredSupply = supply.filter((item: any) => {
    return (
      !searchQuery ||
      item.strain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "default";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "🔴";
      case "HIGH":
        return "🟡";
      case "MEDIUM":
        return "⚪";
      case "LOW":
        return "🔵";
      default:
        return "⚪";
    }
  };

  // FE-QA-010: Handler for View Buyers button
  const handleViewBuyers = (supplyId: number) => {
    setSelectedSupplyId(supplyId);
    setBuyersModalOpen(true);
  };

  // FE-QA-010: Handler for Reserve button
  // FE-QA-FIX: Reserve endpoint only needs id, not status
  // ERR-005: Track which item is being reserved to prevent race conditions
  const handleReserve = useCallback(
    (supplyId: number) => {
      if (reservingItemId !== null) return; // Prevent concurrent reserves
      setReservingItemId(supplyId);
      reserveMutation.mutate({ id: supplyId });
    },
    [reservingItemId, reserveMutation]
  );

  // FE-QA-010: Handler for Create Quote button
  // UX-005: Validate match has required IDs before navigation
  const handleCreateQuote = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (match: any) => {
      // UX-005: Validate that we have at least a needId or clientId
      if (!match.needId && !match.clientId) {
        toast.error("Cannot create quote: missing client or need information");
        return;
      }
      const params = new URLSearchParams();
      if (match.needId) params.set("needId", match.needId.toString());
      if (match.supplyId) params.set("supplyId", match.supplyId.toString());
      if (match.clientId) params.set("clientId", match.clientId.toString());
      setLocation(`/quotes?action=create&${params.toString()}`);
    },
    [setLocation]
  );

  // FE-QA-010: Handler for Dismiss button
  // UX-002: Open confirmation dialog instead of window.confirm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDismissClick = useCallback((match: any) => {
    setMatchToDismiss(match);
    setDismissDialogOpen(true);
  }, []);

  // UX-002: Confirm dismiss action from AlertDialog
  const handleConfirmDismiss = useCallback(() => {
    if (matchToDismiss) {
      setDismissedMatches(
        prev => new Set([...prev, matchToDismiss.needId || matchToDismiss.id])
      );
      toast.success("Match dismissed");
    }
    setDismissDialogOpen(false);
    setMatchToDismiss(null);
  }, [matchToDismiss]);

  // FE-BUG-002: Handle AlertDialog close (cancel/escape) to clear matchToDismiss state
  const handleDismissDialogChange = useCallback((open: boolean) => {
    setDismissDialogOpen(open);
    // Clear matchToDismiss when dialog closes to prevent state pollution
    if (!open) {
      setMatchToDismiss(null);
    }
  }, []);

  // FE-BUG-003: Handle buyers modal close to clear selectedSupplyId and stop query
  const handleBuyersModalChange = useCallback((open: boolean) => {
    setBuyersModalOpen(open);
    // Clear selectedSupplyId when modal closes to stop unnecessary queries
    if (!open) {
      setSelectedSupplyId(null);
    }
  }, []);

  // Filter out dismissed matches
  const visibleMatches = topMatches.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => !dismissedMatches.has(m.needId || m.id)
  );

  return (
    <div className="space-y-6 p-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Matchmaking Service
            </h1>
            <p className="text-muted-foreground">
              Connect client needs with vendor supply using intelligent matching
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/clients")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Need
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/vendor-supply")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Supply
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search strain, category, client, vendor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="FULFILLED">Fulfilled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter || "all"}
            onValueChange={v => setPriorityFilter(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Active Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needs.length}</div>
              <p className="text-xs text-muted-foreground">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {needs.filter((n: any) => n.matchCount > 0).length} with matches
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Available Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supply.length}</div>
              <p className="text-xs text-muted-foreground">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {supply.filter((s: any) => s.buyerCount > 0).length} with buyers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Suggested Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topMatches.length}</div>
              <p className="text-xs text-muted-foreground">
                {topMatches.filter(m => m.confidence >= 80).length} high
                confidence
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Urgent Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {needs.filter((n: any) => n.priority === "URGENT").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client Needs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Needs ({filteredNeeds.length})
            </CardTitle>
            <CardDescription>
              Active purchase requests from clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {needsLoading ? (
                <ListSkeleton items={4} showAvatar={false} showSecondary />
              ) : filteredNeeds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No client needs found
                </div>
              ) : (
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                filteredNeeds.map((need: any) => (
                  <div
                    key={need.id}
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() =>
                      setLocation(`/clients/${need.clientId}?tab=needs`)
                    }
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getPriorityIcon(need.priority)}
                        </span>
                        <Badge variant={getPriorityColor(need.priority)}>
                          {need.priority}
                        </Badge>
                      </div>
                      {need.matchCount > 0 && (
                        <Badge variant="secondary">
                          {need.matchCount} matches
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium">
                      {getProductDisplayName(need)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {need.category && `${need.category}`}
                      {need.grade && ` • ${need.grade}`}
                      {need.quantityMin &&
                        ` • ${need.quantityMin}-${need.quantityMax || "+"} lbs`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Client: {need.clientName}
                    </p>
                    {need.priceMax && (
                      <p className="text-xs text-muted-foreground">
                        Max: ${parseFloat(need.priceMax).toFixed(2)}/lb
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Middle Column: Vendor Supply */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Vendor Supply ({filteredSupply.length})
            </CardTitle>
            <CardDescription>Available products from vendors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {supplyLoading ? (
                <ListSkeleton items={4} showAvatar={false} showSecondary />
              ) : filteredSupply.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No vendor supply found
                </div>
              ) : (
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                filteredSupply.map((item: any) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">✅ Available</Badge>
                      {item.buyerCount > 0 && (
                        <Badge variant="default">
                          {item.buyerCount} potential buyers
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium">
                      {getProductDisplayName(item)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item.category && `${item.category}`}
                      {item.grade && ` • ${item.grade}`}
                      {item.quantityAvailable &&
                        ` • ${item.quantityAvailable} lbs`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vendor: {item.vendorName}
                    </p>
                    {item.unitPrice && (
                      <p className="text-xs font-medium text-green-600">
                        ${parseFloat(item.unitPrice).toFixed(2)}/lb
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={e => {
                          e.stopPropagation();
                          handleViewBuyers(item.id);
                        }}
                      >
                        View Buyers
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={e => {
                          e.stopPropagation();
                          handleReserve(item.id);
                        }}
                        disabled={reservingItemId !== null}
                      >
                        {reservingItemId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Reserve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Suggested Matches */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Suggested Matches ({visibleMatches.length})
            </CardTitle>
            <CardDescription>
              Top opportunities based on intelligent matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {matchesLoading ? (
                <ListSkeleton items={4} showAvatar={false} showSecondary />
              ) : visibleMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No matches found
                </div>
              ) : (
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                visibleMatches.map((match: any, idx: number) => (
                  <div
                    key={`match-${match.needId || idx}`}
                    className="border rounded-lg p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant={
                          match.confidence >= 90
                            ? "default"
                            : match.confidence >= 75
                              ? "secondary"
                              : "outline"
                        }
                      >
                        🎯 {match.confidence}% {match.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {match.source}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reasons:
                        </p>
                        {/* eslint-disable react/no-array-index-key */}
                        <ul className="text-xs space-y-1">
                          {match.reasons.map((reason: string, i: number) => (
                            <li
                              key={`reason-${i}`}
                              className="flex items-start gap-1"
                            >
                              <span className="text-green-600">✓</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                        {/* eslint-enable react/no-array-index-key */}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleCreateQuote(match)}
                        >
                          Create Quote
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleDismissClick(match)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FE-QA-010: Buyers Modal */}
      {/* FE-BUG-003: Use handleBuyersModalChange to clear selectedSupplyId on close */}
      <Dialog open={buyersModalOpen} onOpenChange={handleBuyersModalChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Potential Buyers</DialogTitle>
            <DialogDescription>
              Clients with matching needs for this supply item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {buyersLoading ? (
              <ListSkeleton items={3} showAvatar={false} showSecondary />
            ) : !buyersData?.data?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No matching buyers found
              </div>
            ) : (
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              buyersData.data.map((buyer: any, idx: number) => (
                <div
                  key={`buyer-${buyer.clientId || buyer.needId || idx}`}
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setBuyersModalOpen(false);
                    setLocation(`/clients/${buyer.clientId}?tab=needs`);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {buyer.clientName || `Client #${buyer.clientId}`}
                    </span>
                    <Badge variant="secondary">
                      {buyer.confidence || 0}% match
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {buyer.strain || buyer.category || "Product need"}
                  </p>
                  {buyer.quantityMin && (
                    <p className="text-xs text-muted-foreground">
                      Qty: {buyer.quantityMin}-{buyer.quantityMax || "+"} lbs
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* UX-002: Dismiss Confirmation Dialog (accessible, matches design system) */}
      {/* FE-BUG-002: Use handleDismissDialogChange to clear state on cancel */}
      <AlertDialog
        open={dismissDialogOpen}
        onOpenChange={handleDismissDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Match</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dismiss this match? You can refresh the
              page to see it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDismiss}>
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
