/**
 * FulfillmentPilotSurface (TER-817)
 *
 * Sheet-native surface for Fulfillment (Pick & Pack) operations.
 * Family: Queue + Detail
 *
 * Capability coverage: FUL-001 through FUL-028 (28 capabilities)
 * Discrepancy compliance: DISC-FUL-001 ("Fulfillment" not "Shipping"),
 *   DISC-FUL-006 (permission gate uses orders:update consistent with server)
 *
 * Architecture:
 *   - PowersheetGrid queue of fulfillment-eligible orders
 *   - Selected-order detail panel: item list, bag display, pack actions
 *   - Explicit sidecar CTAs: Pack Selected, Pack All, Unpack, Mark Ready, Ship
 *   - Manifest CSV export
 *   - InspectorPanel for order/item deep context
 *   - Status filter exit notifications (FUL-023)
 *   - Permission tiers: canAccessPickPack (view) vs canManagePickPack (mutations)
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ColDef } from "ag-grid-community";
import {
  AlertCircle,
  ArrowUpDown,
  Box,
  CheckCircle,
  CheckSquare,
  Clock,
  Download,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn, formatCurrency } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useExport } from "@/hooks/work-surface/useExport";
import { usePowersheetSelection } from "@/hooks/work-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import { PICK_PACK_STATUS_TOKENS, STATUS_NEUTRAL } from "@/lib/statusTokens";

// ============================================================================
// Types
// ============================================================================

type FulfillmentStatus = "PENDING" | "PARTIAL" | "READY" | "SHIPPED";
type FulfillmentSortKey =
  | "newest"
  | "oldest"
  | "client_asc"
  | "client_desc"
  | "order_asc"
  | "order_desc";
type InspectorMode = "order" | "item" | null;

const SORT_OPTIONS: Array<{ value: FulfillmentSortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "client_asc", label: "Client A-Z" },
  { value: "client_desc", label: "Client Z-A" },
  { value: "order_asc", label: "Order A-Z" },
  { value: "order_desc", label: "Order Z-A" },
];

interface FulfillmentQueueRow {
  identity: { rowKey: string };
  orderId: number;
  orderNumber: string;
  clientName: string;
  fulfillmentStatus: FulfillmentStatus;
  itemCount: number;
  packedCount: number;
  bagCount: number;
  progressPct: number;
  createdAt: string | null;
}

interface ManifestRow extends Record<string, unknown> {
  orderNumber: string;
  clientName: string;
  productName: string;
  quantity: number;
  location: string;
  bagIdentifier: string;
  packed: string;
  packedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select order" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
  { key: `${mod}+K`, label: "search" },
  { key: "P", label: "pack selected" },
  { key: "A", label: "select all unpacked" },
  { key: "R", label: "mark ready" },
  { key: "I", label: "inspect" },
];

const queueAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
  { label: "Export manifest", available: true },
];

// ============================================================================
// Status badge helpers
// ============================================================================

function statusToken(status: FulfillmentStatus): string {
  switch (status) {
    case "PENDING":
      return PICK_PACK_STATUS_TOKENS.PENDING ?? STATUS_NEUTRAL;
    case "PARTIAL":
      return PICK_PACK_STATUS_TOKENS.PICKING ?? STATUS_NEUTRAL;
    case "READY":
      return PICK_PACK_STATUS_TOKENS.READY ?? STATUS_NEUTRAL;
    case "SHIPPED":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
  }
}

function statusLabel(status: FulfillmentStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PARTIAL":
      return "Partial";
    case "READY":
      return "Ready";
    case "SHIPPED":
      return "Shipped";
  }
}

function StatusBadge({ status }: { status: FulfillmentStatus }) {
  const icons: Record<FulfillmentStatus, React.ElementType> = {
    PENDING: Clock,
    PARTIAL: Package,
    READY: CheckCircle,
    SHIPPED: Truck,
  };
  const Icon = icons[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 min-h-[28px]",
        statusToken(status)
      )}
    >
      <Icon className="w-3 h-3" />
      {statusLabel(status)}
    </Badge>
  );
}

// ============================================================================
// Row mapper
// ============================================================================

type PickListOrder = {
  orderId: number;
  orderNumber: string;
  clientName: string | null;
  pickPackStatus: string | null;
  fulfillmentStatus: string | null;
  createdAt: Date | null;
  itemCount: number;
  packedCount: number;
  bagCount: number;
};

function mapToQueueRow(order: PickListOrder): FulfillmentQueueRow {
  const rawStatus = order.pickPackStatus;
  const rawFulfillment = order.fulfillmentStatus;

  let derived: FulfillmentStatus = "PENDING";
  const shippedStatuses = new Set([
    "SHIPPED",
    "DELIVERED",
    "RETURNED",
    "RESTOCKED",
    "RETURNED_TO_VENDOR",
  ]);
  if (rawFulfillment && shippedStatuses.has(rawFulfillment.toUpperCase())) {
    derived = "SHIPPED";
  } else if (rawStatus?.toUpperCase() === "READY") {
    derived = "READY";
  } else if (
    rawStatus?.toUpperCase() === "PICKING" ||
    rawStatus?.toUpperCase() === "PACKED"
  ) {
    derived = "PARTIAL";
  }

  const progressPct =
    order.itemCount > 0
      ? Math.round((order.packedCount / order.itemCount) * 100)
      : 0;

  return {
    identity: { rowKey: String(order.orderId) },
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    clientName: order.clientName ?? "Unknown",
    fulfillmentStatus: derived,
    itemCount: order.itemCount,
    packedCount: order.packedCount,
    bagCount: order.bagCount,
    progressPct,
    createdAt: order.createdAt?.toISOString() ?? null,
  };
}

// ============================================================================
// Item row sub-component (detail panel)
// ============================================================================

interface OrderItem {
  id: number;
  productId?: number | null;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  location: string;
  isPacked: boolean;
  bagId: number | null;
  bagIdentifier: string | null;
  packedAt: Date | null;
}

interface Bag {
  id: number;
  identifier: string;
  notes: string | null;
  itemCount: number;
  createdAt: Date | null;
}

interface ItemRowProps {
  item: OrderItem;
  isSelected: boolean;
  onToggle: () => void;
  onInspect: () => void;
}

function ItemRow({ item, isSelected, onToggle, onInspect }: ItemRowProps) {
  return (
    <div
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
      onClick={() => !item.isPacked && onToggle()}
      onDoubleClick={onInspect}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all min-h-[44px] cursor-pointer",
        item.isPacked
          ? "bg-green-50 border-green-200 cursor-default"
          : isSelected
            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
            : "bg-white hover:bg-gray-50 border-border"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
          item.isPacked
            ? "bg-green-500 border-green-500"
            : isSelected
              ? "bg-blue-500 border-blue-500"
              : "border-gray-300"
        )}
      >
        {(item.isPacked || isSelected) && (
          <CheckCircle className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {item.productName}
          {item.productId && (
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              #{item.productId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Qty: {item.quantity}</span>
          {item.unitPrice !== null && item.unitPrice !== undefined && (
            <span>{formatCurrency(item.unitPrice)}/unit</span>
          )}
          {item.location && item.location !== "N/A" && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
          )}
        </div>
      </div>

      {/* Bag indicator */}
      {item.isPacked && item.bagIdentifier && (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-700 border-green-200"
        >
          {item.bagIdentifier}
        </Badge>
      )}

      {/* Inspect trigger */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px]"
        onClick={e => {
          e.stopPropagation();
          onInspect();
        }}
        aria-label="Inspect item"
      >
        <PackageCheck className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Order Inspector (right-rail)
