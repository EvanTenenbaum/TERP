/**
 * InventoryWorkSurface - Work Surface implementation for Inventory
 * UXS-401: Aligns Inventory page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract with arrow navigation
 * - Save state indicator
 * - Inspector panel for batch details
 * - Advanced filtering and sorting
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  Package,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Image as ImageIcon,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface InventoryItem {
  batch?: {
    id: number;
    sku: string;
    batchStatus: string;
    grade?: string;
    onHandQty: string;
    reservedQty: string;
    quarantineQty: string;
    holdQty: string;
    unitCogs?: string;
    createdAt?: string;
    intakeDate?: string;
  };
  product?: {
    id: number;
    nameCanonical: string;
    category?: string;
    subcategory?: string;
  };
  vendor?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "AWAITING_INTAKE", label: "Awaiting Intake" },
  { value: "LIVE", label: "Live" },
  { value: "PHOTOGRAPHY_COMPLETE", label: "Photo Complete" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "QUARANTINED", label: "Quarantined" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "CLOSED", label: "Closed" },
];

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "Flower", label: "Flower" },
  { value: "Concentrate", label: "Concentrate" },
  { value: "Edible", label: "Edible" },
  { value: "PreRoll", label: "Pre-Roll" },
  { value: "Vape", label: "Vape" },
  { value: "Deps", label: "Deps" },
];

const STATUS_COLORS: Record<string, string> = {
  AWAITING_INTAKE: "bg-yellow-100 text-yellow-800",
  LIVE: "bg-green-100 text-green-800",
  PHOTOGRAPHY_COMPLETE: "bg-blue-100 text-blue-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  QUARANTINED: "bg-red-100 text-red-800",
  SOLD_OUT: "bg-gray-100 text-gray-800",
  CLOSED: "bg-gray-200 text-gray-600",
};

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const formatQuantity = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return num.toFixed(2);
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function BatchStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[status] || STATUS_COLORS.LIVE)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ============================================================================
// BATCH INSPECTOR
// ============================================================================

interface BatchInspectorProps {
  item: InventoryItem | null;
  onEdit: (batchId: number) => void;
  onStatusChange: (batchId: number, status: string) => void;
}

function BatchInspectorContent({ item, onEdit, onStatusChange }: BatchInspectorProps) {
  if (!item || !item.batch) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a batch to view details</p>
      </div>
    );
  }

  const { batch, product, vendor, brand } = item;
  const onHand = parseFloat(batch.onHandQty || "0");
  const reserved = parseFloat(batch.reservedQty || "0");
  const quarantine = parseFloat(batch.quarantineQty || "0");
  const hold = parseFloat(batch.holdQty || "0");
  const available = onHand - reserved - quarantine - hold;
  const totalValue = batch.unitCogs ? onHand * parseFloat(batch.unitCogs) : 0;

  return (
    <div className="space-y-6">
      <InspectorSection title="Batch Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="SKU">
            <p className="font-semibold text-lg">{batch.sku}</p>
          </InspectorField>
          <InspectorField label="Status">
            <BatchStatusBadge status={batch.batchStatus} />
          </InspectorField>
        </div>

        <InspectorField label="Product">
          <p className="font-medium">{product?.nameCanonical || "Unknown"}</p>
          {product?.category && (
            <p className="text-sm text-muted-foreground">
              {product.category} {product.subcategory ? `/ ${product.subcategory}` : ""}
            </p>
          )}
        </InspectorField>

        {batch.grade && (
          <InspectorField label="Grade">
            <Badge variant="outline">{batch.grade}</Badge>
          </InspectorField>
        )}

        <div className="grid grid-cols-2 gap-4">
          {vendor && (
            <InspectorField label="Vendor">
              <p>{vendor.name}</p>
            </InspectorField>
          )}
          {brand && (
            <InspectorField label="Brand">
              <p>{brand.name}</p>
            </InspectorField>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Quantities" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">On Hand</p>
            <p className="font-semibold text-lg">{formatQuantity(onHand)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className={cn("font-semibold text-lg", available <= 0 && "text-red-600")}>
              {formatQuantity(available)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Reserved</p>
            <p className="font-semibold">{formatQuantity(reserved)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">On Hold</p>
            <p className="font-semibold">{formatQuantity(hold)}</p>
          </div>
          {quarantine > 0 && (
            <div className="p-3 bg-red-50 rounded-lg col-span-2">
              <p className="text-xs text-red-600">Quarantined</p>
              <p className="font-semibold text-red-700">{formatQuantity(quarantine)}</p>
            </div>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Valuation">
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Unit Cost">
            <p className="font-semibold">{formatCurrency(batch.unitCogs)}</p>
          </InspectorField>
          <InspectorField label="Total Value">
            <p className="font-semibold text-green-600">{formatCurrency(totalValue)}</p>
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="Update Status">
        <div className="grid grid-cols-2 gap-2">
          {BATCH_STATUSES.filter((s) => s.value !== "ALL" && s.value !== batch.batchStatus).map(
            (status) => (
              <Button
                key={status.value}
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(batch.id, status.value)}
                className="justify-start text-xs"
              >
                <BatchStatusBadge status={status.value} />
              </Button>
            )
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Actions">
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => onEdit(batch.id)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Batch
          </Button>
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InventoryWorkSurface() {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Work Surface hooks
  const { saveState, setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Data query
  const {
    data: inventoryData,
    isLoading,
    refetch,
  } = trpc.inventory.list.useQuery({
    query: search || undefined,
    status: statusFilter !== "ALL" ? statusFilter as "AWAITING_INTAKE" | "LIVE" | "PHOTOGRAPHY_COMPLETE" | "ON_HOLD" | "QUARANTINED" | "SOLD_OUT" | "CLOSED" : undefined,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
    limit: pageSize,
    cursor: page * pageSize,
  });

  const rawItems = inventoryData?.items ?? [];
  // Cast to our local interface type for easier manipulation
  const items = rawItems as unknown as InventoryItem[];
  // Note: inventory.list returns { items, hasMore, nextCursor }, not pagination.total
  // Use items.length as approximation; hasMore indicates if there are additional pages
  const hasMore = (inventoryData as { hasMore?: boolean })?.hasMore ?? false;
  const totalCount = hasMore ? items.length + pageSize : items.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Selected item
  const selectedItem = useMemo(
    () => items.find((i) => i.batch?.id === selectedBatchId) || null,
    [items, selectedBatchId]
  );

  // Statistics
  const stats = useMemo(() => {
    const totalQty = items.reduce((sum, i) => sum + parseFloat(i.batch?.onHandQty || "0"), 0);
    const totalValue = items.reduce((sum, i) => {
      const qty = parseFloat(i.batch?.onHandQty || "0");
      const cost = parseFloat(i.batch?.unitCogs || "0");
      return sum + qty * cost;
    }, 0);
    const liveCount = items.filter((i) => i.batch?.batchStatus === "LIVE").length;
    return { total: items.length, totalQty, totalValue, liveCount };
  }, [items]);

  // Sort items
  const displayItems = useMemo(() => {
    if (!sortColumn) return items;
    return [...items].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortColumn === "product") {
        aVal = a.product?.nameCanonical || "";
        bVal = b.product?.nameCanonical || "";
      } else if (sortColumn === "onHandQty") {
        aVal = parseFloat(a.batch?.onHandQty || "0");
        bVal = parseFloat(b.batch?.onHandQty || "0");
      } else if (sortColumn === "unitCogs") {
        aVal = parseFloat(a.batch?.unitCogs || "0");
        bVal = parseFloat(b.batch?.unitCogs || "0");
      } else {
        return 0;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortColumn, sortDirection]);

  // Mutations
  const updateStatusMutation = trpc.inventory.updateStatus.useMutation({
    onMutate: () => setSaving("Updating status..."),
    onSuccess: () => {
      toast.success("Status updated");
      setSaved();
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message || "Failed to update status");
      setError(err.message);
    },
  });

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": (e: KeyboardEvent) => { e?.preventDefault(); searchInputRef.current?.focus(); },
      "ctrl+k": (e: KeyboardEvent) => { e?.preventDefault(); searchInputRef.current?.focus(); },
      arrowdown: (e: KeyboardEvent) => {
        e?.preventDefault();
        const newIndex = Math.min(displayItems.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const item = displayItems[newIndex];
        if (item?.batch) setSelectedBatchId(item.batch.id);
      },
      arrowup: (e: KeyboardEvent) => {
        e?.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const item = displayItems[newIndex];
        if (item?.batch) setSelectedBatchId(item.batch.id);
      },
      enter: (e: KeyboardEvent) => {
        if (selectedItem) { e?.preventDefault(); inspector.open(); }
      },
    },
    onCancel: () => { if (inspector.isOpen) inspector.close(); },
  });

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleEdit = (batchId: number) => setLocation(`/inventory/${batchId}`);

  type BatchStatus = "AWAITING_INTAKE" | "LIVE" | "PHOTOGRAPHY_COMPLETE" | "ON_HOLD" | "QUARANTINED" | "SOLD_OUT" | "CLOSED";
  const handleStatusChange = (batchId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: batchId, status: newStatus as BatchStatus });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6" />
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage batches and stock levels</p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>Batches: <span className="font-semibold text-foreground">{stats.total}</span></span>
            <span>Live: <span className="font-semibold text-foreground">{stats.liveCount}</span></span>
            <span>Value: <span className="font-semibold text-foreground">{formatCurrency(stats.totalValue)}</span></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search inventory... (Cmd+K)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {BATCH_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => toast.info("Add batch modal")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Batch
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn("flex-1 overflow-auto transition-all duration-200", inspector.isOpen && "mr-96")}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No inventory found</p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("product")}>
                      <span className="flex items-center">Product <SortIcon column="product" /></span>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("onHandQty")}>
                      <span className="flex items-center justify-end">On Hand <SortIcon column="onHandQty" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("unitCogs")}>
                      <span className="flex items-center justify-end">Cost <SortIcon column="unitCogs" /></span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item: InventoryItem, index: number) => (
                    <TableRow
                      key={item.batch?.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedBatchId === item.batch?.id && "bg-muted",
                        selectedIndex === index && "ring-1 ring-inset ring-primary"
                      )}
                      onClick={() => {
                        if (item.batch) {
                          setSelectedBatchId(item.batch.id);
                          setSelectedIndex(index);
                          inspector.open();
                        }
                      }}
                    >
                      <TableCell className="font-medium">{item.batch?.sku}</TableCell>
                      <TableCell>{item.product?.nameCanonical || "-"}</TableCell>
                      <TableCell>{item.product?.category || "-"}</TableCell>
                      <TableCell>
                        <BatchStatusBadge status={item.batch?.batchStatus || "LIVE"} />
                      </TableCell>
                      <TableCell className="text-right">{formatQuantity(item.batch?.onHandQty)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.batch?.unitCogs)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedItem?.batch?.sku || "Batch Details"}
          subtitle={selectedItem?.product?.nameCanonical}
        >
          <BatchInspectorContent
            item={selectedItem}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
          />
        </InspectorPanel>
      </div>
    </div>
  );
}

export default InventoryWorkSurface;
