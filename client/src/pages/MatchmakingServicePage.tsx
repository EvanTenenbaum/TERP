import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Search,
  Plus,
  Package,
  Users,
  Target,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton-loaders";
import { BackButton } from "@/components/common/BackButton";
import { useLocation } from "wouter";
import { getProductDisplayName } from "@/lib/displayHelpers";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
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

interface ClientNeedWithMatches {
  id: number;
  clientId: number;
  clientName?: string;
  priority?: string;
  matchCount?: number;
  category?: string;
  grade?: string;
  strain?: string;
  quantityMin?: number | string;
  quantityMax?: number | string;
  priceMax?: number | string;
  productName?: string;
}

interface SupplyItemWithBuyers {
  id: number;
  vendorName?: string;
  category?: string;
  grade?: string;
  strain?: string;
  productName?: string;
  buyerCount?: number;
  quantity?: number | string;
  quantityAvailable?: number | string;
  unitPrice?: number | string;
}

interface SuggestedMatch {
  needId?: number;
  id?: number;
  confidence: number;
  type?: string;
  source?: string;
  reasons: string[];
}

interface BuyerMatch {
  clientId: number;
  needId?: number;
  clientName?: string;
  confidence?: number;
  strain?: string;
  category?: string;
  quantityMin?: number | string;
  quantityMax?: number | string;
}

interface MatchmakingServicePageProps {
  embedded?: boolean;
}

export function buildQuoteMatchComposerPath(
  match: SuggestedMatch & { supplyId?: number; clientId?: number }
) {
  if (!match.needId && !match.clientId) {
    return null;
  }

  const params: Record<string, string | number> = { mode: "quote" };
  if (match.needId) params.needId = match.needId;
  if (match.supplyId) params.supplyId = match.supplyId;
  if (match.clientId) params.clientId = match.clientId;

  return buildSalesWorkspacePath("create-order", params);
}

