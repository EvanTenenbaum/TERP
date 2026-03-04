/**
 * PickPackWorkSurface (UXS-402)
 *
 * Work Surface implementation for warehouse pick & pack operations.
 * Integrates keyboard navigation, save state, and inspector panel patterns.
 *
 * Features:
 * - Real-time pick list queue with keyboard navigation
 * - Multi-select item packing with bulk operations
 * - Inspector panel for order and item details
 * - Action bar for pack/ready workflows
 * - Status filtering and search
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  RefreshCw,
  Search,
  Box,
  AlertCircle,
  ChevronRight,
  User,
  DollarSign,
  MapPin,
  Loader2,
  CheckSquare,
  PackageCheck,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import { useUndo } from "@/hooks/work-surface/useUndo";
import { useExport } from "@/hooks/work-surface/useExport";
import { usePermissions } from "@/hooks/usePermissions";
import {
  isShippingEnabledMode,
  resolveSalesBusinessMode,
} from "@/lib/salesMode";
import { usePowersheetSelection } from "../../hooks/work-surface";
import { InspectorPanel } from "@/components/work-surface/InspectorPanel";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PICK_PACK_STATUS_TOKENS } from "../../lib/statusTokens";

// ============================================================================
// Types
// ============================================================================

type PickPackStatus = "PENDING" | "PICKING" | "PACKED" | "READY";
type PickPackSortKey =
  | "newest"
  | "oldest"
  | "client_asc"
  | "client_desc"
  | "order_asc"
  | "order_desc";

const PICK_PACK_VIEW_STATE_KEY = "terp-pick-pack-view-v2";
const PICK_PACK_SORT_OPTIONS: Array<{
  value: PickPackSortKey;
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "client_asc", label: "Client A-Z" },
  { value: "client_desc", label: "Client Z-A" },
  { value: "order_asc", label: "Order A-Z" },
  { value: "order_desc", label: "Order Z-A" },
];

interface OrderItem {
  id: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice?: number;
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

interface OrderSummary {
  orderId: number;
  orderNumber: string;
  clientName: string;
  pickPackStatus: PickPackStatus;
  itemCount: number;
  packedCount: number;
  bagCount: number;
  createdAt?: Date | null;
}

interface OrderDetails {
  order: {
    id: number;
    orderNumber: string;
    clientId: number;
    clientName: string;
    pickPackStatus: PickPackStatus;
    fulfillmentStatus: string | null;
    total: string;
    notes: string | null;
    createdAt: Date | null;
    version?: number;
  };
  items: OrderItem[];
  bags: Bag[];
  summary: {
    totalItems: number;
    packedItems: number;
    bagCount: number;
  };
}

interface PickPackManifestRow extends Record<string, unknown> {
  orderNumber: string;
  clientName: string;
  productName: string;
  quantity: number;
  location: string;
  bagIdentifier: string;
  packed: string;
  packedAt: string;
}

// Helper type for version tracking
interface PickPackOrderEntity {
  id: number;
  version: number;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: PickPackStatus }) {
  const config = {
    PENDING: {
      color: PICK_PACK_STATUS_TOKENS.PENDING,
      icon: Clock,
      label: "Pending",
    },
    PICKING: {
      color: PICK_PACK_STATUS_TOKENS.PICKING,
      icon: Package,
      label: "Picking",
    },
    PACKED: {
      color: PICK_PACK_STATUS_TOKENS.PACKED,
      icon: CheckCircle,
      label: "Packed",
    },
    READY: {
      color: PICK_PACK_STATUS_TOKENS.READY,
      icon: Truck,
      label: "Ready",
    },
  };
  const { color, icon: Icon, label } = config[status] || config.PENDING;

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// Order List Row
// ============================================================================

interface OrderListRowProps {
  order: OrderSummary;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

function OrderListRow({
  order,
  isSelected,
  isFocused,
  onClick,
}: OrderListRowProps) {
  const progress =
    order.itemCount > 0 ? (order.packedCount / order.itemCount) * 100 : 0;

  return (
    <div
      onClick={onClick}
      data-testid="order-queue-row"
      className={cn(
        "p-4 border-b cursor-pointer transition-colors",
        isSelected && "bg-blue-50 border-l-4 border-l-blue-500",
        isFocused &&
          !isSelected &&
          "bg-gray-100 ring-2 ring-inset ring-blue-400",
        !isSelected && !isFocused && "hover:bg-gray-50"
      )}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{order.orderNumber}</span>
        <StatusBadge status={order.pickPackStatus} />
      </div>
      <div className="text-sm text-gray-600 mb-2">{order.clientName}</div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {order.packedCount}/{order.itemCount} items packed
        </span>
        <span>{order.bagCount} bags</span>
      </div>
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Item Row
// ============================================================================

interface ItemRowProps {
  item: OrderItem;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onInspect: () => void;
}

function ItemRow({
  item,
  isSelected,
  isFocused,
  onToggle,
  onInspect,
}: ItemRowProps) {
  return (
    <div
      onClick={() => !item.isPacked && onToggle()}
      onDoubleClick={onInspect}
      className={cn(
        "p-3 border rounded-lg transition-all",
        item.isPacked
          ? "bg-green-50 border-green-200 cursor-default"
          : isSelected
            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200 cursor-pointer"
            : "bg-white hover:bg-gray-50 cursor-pointer",
        isFocused && "ring-2 ring-blue-400"
      )}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3">
        {/* Selection checkbox */}
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

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {item.productName}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Qty: {item.quantity}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
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

        {/* Inspect button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => {
            e.stopPropagation();
            onInspect();
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Item Inspector
// ============================================================================

interface ItemInspectorProps {
  item: OrderItem;
  onClose: () => void;
}

function ItemInspector({ item, onClose }: ItemInspectorProps) {
  return (
    <InspectorPanel title="Item Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Product Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Product</h4>
          <p className="text-lg font-semibold">{item.productName}</p>
          {item.productId && (
            <p className="text-sm text-gray-500">ID: {item.productId}</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Quantity</h4>
            <p className="text-lg font-semibold">{item.quantity}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
            <p className="text-lg font-semibold flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {item.location}
            </p>
          </div>
          {item.unitPrice && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                Unit Price
              </h4>
              <p className="text-lg font-semibold">
                ${item.unitPrice.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
          {item.isPacked ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <PackageCheck className="w-5 h-5" />
                <span className="font-medium">Packed</span>
              </div>
              {item.bagIdentifier && (
                <p className="text-sm text-green-600 mt-1">
                  Bag: {item.bagIdentifier}
                </p>
              )}
              {item.packedAt && (
                <p className="text-sm text-green-600 mt-1">
                  Packed: {new Date(item.packedAt).toLocaleString()}
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
        </div>
      </div>
    </InspectorPanel>
  );
}

// ============================================================================
// Order Inspector
// ============================================================================

interface OrderInspectorProps {
  order: OrderDetails["order"];
  summary: OrderDetails["summary"];
  bags: Bag[];
  onClose: () => void;
}

function OrderInspector({
  order,
  summary,
  bags,
  onClose,
}: OrderInspectorProps) {
  return (
    <InspectorPanel title="Order Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Order Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{order.orderNumber}</p>
            <StatusBadge status={order.pickPackStatus} />
          </div>
        </div>

        {/* Client */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Client</h4>
          <p className="font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            {order.clientName}
          </p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Total</h4>
            <p className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {parseFloat(order.total).toFixed(2)}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
            <p className="text-sm">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Packing Progress
          </h4>
          <div className="flex items-center gap-4">
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
            <span className="text-sm font-medium">
              {summary.packedItems}/{summary.totalItems}
            </span>
          </div>
        </div>

        {/* Bags */}
        {bags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Bags ({bags.length})
            </h4>
            <div className="space-y-2">
              {bags.map(bag => (
                <div
                  key={bag.id}
                  className="p-3 border rounded-lg bg-gray-50 flex items-center gap-3"
                >
                  <Box className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{bag.identifier}</p>
                    <p className="text-sm text-gray-500">
                      {bag.itemCount} items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </InspectorPanel>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PickPackWorkSurface() {
  const [location] = useLocation();
  const { hasAnyPermission } = usePermissions();
  const salesBusinessMode = useMemo(
    () => resolveSalesBusinessMode(location),
    [location]
  );
  const shippingEnabled = isShippingEnabledMode(salesBusinessMode);
  const canManagePickPack = hasAnyPermission([
    "pick-pack:manage",
    "orders:manage",
    "orders:fulfill",
    "orders:update",
  ]);
  const readyCtaLabel = shippingEnabled
    ? "Mark Ready for Shipping (R)"
    : "Mark Ready for Payment (R)";

  // State
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<PickPackStatus | "ALL">(
    () => {
      if (typeof window === "undefined") return "ALL";
      try {
        const raw = localStorage.getItem(PICK_PACK_VIEW_STATE_KEY);
        if (!raw) return "ALL";
        const parsed = JSON.parse(raw) as {
          statusFilter?: PickPackStatus | "ALL";
        };
        return parsed.statusFilter ?? "ALL";
      } catch {
        return "ALL";
      }
    }
  );
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem(PICK_PACK_VIEW_STATE_KEY);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { searchQuery?: string };
      return parsed.searchQuery ?? "";
    } catch {
      return "";
    }
  });
  const [sortKey, setSortKey] = useState<PickPackSortKey>(() => {
    if (typeof window === "undefined") return "newest";
    try {
      const raw = localStorage.getItem(PICK_PACK_VIEW_STATE_KEY);
      if (!raw) return "newest";
      const parsed = JSON.parse(raw) as { sortKey?: PickPackSortKey };
      return parsed.sortKey ?? "newest";
    } catch {
      return "newest";
    }
  });
  const [focusedOrderIndex, setFocusedOrderIndex] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<"list" | "items">("list");
  const [inspectorMode, setInspectorMode] = useState<"item" | "order" | null>(
    null
  );
  const [inspectedItemId, setInspectedItemId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        PICK_PACK_VIEW_STATE_KEY,
        JSON.stringify({ statusFilter, searchQuery, sortKey })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [searchQuery, sortKey, statusFilter]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const {
    data: pickList,
    isLoading: pickListLoading,
    refetch: refetchPickList,
  } = trpc.pickPack.getPickList.useQuery({
    filters: statusFilter !== "ALL" ? { status: statusFilter } : undefined,
    limit: 50,
  });

  const { data: stats, refetch: refetchStats } =
    trpc.pickPack.getStats.useQuery();

  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    refetch: refetchOrderDetails,
  } = trpc.pickPack.getOrderDetails.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  // Save state
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const { registerAction, undoLast } = useUndo({ enableKeyboard: false });
  const { exportCSV: exportManifestCSV, state: manifestExportState } =
    useExport<PickPackManifestRow>();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<PickPackOrderEntity>({
    entityType: "Order",
    onRefresh: async () => {
      await refetchOrderDetails();
      await refetchPickList();
    },
  });

  // Track version when order details are loaded (UXS-705)
  // Cast to access version if available from API response
  useEffect(() => {
    if (orderDetails?.order) {
      const order = orderDetails.order as typeof orderDetails.order & {
        version?: number;
      };
      if (order.version !== undefined) {
        trackVersion({ id: order.id, version: order.version });
      }
    }
  }, [orderDetails, trackVersion]);

  // Filter pick list
  const filteredPickList = useMemo(() => {
    if (!pickList) return [];
    const filtered = pickList.filter(
      order =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const clientA = a.clientName.toLowerCase();
      const clientB = b.clientName.toLowerCase();
      const orderA = a.orderNumber.toLowerCase();
      const orderB = b.orderNumber.toLowerCase();

      switch (sortKey) {
        case "oldest":
          return createdA - createdB;
        case "client_asc":
          return clientA.localeCompare(clientB);
        case "client_desc":
          return clientB.localeCompare(clientA);
        case "order_asc":
          return orderA.localeCompare(orderB);
        case "order_desc":
          return orderB.localeCompare(orderA);
        case "newest":
        default:
          return createdB - createdA;
      }
    });
  }, [pickList, searchQuery, sortKey]);

  // Get unpacked items for current order
  const unpackedItems = useMemo(() => {
    if (!orderDetails) return [];
    return orderDetails.items.filter(item => !item.isPacked);
  }, [orderDetails]);

  const pickPackManifestRows = useMemo<PickPackManifestRow[]>(() => {
    if (!orderDetails) {
      return [];
    }

    return orderDetails.items.map(item => ({
      orderNumber: orderDetails.order.orderNumber,
      clientName: orderDetails.order.clientName,
      productName: item.productName,
      quantity: item.quantity,
      location: item.location,
      bagIdentifier: item.bagIdentifier || "UNASSIGNED",
      packed: item.isPacked ? "Yes" : "No",
      packedAt: item.packedAt ? new Date(item.packedAt).toLocaleString() : "",
    }));
  }, [orderDetails]);

  // Shared powersheet selection for items (TER-285)
  const unpackedItemIds = useMemo(
    () => unpackedItems.map(item => item.id),
    [unpackedItems]
  );
  const itemSelection = usePowersheetSelection<number>({
    visibleIds: unpackedItemIds,
    clearOnActiveChange: true,
  });
  const selectedItems = itemSelection.getSelectedArray();

  // Status filter exit notification (XP-A-004-PPK / TER-498)
  // Mirrors the Orders pattern: warn user when a status change moves an order
  // outside the currently-active status filter.
  const notifyStatusFilterExit = useCallback(
    (orderNumber: string | undefined, newStatus: string) => {
      const normalizedFilter = statusFilter.toUpperCase();
      const normalizedTarget = newStatus.toUpperCase();
      if (normalizedFilter === "ALL" || normalizedFilter === normalizedTarget) {
        return;
      }
      toast.info(
        `${orderNumber ?? "Order"} moved to ${normalizedTarget} and is now hidden by the ${normalizedFilter.toLowerCase()} filter. Switch to All or ${normalizedTarget.charAt(0) + normalizedTarget.slice(1).toLowerCase()} to keep tracking it.`
      );
    },
    [statusFilter]
  );

  // Mutations
  const packItemsMutation = trpc.pickPack.packItems.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      itemSelection.clear();
      void refetchOrderDetails();
      void refetchPickList();
      void refetchStats();
      setSaved();
      toast.success("Items packed successfully");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PICKING");
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || "Failed to pack items");
        toast.error(`Failed to pack items: ${error.message}`);
      }
    },
  });

  const markAllPackedMutation = trpc.pickPack.markAllPacked.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      void refetchOrderDetails();
      void refetchPickList();
      void refetchStats();
      setSaved();
      toast.success("All items packed");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PACKED");
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || "Failed to pack items");
        toast.error(`Failed to pack items: ${error.message}`);
      }
    },
  });

  const unpackItemsMutation = trpc.pickPack.unpackItems.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      void refetchOrderDetails();
      void refetchPickList();
      void refetchStats();
      setSaved();
      toast.success("Items unpacked");
      notifyStatusFilterExit(orderDetails?.order.orderNumber, "PICKING");
    },
    onError: (error: { message: string }) => {
      if (!handleConflictError(error)) {
        setError(error.message || "Failed to unpack items");
        toast.error(`Failed to unpack items: ${error.message}`);
      }
    },
  });

  const markReadyMutation = trpc.pickPack.markOrderReady.useMutation({
    onMutate: () => setSaving(),
    onSuccess: () => {
      const orderNum = orderDetails?.order.orderNumber;
      setSelectedOrderId(null);
      // Close inspector on terminal status change (XP-A-007-PPK / TER-504)
      setInspectorMode(null);
      setInspectedItemId(null);
      void refetchPickList();
      void refetchStats();
      setSaved();
      toast.success(
        shippingEnabled
          ? "Order marked ready for shipping"
          : "Order marked ready for payment handoff"
      );
      notifyStatusFilterExit(orderNum, "READY");
    },
    onError: (error: { message: string }) => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        setError(error.message || "Failed to mark ready");
        toast.error(`Failed to mark ready: ${error.message}`);
      }
    },
  });

  // Handlers
  const handleSelectOrder = useCallback(
    (orderId: number) => {
      setSelectedOrderId(orderId);
      itemSelection.reset();
      setFocusZone("items");
      setFocusedItemIndex(0);
    },
    [itemSelection]
  );

  const toggleItemSelection = useCallback(
    (itemId: number) => {
      itemSelection.toggle(itemId, !itemSelection.isSelected(itemId));
    },
    [itemSelection]
  );

  const selectAllUnpacked = useCallback(() => {
    itemSelection.toggleAll(true);
  }, [itemSelection]);

  const handlePackSelected = useCallback(() => {
    if (!canManagePickPack) {
      return;
    }
    if (selectedOrderId && selectedItems.length > 0) {
      const orderId = selectedOrderId;
      const itemIds = [...selectedItems];
      packItemsMutation.mutate(
        {
          orderId,
          itemIds,
        },
        {
          onSuccess: () => {
            registerAction({
              description: `Packed ${itemIds.length} selected item${
                itemIds.length === 1 ? "" : "s"
              }`,
              undo: () => {
                unpackItemsMutation.mutate({
                  orderId,
                  itemIds,
                  reason: "Undo pack selected action",
                });
              },
            });
          },
        }
      );
    }
  }, [
    canManagePickPack,
    packItemsMutation,
    registerAction,
    selectedItems,
    selectedOrderId,
    unpackItemsMutation,
  ]);

  const handleMarkAllPacked = useCallback(() => {
    if (!canManagePickPack) {
      return;
    }
    if (selectedOrderId) {
      const orderId = selectedOrderId;
      const itemIds = unpackedItems.map(item => item.id);
      if (itemIds.length === 0) {
        return;
      }
      markAllPackedMutation.mutate(
        { orderId },
        {
          onSuccess: () => {
            registerAction({
              description: `Packed all remaining items (${itemIds.length})`,
              undo: () => {
                unpackItemsMutation.mutate({
                  orderId,
                  itemIds,
                  reason: "Undo pack all action",
                });
              },
            });
          },
        }
      );
    }
  }, [
    canManagePickPack,
    markAllPackedMutation,
    registerAction,
    selectedOrderId,
    unpackItemsMutation,
    unpackedItems,
  ]);

  const handleMarkReady = useCallback(() => {
    if (!canManagePickPack) {
      return;
    }
    if (selectedOrderId) {
      markReadyMutation.mutate({ orderId: selectedOrderId });
    }
  }, [canManagePickPack, selectedOrderId, markReadyMutation]);

  const handleExportManifest = useCallback(() => {
    if (!orderDetails || pickPackManifestRows.length === 0) {
      toast.error("Select an order with items to export a manifest");
      return;
    }

    const safeOrderNumber = orderDetails.order.orderNumber.replace(/\s+/g, "_");
    void exportManifestCSV(pickPackManifestRows, {
      filename: `pick_pack_manifest_${safeOrderNumber}`,
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
  }, [exportManifestCSV, orderDetails, pickPackManifestRows]);

  const openItemInspector = useCallback((itemId: number) => {
    setInspectedItemId(itemId);
    setInspectorMode("item");
  }, []);

  const openOrderInspector = useCallback(() => {
    setInspectorMode("order");
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorMode(null);
    setInspectedItemId(null);
  }, []);

  // Keyboard configuration
  const keyboardConfig = useMemo(
    () => ({
      customHandlers: {
        arrowup: () => {
          if (focusZone === "list") {
            setFocusedOrderIndex(prev => Math.max(0, prev - 1));
          } else if (orderDetails) {
            setFocusedItemIndex(prev => Math.max(0, prev - 1));
          }
        },
        arrowdown: () => {
          if (focusZone === "list") {
            if (filteredPickList.length === 0) {
              return;
            }
            setFocusedOrderIndex(prev =>
              Math.min(filteredPickList.length - 1, prev + 1)
            );
          } else if (orderDetails) {
            if (orderDetails.items.length === 0) {
              return;
            }
            setFocusedItemIndex(prev =>
              Math.min(orderDetails.items.length - 1, prev + 1)
            );
          }
        },
        arrowleft: () => {
          if (focusZone === "items") {
            setFocusZone("list");
          }
        },
        arrowright: () => {
          if (focusZone === "list" && selectedOrderId) {
            setFocusZone("items");
          }
        },
        enter: () => {
          if (focusZone === "list" && filteredPickList[focusedOrderIndex]) {
            handleSelectOrder(filteredPickList[focusedOrderIndex].orderId);
          } else if (
            focusZone === "items" &&
            orderDetails?.items[focusedItemIndex]
          ) {
            const item = orderDetails.items[focusedItemIndex];
            if (!item.isPacked) {
              toggleItemSelection(item.id);
            }
          }
        },
        tab: () => {
          if (focusZone === "list") {
            setFocusZone("items");
          } else {
            setFocusZone("list");
          }
        },
        "cmd+k": (e: React.KeyboardEvent) => {
          e.preventDefault();
          searchInputRef.current?.focus();
        },
        "ctrl+k": (e: React.KeyboardEvent) => {
          e.preventDefault();
          searchInputRef.current?.focus();
        },
        " ": () => {
          if (focusZone === "items" && orderDetails?.items[focusedItemIndex]) {
            const item = orderDetails.items[focusedItemIndex];
            if (!item.isPacked) {
              toggleItemSelection(item.id);
            }
          }
        },
        p: () => handlePackSelected(),
        a: () => selectAllUnpacked(),
        r: () => handleMarkReady(),
        // Status changing shortcuts are disabled for read-only users.
        i: () => {
          if (focusZone === "items" && orderDetails?.items[focusedItemIndex]) {
            openItemInspector(orderDetails.items[focusedItemIndex].id);
          } else if (selectedOrderId) {
            openOrderInspector();
          }
        },
      },
      onCancel: () => {
        if (inspectorMode) {
          closeInspector();
        } else if (focusZone === "items") {
          setFocusZone("list");
          itemSelection.clear();
        } else {
          setSelectedOrderId(null);
        }
      },
      onUndo: () => {
        void undoLast();
      },
      containerRef,
    }),
    [
      focusZone,
      focusedOrderIndex,
      focusedItemIndex,
      filteredPickList,
      orderDetails,
      selectedOrderId,
      inspectorMode,
      itemSelection,
      handleSelectOrder,
      toggleItemSelection,
      closeInspector,
      handlePackSelected,
      selectAllUnpacked,
      handleMarkReady,
      openItemInspector,
      openOrderInspector,
      undoLast,
      containerRef,
    ]
  );

  const { keyboardProps } = useWorkSurfaceKeyboard(keyboardConfig);

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key !== "k" || (!event.metaKey && !event.ctrlKey)) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        const isTextInput =
          target.isContentEditable ||
          tag === "input" ||
          tag === "textarea" ||
          target.getAttribute("role") === "textbox";
        if (isTextInput) return;
      }

      event.preventDefault();
      event.stopPropagation();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleGlobalSearchShortcut, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalSearchShortcut, true);
    };
  }, []);

  // Get inspected item
  const inspectedItem = useMemo(() => {
    if (inspectorMode === "item" && inspectedItemId && orderDetails) {
      return orderDetails.items.find(item => item.id === inspectedItemId);
    }
    return null;
  }, [inspectorMode, inspectedItemId, orderDetails]);

  // Status counts
  const statusCounts = useMemo(
    () => ({
      pending: stats?.pending || 0,
      picking: stats?.picking || 0,
      packed: stats?.packed || 0,
      ready: stats?.ready || 0,
    }),
    [stats]
  );

  return (
    <div
      {...keyboardProps}
      ref={containerRef}
      className="flex flex-col lg:flex-row h-full bg-gray-50"
    >
      {/* Left Panel: Pick List */}
      <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-white flex flex-col min-w-0 lg:min-w-[320px]">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-bold text-gray-900 flex items-center gap-2"
              data-testid="pick-pack-header"
            >
              <Package className="w-6 h-6 text-blue-600" />
              Pick & Pack
            </h2>
            <div className="flex items-center gap-2">
              {SaveStateIndicator}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetchPickList();
                  void refetchStats();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Queue
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">
                {statusCounts.pending}
              </div>
              <div className="text-xs text-yellow-700">Pending</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {statusCounts.picking}
              </div>
              <div className="text-xs text-blue-700">Picking</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {statusCounts.packed}
              </div>
              <div className="text-xs text-green-700">Packed</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {statusCounts.ready}
              </div>
              <div className="text-xs text-purple-700">Ready</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                data-testid="pick-pack-search-input"
                placeholder="Search orders... (Cmd+K)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={v => setStatusFilter(v as PickPackStatus | "ALL")}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PICKING">Picking</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortKey}
              onValueChange={v => setSortKey(v as PickPackSortKey)}
            >
              <SelectTrigger className="w-full sm:w-[170px]">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {PICK_PACK_SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Order List */}
        <div
          className="flex-1 overflow-y-auto max-h-[45vh] lg:max-h-none"
          role="listbox"
          data-testid="order-queue"
        >
          {pickListLoading ? (
            <div
              className="flex items-center justify-center h-32"
              data-testid="order-queue-loading"
            >
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : filteredPickList.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-32 text-gray-500"
              data-testid="order-queue-empty"
            >
              <Package className="w-8 h-8 mb-2" />
              <p>No orders to pick</p>
            </div>
          ) : (
            filteredPickList.map((order, index) => (
              <OrderListRow
                key={order.orderId}
                order={order}
                isSelected={selectedOrderId === order.orderId}
                isFocused={focusZone === "list" && focusedOrderIndex === index}
                onClick={() => handleSelectOrder(order.orderId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Order Details */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedOrderId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Box className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              Select an order to start packing
            </p>
            <p className="text-sm">
              Use arrow keys to navigate, Enter to select
            </p>
          </div>
        ) : orderDetailsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : orderDetails ? (
          <>
            {/* Order Header */}
            <div className="p-4 border-b bg-white" data-testid="order-details">
              <div
                className="flex items-center justify-between mb-2"
                data-testid="pick-pack-order-summary"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Order {orderDetails.order.orderNumber}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {orderDetails.order.clientName}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openOrderInspector}
                  >
                    View Details
                  </Button>
                </div>
                <StatusBadge status={orderDetails.order.pickPackStatus} />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  Total: ${parseFloat(orderDetails.order.total).toFixed(2)}
                </span>
                <span>
                  {orderDetails.summary.packedItems}/
                  {orderDetails.summary.totalItems} items packed
                </span>
                <span>{orderDetails.summary.bagCount} bags</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllUnpacked}
                disabled={unpackedItems.length === 0 || !canManagePickPack}
                title={
                  canManagePickPack
                    ? undefined
                    : "Pick & Pack manage permissions required"
                }
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All (A)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportManifest}
                disabled={
                  manifestExportState.isExporting ||
                  pickPackManifestRows.length === 0
                }
                title={
                  pickPackManifestRows.length === 0
                    ? "Select an order with items to export"
                    : "Export pick-pack manifest to CSV"
                }
              >
                <Download className="w-4 h-4 mr-2" />
                {manifestExportState.isExporting
                  ? "Exporting..."
                  : "Export Manifest"}
              </Button>
              <Button
                size="sm"
                onClick={handlePackSelected}
                disabled={
                  selectedItems.length === 0 ||
                  packItemsMutation.isPending ||
                  !canManagePickPack
                }
                title={
                  canManagePickPack
                    ? undefined
                    : "Pick & Pack manage permissions required"
                }
              >
                {packItemsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Pack Selected (P) ({selectedItems.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPacked}
                disabled={
                  unpackedItems.length === 0 ||
                  markAllPackedMutation.isPending ||
                  !canManagePickPack
                }
                title={
                  canManagePickPack
                    ? undefined
                    : "Pick & Pack manage permissions required"
                }
              >
                Pack All to One Bag
              </Button>
              <div className="flex-1" />
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkReady}
                disabled={
                  orderDetails.summary.packedItems <
                    orderDetails.summary.totalItems ||
                  markReadyMutation.isPending ||
                  !canManagePickPack
                }
                className="bg-green-600 hover:bg-green-700"
                title={
                  canManagePickPack
                    ? undefined
                    : "Pick & Pack manage permissions required"
                }
              >
                {markReadyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4 mr-2" />
                )}
                {readyCtaLabel}
              </Button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Order Items ({orderDetails.items.length})
              </h3>
              <div
                className="space-y-2"
                role="listbox"
                data-testid="pick-pack-items-list"
              >
                {orderDetails.items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    isFocused={
                      focusZone === "items" && focusedItemIndex === index
                    }
                    onToggle={() => toggleItemSelection(item.id)}
                    onInspect={() => openItemInspector(item.id)}
                  />
                ))}
              </div>

              {/* Bags Section */}
              {orderDetails.bags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Bags ({orderDetails.bags.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {orderDetails.bags.map(bag => (
                      <Card key={bag.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Box className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {bag.identifier}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {bag.itemCount} items
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <WorkSurfaceStatusBar
              left={`Zone: ${focusZone === "list" ? "Order List" : "Items"}`}
              center={`${selectedItems.length} items selected`}
              right={
                <KeyboardHintBar
                  hints={[
                    { key: "↑↓", label: "Navigate" },
                    { key: "Space", label: "Select" },
                    { key: "P", label: "Pack" },
                    { key: "R", label: "Ready" },
                    { key: "I", label: "Inspect" },
                  ]}
                />
              }
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <AlertCircle className="w-16 h-16 mb-4 text-red-300" />
            <p className="text-lg">Order not found</p>
          </div>
        )}
      </div>

      {/* Inspector Panel */}
      {inspectorMode === "item" && inspectedItem && (
        <ItemInspector item={inspectedItem} onClose={closeInspector} />
      )}
      {inspectorMode === "order" && orderDetails && (
        <OrderInspector
          order={orderDetails.order}
          summary={orderDetails.summary}
          bags={orderDetails.bags}
          onClose={closeInspector}
        />
      )}

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default PickPackWorkSurface;
