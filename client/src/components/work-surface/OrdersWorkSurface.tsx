/**
 * OrdersWorkSurface - Work Surface implementation for Orders
 * UXS-301: Aligns Orders page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract with arrow navigation
 * - Save state indicator
 * - Inspector panel for order details
 * - Draft/Confirmed tabs with status filtering
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  OrderCOGSDetails,
  type OrderCOGSLineItem,
} from "@/components/orders/OrderCOGSDetails";
import { GLEntriesViewer } from "@/components/accounting/GLEntriesViewer";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  ShoppingCart,
  ChevronRight,
  Loader2,
  RefreshCw,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileText,
  Edit,
  Trash2,
  Send,
  Download,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Order {
  id: number;
  orderNumber: string;
  clientId: number;
  isDraft: boolean;
  orderType?: string;
  fulfillmentStatus?: string;
  saleStatus?: string;
  total: string;
  createdAt?: string;
  confirmedAt?: string;
  version?: number;
  lineItems?: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}

interface ClientSummary {
  id: number;
  name?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// WSQA-003: Added RETURNED, RESTOCKED, RETURNED_TO_VENDOR statuses
const FULFILLMENT_STATUSES = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PACKED", label: "Packed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "RESTOCKED", label: "Restocked" },
  { value: "RETURNED_TO_VENDOR", label: "Returned to Vendor" },
  { value: "CANCELLED", label: "Cancelled" },
];

// WSQA-003: Added return status icons
const STATUS_ICONS: Record<string, ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  PROCESSING: <Package className="h-4 w-4" />,
  PACKED: <CheckCircle2 className="h-4 w-4" />,
  SHIPPED: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle2 className="h-4 w-4" />,
  RETURNED: <RefreshCw className="h-4 w-4" />,
  RESTOCKED: <Package className="h-4 w-4" />,
  RETURNED_TO_VENDOR: <Truck className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};

// WSQA-003: Added return status colors
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PACKED: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-orange-100 text-orange-800",
  RESTOCKED: "bg-emerald-100 text-emerald-800",
  RETURNED_TO_VENDOR: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-800",
};

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "-";
  }
};

const extractItems = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function OrderStatusBadge({
  status,
  isDraft,
}: {
  status?: string;
  isDraft?: boolean;
}) {
  const displayStatus = isDraft ? "DRAFT" : status || "PENDING";
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", STATUS_COLORS[displayStatus])}
    >
      {STATUS_ICONS[displayStatus]}
      {displayStatus}
    </Badge>
  );
}

// ============================================================================
// ORDER INSPECTOR
// ============================================================================

// WSQA-003: Added return processing handlers
interface OrderInspectorProps {
  order: Order | null;
  clientName: string;
  cogsLineItems: OrderCOGSLineItem[];
  onEdit: (orderId: number) => void;
  onConfirm: (orderId: number) => void;
  onDelete: (orderId: number) => void;
  onShip: (orderId: number) => void;
  onMarkReturned?: (orderId: number) => void;
  onProcessRestock?: (orderId: number) => void;
  onReturnToVendor?: (orderId: number) => void;
}

function OrderInspectorContent({
  order,
  clientName,
  cogsLineItems,
  onEdit,
  onConfirm,
  onDelete,
  onShip,
  onMarkReturned,
  onProcessRestock,
  onReturnToVendor,
}: OrderInspectorProps) {
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
        <p>Select an order to view details</p>
      </div>
    );
  }

  const lineItems = order.lineItems || [];
  const lineTotal = lineItems.reduce(
    (sum, item) => sum + parseFloat(item.totalPrice || "0"),
    0
  );

  return (
    <div className="space-y-6">
      <InspectorSection title="Order Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Order #">
            <p className="font-semibold text-lg">{order.orderNumber}</p>
          </InspectorField>
          <InspectorField label="Status">
            <OrderStatusBadge
              status={order.fulfillmentStatus}
              isDraft={order.isDraft}
            />
          </InspectorField>
        </div>

        <InspectorField label="Client">
          <p className="font-medium">{clientName}</p>
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Created">
            <p>{formatDate(order.createdAt)}</p>
          </InspectorField>
          {order.confirmedAt && (
            <InspectorField label="Confirmed">
              <p>{formatDate(order.confirmedAt)}</p>
            </InspectorField>
          )}
        </div>

        {order.orderType && (
          <InspectorField label="Order Type">
            <Badge variant="outline">{order.orderType}</Badge>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title={`Line Items (${lineItems.length})`} defaultOpen>
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items</p>
        ) : (
          <div className="space-y-2">
            {lineItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} @ {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(item.totalPrice)}
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(order.total || lineTotal)}
              </span>
            </div>
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="COGS Details" defaultOpen>
        <OrderCOGSDetails lineItems={cogsLineItems} />
      </InspectorSection>

      <InspectorSection title="GL Entries" defaultOpen>
        <GLEntriesViewer
          referenceType="ORDER"
          referenceId={order.id}
          showTitle={false}
          compact
          maxEntries={20}
        />
      </InspectorSection>

      <InspectorSection title="Quick Actions">
        <div className="space-y-2">
          {order.isDraft ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onEdit(order.id)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Draft
              </Button>
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => onConfirm(order.id)}
              >
                <Send className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => onDelete(order.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Draft
              </Button>
            </>
          ) : (
            <>
              {/* WSQA-003: Status-based actions */}
              {order.fulfillmentStatus === "PENDING" && (
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => onShip(order.id)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Ship Order
                </Button>
              )}
              {/* WSQA-003: Mark as Returned for SHIPPED or DELIVERED orders */}
              {(order.fulfillmentStatus === "SHIPPED" ||
                order.fulfillmentStatus === "DELIVERED") &&
                onMarkReturned && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 hover:text-orange-700"
                    onClick={() => onMarkReturned(order.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Mark as Returned
                  </Button>
                )}
              {/* WSQA-003: Processing paths for RETURNED orders */}
              {order.fulfillmentStatus === "RETURNED" && (
                <>
                  {onProcessRestock && (
                    <Button
                      variant="default"
                      className="w-full justify-start"
                      onClick={() => onProcessRestock(order.id)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Restock Inventory
                    </Button>
                  )}
                  {onReturnToVendor && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onReturnToVendor(order.id)}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Return to Vendor
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            </>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrdersWorkSurface() {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<"draft" | "confirmed">(
    "confirmed"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // WSQA-003: Return processing dialogs
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showVendorReturnDialog, setShowVendorReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<Order>({
    entityType: "Order",
    onRefresh: async () => {
      await refetchDrafts();
      await refetchConfirmed();
    },
  });

  // Data queries
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = useMemo(
    () => extractItems<ClientSummary>(clientsData),
    [clientsData]
  );

  const {
    data: draftOrdersData,
    isLoading: loadingDrafts,
    refetch: refetchDrafts,
  } = trpc.orders.getAll.useQuery({ isDraft: true });
  const draftOrders = useMemo(
    () => extractItems<Order>(draftOrdersData),
    [draftOrdersData]
  );

  const {
    data: confirmedOrdersData,
    isLoading: loadingConfirmed,
    refetch: refetchConfirmed,
  } = trpc.orders.getAll.useQuery({
    isDraft: false,
    fulfillmentStatus: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const confirmedOrders = useMemo(
    () => extractItems<Order>(confirmedOrdersData),
    [confirmedOrdersData]
  );

  // Helpers
  const getClientName = useCallback(
    (clientId: number) => {
      const client = clients.find(c => c.id === clientId);
      return client?.name || "Unknown";
    },
    [clients]
  );

  // Filtered orders
  const displayOrders = useMemo(() => {
    const orders = activeTab === "draft" ? draftOrders : confirmedOrders;
    if (!search) return orders;
    const searchLower = search.toLowerCase();
    return orders.filter((order: Order) => {
      const orderNumber = order.orderNumber || "";
      const clientName = getClientName(order.clientId);
      return (
        orderNumber.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower)
      );
    });
  }, [activeTab, draftOrders, confirmedOrders, search, getClientName]);

  // Selected order
  const selectedOrder = useMemo(
    () =>
      (displayOrders as Order[]).find(o => o.id === selectedOrderId) || null,
    [displayOrders, selectedOrderId]
  );

  const { data: orderDetails } = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );

  const { data: vendorReturnOptions } =
    trpc.orders.getVendorReturnOptions.useQuery(
      { orderId: selectedOrderId ?? 0 },
      { enabled: selectedOrderId !== null && showVendorReturnDialog }
    );

  const cogsLineItems = useMemo<OrderCOGSLineItem[]>(() => {
    const items = orderDetails?.lineItems ?? [];
    return items
      .map(item => ({
        id: item.id,
        productDisplayName: item.productDisplayName ?? null,
        quantity: item.quantity,
        cogsPerUnit: item.cogsPerUnit,
        marginPercent: item.marginPercent,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        isSample:
          typeof item.isSample === "boolean"
            ? item.isSample
            : item.isSample === 1,
      }))
      .filter(
        (item): item is OrderCOGSLineItem =>
          typeof item.id === "number" &&
          typeof item.quantity === "string" &&
          typeof item.cogsPerUnit === "string" &&
          typeof item.marginPercent === "string" &&
          typeof item.unitPrice === "string" &&
          typeof item.lineTotal === "string"
      );
  }, [orderDetails?.lineItems]);

  // Statistics
  const stats = useMemo(
    () => ({
      drafts: draftOrders.length,
      pending: confirmedOrders.filter(
        (o: Order) => o.fulfillmentStatus === "PENDING"
      ).length,
      shipped: confirmedOrders.filter(
        (o: Order) => o.fulfillmentStatus === "SHIPPED"
      ).length,
      total: confirmedOrders.length,
    }),
    [draftOrders, confirmedOrders]
  );

  // Mutations
  const confirmOrderMutation = trpc.orders.confirmDraftOrder.useMutation({
    onMutate: () => setSaving("Confirming order..."),
    onSuccess: () => {
      toast.success("Order confirmed");
      setSaved();
      refetchDrafts();
      refetchConfirmed();
      setShowConfirmDialog(false);
      inspector.close();
    },
    onError: err => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to confirm order");
        setError(err.message);
      }
    },
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onMutate: () => setSaving("Deleting draft..."),
    onSuccess: () => {
      toast.success("Draft deleted");
      setSaved();
      refetchDrafts();
      setShowDeleteDialog(false);
      setSelectedOrderId(null);
      inspector.close();
    },
    onError: err => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to delete draft");
        setError(err.message);
      }
    },
  });

  // WSQA-003: Return processing mutations
  const markAsReturnedMutation = trpc.orders.markAsReturned.useMutation({
    onMutate: () => setSaving("Marking as returned..."),
    onSuccess: () => {
      toast.success("Order marked as returned");
      setSaved();
      refetchConfirmed();
      setShowReturnDialog(false);
      setReturnReason("");
    },
    onError: err => {
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to mark order as returned");
        setError(err.message);
      }
    },
  });

  const processRestockMutation = trpc.orders.processRestock.useMutation({
    onMutate: () => setSaving("Restocking inventory..."),
    onSuccess: () => {
      toast.success("Inventory restocked successfully");
      setSaved();
      refetchConfirmed();
      setShowRestockDialog(false);
    },
    onError: err => {
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to restock inventory");
        setError(err.message);
      }
    },
  });

  const processVendorReturnMutation =
    trpc.orders.processVendorReturn.useMutation({
      onMutate: () => setSaving("Processing vendor return..."),
      onSuccess: () => {
        toast.success("Vendor return processed successfully");
        setSaved();
        refetchConfirmed();
        setShowVendorReturnDialog(false);
        setReturnReason("");
        setSelectedVendorId("");
      },
      onError: err => {
        if (!handleConflictError(err)) {
          toast.error(err.message || "Failed to process vendor return");
          setError(err.message);
        }
      },
    });

  // Track version for optimistic locking when order is selected (UXS-705)
  useEffect(() => {
    if (selectedOrder && selectedOrder.version !== undefined) {
      trackVersion(selectedOrder);
    }
  }, [selectedOrder, trackVersion]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "cmd+n": e => {
        e.preventDefault();
        setLocation("/orders/create");
      },
      "ctrl+n": e => {
        e.preventDefault();
        setLocation("/orders/create");
      },
      arrowdown: e => {
        e.preventDefault();
        const newIndex = Math.min(displayOrders.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const order = displayOrders[newIndex];
        if (order) setSelectedOrderId(order.id);
      },
      arrowup: e => {
        e.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const order = displayOrders[newIndex];
        if (order) setSelectedOrderId(order.id);
      },
      enter: e => {
        if (selectedOrder) {
          e.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (showConfirmDialog) setShowConfirmDialog(false);
      else if (showDeleteDialog) setShowDeleteDialog(false);
      else if (showReturnDialog) {
        setShowReturnDialog(false);
        setReturnReason("");
      } else if (showRestockDialog) setShowRestockDialog(false);
      else if (showVendorReturnDialog) {
        setShowVendorReturnDialog(false);
        setReturnReason("");
      } else if (inspector.isOpen) inspector.close();
    },
  });

  // Handlers
  const handleEdit = (orderId: number) =>
    setLocation(`/orders/create?draftId=${orderId}`);
  const handleConfirm = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowConfirmDialog(true);
  };
  const handleDelete = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDeleteDialog(true);
  };
  const handleShip = (orderId: number) =>
    toast.info(`Ship order ${orderId} - modal to be implemented`);
  // WSQA-003: Return processing handlers
  const handleMarkReturned = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowReturnDialog(true);
  };
  const handleProcessRestock = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowRestockDialog(true);
  };
  const handleReturnToVendor = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowVendorReturnDialog(true);
  };

  const isLoading = activeTab === "draft" ? loadingDrafts : loadingConfirmed;

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-6 w-6" />
            Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage sales orders and drafts
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Drafts:{" "}
              <span className="font-semibold text-foreground">
                {stats.drafts}
              </span>
            </span>
            <span>
              Pending:{" "}
              <span className="font-semibold text-foreground">
                {stats.pending}
              </span>
            </span>
            <span>
              Shipped:{" "}
              <span className="font-semibold text-foreground">
                {stats.shipped}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as "draft" | "confirmed")}
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="draft">
                Drafts ({draftOrders.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({confirmedOrders.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-4 items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  data-testid="orders-search-input"
                  placeholder="Search orders... (Cmd+K)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeTab === "confirmed" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={() => setLocation("/orders/create")}
                data-testid="new-order-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayOrders.length === 0 ? (
            <div
              className="flex items-center justify-center h-64"
              data-testid="orders-empty-state"
            >
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No orders found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try adjusting your search"
                    : "Create your first order"}
                </p>
              </div>
            </div>
          ) : (
            <Table data-testid="orders-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayOrders.map((order: Order, index: number) => (
                  <TableRow
                    key={order.id}
                    data-testid={`order-row-${order.id}`}
                    data-orderid={order.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedOrderId === order.id && "bg-muted",
                      selectedIndex === index &&
                        "ring-1 ring-inset ring-primary"
                    )}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSelectedIndex(index);
                      inspector.open();
                    }}
                  >
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{getClientName(order.clientId)}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge
                        status={order.fulfillmentStatus}
                        isDraft={order.isDraft}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedOrder?.orderNumber || "Order Details"}
          subtitle={
            selectedOrder ? getClientName(selectedOrder.clientId) : undefined
          }
        >
          <OrderInspectorContent
            order={selectedOrder}
            clientName={
              selectedOrder ? getClientName(selectedOrder.clientId) : ""
            }
            cogsLineItems={cogsLineItems}
            onEdit={handleEdit}
            onConfirm={handleConfirm}
            onDelete={handleDelete}
            onShip={handleShip}
            onMarkReturned={handleMarkReturned}
            onProcessRestock={handleProcessRestock}
            onReturnToVendor={handleReturnToVendor}
          />
        </InspectorPanel>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to confirm this order? It will be sent to
            fulfillment.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOrderId &&
                confirmOrderMutation.mutate({
                  orderId: selectedOrderId,
                  paymentTerms: "NET_30", // Default payment terms
                })
              }
              disabled={confirmOrderMutation.isPending}
            >
              {confirmOrderMutation.isPending
                ? "Confirming..."
                : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this draft? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedOrderId &&
                deleteOrderMutation.mutate({ id: selectedOrderId })
              }
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WSQA-003: Mark as Returned Dialog */}
      <Dialog
        open={showReturnDialog}
        onOpenChange={open => {
          setShowReturnDialog(open);
          if (!open) setReturnReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Returned</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide a reason for the return:</p>
            <Input
              placeholder="Return reason..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReturnDialog(false);
                setReturnReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOrderId &&
                markAsReturnedMutation.mutate({
                  orderId: selectedOrderId,
                  returnReason,
                })
              }
              disabled={
                markAsReturnedMutation.isPending || !returnReason.trim()
              }
            >
              {markAsReturnedMutation.isPending
                ? "Processing..."
                : "Mark as Returned"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WSQA-003: Restock Confirmation Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Inventory</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to restock the returned items? This will add
            the items back to inventory.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestockDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedOrderId &&
                processRestockMutation.mutate({ orderId: selectedOrderId })
              }
              disabled={processRestockMutation.isPending}
            >
              {processRestockMutation.isPending
                ? "Restocking..."
                : "Restock Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WSQA-003: Vendor Return Dialog */}
      <Dialog
        open={showVendorReturnDialog}
        onOpenChange={open => {
          setShowVendorReturnDialog(open);
          if (!open) setReturnReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2">Select vendor:</p>
              <Select
                value={selectedVendorId}
                onValueChange={value => setSelectedVendorId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {(vendorReturnOptions?.items ?? []).map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p>Please provide a reason for returning to the vendor:</p>
            <Input
              placeholder="Vendor return reason..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVendorReturnDialog(false);
                setReturnReason("");
                setSelectedVendorId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const vendorId = Number.parseInt(selectedVendorId, 10);
                if (
                  selectedOrderId &&
                  selectedOrder &&
                  Number.isFinite(vendorId)
                ) {
                  processVendorReturnMutation.mutate({
                    orderId: selectedOrderId,
                    vendorId,
                    returnReason,
                  });
                }
              }}
              disabled={
                processVendorReturnMutation.isPending ||
                !returnReason.trim() ||
                !selectedVendorId
              }
            >
              {processVendorReturnMutation.isPending
                ? "Processing..."
                : "Return to Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default OrdersWorkSurface;