export default function MatchmakingServicePage({
  embedded = false,
}: MatchmakingServicePageProps) {
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
  const [matchToDismiss, setMatchToDismiss] = useState<SuggestedMatch | null>(
    null
  );

  // TER-888: Add Need modal state
  const [addNeedOpen, setAddNeedOpen] = useState(false);
  const [needClientId, setNeedClientId] = useState<string>("");
  const [needProductName, setNeedProductName] = useState("");
  const [needQuantityMin, setNeedQuantityMin] = useState("");
  const [needQuantityMax, setNeedQuantityMax] = useState("");
  const [needPriority, setNeedPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");
  const [needNotes, setNeedNotes] = useState("");

  // TER-888: Add Supply modal state
  const [addSupplyOpen, setAddSupplyOpen] = useState(false);
  const [supplyClientId, setSupplyClientId] = useState<string>("");
  const [supplyProductName, setSupplyProductName] = useState("");
  const [supplyQuantity, setSupplyQuantity] = useState("");
  const [supplyUnitPrice, setSupplyUnitPrice] = useState("");
  const [supplyNotes, setSupplyNotes] = useState("");

  // ERR-001: Get tRPC utils for proper cache invalidation
  const utils = trpc.useUtils();

  // TER-1336: Track in-flight state for the primary "Compute Matches" action
  const [isComputingMatches, setIsComputingMatches] = useState(false);

  // Fetch client needs with match counts
  const {
    data: needsData,
    isLoading: needsLoading,
    refetch: refetchNeeds,
  } = trpc.clientNeeds.getAllWithMatches.useQuery({
    status: statusFilter as "ACTIVE" | "FULFILLED" | "EXPIRED" | "CANCELLED",
  });

  // Fetch vendor supply
  const {
    data: supplyData,
    isLoading: supplyLoading,
    refetch: refetchSupply,
  } = trpc.vendorSupply.getAllWithMatches.useQuery({
    status: "AVAILABLE",
  });

  // Fetch all active needs with their matches (for suggested matches section)
  const {
    data: matchesData,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = trpc.matching.getAllActiveNeedsWithMatches.useQuery();

  // FE-QA-010: Fetch buyers for selected supply item
  const { data: buyersData, isLoading: buyersLoading } =
    trpc.matching.findMatchesForVendorSupply.useQuery(
      { vendorSupplyId: selectedSupplyId ?? 0 },
      { enabled: selectedSupplyId !== null }
    );

  // TER-888: Client buyer list for Add Need modal
  const { data: buyerClientsData } = trpc.clients.list.useQuery(
    { clientTypes: ["buyer"], limit: 200 },
    { enabled: addNeedOpen }
  );

  // TER-888: Client seller list for Add Supply modal
  const { data: sellerClientsData } = trpc.clients.list.useQuery(
    { clientTypes: ["seller"], limit: 200 },
    { enabled: addSupplyOpen }
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

  // TER-888: Add Need mutation
  const addNeedMutation = trpc.clientNeeds.create.useMutation({
    onSuccess: () => {
      toast.success("Client need added successfully");
      utils.clientNeeds.getAllWithMatches.invalidate();
      utils.matching.getAllActiveNeedsWithMatches.invalidate();
      setAddNeedOpen(false);
      setNeedClientId("");
      setNeedProductName("");
      setNeedQuantityMin("");
      setNeedQuantityMax("");
      setNeedPriority("MEDIUM");
      setNeedNotes("");
    },
    onError: error => {
      toast.error(error.message || "Failed to add client need");
    },
  });

  // TER-888: Add Supply mutation
  const addSupplyMutation = trpc.vendorSupply.create.useMutation({
    onSuccess: () => {
      toast.success("Supply item added successfully");
      utils.vendorSupply.getAll.invalidate();
      utils.vendorSupply.getAllWithMatches.invalidate();
      utils.matching.getAllActiveNeedsWithMatches.invalidate();
      setAddSupplyOpen(false);
      setSupplyClientId("");
      setSupplyProductName("");
      setSupplyQuantity("");
      setSupplyUnitPrice("");
      setSupplyNotes("");
    },
    onError: error => {
      toast.error(error.message || "Failed to add supply item");
    },
  });

  // TER-1336: Compute/Update Matches — primary action on the page.
  // Refreshes client needs, supplier supply, and suggested matches so users
  // can recompute the matching snapshot after changes upstream.
  const handleComputeMatches = useCallback(async () => {
    if (isComputingMatches) return;
    setIsComputingMatches(true);
    try {
      await Promise.all([refetchNeeds(), refetchSupply(), refetchMatches()]);
      toast.success("Matches updated");
    } catch {
      toast.error("Failed to update matches");
    } finally {
      setIsComputingMatches(false);
    }
  }, [isComputingMatches, refetchNeeds, refetchSupply, refetchMatches]);

  // TER-888: Handle Add Need form submit
  const handleAddNeedSubmit = useCallback(() => {
    const clientId = parseInt(needClientId, 10);
    if (!clientId || isNaN(clientId)) {
      toast.error("Please select a client");
      return;
    }
    addNeedMutation.mutate({
      clientId,
      productName: needProductName || undefined,
      quantityMin: needQuantityMin || undefined,
      quantityMax: needQuantityMax || undefined,
      priority: needPriority,
      notes: needNotes || undefined,
    });
  }, [
    needClientId,
    needProductName,
    needQuantityMin,
    needQuantityMax,
    needPriority,
    needNotes,
    addNeedMutation,
  ]);

  // TER-888: Handle Add Supply form submit
  const handleAddSupplySubmit = useCallback(() => {
    const vendorId = parseInt(supplyClientId, 10);
    if (!vendorId || isNaN(vendorId)) {
      toast.error("Please select a supplier");
      return;
    }
    if (!supplyQuantity) {
      toast.error("Quantity available is required");
      return;
    }
    addSupplyMutation.mutate({
      vendorId,
      productName: supplyProductName || undefined,
      quantityAvailable: supplyQuantity,
      unitPrice: supplyUnitPrice || undefined,
      notes: supplyNotes || undefined,
    });
  }, [
    supplyClientId,
    supplyProductName,
    supplyQuantity,
    supplyUnitPrice,
    supplyNotes,
    addSupplyMutation,
  ]);

  const needs = needsData?.data || [];
  const supply = supplyData?.data || [];
  const allMatches = matchesData?.data || [];

  // Get top suggested matches (sorted by confidence)
  const topMatches = (allMatches as SuggestedMatch[])
    .filter(m => m.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  // Filter needs based on search and priority
  const filteredNeeds = (needs as ClientNeedWithMatches[]).filter(need => {
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
  const filteredSupply = (supply as SupplyItemWithBuyers[]).filter(item => {
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
    (match: SuggestedMatch & { supplyId?: number; clientId?: number }) => {
      const targetPath = buildQuoteMatchComposerPath(match);
      if (!targetPath) {
        toast.error("Cannot create quote: missing client or need information");
        return;
      }
      setLocation(targetPath);
    },
    [setLocation]
  );

  // FE-QA-010: Handler for Dismiss button
  // UX-002: Open confirmation dialog instead of window.confirm
  const handleDismissClick = useCallback((match: SuggestedMatch) => {
    setMatchToDismiss(match);
    setDismissDialogOpen(true);
  }, []);

  // UX-002: Confirm dismiss action from AlertDialog
  const handleConfirmDismiss = useCallback(() => {
    if (matchToDismiss) {
      const dismissId = matchToDismiss.needId ?? matchToDismiss.id;
      if (dismissId !== undefined) {
        setDismissedMatches(prev => new Set([...prev, dismissId]));
      }
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
    m => !dismissedMatches.has((m.needId ?? m.id) as number)
  );

  return (
    <div className="space-y-6 p-6">
      {!embedded && (
        <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      )}
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Matchmaking Service
            </h1>
            <p className="text-muted-foreground">
              Connect client needs with supplier supply using intelligent
              matching
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* TER-1336: Primary action — recompute/refresh matches */}
            <Button
              onClick={handleComputeMatches}
              disabled={isComputingMatches}
              aria-label="Compute or update matches"
            >
              {isComputingMatches ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isComputingMatches ? "Updating..." : "Compute Matches"}
            </Button>
            <Button variant="outline" onClick={() => setAddNeedOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Need
            </Button>
            <Button variant="outline" onClick={() => setAddSupplyOpen(true)}>
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
                placeholder="Search strain, category, client, supplier..."
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
                {
                  (needs as ClientNeedWithMatches[]).filter(
                    n => (n.matchCount ?? 0) > 0
                  ).length
                }{" "}
                with matches
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
                {
                  (supply as SupplyItemWithBuyers[]).filter(
                    s => (s.buyerCount ?? 0) > 0
                  ).length
                }{" "}
                with buyers
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
                {
                  (needs as ClientNeedWithMatches[]).filter(
                    n => n.priority === "URGENT"
                  ).length
                }
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
                filteredNeeds.map(need => (
                  <div
                    key={need.id}
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() =>
                      setLocation(
                        buildRelationshipProfilePath(
                          need.clientId,
                          "sales-pricing"
                        )
                      )
                    }
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getPriorityIcon(need.priority || "")}
                        </span>
                        <Badge variant={getPriorityColor(need.priority || "")}>
                          {need.priority}
                        </Badge>
                      </div>
                      {(need.matchCount ?? 0) > 0 && (
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
                        Max: ${parseFloat(String(need.priceMax)).toFixed(2)}/lb
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
              Supplier Supply ({filteredSupply.length})
            </CardTitle>
            <CardDescription>Available products from suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {supplyLoading ? (
                <ListSkeleton items={4} showAvatar={false} showSecondary />
              ) : filteredSupply.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No supplier supply found
                </div>
              ) : (
                filteredSupply.map(item => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    {(() => {
                      const supplierName =
                        item.vendorName?.trim() || "Unknown supplier";
                      const quantityLabel =
                        item.quantityAvailable ?? item.quantity;
                      const reserveDisabled =
                        (item.buyerCount ?? 0) === 0 ||
                        reservingItemId !== null;

                      return (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary">✅ Available</Badge>
                            {(item.buyerCount ?? 0) > 0 && (
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
                            {quantityLabel &&
                              ` • ${quantityLabel} lbs available`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Supplier: {supplierName}
                          </p>
                          {item.unitPrice && (
                            <p className="text-xs font-medium text-[var(--success)]">
                              ${parseFloat(String(item.unitPrice)).toFixed(2)}
                              /lb
                              {quantityLabel
                                ? ` • ${quantityLabel} lbs available`
                                : ""}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      className="text-xs"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleReserve(item.id);
                                      }}
                                      disabled={reserveDisabled}
                                    >
                                      {reservingItemId === item.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : null}
                                      Reserve
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {reserveDisabled ? (
                                  <TooltipContent>
                                    {(item.buyerCount ?? 0) === 0
                                      ? "Reserve is unavailable until this supply has at least one active buyer need."
                                      : "A reserve action is already in progress."}
                                  </TooltipContent>
                                ) : null}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </>
                      );
                    })()}
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
                visibleMatches.map((match, idx) => (
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
                              <span className="text-[var(--success)]">✓</span>
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

      {/* TER-888: Add Need Modal */}
      <Dialog
        open={addNeedOpen}
        onOpenChange={open => {
          setAddNeedOpen(open);
          if (!open) {
            setNeedClientId("");
            setNeedProductName("");
            setNeedQuantityMin("");
            setNeedQuantityMax("");
            setNeedPriority("MEDIUM");
            setNeedNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Need</DialogTitle>
            <DialogDescription>
              Record a new purchase need for a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="need-client">Client *</Label>
              <Select value={needClientId} onValueChange={setNeedClientId}>
                <SelectTrigger id="need-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    (
                      buyerClientsData as {
                        items?: Array<{ id: number; name: string }>;
                      } | null
                    )?.items ?? []
                  ).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="need-product">Product / Strain</Label>
              <Input
                id="need-product"
                placeholder="e.g. Wedding Cake, Indica Flower"
                value={needProductName}
                onChange={e => setNeedProductName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="need-qty-min">Min Qty (lbs)</Label>
                <Input
                  id="need-qty-min"
                  type="number"
                  placeholder="0"
                  value={needQuantityMin}
                  onChange={e => setNeedQuantityMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="need-qty-max">Max Qty (lbs)</Label>
                <Input
                  id="need-qty-max"
                  type="number"
                  placeholder="0"
                  value={needQuantityMax}
                  onChange={e => setNeedQuantityMax(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="need-priority">Priority</Label>
              <Select
                value={needPriority}
                onValueChange={v =>
                  setNeedPriority(v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                }
              >
                <SelectTrigger id="need-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="need-notes">Notes</Label>
              <Input
                id="need-notes"
                placeholder="Optional notes..."
                value={needNotes}
                onChange={e => setNeedNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNeedOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNeedSubmit}
              disabled={addNeedMutation.isPending || !needClientId}
            >
              {addNeedMutation.isPending ? "Adding..." : "Add Need"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TER-888: Add Supply Modal */}
      <Dialog
        open={addSupplyOpen}
        onOpenChange={open => {
          setAddSupplyOpen(open);
          if (!open) {
            setSupplyClientId("");
            setSupplyProductName("");
            setSupplyQuantity("");
            setSupplyUnitPrice("");
            setSupplyNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Supply Item</DialogTitle>
            <DialogDescription>
              Record available supply from a supplier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="supply-vendor">Supplier *</Label>
              <Select value={supplyClientId} onValueChange={setSupplyClientId}>
                <SelectTrigger id="supply-vendor">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    (
                      sellerClientsData as {
                        items?: Array<{ id: number; name: string }>;
                      } | null
                    )?.items ?? []
                  ).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="supply-product">Product / Strain</Label>
              <Input
                id="supply-product"
                placeholder="e.g. Wedding Cake, Indica Flower"
                value={supplyProductName}
                onChange={e => setSupplyProductName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="supply-qty">Qty Available (lbs) *</Label>
                <Input
                  id="supply-qty"
                  type="number"
                  placeholder="0"
                  value={supplyQuantity}
                  onChange={e => setSupplyQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="supply-price">Unit Price ($/lb)</Label>
                <Input
                  id="supply-price"
                  type="number"
                  placeholder="0.00"
                  value={supplyUnitPrice}
                  onChange={e => setSupplyUnitPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="supply-notes">Notes</Label>
              <Input
                id="supply-notes"
                placeholder="Optional notes..."
                value={supplyNotes}
                onChange={e => setSupplyNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSupplyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSupplySubmit}
              disabled={
                addSupplyMutation.isPending ||
                !supplyClientId ||
                !supplyQuantity
              }
            >
              {addSupplyMutation.isPending ? "Adding..." : "Add Supply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              (buyersData.data as BuyerMatch[]).map((buyer, idx) => (
                <div
                  key={`buyer-${buyer.clientId || buyer.needId || idx}`}
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setBuyersModalOpen(false);
                    setLocation(
                      buildRelationshipProfilePath(
                        buyer.clientId,
                        "sales-pricing"
                      )
                    );
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