// ============================================================================

interface OrderInspectorProps {
  order: {
    id: number;
    orderNumber: string;
    clientName: string;
    pickPackStatus: string | null;
    fulfillmentStatus: string | null;
    total: string;
    notes: string | null;
    createdAt: Date | null;
  };
  summary: { totalItems: number; packedItems: number; bagCount: number };
  bags: Bag[];
  isOpen: boolean;
  onClose: () => void;
}

function OrderInspector({
  order,
  summary,
  bags,
  isOpen,
  onClose,
}: OrderInspectorProps) {
  const derivedStatus: FulfillmentStatus = (() => {
    const shippedStatuses = new Set([
      "SHIPPED",
      "DELIVERED",
      "RETURNED",
      "RESTOCKED",
      "RETURNED_TO_VENDOR",
    ]);
    if (
      order.fulfillmentStatus &&
      shippedStatuses.has(order.fulfillmentStatus.toUpperCase())
    ) {
      return "SHIPPED";
    }
    if (order.pickPackStatus?.toUpperCase() === "READY") return "READY";
    if (
      order.pickPackStatus?.toUpperCase() === "PICKING" ||
      order.pickPackStatus?.toUpperCase() === "PACKED"
    ) {
      return "PARTIAL";
    }
    return "PENDING";
  })();

  return (
    <InspectorPanel
      isOpen={isOpen}
      onClose={onClose}
      title={order.orderNumber}
      subtitle={order.clientName}
      headerActions={<StatusBadge status={derivedStatus} />}
    >
      <InspectorSection title="Order">
        <InspectorField label="Client">
          <p className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            {order.clientName}
          </p>
        </InspectorField>
        <InspectorField label="Total">
          <p className="font-semibold">{formatCurrency(order.total)}</p>
        </InspectorField>
        <InspectorField label="Created">
          <p>
            {order.createdAt
              ? new Date(order.createdAt).toLocaleDateString()
              : "-"}
          </p>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="Packing Progress">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{
                width: `${
                  summary.totalItems > 0
                    ? (summary.packedItems / summary.totalItems) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {summary.packedItems}/{summary.totalItems}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {summary.bagCount} bag{summary.bagCount !== 1 ? "s" : ""}
        </p>
      </InspectorSection>

      {bags.length > 0 && (
        <InspectorSection title={`Bags (${bags.length})`}>
          <div className="space-y-2">
            {bags.map(bag => (
              <div
                key={bag.id}
                className="p-2 border rounded-lg bg-muted/30 flex items-center gap-2"
              >
                <Box className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {bag.identifier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bag.itemCount} items
                  </p>
                </div>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}

      {order.notes && (
        <InspectorSection title="Notes">
          <p className="text-sm text-gray-700 bg-muted/30 p-3 rounded-lg">
            {order.notes}
          </p>
        </InspectorSection>
      )}
    </InspectorPanel>
  );
}

// ============================================================================
// Item Inspector (right-rail)
// ============================================================================

interface ItemInspectorProps {
  item: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

function ItemInspector({ item, isOpen, onClose }: ItemInspectorProps) {
  return (
    <InspectorPanel
      isOpen={isOpen}
      onClose={onClose}
      title={item.productName}
      subtitle={item.isPacked ? "Packed" : "Not Packed"}
    >
      <InspectorSection title="Product">
        <InspectorField label="Name">
          <p className="font-semibold">{item.productName}</p>
        </InspectorField>
        {item.productId !== null && (
          <InspectorField label="ID">
            <p className="text-sm text-muted-foreground">#{item.productId}</p>
          </InspectorField>
        )}
        <InspectorField label="Quantity">
          <p className="font-semibold">{item.quantity}</p>
        </InspectorField>
        <InspectorField label="Location">
          <p className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {item.location || "-"}
          </p>
        </InspectorField>
        {item.unitPrice !== null && item.unitPrice !== undefined && (
          <InspectorField label="Unit Price">
            <p>${item.unitPrice.toFixed(2)}</p>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title="Pack Status">
        {item.isPacked ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <PackageCheck className="w-5 h-5" />
              <span className="font-medium">Packed</span>
            </div>
            {item.bagIdentifier && (
              <p className="text-sm text-green-600">
                Bag: {item.bagIdentifier}
              </p>
            )}
            {item.packedAt && (
              <p className="text-sm text-green-600">
                At: {new Date(item.packedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Not Packed</span>
            </div>
          </div>
        )}
      </InspectorSection>
    </InspectorPanel>
  );
}

// ============================================================================
// Main component
// ============================================================================

interface FulfillmentPilotSurfaceProps {
  onOpenClassic?: () => void;
}

export function FulfillmentPilotSurface({
  onOpenClassic,
}: FulfillmentPilotSurfaceProps) {
  const { hasAnyPermission, isLoading: permissionsLoading } = usePermissions();

  // FUL-028: permission tiers
  const canAccessPickPack = hasAnyPermission([
    "orders:read",
    "pick-pack:manage",
    "orders:fulfill",
    "orders:update",
  ]);
  // DISC-FUL-006: use orders:update consistent with server requirement
  const canManagePickPack = hasAnyPermission([
    "pick-pack:manage",
    "orders:update",
  ]);

  // ── State ──────────────────────────────────────────────────────────────────

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<FulfillmentStatus | "ALL">(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<FulfillmentSortKey>("newest");
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(null);
  const [inspectedItemId, setInspectedItemId] = useState<number | null>(null);
  const [showUnpackDialog, setShowUnpackDialog] = useState(false);
  const [unpackReason, setUnpackReason] = useState("");

  // DISC-FUL-009: ship dialog state
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");
  const [shipCarrier, setShipCarrier] = useState("");
  const [shipNotes, setShipNotes] = useState("");

  // Dedup toast refs
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const pickListQuery = trpc.pickPack.getPickList.useQuery({
    filters: statusFilter !== "ALL" ? { status: statusFilter } : undefined,
    limit: 50,
  });

  const statsQuery = trpc.pickPack.getStats.useQuery();

  const orderDetailsQuery = trpc.pickPack.getOrderDetails.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );

  const { exportCSV, state: exportState } = useExport<ManifestRow>();

  // ── Derived data ───────────────────────────────────────────────────────────

  const allQueueRows = useMemo<FulfillmentQueueRow[]>(() => {
    const rawList = pickListQuery.data ?? [];
    return rawList.map(o =>
      mapToQueueRow({
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        clientName: o.clientName,
        pickPackStatus: o.pickPackStatus ?? null,
        fulfillmentStatus: o.fulfillmentStatus ?? null,
        createdAt: o.createdAt ?? null,
        itemCount: o.itemCount,
        packedCount: o.packedCount,
        bagCount: o.bagCount,
      })
    );
  }, [pickListQuery.data]);

  const searchLower = searchQuery.trim().toLowerCase();
  const queueRows = useMemo<FulfillmentQueueRow[]>(() => {
    const filtered = searchLower
      ? allQueueRows.filter(
          r =>
            r.orderNumber.toLowerCase().includes(searchLower) ||
            r.clientName.toLowerCase().includes(searchLower)
        )
      : allQueueRows;

    return [...filtered].sort((a, b) => {
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      switch (sortKey) {
        case "oldest":
          return createdA - createdB;
        case "client_asc":
          return a.clientName.localeCompare(b.clientName);
        case "client_desc":
          return b.clientName.localeCompare(a.clientName);
        case "order_asc":
          return a.orderNumber.localeCompare(b.orderNumber);
        case "order_desc":
          return b.orderNumber.localeCompare(a.orderNumber);
        default:
          return createdB - createdA;
      }
    });
  }, [allQueueRows, searchLower, sortKey]);

  const selectedQueueRow =
    queueRows.find(r => r.orderId === selectedOrderId) ?? null;

  const orderDetails = orderDetailsQuery.data ?? null;

  const unpackedItems = useMemo<OrderItem[]>(
    () => (orderDetails?.items ?? []).filter(i => !i.isPacked),
    [orderDetails]
  );

  const unpackedItemIds = useMemo(
    () => unpackedItems.map(i => i.id),
    [unpackedItems]
  );

  // Item multi-select (FUL-011)
  const itemSelection = usePowersheetSelection<number>({
    visibleIds: unpackedItemIds,
    clearOnActiveChange: true,
  });
  const selectedItemIds = itemSelection.getSelectedArray();

  const canShipSelectedOrder =
    orderDetails !== null &&
    orderDetails.order.pickPackStatus === "READY" &&
    ![
      "SHIPPED",
      "DELIVERED",
      "RETURNED",
      "RESTOCKED",
      "RETURNED_TO_VENDOR",
    ].includes((orderDetails.order.fulfillmentStatus ?? "").toUpperCase());

  const hasActiveFilters =
    statusFilter !== "ALL" || searchLower.length > 0 || sortKey !== "newest";

  const statusCounts = useMemo(
    () => ({
      pending: statsQuery.data?.pending ?? 0,
      partial: statsQuery.data?.partial ?? 0,
      ready: statsQuery.data?.ready ?? 0,
      shipped: statsQuery.data?.shipped ?? 0,
    }),
    [statsQuery.data]
  );

  const manifestRows = useMemo<ManifestRow[]>(() => {
    if (!orderDetails) return [];
    return orderDetails.items.map(item => ({
      orderNumber: orderDetails.order.orderNumber,
      clientName: orderDetails.order.clientName,
      productName: item.productName,
      quantity: item.quantity,
      location: item.location,
      bagIdentifier: item.bagIdentifier ?? "UNASSIGNED",
      packed: item.isPacked ? "Yes" : "No",
      packedAt: item.packedAt ? new Date(item.packedAt).toLocaleString() : "",
    }));
  }, [orderDetails]);

  const inspectedItem = useMemo<OrderItem | undefined>(
    () =>
      inspectorMode === "item" && inspectedItemId !== null
        ? (orderDetails?.items ?? []).find(i => i.id === inspectedItemId)
        : undefined,
    [inspectorMode, inspectedItemId, orderDetails]
  );

  // ── Toast dedup helper ─────────────────────────────────────────────────────

  const notifyToast = useCallback(
    (level: "success" | "error" | "info" | "warning", message: string) => {
      const now = Date.now();
      const key = `${level}:${message}`;
      if (
        key !== lastToastKeyRef.current ||
        now - lastToastTimeRef.current > 300
      ) {
        if (level === "success") toast.success(message);
        else if (level === "error") toast.error(message);
        else if (level === "info") toast.info(message);
        else toast.warning(message);
        lastToastKeyRef.current = key;
        lastToastTimeRef.current = now;
      }
    },
    []
  );

  // FUL-023: Status filter exit notification
  const notifyStatusFilterExit = useCallback(
    (orderNumber: string | undefined, newStatus: string) => {
      const normalizedFilter = statusFilter.toUpperCase();
      const normalizedTarget =
        newStatus === "PICKING" || newStatus === "PACKED"
          ? "PARTIAL"
          : newStatus.toUpperCase();
      if (normalizedFilter === "ALL" || normalizedFilter === normalizedTarget) {
        return;
      }
      notifyToast(
        "info",
        `${orderNumber ?? "Order"} moved to ${normalizedTarget} and is now hidden by the ${normalizedFilter.toLowerCase()} filter. Switch to All or ${normalizedTarget.charAt(0) + normalizedTarget.slice(1).toLowerCase()} to keep tracking it.`
      );
    },
    [statusFilter, notifyToast]
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const refetchAll = useCallback(() => {
    void pickListQuery.refetch();
    void statsQuery.refetch();
    void orderDetailsQuery.refetch();
  }, [pickListQuery, statsQuery, orderDetailsQuery]);

  const packItemsMutation = trpc.pickPack.packItems.useMutation({
    onSuccess: () => {
      itemSelection.clear();
      refetchAll();
      notifyToast("success", "Items packed");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PACKED");
    },
    onError: (error: { message: string }) => {
      notifyToast("error", `Failed to pack items: ${error.message}`);
    },
  });

  // FUL-014 / FUL-013: markAllPacked with legacy JSON fallback handled server-side
  const markAllPackedMutation = trpc.pickPack.markAllPacked.useMutation({
    onSuccess: () => {
      refetchAll();
      notifyToast("success", "All items packed");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PACKED");
    },
    onError: (error: { message: string }) => {
      notifyToast("error", `Failed to pack all: ${error.message}`);
    },
  });

  // FUL-015: unpack requires reason string
  const unpackItemsMutation = trpc.pickPack.unpackItems.useMutation({
    onSuccess: () => {
      itemSelection.clear();
      refetchAll();
      notifyToast("success", "Items unpacked");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PICKING");
    },
    onError: (error: { message: string }) => {
      notifyToast("error", `Failed to unpack: ${error.message}`);
    },
  });

  // FUL-017
  const markReadyMutation = trpc.pickPack.markOrderReady.useMutation({
    onSuccess: () => {
      const num = orderDetails?.order.orderNumber;
      setSelectedOrderId(null);
      setInspectorMode(null);
      refetchAll();
      notifyToast("success", "Order marked ready for fulfillment");
      notifyStatusFilterExit(num, "READY");
    },
    onError: (error: { message: string }) => {
      notifyToast("error", `Failed to mark ready: ${error.message}`);
    },
  });

  // FUL-018: terminal mutation — orders.shipOrder
  const shipOrderMutation = trpc.orders.shipOrder.useMutation({
    onSuccess: () => {
      const num = orderDetails?.order.orderNumber;
      setSelectedOrderId(null);
      setInspectorMode(null);
      refetchAll();
      notifyToast("success", "Order marked as Shipped");
      notifyStatusFilterExit(num, "SHIPPED");
    },
    onError: (error: { message: string }) => {
      notifyToast("error", `Failed to ship order: ${error.message}`);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectOrder = useCallback(
    (orderId: number | null) => {
      setSelectedOrderId(orderId);
      itemSelection.reset();
      setInspectorMode(null);
      setInspectedItemId(null);
    },
    [itemSelection]
  );

  const handlePackSelected = useCallback(() => {
    if (
      !canManagePickPack ||
      !selectedOrderId ||
      selectedItemIds.length === 0
    ) {
      return;
    }
    packItemsMutation.mutate({
      orderId: selectedOrderId,
      itemIds: selectedItemIds,
    });
  }, [canManagePickPack, selectedOrderId, selectedItemIds, packItemsMutation]);

  const handleMarkAllPacked = useCallback(() => {
    if (!canManagePickPack || !selectedOrderId || unpackedItems.length === 0) {
      return;
    }
    markAllPackedMutation.mutate({ orderId: selectedOrderId });
  }, [
    canManagePickPack,
    selectedOrderId,
    unpackedItems,
    markAllPackedMutation,
  ]);

  // FUL-015: show dialog to collect reason before unpack
  const handleUnpackSelected = useCallback(() => {
    if (!canManagePickPack || selectedItemIds.length === 0) return;
    setShowUnpackDialog(true);
  }, [canManagePickPack, selectedItemIds]);

  const handleUnpackConfirm = useCallback(() => {
    if (!selectedOrderId || selectedItemIds.length === 0) return;
    const reason = unpackReason.trim() || "Manual unpack";
    unpackItemsMutation.mutate({
      orderId: selectedOrderId,
      itemIds: selectedItemIds,
      reason,
    });
    setShowUnpackDialog(false);
    setUnpackReason("");
  }, [selectedOrderId, selectedItemIds, unpackReason, unpackItemsMutation]);

  const handleMarkReady = useCallback(() => {
    if (!canManagePickPack || !selectedOrderId) return;
    markReadyMutation.mutate({ orderId: selectedOrderId });
  }, [canManagePickPack, selectedOrderId, markReadyMutation]);

  const handleShip = useCallback(() => {
    if (!canManagePickPack || !selectedOrderId) return;
    setShowShipDialog(true);
  }, [canManagePickPack, selectedOrderId]);

  const handleShipConfirm = useCallback(() => {
    if (!selectedOrderId) return;
    shipOrderMutation.mutate({
      id: selectedOrderId,
      ...(shipTrackingNumber.trim() && {
        trackingNumber: shipTrackingNumber.trim(),
      }),
      ...(shipCarrier.trim() && { carrier: shipCarrier.trim() }),
      ...(shipNotes.trim() && { notes: shipNotes.trim() }),
    });
    setShowShipDialog(false);
    setShipTrackingNumber("");
    setShipCarrier("");
    setShipNotes("");
  }, [
    selectedOrderId,
    shipOrderMutation,
    shipTrackingNumber,
    shipCarrier,
    shipNotes,
  ]);

  const handleExportManifest = useCallback(() => {
    if (!orderDetails || manifestRows.length === 0) {
      notifyToast("error", "Select an order with items to export a manifest");
      return;
    }
    const safeNum = orderDetails.order.orderNumber.replace(/\s+/g, "_");
    void exportCSV(manifestRows, {
      filename: `fulfillment_manifest_${safeNum}`,
      addTimestamp: true,
      columns: [
        { key: "orderNumber", label: "Order Number" },
        { key: "clientName", label: "Client" },
        { key: "productName", label: "Product" },
        { key: "quantity", label: "Quantity" },
        { key: "location", label: "Location" },
        { key: "bagIdentifier", label: "Bag" },
        { key: "packed", label: "Packed" },
        { key: "packedAt", label: "Packed At" },
      ],
    });
  }, [exportCSV, orderDetails, manifestRows, notifyToast]);

  const resetQueueView = useCallback(() => {
    setStatusFilter("ALL");
    setSearchQuery("");
    setSortKey("newest");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  // FUL-012: select all unpacked
  const selectAllUnpacked = useCallback(() => {
    itemSelection.toggleAll(true);
  }, [itemSelection]);

  // Cmd+K global search shortcut
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey))
        return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (
          target.isContentEditable ||
          tag === "input" ||
          tag === "textarea" ||
          target.getAttribute("role") === "textbox"
        ) {
          return;
        }
      }
      event.preventDefault();
      event.stopPropagation();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  // Keyboard shortcuts for pack/ready/inspect (FUL-025)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!selectedOrderId) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (
          target.isContentEditable ||
          tag === "input" ||
          tag === "textarea" ||
          target.getAttribute("role") === "textbox"
        ) {
          return;
        }
      }
      switch (event.key.toLowerCase()) {
        case "p":
          handlePackSelected();
          break;
        case "a":
          selectAllUnpacked();
          break;
        case "r":
          // FUL-P3-A: guard — only fire if the order has packed items
          if (orderDetails && orderDetails.summary.packedItems > 0) {
            handleMarkReady();
          }
          break;
        case "i":
          if (selectedOrderId) setInspectorMode("order");
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedOrderId,
    handlePackSelected,
    selectAllUnpacked,
    handleMarkReady,
    orderDetails,
  ]);

  // ── Column definitions ─────────────────────────────────────────────────────

  const queueColumnDefs = useMemo<ColDef<FulfillmentQueueRow>[]>(
    () => [
      {
        field: "orderNumber",
        headerName: "Order #",
        headerTooltip: "S-... = Sale order, O-... = Draft/quote order",
        minWidth: 130,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "clientName",
        headerName: "Client",
        flex: 1.3,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "fulfillmentStatus",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          statusLabel((params.value as FulfillmentStatus) ?? "PENDING"),
      },
      {
        field: "progressPct",
        headerName: "Progress",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => `${String(params.value ?? 0)}%`,
      },
      {
        field: "itemCount",
        headerName: "Items",
        minWidth: 80,
        maxWidth: 100,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "bagCount",
        headerName: "Bags",
        minWidth: 70,
        maxWidth: 90,
        cellClass: "powersheet-cell--locked",
      },
    ],
    []
  );

  // ── Permission guard ───────────────────────────────────────────────────────

  if (!permissionsLoading && !canAccessPickPack) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Fulfillment access requires order read or fulfillment permissions.
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const queueMultiRowSelected =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="fulfillment-pilot-surface"
    >
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            data-testid="fulfillment-search-input"
            placeholder={`Search orders... (${mod}+K)`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 max-w-xs min-h-[44px]"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={v => setStatusFilter(v as FulfillmentStatus | "ALL")}
        >
          <SelectTrigger
            className="w-[140px] min-h-[44px]"
            data-testid="fulfillment-status-filter"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortKey}
          onValueChange={v => setSortKey(v as FulfillmentSortKey)}
        >
          <SelectTrigger className="w-[160px] min-h-[44px]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            onClick={resetQueueView}
            data-testid="fulfillment-reset-filters"
          >
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => {
              void pickListQuery.refetch();
              void statsQuery.refetch();
            }}
            aria-label="Refresh fulfillment queue"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onOpenClassic && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px]"
              onClick={onOpenClassic}
            >
              Classic View
            </Button>
          )}
        </div>
      </div>

      {/* ── Status summary cards (FUL-006) ── */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground px-1">
          Queue totals as of{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="text-xl font-bold text-yellow-700">
              {statusCounts.pending}
            </div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xl font-bold text-blue-700">
              {statusCounts.partial}
            </div>
            <div className="text-xs text-blue-600">Partial</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-xl font-bold text-green-700">
              {statusCounts.ready}
            </div>
            <div className="text-xs text-green-600">Ready</div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xl font-bold text-slate-700">
              {statusCounts.shipped}
            </div>
            <div className="text-xs text-slate-600">Shipped</div>
          </div>
        </div>
      </div>

      {/* ── Queue grid (FUL-001, FUL-002, FUL-003, FUL-004, FUL-010) ── */}
      <PowersheetGrid
        surfaceId="fulfillment-queue"
        requirementIds={[
          "FUL-001",
          "FUL-002",
          "FUL-003",
          "FUL-004",
          "FUL-008",
          "FUL-010",
          "FUL-026",
        ]}
        affordances={queueAffordances}
        title="Fulfillment Queue"
        description="Orders eligible for pick and pack. Select a row to open the detail panel."
        rows={queueRows}
        columnDefs={queueColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedQueueRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => handleSelectOrder(row?.orderId ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setQueueSelectionSummary}
        isLoading={pickListQuery.isLoading}
        errorMessage={pickListQuery.error?.message ?? null}
        emptyTitle={
          hasActiveFilters
            ? "No fulfillment orders match the current filters"
            : "No fulfillment orders in queue"
        }
        emptyDescription={
          hasActiveFilters
            ? "Adjust filters or clear them to see all orders."
            : "Orders appear here once they are confirmed SALE orders."
        }
        summary={
          <span>
            {queueRows.length} order{queueRows.length !== 1 ? "s" : ""} visible
            {queueSelectionSummary
              ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows selected`
              : ""}
          </span>
        }
        minHeight={280}
      />

      {/* ── Workflow action bar ── */}
      {queueMultiRowSelected && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Spreadsheet selection spans multiple rows. Workflow actions are locked
          until a single order row is focused.
        </div>
      )}

      {/* ── Selected order detail ── */}
      {selectedOrderId && (
        <div
          className="rounded-lg border border-border bg-background"
          data-testid="fulfillment-order-detail"
        >
          {/* Order header */}
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            {orderDetailsQuery.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : orderDetails ? (
              <>
                <div>
                  <p className="font-semibold text-base">
                    Order {orderDetails.order.orderNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {orderDetails.order.clientName}
                  </p>
                </div>
                <StatusBadge
                  status={
                    canShipSelectedOrder
                      ? "READY"
                      : (selectedQueueRow?.fulfillmentStatus ?? "PENDING")
                  }
                />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {orderDetails.summary.packedItems}/
                    {orderDetails.summary.totalItems} packed
                  </span>
                  <span>{orderDetails.summary.bagCount} bags</span>
                  <span>{formatCurrency(orderDetails.order.total)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto min-h-[44px]"
                  onClick={() => setInspectorMode("order")}
                >
                  View Details
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Failed to load order details.
              </p>
            )}
          </div>

          {/* Pack action bar (FUL-011 through FUL-018) */}
          {orderDetails && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2">
              {/* FUL-012: select all unpacked */}
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={selectAllUnpacked}
                disabled={unpackedItems.length === 0 || !canManagePickPack}
                title={
                  canManagePickPack
                    ? "Select all unpacked items (A)"
                    : "Fulfillment manage permission required"
                }
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All (A)
              </Button>

              {/* FUL-013: pack selected */}
              <Button
                size="sm"
                className="min-h-[44px]"
                onClick={handlePackSelected}
                disabled={
                  selectedItemIds.length === 0 ||
                  packItemsMutation.isPending ||
                  !canManagePickPack
                }
                title={
                  canManagePickPack
                    ? `Pack ${selectedItemIds.length} selected item${selectedItemIds.length !== 1 ? "s" : ""} (P)`
                    : "Fulfillment manage permission required"
                }
              >
                {packItemsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Pack Selected (P) ({selectedItemIds.length})
              </Button>

              {/* FUL-014: pack all to one bag */}
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={handleMarkAllPacked}
                disabled={
                  unpackedItems.length === 0 ||
                  markAllPackedMutation.isPending ||
                  !canManagePickPack
                }
                title={
                  canManagePickPack
                    ? "Pack all remaining items into one bag"
                    : "Fulfillment manage permission required"
                }
              >
                {markAllPackedMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4 mr-2" />
                )}
                Pack All to One Bag
              </Button>

              {/* FUL-015: unpack with reason */}
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={handleUnpackSelected}
                disabled={
                  selectedItemIds.length === 0 ||
                  unpackItemsMutation.isPending ||
                  !canManagePickPack
                }
                title={
                  canManagePickPack
                    ? "Unpack selected items (requires reason)"
                    : "Fulfillment manage permission required"
                }
              >
                {unpackItemsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Unpack Selected
              </Button>

              {/* FUL-019: export manifest */}
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={handleExportManifest}
                disabled={exportState.isExporting || manifestRows.length === 0}
                title="Export fulfillment manifest to CSV"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportState.isExporting ? "Exporting..." : "Export Manifest"}
              </Button>

              <div className="flex-1" />

              {/* FUL-017 / FUL-018: Mark Ready or Ship */}
              {canShipSelectedOrder ? (
                <Button
                  size="sm"
                  className="min-h-[44px] bg-green-600 hover:bg-green-700"
                  onClick={handleShip}
                  disabled={shipOrderMutation.isPending || !canManagePickPack}
                  title={
                    canManagePickPack
                      ? "Mark order as Shipped (terminal action)"
                      : "Fulfillment manage permission required"
                  }
                >
                  {shipOrderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4 mr-2" />
                  )}
                  Mark Shipped
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="min-h-[44px] bg-green-600 hover:bg-green-700"
                  onClick={handleMarkReady}
                  disabled={
                    orderDetails.summary.packedItems <
                      orderDetails.summary.totalItems ||
                    markReadyMutation.isPending ||
                    !canManagePickPack
                  }
                  title={
                    canManagePickPack
                      ? "Mark order ready for fulfillment (R)"
                      : "Fulfillment manage permission required"
                  }
                >
                  {markReadyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Mark Ready (R)
                </Button>
              )}
            </div>
          )}

          {/* Items list (FUL-009) */}
          {orderDetailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orderDetails ? (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Order Items ({orderDetails.items.length})
              </h3>

              <div
                className="space-y-2"
                role="listbox"
                aria-multiselectable="true"
                data-testid="fulfillment-items-list"
              >
                {orderDetails.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItemIds.includes(item.id)}
                    onToggle={() =>
                      itemSelection.toggle(
                        item.id,
                        !itemSelection.isSelected(item.id)
                      )
                    }
                    onInspect={() => {
                      setInspectedItemId(item.id);
                      setInspectorMode("item");
                    }}
                  />
                ))}
              </div>

              {/* Bags display (FUL-022) */}
              {orderDetails.bags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Bags ({orderDetails.bags.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {orderDetails.bags.map(bag => (
                      <Card key={bag.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Box className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm truncate">
                              {bag.identifier}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bag.itemCount} item{bag.itemCount !== 1 ? "s" : ""}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-3 text-destructive/40" />
              <p>Order details unavailable.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Status bar ── */}
      <WorkSurfaceStatusBar
        left={
          <span>
            {statusCounts.pending + statusCounts.partial} active ·{" "}
            {statusCounts.ready} ready · {statusCounts.shipped} shipped
          </span>
        }
        center={
          <span>
            {selectedQueueRow
              ? `Fulfillment: ${selectedQueueRow.orderNumber} · ${selectedQueueRow.clientName} · ${selectedItemIds.length} items selected`
              : "Select an order to start packing"}
          </span>
        }
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* ── Order inspector (FUL-021) ── */}
      {orderDetails && (
        <OrderInspector
          order={orderDetails.order}
          summary={orderDetails.summary}
          bags={orderDetails.bags}
          isOpen={inspectorMode === "order"}
          onClose={() => setInspectorMode(null)}
        />
      )}

      {/* ── Item inspector (FUL-020) ── */}
      {inspectedItem && (
        <ItemInspector
          item={inspectedItem}
          isOpen={inspectorMode === "item"}
          onClose={() => {
            setInspectorMode(null);
            setInspectedItemId(null);
          }}
        />
      )}

      {/* ── Unpack reason dialog (FUL-015) ── */}
      <ConfirmDialog
        open={showUnpackDialog}
        onOpenChange={open => {
          setShowUnpackDialog(open);
          if (!open) setUnpackReason("");
        }}
        title="Unpack Items"
        description={
          <div className="space-y-3">
            <p>
              Unpack {selectedItemIds.length} selected item
              {selectedItemIds.length !== 1 ? "s" : ""}? A reason is required.
            </p>
            <Input
              placeholder="Reason for unpacking..."
              value={unpackReason}
              onChange={e => setUnpackReason(e.target.value)}
              className="min-h-[44px]"
              autoFocus
            />
          </div>
        }
        confirmLabel="Unpack"
        variant="destructive"
        onConfirm={handleUnpackConfirm}
      />

      {/* ── Ship dialog (DISC-FUL-009) ── */}
      <ConfirmDialog
        open={showShipDialog}
        onOpenChange={open => {
          setShowShipDialog(open);
          if (!open) {
            setShipTrackingNumber("");
            setShipCarrier("");
            setShipNotes("");
          }
        }}
        title="Ship Order"
        description={
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm shipment for order{" "}
              <span className="font-semibold">
                {orderDetails?.order.orderNumber}
              </span>
              . All fields are optional.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ship-tracking-number">Tracking Number</Label>
              <Input
                id="ship-tracking-number"
                placeholder="e.g. 1Z999AA10123456784"
                value={shipTrackingNumber}
                onChange={e => setShipTrackingNumber(e.target.value)}
                className="min-h-[44px]"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ship-carrier">Carrier</Label>
              <Select value={shipCarrier} onValueChange={setShipCarrier}>
                <SelectTrigger id="ship-carrier" className="min-h-[44px]">
                  <SelectValue placeholder="Select carrier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="Local Delivery">Local Delivery</SelectItem>
                  <SelectItem value="Customer Pickup">
                    Customer Pickup
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ship-notes">Notes</Label>
              <Textarea
                id="ship-notes"
                placeholder="Optional shipping notes..."
                value={shipNotes}
                onChange={e => setShipNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        }
        confirmLabel="Mark Shipped"
        onConfirm={handleShipConfirm}
      />
    </div>
  );
}

export default FulfillmentPilotSurface;
