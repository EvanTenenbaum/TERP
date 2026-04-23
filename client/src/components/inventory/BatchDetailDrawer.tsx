import { trpc } from "@/lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DrawerSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
  MapPin,
  DollarSign,
  Package,
  History,
  Calculator,
  TrendingUp,
  Percent,
} from "lucide-react";
import { format } from "date-fns";
import { CogsEditModal } from "./CogsEditModal";
import { PotentialBuyersWidget } from "./PotentialBuyersWidget";
import { PriceSimulationModal } from "./PriceSimulationModal";
import { BatchMediaUpload } from "./BatchMediaUpload";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { AdjustQuantityDialog } from "@/components/AdjustQuantityDialog";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Profitability Section Component
function ProfitabilitySection({ batchId }: { batchId: number }) {
  const { data: profitability, isLoading } =
    trpc.inventory.profitability.batch.useQuery(batchId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Profitability</h3>
        </div>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </Card>
      </div>
    );
  }

  if (!profitability || profitability.unitsSold === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Profitability</h3>
        </div>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">
            No sales data available
          </div>
        </Card>
      </div>
    );
  }

  const profitColor =
    profitability.grossProfit >= 0 ? "text-[var(--success)]" : "text-destructive";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        <h3 className="font-semibold text-lg">Profitability</h3>
      </div>
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Units Sold</div>
            <div className="text-lg font-semibold">
              {profitability.unitsSold}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Avg Price</div>
            <div className="text-lg font-semibold">
              {formatCurrency(profitability.avgSellingPrice)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Total Revenue
            </div>
            <div className="text-lg font-semibold text-[var(--success)]">
              {formatCurrency(profitability.totalRevenue)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
            <div className="text-lg font-semibold">
              {formatCurrency(profitability.totalCost)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Gross Profit
            </div>
            <div className={`text-xl font-bold ${profitColor}`}>
              {formatCurrency(profitability.grossProfit)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Margin
            </div>
            <div className={`text-xl font-bold ${profitColor}`}>
              {formatPercent(profitability.marginPercent)}
            </div>
          </div>
        </div>
        {profitability.remainingUnits > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">
              Potential (Remaining Inventory)
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Units: </span>
                <span className="font-semibold">
                  {profitability.remainingUnits}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue: </span>
                <span className="font-semibold">
                  {formatCurrency(profitability.potentialRevenue)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">
                  Potential Profit:{" "}
                </span>
                <span className="font-semibold text-[var(--info)]">
                  {formatCurrency(profitability.potentialProfit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface BatchDetailDrawerProps {
  batchId: number | null;
  open: boolean;
  onClose: () => void;
}

// Status options with labels
const BATCH_STATUSES = [
  { value: "AWAITING_INTAKE", label: "Awaiting Intake" },
  { value: "LIVE", label: "Live" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "QUARANTINED", label: "Quarantined" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "CLOSED", label: "Closed" },
] as const;

interface ProductMetadataDraft {
  nameCanonical: string;
  category: string;
  strainId: string;
  grade: string;
}

const EMPTY_PRODUCT_METADATA_DRAFT: ProductMetadataDraft = {
  nameCanonical: "",
  category: "",
  strainId: "none",
  grade: "",
};

export function BatchDetailDrawer({
  batchId,
  open,
  onClose,
}: BatchDetailDrawerProps) {
  const [showCogsEdit, setShowCogsEdit] = useState(false);
  const [showPriceSimulation, setShowPriceSimulation] = useState(false);
  // FIX-BATCH-001: Add modals for action buttons
  const [showQtyAdjust, setShowQtyAdjust] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [productDraft, setProductDraft] = useState<ProductMetadataDraft>(
    EMPTY_PRODUCT_METADATA_DRAFT
  );
  // BUG-041 FIX: Track closing state to prevent race conditions
  const isClosingRef = useRef(false);

  // Mutations for actions
  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onSuccess: () => {
      toast.success("Quantity adjusted successfully");
      refetch();
      setShowQtyAdjust(false);
    },
    onError: error => {
      toast.error(`Failed to adjust quantity: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
      setShowStatusChange(false);
      setNewStatus("");
      setStatusReason("");
    },
    onError: error => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
  const updateBatchMutation = trpc.inventory.updateBatch.useMutation();
  const updateProductMutation = trpc.productCatalogue.update.useMutation();

  const { data, isLoading, error, refetch } = trpc.inventory.getById.useQuery(
    batchId as number,
    {
      enabled: !!batchId && open,
    }
  );
  const batch = data?.batch;
  const hasLinkedProduct =
    batch?.productId !== null && batch?.productId !== undefined;
  const {
    data: linkedProduct,
    error: linkedProductError,
    refetch: refetchLinkedProduct,
  } = trpc.productCatalogue.getById.useQuery(
    { id: batch?.productId ?? 0 },
    {
      enabled: open && hasLinkedProduct,
    }
  );
  const { data: strains = [] } = trpc.productCatalogue.getStrains.useQuery(
    undefined,
    {
      enabled: open && hasLinkedProduct,
    }
  );
  const { data: grades = [] } = trpc.settings.grades.list.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (!showProductEdit) {
      return;
    }

    setProductDraft({
      nameCanonical: linkedProduct?.nameCanonical ?? "",
      category: linkedProduct?.category ?? "",
      strainId:
        linkedProduct?.strainId !== null &&
        linkedProduct?.strainId !== undefined
          ? String(linkedProduct.strainId)
          : "none",
      grade: batch?.grade ?? "",
    });
  }, [
    batch?.grade,
    linkedProduct?.category,
    linkedProduct?.nameCanonical,
    linkedProduct?.strainId,
    showProductEdit,
  ]);

  /**
   * BUG-041 FIX: Safe close handler that prevents crashes during drawer close.
   *
   * Root cause: The Sheet component's onOpenChange can trigger during render
   * while data is still loading or when React state updates race with the close.
   * This handler ensures clean close by:
   * 1. Using a ref to prevent multiple close calls
   * 2. Resetting modal states before calling onClose
   * 3. Using requestAnimationFrame to defer the close to the next frame
   */
  const handleSafeClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !isClosingRef.current) {
        isClosingRef.current = true;
        // Reset ALL internal states to prevent stale state issues
        setShowCogsEdit(false);
        setShowPriceSimulation(false);
        // REDHAT-FIX-001: Reset action modal states added in BUG-041 fix
        setShowQtyAdjust(false);
        setShowStatusChange(false);
        setShowProductEdit(false);
        setNewStatus("");
        setStatusReason("");
        setProductDraft(EMPTY_PRODUCT_METADATA_DRAFT);
        // Defer close to next animation frame to prevent render crashes
        window.requestAnimationFrame(() => {
          try {
            onClose();
          } catch (closeError) {
            console.error(
              "[BatchDetailDrawer] BUG-041: Error during close",
              closeError
            );
          } finally {
            isClosingRef.current = false;
          }
        });
      }
    },
    [onClose]
  );

  if (!batchId || !open) return null;

  // BUG-041 FIX: Handle error state
  if (error) {
    console.error(`[BatchDetailDrawer] Error loading batch ${batchId}:`, error);
    return (
      <Sheet open={open} onOpenChange={handleSafeClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">
              Failed to load batch details
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // BUG-041 FIX: Defensive array access with logging for unexpected states
  const locations = Array.isArray(data?.locations) ? data.locations : [];
  const auditLogs = Array.isArray(data?.auditLogs) ? data.auditLogs : [];
  const availableQty = data?.availableQty || 0;
  const selectedStrain = strains.find(
    strain => strain.id === linkedProduct?.strainId
  );
  const isSavingProductMetadata =
    updateProductMutation.isPending || updateBatchMutation.isPending;
  const canEditProductMetadata = Boolean(hasLinkedProduct && linkedProduct);

  const handleSaveProductMetadata = async () => {
    if (!batch) {
      toast.error("Batch not found");
      return;
    }

    if (!hasLinkedProduct) {
      toast.error(
        "This batch is not linked to a product. Product metadata cannot be edited from the drawer."
      );
      return;
    }

    if (!linkedProduct) {
      toast.error("Linked product details are still loading");
      return;
    }

    const productId = batch.productId;
    if (productId === null || productId === undefined) {
      toast.error(
        "This batch is not linked to a product. Product metadata cannot be edited from the drawer."
      );
      return;
    }

    const trimmedName = productDraft.nameCanonical.trim();
    const trimmedCategory = productDraft.category.trim();
    const normalizedGrade = productDraft.grade.trim();

    if (!trimmedName || !trimmedCategory) {
      toast.error("Product name and category are required");
      return;
    }

    const nextStrainId =
      productDraft.strainId === "none" ? null : Number(productDraft.strainId);
    const previousGrade = batch.grade?.trim() ?? "";
    const productUpdates: Partial<{
      nameCanonical: string;
      category: string;
      strainId: number | null;
    }> = {};

    if (trimmedName !== linkedProduct.nameCanonical) {
      productUpdates.nameCanonical = trimmedName;
    }
    if (trimmedCategory !== linkedProduct.category) {
      productUpdates.category = trimmedCategory;
    }
    if ((linkedProduct.strainId ?? null) !== nextStrainId) {
      productUpdates.strainId = nextStrainId;
    }

    const shouldUpdateProduct = Object.keys(productUpdates).length > 0;
    const shouldUpdateGrade = normalizedGrade !== previousGrade;

    if (!shouldUpdateProduct && !shouldUpdateGrade) {
      setShowProductEdit(false);
      return;
    }

    try {
      if (shouldUpdateProduct) {
        await updateProductMutation.mutateAsync({
          id: productId,
          data: productUpdates,
        });
      }

      if (shouldUpdateGrade) {
        await updateBatchMutation.mutateAsync({
          id: batch.id,
          version: batch.version,
          grade: normalizedGrade || null,
          reason: "Updated product metadata from batch drawer",
        });
      }

      await Promise.all([refetch(), refetchLinkedProduct()]);
      toast.success("Product metadata updated");
      setShowProductEdit(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to update product metadata";
      toast.error(message);
    }
  };

  // BUG-041: Log warnings for undefined arrays (helps track data issues)
  if (data && !Array.isArray(data.locations)) {
    console.warn(
      `[BatchDetailDrawer] Batch ${batchId} has undefined/invalid locations`
    );
  }
  if (data && !Array.isArray(data.auditLogs)) {
    console.warn(
      `[BatchDetailDrawer] Batch ${batchId} has undefined/invalid auditLogs`
    );
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: LucideIcon;
        label: string;
      }
    > = {
      AWAITING_INTAKE: {
        variant: "secondary",
        icon: Clock,
        label: "Awaiting Intake",
      },
      QC_PENDING: { variant: "secondary", icon: Clock, label: "QC Pending" },
      LIVE: { variant: "default", icon: CheckCircle, label: "Live" },
      ON_HOLD: { variant: "secondary", icon: Pause, label: "On Hold" },
      QUARANTINED: {
        variant: "destructive",
        icon: AlertCircle,
        label: "Quarantined",
      },
      SOLD_OUT: { variant: "secondary", icon: XCircle, label: "Sold Out" },
      CLOSED: { variant: "secondary", icon: XCircle, label: "Closed" },
    };

    const config = statusConfig[status] || statusConfig.LIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleSafeClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <DrawerSkeleton sections={5} />
        ) : !batch ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Batch not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <Package className="h-6 w-6" />
                {batch.sku}
              </SheetTitle>
              <SheetDescription>Batch Code: {batch.code}</SheetDescription>
            </SheetHeader>

            {/* Status */}
            <div>{getStatusBadge(batch.batchStatus)}</div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">On Hand</span>
                </div>
                <p className="text-2xl font-bold">
                  {parseFloat(batch.onHandQty).toFixed(2)}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Available</span>
                </div>
                <p className="text-2xl font-bold text-[var(--success)]">
                  {availableQty.toFixed(2)}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Reserved</span>
                </div>
                <p className="text-2xl font-bold">
                  {parseFloat(batch.reservedQty).toFixed(2)}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Quarantine</span>
                </div>
                <p className="text-2xl font-bold">
                  {parseFloat(batch.quarantineQty).toFixed(2)}
                </p>
              </Card>
            </div>

            <Separator />

            {/* Product Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-lg">Product Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductEdit(true)}
                  disabled={!canEditProductMetadata}
                >
                  Edit Product Metadata
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Product Name</p>
                  <p className="font-medium">
                    {linkedProduct?.nameCanonical ||
                      "Linked product unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {linkedProduct?.category || "Linked product unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Strain</p>
                  <p className="font-medium">
                    {selectedStrain?.name ||
                      linkedProduct?.strainName ||
                      "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grade</p>
                  <p className="font-medium">{batch.grade || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sample</p>
                  <p className="font-medium">{batch.isSample ? "Yes" : "No"}</p>
                </div>
              </div>
              {!hasLinkedProduct && (
                <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This batch is missing a linked product. Product metadata
                  editing is unavailable until the batch is re-linked.
                </Card>
              )}
              {linkedProductError && (
                <Card className="border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Unable to load the linked product record for editing.
                </Card>
              )}
              {/* TODO: Re-enable when API includes product relation
              {batch.product?.strainId && (
                <div className="pt-2">
                  <p className="text-muted-foreground text-sm mb-2">Strain</p>
                  <StrainInfo strainId={batch.product.strainId} />
                </div>
              )}
              */}
            </div>

            {/* TODO: Re-enable when API includes product relation
            {availableQty <= 0 && batch.product?.strainId && (
              <>
                <Separator />
                <RelatedProducts 
                  strainId={batch.product.strainId}
                  currentProductId={batch.productId}
                />
              </>
            )}
            */}

            <Separator />

            {/* COGS Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Cost Details</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCogsEdit(true)}
                  >
                    Edit COGS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceSimulation(true)}
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    Price Simulation
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">COGS Mode</p>
                  <p className="font-medium">{batch.cogsMode}</p>
                </div>
                {batch.cogsMode === "FIXED" && batch.unitCogs && (
                  <div>
                    <p className="text-muted-foreground">Unit COGS</p>
                    <p className="font-medium">
                      ${parseFloat(batch.unitCogs).toFixed(2)}
                    </p>
                  </div>
                )}

                {batch.cogsMode === "RANGE" && (
                  <>
                    <div>
                      <p className="text-muted-foreground">COGS Min</p>
                      <p className="font-medium">
                        $
                        {batch.unitCogsMin
                          ? parseFloat(batch.unitCogsMin).toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">COGS Max</p>
                      <p className="font-medium">
                        $
                        {batch.unitCogsMax
                          ? parseFloat(batch.unitCogsMax).toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">
                    {batch.paymentTerms?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Batch Media */}
            <BatchMediaUpload batchId={batchId} productId={batch.productId} />

            <Separator />

            {/* Payment History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Payment History</h3>
              </div>
              <Card className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Terms:
                    </span>
                    <span className="font-medium">
                      {batch.paymentTerms?.replace(/_/g, " ") || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Status:
                    </span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Potential Buyers - Enhanced matching with historical and predictive */}
            <PotentialBuyersWidget
              batchId={batchId}
              productData={{
                grade: batch.grade,
                // Product details would come from batch->product join
                // For now, let batchId drive the matching
              }}
            />

            <Separator />

            {/* Profitability */}
            <ProfitabilitySection batchId={batchId} />

            <Separator />

            {/* Sales History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Sales History</h3>
              </div>
              <Card className="p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <p>No sales recorded</p>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Locations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Storage Locations</h3>
              </div>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No locations recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {locations.map(location => (
                    <Card key={location.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="text-sm">
                          <p className="font-medium">{location.site}</p>
                          <p className="text-muted-foreground">
                            {[
                              location.zone,
                              location.rack,
                              location.shelf,
                              location.bin,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "No specific location"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {parseFloat(location.qty).toFixed(2)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Audit Trail */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Audit Trail</h3>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit logs</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 10).map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.action}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(
                              new Date(log.createdAt),
                              "MMM d, yyyy HH:mm"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.reason || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Comments</h3>
              <CommentWidget
                commentableType="inventory_batch"
                commentableId={batch.id}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowQtyAdjust(true)}
              >
                Adjust Quantity
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setNewStatus(batch.batchStatus);
                  setShowStatusChange(true);
                }}
              >
                Change Status
              </Button>
            </div>
          </div>
        )}
      </SheetContent>

      <AdjustQuantityDialog
        open={showQtyAdjust}
        onOpenChange={setShowQtyAdjust}
        currentQuantity={batch?.onHandQty}
        itemLabel={batch ? `Selected batch: ${batch.sku}` : undefined}
        isPending={adjustQtyMutation.isPending}
        onSubmit={({ adjustment, adjustmentReason, notes }) => {
          if (!batchId) {
            toast.error("Batch not found");
            return;
          }

          adjustQtyMutation.mutate({
            id: batchId,
            field: "onHandQty",
            adjustment,
            adjustmentReason,
            notes,
          });
        }}
      />

      <Dialog open={showProductEdit} onOpenChange={setShowProductEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Metadata</DialogTitle>
            <DialogDescription>
              Update the linked product fields and this batch&apos;s grade from
              the inventory drawer.
            </DialogDescription>
          </DialogHeader>
          {!hasLinkedProduct ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This batch does not have a linked product record, so product
              metadata cannot be edited here.
            </div>
          ) : !linkedProduct ? (
            <div className="py-4 text-sm text-muted-foreground">
              Loading linked product details...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={productDraft.nameCanonical}
                  onChange={event =>
                    setProductDraft(current => ({
                      ...current,
                      nameCanonical: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Input
                  id="product-category"
                  value={productDraft.category}
                  onChange={event =>
                    setProductDraft(current => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-strain">Strain</Label>
                <select
                  id="product-strain"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={productDraft.strainId}
                  onChange={event =>
                    setProductDraft(current => ({
                      ...current,
                      strainId: event.target.value,
                    }))
                  }
                >
                  <option value="none">No strain</option>
                  {strains.map(strain => (
                    <option key={strain.id} value={String(strain.id)}>
                      {strain.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-grade">Grade</Label>
                <select
                  id="batch-grade"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={productDraft.grade}
                  onChange={event =>
                    setProductDraft(current => ({
                      ...current,
                      grade: event.target.value,
                    }))
                  }
                >
                  <option value="">Unassigned</option>
                  {grades.map(grade => (
                    <option key={grade.id} value={grade.name}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveProductMetadata()}
              disabled={!canEditProductMetadata || isSavingProductMetadata}
            >
              {isSavingProductMetadata ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusChange} onOpenChange={setShowStatusChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Batch Status</DialogTitle>
            <DialogDescription>
              Select a new status for this batch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-reason">Reason</Label>
              <Input
                id="status-reason"
                placeholder="Reason for status change"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newStatus || !statusReason || !batchId) {
                  toast.error("Please select a status and enter a reason");
                  return;
                }
                updateStatusMutation.mutate({
                  id: batchId,
                  status: newStatus as (typeof BATCH_STATUSES)[number]["value"],
                  reason: statusReason,
                  version: batch?.version,
                });
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COGS Edit Modal */}
      {batch && (
        <CogsEditModal
          isOpen={showCogsEdit}
          onClose={() => setShowCogsEdit(false)}
          batchId={batch.id}
          currentCogs={batch.unitCogs || "0"}
          batchCode={batch.code}
          onSuccess={() => {
            refetch();
            setShowCogsEdit(false);
          }}
        />
      )}

      {/* Price Simulation Modal */}
      {batch && (
        <PriceSimulationModal
          open={showPriceSimulation}
          onOpenChange={setShowPriceSimulation}
          batch={{
            id: batch.id,
            sku: batch.sku,
            unitCogs: batch.unitCogs,
            onHandQty: batch.onHandQty,
          }}
          currentAvgPrice={0} // TODO: Calculate from profitability data
        />
      )}
    </Sheet>
  );
}
