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
import { useLocation, useSearch as useRouteSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import {
  getFulfillmentDisplayLabel,
  mapToFulfillmentDisplayStatus,
  type FulfillmentDisplayStatus,
} from "@/lib/fulfillmentDisplay";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import {
  isShippingEnabledMode,
  resolveSalesBusinessMode,
} from "@/lib/salesMode";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MonoId } from "@/components/ui/mono-id";
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
import { EmptyState } from "@/components/ui/empty-state";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  OrderCOGSDetails,
  type OrderCOGSLineItem,
} from "@/components/orders/OrderCOGSDetails";
import { OrderStatusActions } from "@/components/orders";
import { ProcessReturnModal } from "@/components/orders/ProcessReturnModal";
import { GLEntriesViewer } from "@/components/accounting/GLEntriesViewer";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";
import {
  BulkActionsBar,
  useTableSelection,
  SelectAllCheckbox,
  SelectRowCheckbox,
  type StatusOption,
} from "@/components/ui/bulk-actions";

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
  ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

// ============================================================================
// TYPES
// ============================================================================

interface Order {
  id: number;
  orderNumber: string;
  clientId: number;
  isDraft: boolean;
  orderType?: string;
  fulfillmentStatus?:
    | "READY_FOR_PACKING"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED"
    | "RETURNED"
    | "RESTOCKED"
    | "RETURNED_TO_VENDOR"
    | "CANCELLED"
    | "DRAFT"
    | "CONFIRMED"
    | null;
  saleStatus?: string;
  invoiceId?: number | null;
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

export function canDownloadInvoice(
  invoiceId: number | null,
  canAccessAccounting: boolean
): boolean {
  return Boolean(canAccessAccounting && invoiceId);
}

export function canGenerateInvoice(
  order: {
    orderType?: string | null;
    invoiceId?: number | null;
    fulfillmentStatus?: string | null;
  } | null,
  canCreateAccounting: boolean
): boolean {
  return Boolean(
    canCreateAccounting &&
    order?.orderType === "SALE" &&
    !order.invoiceId &&
    order.fulfillmentStatus &&
    ["READY_FOR_PACKING", "PACKED", "SHIPPED"].includes(order.fulfillmentStatus)
  );
}

export function getMakePaymentRoute(
  order: { id: number; invoiceId: number | null } | null
): string | null {
  if (!order?.invoiceId) {
    return null;
  }

  const params = new URLSearchParams({
    tab: "invoices",
    invoiceId: String(order.invoiceId),
    orderId: String(order.id),
    from: "sales",
  });

  return `/accounting?${params.toString()}`;
}

export function resolveOrderInvoiceId(
  directInvoiceId: number | null | undefined,
  linkedInvoiceId: number | null | undefined
): number | null {
  if (
    typeof directInvoiceId === "number" &&
    Number.isInteger(directInvoiceId) &&
    directInvoiceId > 0
  ) {
    return directInvoiceId;
  }

  if (
    typeof linkedInvoiceId === "number" &&
    Number.isInteger(linkedInvoiceId) &&
    linkedInvoiceId > 0
  ) {
    return linkedInvoiceId;
  }

  return null;
}

export function canViewOrderCogsDetails(settings?: {
  display?: { canViewCogsData?: boolean };
}): boolean {
  return Boolean(settings?.display?.canViewCogsData);
}

interface ClientSummary {
  id: number;
  name?: string | null;
}

interface OrderReturnEntry {
  id: number;
  returnReason: string;
  notes?: string | null;
  processedByName?: string | null;
  processedAt?: string | null;
}

type FulfillmentStatusValue = Exclude<
  Order["fulfillmentStatus"],
  null | undefined
>;

type OrderWorkspaceTab = "draft" | "confirmed";

// ============================================================================
// CONSTANTS
// ============================================================================

// WSQA-003: Added RETURNED, RESTOCKED, RETURNED_TO_VENDOR statuses
const FULFILLMENT_STATUSES = [
  { value: "ALL", label: "All" },
  { value: "READY_FOR_PACKING", label: "Pending" },
  { value: "PACKED", label: "Ready" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "RESTOCKED", label: "Restocked" },
  { value: "RETURNED_TO_VENDOR", label: "Returned to Supplier" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ORDERS_VIEW_STATE_KEY = "terp-sales-orders-view-v2";

type OrdersSortKey =
  | "newest"
  | "oldest"
  | "client_asc"
  | "client_desc"
  | "total_desc"
  | "total_asc";

const ORDER_SORT_OPTIONS: Array<{ value: OrdersSortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "client_asc", label: "Client A-Z" },
  { value: "client_desc", label: "Client Z-A" },
  { value: "total_desc", label: "Total high-low" },
  { value: "total_asc", label: "Total low-high" },
];

// WSQA-003: Added return status icons
const STATUS_ICONS: Record<FulfillmentDisplayStatus, ReactNode> = {
  DRAFT: <FileText className="h-4 w-4" />,
  CONFIRMED: <CheckCircle2 className="h-4 w-4" />,
  PENDING: <Clock className="h-4 w-4" />,
  READY: <CheckCircle2 className="h-4 w-4" />,
  SHIPPED: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle2 className="h-4 w-4" />,
  RETURNED: <RefreshCw className="h-4 w-4" />,
  RESTOCKED: <Package className="h-4 w-4" />,
  RETURNED_TO_VENDOR: <Truck className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
};

// WSQA-003: Added return status colors — updated 420-fork Wave 1 to semantic tokens
const STATUS_COLORS: Record<FulfillmentDisplayStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-sky-50 text-sky-700 border-sky-200",
  SHIPPED: "bg-sky-50 text-sky-700 border-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETURNED: "bg-neutral-100 text-neutral-500 border-neutral-200",
  RESTOCKED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETURNED_TO_VENDOR: "bg-neutral-100 text-neutral-500 border-neutral-200",
  CANCELLED: "bg-neutral-100 text-neutral-500 border-neutral-200",
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

export const buildConfirmedQueryInput = (
  fulfillmentStatus?: string
): {
  orderType: "SALE";
  isDraft: boolean;
  fulfillmentStatus?: string;
} =>
  fulfillmentStatus && fulfillmentStatus !== "ALL"
    ? { orderType: "SALE", isDraft: false, fulfillmentStatus }
    : { orderType: "SALE", isDraft: false };

export const buildDraftQueryInput = (): {
  orderType: "SALE";
  isDraft: boolean;
} => ({
  orderType: "SALE",
  isDraft: true,
});

const normalizeStatus = (status?: string | null): string =>
  String(status ?? "").toUpperCase();

const normalizeFulfillmentStatus = (status?: string | null): string => {
  const normalized = normalizeStatus(status);
  return normalized === "PENDING" ? "READY_FOR_PACKING" : normalized;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const formatPaymentStatus = (status?: string | null): string => {
  const normalized = normalizeStatus(status);
  return normalized ? (PAYMENT_STATUS_LABELS[normalized] ?? normalized) : "-";
};

export const getDisplayOrderNumber = (
  order: Pick<Order, "orderNumber" | "isDraft" | "orderType">
): string => {
  const raw = order.orderNumber?.trim();
  if (!raw) {
    return "";
  }

  const [prefix, ...suffixParts] = raw.split("-");
  const suffix = suffixParts.join("-");
  if (!suffix) {
    return raw;
  }

  const normalizedPrefix = prefix.toUpperCase();

  if (order.isDraft) {
    return order.orderType === "QUOTE"
      ? normalizedPrefix === "Q"
        ? raw
        : `Q-${suffix}`
      : normalizedPrefix === "D"
        ? raw
        : `D-${suffix}`;
  }

  if (order.orderType === "SALE" && ["D", "O"].includes(normalizedPrefix)) {
    return `S-${suffix}`;
  }

  return raw;
};

export function getStatusFilterExitMessage(params: {
  orderNumber: string;
  fromFilter: string;
  toStatus: string;
}): string | null {
  const normalizedFilter = normalizeStatus(params.fromFilter);
  const normalizedTarget = normalizeStatus(params.toStatus);
  if (normalizedFilter === "ALL" || normalizedFilter === normalizedTarget) {
    return null;
  }

  return `${params.orderNumber} moved to ${getFulfillmentDisplayLabel(
    normalizedTarget
  )} and is now hidden by the ${getFulfillmentDisplayLabel(
    normalizedFilter
  ).toLowerCase()} filter. Switch to All to keep tracking it.`;
}

export function parseDeepLinkedOrderId(search: string): number | null {
  const params = new URLSearchParams(search);
  const rawId = params.get("id") ?? params.get("orderId");
  if (!rawId) {
    return null;
  }

  const parsedId = Number(rawId);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

export function resolveDeepLinkedOrderSelection(params: {
  orderId: number | null;
  draftOrders: Array<Pick<Order, "id">>;
  confirmedOrders: Array<Pick<Order, "id">>;
}): { activeTab: OrderWorkspaceTab; selectedOrderId: number } | null {
  if (params.orderId === null) {
    return null;
  }

  if (params.confirmedOrders.some(order => order.id === params.orderId)) {
    return {
      activeTab: "confirmed",
      selectedOrderId: params.orderId,
    };
  }

  if (params.draftOrders.some(order => order.id === params.orderId)) {
    return {
      activeTab: "draft",
      selectedOrderId: params.orderId,
    };
  }

  return null;
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function OrderStatusBadge({
  status,
  isDraft,
}: {
  status?: string | null;
  isDraft?: boolean;
}) {
  const displayStatus = (
    isDraft
      ? "DRAFT"
      : mapToFulfillmentDisplayStatus(normalizeFulfillmentStatus(status)) ||
        "PENDING"
  ) as FulfillmentDisplayStatus;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", STATUS_COLORS[displayStatus])}
    >
      {STATUS_ICONS[displayStatus]}
      {getFulfillmentDisplayLabel(displayStatus)}
    </Badge>
  );
}

// ============================================================================
// ORDER INSPECTOR
// ============================================================================

// WSQA-003: Added return processing handlers
interface OrderInspectorProps {
  order: Order | null;
  resolvedInvoiceId: number | null;
  clientName: string;
  cogsLineItems: OrderCOGSLineItem[];
  canViewCogsDetails: boolean;
  returnHistory: OrderReturnEntry[];
  shippingEnabled: boolean;
  canManageShipping: boolean;
  canProcessReturns: boolean;
  canAccessAccounting: boolean;
  canCreateAccounting: boolean;
  onEdit: (orderId: number) => void;
  onMakePayment: (orderId: number) => void;
  onConfirm: (orderId: number) => void;
  onConfirmFulfillment?: (orderId: number) => void;
  onDelete: (orderId: number) => void;
  onShip: (orderId: number) => void;
  onGenerateInvoice?: (orderId: number) => void;
  generatingInvoice?: boolean;
  onDownloadInvoice?: (invoiceId: number) => void;
  downloadingInvoice?: boolean;
  onProcessReturn?: (orderId: number) => void;
  onProcessRestock?: (orderId: number) => void;
  onReturnToVendor?: (orderId: number) => void;
  isStatusUpdating?: boolean;
  onStatusChange?: (
    orderId: number,
    newStatus:
      | "DRAFT"
      | "CONFIRMED"
      | "READY_FOR_PACKING"
      | "PACKED"
      | "SHIPPED"
      | "DELIVERED"
      | "RETURNED"
      | "RESTOCKED"
      | "RETURNED_TO_VENDOR"
      | "CANCELLED"
      | "PENDING"
  ) => void;
}

function OrderInspectorContent({
  order,
  resolvedInvoiceId,
  clientName,
  cogsLineItems,
  canViewCogsDetails,
  returnHistory,
  shippingEnabled,
  canManageShipping,
  canProcessReturns,
  canAccessAccounting,
  canCreateAccounting,
  onEdit,
  onMakePayment,
  onConfirm,
  onConfirmFulfillment,
  onDelete,
  onShip,
  onGenerateInvoice,
  generatingInvoice = false,
  onDownloadInvoice,
  downloadingInvoice = false,
  onProcessReturn,
  onProcessRestock,
  onReturnToVendor,
  isStatusUpdating = false,
  onStatusChange,
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
  const fulfillmentStatus = normalizeFulfillmentStatus(order.fulfillmentStatus);
  const invoiceId = resolveOrderInvoiceId(
    order.invoiceId ?? null,
    resolvedInvoiceId
  );

  return (
    <div className="space-y-6">
      <InspectorSection title="Order Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Order #">
            <p className="font-semibold text-lg">
              {getDisplayOrderNumber(order) || order.orderNumber}
            </p>
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

        {!order.isDraft && (
          <InspectorField label="Payment Status">
            <p>{formatPaymentStatus(order.saleStatus)}</p>
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

      {canViewCogsDetails ? (
        <InspectorSection title="COGS Details" defaultOpen>
          <OrderCOGSDetails lineItems={cogsLineItems} />
        </InspectorSection>
      ) : null}

      <InspectorSection title="GL Entries" defaultOpen>
        <GLEntriesViewer
          referenceType="ORDER"
          referenceId={order.id}
          showTitle={false}
          compact
          maxEntries={20}
          hidePermissionErrors
        />
      </InspectorSection>

      <InspectorSection title="Return History" defaultOpen>
        {returnHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No returns have been processed from this order yet.
          </p>
        ) : (
          <div className="space-y-3">
            {returnHistory.map(entry => (
              <div key={entry.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.returnReason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.processedAt)}
                  </p>
                </div>
                {entry.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.notes}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Processed by {entry.processedByName || "Unknown"}
                </p>
              </div>
            ))}
          </div>
        )}
      </InspectorSection>

      {!order.isDraft && canManageShipping && (
        <InspectorSection title="Status Actions" defaultOpen>
          <OrderStatusActions
            currentStatus={
              (normalizeFulfillmentStatus(order.fulfillmentStatus) ??
                "READY_FOR_PACKING") as Parameters<
                typeof OrderStatusActions
              >[0]["currentStatus"]
            }
            orderNumber={
              getDisplayOrderNumber(order) ||
              order.orderNumber ||
              `Order #${order.id}`
            }
            isUpdating={isStatusUpdating}
            onStatusChange={newStatus => onStatusChange?.(order.id, newStatus)}
            customHandlers={{
              SHIPPED: () => onShip(order.id),
              RETURNED: onProcessReturn
                ? () => onProcessReturn(order.id)
                : undefined,
              RESTOCKED: onProcessRestock
                ? () => onProcessRestock(order.id)
                : undefined,
              RETURNED_TO_VENDOR: onReturnToVendor
                ? () => onReturnToVendor(order.id)
                : undefined,
            }}
          />
        </InspectorSection>
      )}

      <InspectorSection title="Quick Actions">
        <div className="space-y-2">
          {order.isDraft ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="edit-draft-btn"
                onClick={() => onEdit(order.id)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Draft
              </Button>
              <Button
                variant="default"
                className="w-full justify-start"
                data-testid="confirm-order-btn"
                onClick={() => onConfirm(order.id)}
              >
                <Send className="h-4 w-4 mr-2" />
                Confirm Order
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700"
                data-testid="delete-draft-btn"
                onClick={() => onDelete(order.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Draft
              </Button>
            </>
          ) : (
            <>
              <div className="pb-1">
                <Badge variant="outline" className="text-xs">
                  {shippingEnabled
                    ? "Fulfillment-enabled mode"
                    : "Non-fulfillment mode"}
                </Badge>
              </div>

              {!shippingEnabled &&
                order.orderType === "SALE" &&
                canAccessAccounting &&
                getMakePaymentRoute({ id: order.id, invoiceId }) && (
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    data-testid="make-payment-btn"
                    onClick={() => onMakePayment(order.id)}
                    title="Open accounting payments context"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Make Payment
                  </Button>
                )}

              {/* WSQA-003: Status-based actions */}
              {fulfillmentStatus === "READY_FOR_PACKING" &&
                onConfirmFulfillment &&
                !order.confirmedAt &&
                canManageShipping && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="confirm-fulfillment-btn"
                    onClick={() => onConfirmFulfillment(order.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm for Fulfillment
                  </Button>
                )}
              {(fulfillmentStatus === "READY_FOR_PACKING" ||
                fulfillmentStatus === "PACKED") &&
                shippingEnabled &&
                canManageShipping && (
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    data-testid="ship-order-btn"
                    onClick={() => onShip(order.id)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Ship Order
                  </Button>
                )}
              {canGenerateInvoice(
                {
                  orderType: order.orderType,
                  invoiceId,
                  fulfillmentStatus,
                },
                canCreateAccounting
              ) &&
                onGenerateInvoice && (
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    data-testid="generate-invoice-btn"
                    onClick={() => onGenerateInvoice(order.id)}
                    disabled={generatingInvoice}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {generatingInvoice ? "Generating..." : "Generate Invoice"}
                  </Button>
                )}
              {/* WSQA-003: Mark as Returned for SHIPPED or DELIVERED orders */}
              {(order.fulfillmentStatus === "SHIPPED" ||
                order.fulfillmentStatus === "DELIVERED") &&
                onProcessReturn &&
                canProcessReturns && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 hover:text-orange-700"
                    onClick={() => onProcessReturn(order.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Process Return
                  </Button>
                )}
              {/* WSQA-003: Processing paths for RETURNED orders */}
              {order.fulfillmentStatus === "RETURNED" && canManageShipping && (
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
                      Return to Supplier
                    </Button>
                  )}
                </>
              )}
              {invoiceId !== null &&
                canDownloadInvoice(invoiceId, canAccessAccounting) &&
                onDownloadInvoice && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onDownloadInvoice(invoiceId)}
                    disabled={downloadingInvoice}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadingInvoice
                      ? "Preparing invoice..."
                      : "Download Invoice"}
                  </Button>
                )}
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

export function OrdersWorkSurface({
  onNewOrder,
}: {
  onNewOrder?: () => void;
} = {}) {
  const [location, setLocation] = useLocation();
  const routeSearch = useRouteSearch();
  const trpcUtils = trpc.useUtils();
  const { hasAnyPermission } = usePermissions();
  const { data: displaySettings } =
    trpc.organizationSettings.getDisplaySettings.useQuery();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const appliedOrderDeepLinkRef = useRef<number | null>(null);

  const salesBusinessMode = useMemo(
    () => resolveSalesBusinessMode(location),
    [location]
  );
  const shippingEnabled = isShippingEnabledMode(salesBusinessMode);
  const canManageShipping = hasAnyPermission([
    "orders:update",
    "orders:fulfill",
    "orders:manage",
  ]);
  const canProcessReturns = hasAnyPermission([
    "returns:create",
    "returns:process",
    "orders:update",
  ]);
  const canAccessAccounting = hasAnyPermission([
    "accounting:access",
    "accounting:read",
    "accounting:transactions:read",
  ]);
  const canCreateAccounting = hasAnyPermission([
    "accounting:create",
    "accounting:transactions:create",
    "accounting:manage",
  ]);
  const canViewCogsDetails = canViewOrderCogsDetails(displaySettings);

  // State — Parse localStorage once and distribute
  const savedViewState = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(ORDERS_VIEW_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        search?: string;
        statusFilter?: string;
        sortKey?: OrdersSortKey;
      };
    } catch {
      return null;
    }
  }, []);
  const [activeTab, setActiveTab] = useState<"draft" | "confirmed">(
    "confirmed"
  );
  const [search, setSearch] = useState(() => savedViewState?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(
    () => savedViewState?.statusFilter ?? "ALL"
  );
  const [sortKey, setSortKey] = useState<OrdersSortKey>(
    () => savedViewState?.sortKey ?? "newest"
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmFulfillmentDialog, setShowConfirmFulfillmentDialog] =
    useState(false);
  const [confirmFulfillmentNotes, setConfirmFulfillmentNotes] = useState("");
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");
  const [shipCarrier, setShipCarrier] = useState("");
  const [shipNotes, setShipNotes] = useState("");
  const [showProcessReturnDialog, setShowProcessReturnDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showVendorReturnDialog, setShowVendorReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        ORDERS_VIEW_STATE_KEY,
        JSON.stringify({ search, statusFilter, sortKey })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [search, statusFilter, sortKey]);

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

  const draftQueryInput = useMemo(() => buildDraftQueryInput(), []);
  const {
    data: draftOrdersData,
    isLoading: loadingDrafts,
    refetch: refetchDrafts,
  } = trpc.orders.getAll.useQuery(draftQueryInput);
  const draftOrders = useMemo(
    () => extractItems<Order>(draftOrdersData),
    [draftOrdersData]
  );

  const confirmedQueryInput = useMemo(
    () => buildConfirmedQueryInput(statusFilter),
    [statusFilter]
  );

  const {
    data: confirmedOrdersData,
    isLoading: loadingConfirmed,
    refetch: refetchConfirmed,
  } = trpc.orders.getAll.useQuery(confirmedQueryInput);
  const confirmedOrders = useMemo(
    () => extractItems<Order>(confirmedOrdersData),
    [confirmedOrdersData]
  );
  const deepLinkedOrderId = useMemo(
    () => parseDeepLinkedOrderId(routeSearch),
    [routeSearch]
  );

  useEffect(() => {
    if (deepLinkedOrderId === null) {
      appliedOrderDeepLinkRef.current = null;
      return;
    }

    if (appliedOrderDeepLinkRef.current === deepLinkedOrderId) {
      return;
    }

    const nextSelection = resolveDeepLinkedOrderSelection({
      orderId: deepLinkedOrderId,
      draftOrders,
      confirmedOrders,
    });

    if (!nextSelection) {
      return;
    }

    appliedOrderDeepLinkRef.current = deepLinkedOrderId;
    setActiveTab(nextSelection.activeTab);
    setSelectedOrderId(nextSelection.selectedOrderId);
    const targetOrders =
      nextSelection.activeTab === "draft" ? draftOrders : confirmedOrders;
    const nextIndex = targetOrders.findIndex(
      order => order.id === nextSelection.selectedOrderId
    );
    if (nextIndex >= 0) {
      setSelectedIndex(nextIndex);
    }
    inspector.open();
  }, [deepLinkedOrderId, draftOrders, confirmedOrders, inspector]);

  const patchConfirmedOrderStatus = useCallback(
    (orderId: number, targetStatus: FulfillmentStatusValue) => {
      const statusFilters = FULFILLMENT_STATUSES.map(status =>
        status.value === "ALL" ? undefined : status.value
      );

      for (const filter of statusFilters) {
        trpcUtils.orders.getAll.setData(
          buildConfirmedQueryInput(filter),
          data => {
            if (!data) return data;

            const nextItems = data.items
              .map(order =>
                order.id === orderId
                  ? {
                      ...order,
                      fulfillmentStatus: targetStatus,
                    }
                  : order
              )
              .filter(order => {
                if (!filter) return true;
                return (
                  normalizeFulfillmentStatus(order.fulfillmentStatus) === filter
                );
              });

            const nextPagination = data.pagination
              ? {
                  ...data.pagination,
                  total: filter ? nextItems.length : data.pagination.total,
                }
              : data.pagination;

            return {
              ...data,
              items: nextItems,
              pagination: nextPagination,
            };
          }
        );
      }
    },
    [trpcUtils]
  );

  const notifyStatusFilterExit = useCallback(
    (order: Order | null, nextStatus: string) => {
      if (!order || activeTab !== "confirmed") {
        return;
      }
      const message = getStatusFilterExitMessage({
        orderNumber:
          getDisplayOrderNumber(order) ||
          order.orderNumber ||
          `Order #${order.id}`,
        fromFilter: statusFilter,
        toStatus: nextStatus,
      });
      if (message) {
        toast.info(message);
      }
    },
    [activeTab, statusFilter]
  );

  // Helpers
  const getClientName = useCallback(
    (clientId: number) => {
      const client = clients.find(c => c.id === clientId);
      return client?.name || "Unknown";
    },
    [clients]
  );

  // TER-1065: Get display name for order creator
  const getSubmittedByName = useCallback(
    (order: Order) => {
      const withUser = order as Order & {
        createdByUser?: { name?: string | null; email?: string | null } | null;
      };
      if (!withUser.createdByUser) return "Unknown";
      return withUser.createdByUser.name || withUser.createdByUser.email || "Unknown";
    },
    []
  );

  // Filtered orders
  const displayOrders = useMemo(() => {
    const orders = activeTab === "draft" ? draftOrders : confirmedOrders;
    const searchLower = search.toLowerCase();
    const filtered = !search
      ? [...orders]
      : orders.filter((order: Order) => {
          const orderNumber =
            getDisplayOrderNumber(order) || order.orderNumber || "";
          const clientName = getClientName(order.clientId);
          return (
            orderNumber.toLowerCase().includes(searchLower) ||
            clientName.toLowerCase().includes(searchLower)
          );
        });

    return filtered.sort((a: Order, b: Order) => {
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const clientA = getClientName(a.clientId).toLowerCase();
      const clientB = getClientName(b.clientId).toLowerCase();
      const totalA = Number.parseFloat(String(a.total ?? 0)) || 0;
      const totalB = Number.parseFloat(String(b.total ?? 0)) || 0;

      switch (sortKey) {
        case "oldest":
          return createdA - createdB;
        case "client_asc":
          return clientA.localeCompare(clientB);
        case "client_desc":
          return clientB.localeCompare(clientA);
        case "total_desc":
          return totalB - totalA;
        case "total_asc":
          return totalA - totalB;
        case "newest":
        default:
          return createdB - createdA;
      }
    });
  }, [activeTab, draftOrders, confirmedOrders, search, getClientName, sortKey]);

  const orderEmptyStateAction = useMemo(() => {
    if (search || statusFilter !== "ALL") {
      return {
        label: "Clear Filters",
        onClick: () => {
          setSearch("");
          setStatusFilter("ALL");
        },
      };
    }

    if (activeTab === "draft") {
      return {
        label: "Create Order",
        onClick: () => setLocation(buildSalesWorkspacePath("create-order")),
      };
    }

    return {
      label: "View Draft Orders",
      onClick: () => setActiveTab("draft"),
    };
  }, [activeTab, search, setLocation, statusFilter]);

  // TER-1056: Bulk selection state
  const selection = useTableSelection<Order>(displayOrders as Order[]);

  // TER-1056: Clear selection when changing tabs or filters
  useEffect(() => {
    selection.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, statusFilter]);

  // Selected order
  const selectedOrderSummary = useMemo(
    () =>
      (displayOrders as Order[]).find(o => o.id === selectedOrderId) || null,
    [displayOrders, selectedOrderId]
  );

  const linkedInvoiceQuery = trpc.accounting.invoices.getByReference.useQuery(
    {
      referenceId: selectedOrderSummary?.id ?? 0,
      referenceTypes: ["ORDER", "SALE"],
    },
    {
      enabled:
        selectedOrderSummary !== null && selectedOrderSummary.isDraft === false,
    }
  );

  const { data: orderDetails } = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );
  const { data: orderReturns = [], refetch: refetchOrderReturns } =
    trpc.orders.getOrderReturns.useQuery(
      { orderId: selectedOrderId ?? 0 },
      { enabled: selectedOrderId !== null }
    );

  const selectedOrder: Order | null = useMemo(() => {
    if (!selectedOrderSummary) return null;
    if (
      !orderDetails?.order ||
      orderDetails.order.id !== selectedOrderSummary.id
    ) {
      return selectedOrderSummary;
    }

    const detailOrder = orderDetails.order;

    return {
      ...selectedOrderSummary,
      invoiceId: detailOrder.invoiceId ?? selectedOrderSummary.invoiceId,
      version: detailOrder.version ?? selectedOrderSummary.version,
      total: detailOrder.total ?? selectedOrderSummary.total,
      createdAt:
        typeof detailOrder.createdAt === "string"
          ? detailOrder.createdAt
          : (detailOrder.createdAt?.toISOString() ??
            selectedOrderSummary.createdAt),
      confirmedAt:
        typeof detailOrder.confirmedAt === "string"
          ? detailOrder.confirmedAt
          : (detailOrder.confirmedAt?.toISOString() ??
            selectedOrderSummary.confirmedAt),
      saleStatus: detailOrder.saleStatus ?? selectedOrderSummary.saleStatus,
      fulfillmentStatus: (detailOrder.fulfillmentStatus ??
        selectedOrderSummary.fulfillmentStatus) as Order["fulfillmentStatus"],
      lineItems: (orderDetails.lineItems ?? []).map(item => ({
        id: item.id,
        productName:
          item.productDisplayName ?? item.batchSku ?? `Batch ${item.batchId}`,
        quantity: Number.parseFloat(item.quantity ?? "0") || 0,
        unitPrice: item.unitPrice ?? "0",
        totalPrice: item.lineTotal ?? "0",
      })),
    };
  }, [orderDetails, selectedOrderSummary]);

  const selectedOrderInvoiceId = useMemo(
    () =>
      resolveOrderInvoiceId(
        selectedOrder?.invoiceId,
        linkedInvoiceQuery.data?.id
      ),
    [linkedInvoiceQuery.data?.id, selectedOrder?.invoiceId]
  );

  const normalizedOrderReturns = useMemo<OrderReturnEntry[]>(
    () =>
      orderReturns.map(entry => ({
        id: entry.id,
        returnReason: entry.returnReason,
        notes: entry.notes,
        processedByName: entry.processedByName,
        processedAt:
          entry.processedAt instanceof Date
            ? entry.processedAt.toISOString()
            : (entry.processedAt ?? null),
      })),
    [orderReturns]
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

  const returnableItems = useMemo(
    () =>
      (orderDetails?.lineItems ?? [])
        .map(item => ({
          batchId: item.batchId,
          displayName:
            item.productDisplayName ?? item.batchSku ?? `Batch ${item.batchId}`,
          quantity: Number.parseFloat(item.quantity ?? "0") || 0,
        }))
        .filter(item => item.batchId > 0 && item.quantity > 0),
    [orderDetails?.lineItems]
  );

  // Statistics
  const stats = useMemo(
    () => ({
      drafts: draftOrders.length,
      pending: confirmedOrders.filter(
        (o: Order) =>
          normalizeFulfillmentStatus(o.fulfillmentStatus) ===
          "READY_FOR_PACKING"
      ).length,
      ready: confirmedOrders.filter(
        (o: Order) =>
          normalizeFulfillmentStatus(o.fulfillmentStatus) === "PACKED"
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
      void refetchDrafts();
      void refetchConfirmed();
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
      void refetchDrafts();
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

  const confirmFulfillmentMutation = trpc.orders.confirmOrder.useMutation({
    onMutate: () => setSaving("Confirming for fulfillment..."),
    onSuccess: () => {
      if (selectedOrderId) {
        patchConfirmedOrderStatus(selectedOrderId, "READY_FOR_PACKING");
      }
      notifyStatusFilterExit(selectedOrder, "READY_FOR_PACKING");
      toast.success("Order confirmed for fulfillment");
      setSaved();
      void refetchConfirmed();
      setShowConfirmFulfillmentDialog(false);
      setConfirmFulfillmentNotes("");
      inspector.close();
    },
    onError: err => {
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to confirm order");
        setError(err.message);
      }
    },
  });

  const shipOrderMutation = trpc.orders.shipOrder.useMutation({
    onMutate: () => setSaving("Fulfilling order..."),
    onSuccess: result => {
      const shippedOrderId =
        typeof result?.orderId === "number" ? result.orderId : selectedOrderId;
      if (typeof shippedOrderId === "number") {
        patchConfirmedOrderStatus(shippedOrderId, "SHIPPED");
      }
      notifyStatusFilterExit(selectedOrder, "SHIPPED");

      toast.success("Order shipped");
      setSaved();
      void refetchConfirmed();
      setShowShipDialog(false);
      setShipTrackingNumber("");
      setShipCarrier("");
      setShipNotes("");
      inspector.close();
    },
    onError: err => {
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to ship order");
        setError(err.message);
      }
    },
  });

  const processRestockMutation = trpc.orders.processRestock.useMutation({
    onMutate: () => setSaving("Restocking inventory..."),
    onSuccess: () => {
      if (selectedOrderId) {
        patchConfirmedOrderStatus(selectedOrderId, "RESTOCKED");
      }
      notifyStatusFilterExit(selectedOrder, "RESTOCKED");
      toast.success("Inventory restocked successfully");
      setSaved();
      void refetchConfirmed();
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
      onMutate: () => setSaving("Processing supplier return..."),
      onSuccess: () => {
        if (selectedOrderId) {
          patchConfirmedOrderStatus(selectedOrderId, "RETURNED_TO_VENDOR");
        }
        notifyStatusFilterExit(selectedOrder, "RETURNED_TO_VENDOR");
        toast.success("Supplier return processed successfully");
        setSaved();
        void refetchConfirmed();
        setShowVendorReturnDialog(false);
        setReturnReason("");
        setSelectedVendorId("");
      },
      onError: err => {
        if (!handleConflictError(err)) {
          toast.error(err.message || "Failed to process supplier return");
          setError(err.message);
        }
      },
    });

  const updateOrderStatusMutation = trpc.orders.updateOrderStatus.useMutation({
    onMutate: () => setSaving("Updating order status..."),
    onSuccess: result => {
      const nextStatus = result.newStatus as FulfillmentStatusValue;
      if (selectedOrderId) {
        patchConfirmedOrderStatus(selectedOrderId, nextStatus);
      }
      notifyStatusFilterExit(selectedOrder, nextStatus);
      toast.success("Order status updated");
      setSaved();
      void refetchConfirmed();
      inspector.close();
    },
    onError: err => {
      if (!handleConflictError(err)) {
        toast.error(err.message || "Failed to update order status");
        setError(err.message);
      }
    },
  });

  const generateInvoiceMutation = trpc.invoices.generateFromOrder.useMutation({
    onMutate: () => setSaving("Generating invoice..."),
    onSuccess: invoice => {
      toast.success(
        invoice?.invoiceNumber
          ? `Invoice ${invoice.invoiceNumber} generated`
          : "Invoice generated"
      );
      setSaved();
      void refetchDrafts();
      void refetchConfirmed();
    },
    onError: err => {
      toast.error(err.message || "Failed to generate invoice");
      setError(err.message);
    },
  });

  const downloadInvoiceMutation = trpc.invoices.downloadPdf.useMutation({
    onSuccess: result => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = result.fileName;
      link.click();
      toast.success("Invoice PDF downloaded");
    },
    onError: err => {
      toast.error(err.message || "Failed to download invoice");
      setError(err.message);
    },
  });

  // TER-1056: Batch update order status mutation
  const batchUpdateStatusMutation =
    trpc.orders.batchUpdateOrderStatus.useMutation({
      onMutate: () => setSaving("Updating order statuses..."),
      onSuccess: result => {
        const { succeeded, failed } = result.summary;
        if (failed > 0) {
          toast.warning(
            `Updated ${succeeded} order${succeeded !== 1 ? "s" : ""}, ${failed} failed`
          );
        } else {
          toast.success(
            `Successfully updated ${succeeded} order${succeeded !== 1 ? "s" : ""}`
          );
        }
        setSaved();
        selection.clearSelection();
        void refetchConfirmed();
      },
      onError: err => {
        toast.error(err.message || "Failed to update order statuses");
        setError(err.message);
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
        if (onNewOrder) {
          onNewOrder();
        } else {
          setLocation(buildSalesWorkspacePath("create-order"));
        }
      },
      "ctrl+n": e => {
        e.preventDefault();
        if (onNewOrder) {
          onNewOrder();
        } else {
          setLocation(buildSalesWorkspacePath("create-order"));
        }
      },
      arrowdown: e => {
        e.preventDefault();
        if (displayOrders.length === 0) {
          return;
        }
        const newIndex = Math.min(displayOrders.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const order = displayOrders[newIndex];
        if (order) setSelectedOrderId(order.id);
      },
      arrowup: e => {
        e.preventDefault();
        if (displayOrders.length === 0) {
          return;
        }
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
      else if (showConfirmFulfillmentDialog)
        setShowConfirmFulfillmentDialog(false);
      else if (showShipDialog) setShowShipDialog(false);
      else if (showProcessReturnDialog) setShowProcessReturnDialog(false);
      else if (showRestockDialog) setShowRestockDialog(false);
      else if (showVendorReturnDialog) {
        setShowVendorReturnDialog(false);
        setReturnReason("");
      } else if (inspector.isOpen) inspector.close();
    },
  });

  // TER-1056: Bulk action status options (only for confirmed orders)
  const bulkStatusOptions: StatusOption[] = useMemo(
    () => [
      { value: "READY_FOR_PACKING", label: "Pending" },
      { value: "PACKED", label: "Ready" },
      { value: "SHIPPED", label: "Shipped" },
      { value: "DELIVERED", label: "Delivered" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
    []
  );

  // TER-1056: Handle bulk status change
  const handleBulkStatusChange = useCallback(
    (newStatus: string) => {
      if (selection.selectedCount === 0) {
        toast.error("No orders selected");
        return;
      }

      if (activeTab === "draft") {
        toast.error("Bulk status update is only available for confirmed orders");
        return;
      }

      const validStatus = [
        "READY_FOR_PACKING",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ].find(s => s === newStatus);

      if (!validStatus) {
        toast.error("Invalid status selected");
        return;
      }

      batchUpdateStatusMutation.mutate({
        orderIds: selection.selectedItems.map(o => o.id),
        newStatus: validStatus as
          | "READY_FOR_PACKING"
          | "PACKED"
          | "SHIPPED"
          | "DELIVERED"
          | "CANCELLED",
      });
    },
    [selection, activeTab, batchUpdateStatusMutation]
  );

  // Handlers
  const handleEdit = (orderId: number) =>
    setLocation(buildSalesWorkspacePath("create-order", { draftId: orderId }));
  const handleConfirm = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowConfirmDialog(true);
  };
  const handleDelete = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDeleteDialog(true);
  };
  const handleConfirmFulfillment = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowConfirmFulfillmentDialog(true);
  };
  const handleShip = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowShipDialog(true);
  };
  const handleMakePayment = (orderId: number) => {
    const matchedFallbackOrder =
      confirmedOrders.find(order => order.id === orderId) ??
      draftOrders.find(order => order.id === orderId) ??
      null;

    const sourceOrder =
      (selectedOrder?.id === orderId
        ? {
            id: selectedOrder.id,
            invoiceId: selectedOrderInvoiceId,
          }
        : null) ??
      (matchedFallbackOrder
        ? {
            id: matchedFallbackOrder.id,
            invoiceId: matchedFallbackOrder.invoiceId ?? null,
          }
        : null) ??
      null;

    const destination = getMakePaymentRoute(sourceOrder);

    if (!destination) {
      toast.error("Generate an invoice before recording payment");
      return;
    }

    setLocation(destination);
  };
  const handleGenerateInvoice = (orderId: number) => {
    generateInvoiceMutation.mutate({ orderId });
  };
  const handleDownloadInvoice = (invoiceId: number) => {
    downloadInvoiceMutation.mutate({ id: invoiceId });
  };
  const handleProcessReturn = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowProcessReturnDialog(true);
  };
  const handleProcessRestock = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowRestockDialog(true);
  };
  const handleReturnToVendor = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowVendorReturnDialog(true);
  };
  const handleRefresh = () => {
    void refetchDrafts();
    void refetchConfirmed();
  };

  const isLoading = activeTab === "draft" ? loadingDrafts : loadingConfirmed;

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Sales"
        description="Manage sales and drafts"
        divider
        className="px-6 py-4"
        actions={
          <>
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
                Ready:{" "}
                <span className="font-semibold text-foreground">
                  {stats.ready}
                </span>
              </span>
              <span>
                Shipped:{" "}
                <span className="font-semibold text-foreground">
                  {stats.shipped}
                </span>
              </span>
            </div>
          </>
        }
      />

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
              <Select
                value={sortKey}
                onValueChange={value => setSortKey(value as OrdersSortKey)}
              >
                <SelectTrigger className="w-44">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sort" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ORDER_SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() =>
                  onNewOrder
                    ? onNewOrder()
                    : setLocation(buildSalesWorkspacePath("create-order"))
                }
                data-testid="new-order-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Sales Order
              </Button>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          <div className="flex-1 overflow-auto">
            <Table data-testid="orders-table" className="min-h-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <SelectAllCheckbox
                      checked={selection.isAllSelected}
                      indeterminate={selection.isIndeterminate}
                      onCheckedChange={selection.toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading orders…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayOrders.length === 0 ? (
                  <TableRow data-testid="orders-empty-state">
                    <TableCell colSpan={9} className="h-64 text-center">
                      <EmptyState
                        variant="orders"
                        title="No orders found"
                        description={
                          search
                            ? "No orders match this search yet. Clear the filters and try a broader lookup."
                            : statusFilter !== "ALL"
                              ? `No ${statusFilter.toLowerCase()} orders match the current status filter.`
                              : activeTab === "draft"
                                ? "Create a sales order draft so pricing, review, and final confirmation can all happen from one place."
                                : "Confirmed orders appear here once a draft is finalized."
                        }
                        action={orderEmptyStateAction}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  displayOrders.map((order: Order, index: number) => (
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
                      <TableCell className="w-12" onClick={e => e.stopPropagation()}>
                        <SelectRowCheckbox
                          checked={selection.isSelected(order.id)}
                          onCheckedChange={() => selection.toggleSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <MonoId
                          value={
                            getDisplayOrderNumber(order) ||
                            order.orderNumber ||
                            `#${order.id}`
                          }
                          truncate={14}
                        />
                      </TableCell>
                      <TableCell>{getClientName(order.clientId)}</TableCell>
                      <TableCell>{getSubmittedByName(order)}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        {formatPaymentStatus(order.saleStatus)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge
                          status={order.fulfillmentStatus}
                          isDraft={order.isDraft}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Quick-action bottom panel — slides up when a row is selected */}
          {selectedOrder && (
            <div className="animate-in slide-in-from-bottom-2 duration-200 border-t bg-card px-4 py-3 flex items-center gap-4 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">
                  {getClientName(selectedOrder.clientId)}
                </p>
                {(selectedOrder.lineItems ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(selectedOrder.lineItems ?? [])
                      .slice(0, 3)
                      .map(
                        item =>
                          `${item.productName} × ${item.quantity} @ ${formatCurrency(item.unitPrice)}`
                      )
                      .join(" · ")}
                    {(selectedOrder.lineItems ?? []).length > 3 && " …"}
                  </p>
                )}
              </div>
              <p className="text-[18px] font-bold tabular-nums flex-shrink-0">
                {formatCurrency(selectedOrder.total)}
              </p>
              {selectedOrder.isDraft && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                  onClick={() => handleConfirm(selectedOrder.id)}
                >
                  Confirm Order
                </Button>
              )}
              {!selectedOrder.isDraft &&
                (selectedOrder.fulfillmentStatus === "CONFIRMED" ||
                  selectedOrder.fulfillmentStatus === null) && (
                  <Button
                    className="bg-sky-600 hover:bg-sky-700 text-white flex-shrink-0"
                    onClick={() => handleConfirmFulfillment(selectedOrder.id)}
                  >
                    Fulfill
                  </Button>
                )}
              {!selectedOrder.isDraft &&
                selectedOrder.fulfillmentStatus === "DELIVERED" && (
                  <Button
                    variant="default"
                    className="flex-shrink-0"
                    onClick={() => handleGenerateInvoice(selectedOrder.id)}
                  >
                    Create Invoice
                  </Button>
                )}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 text-muted-foreground"
                onClick={() => setSelectedOrderId(null)}
              >
                ×
              </Button>
            </div>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={
            (selectedOrder && getDisplayOrderNumber(selectedOrder)) ||
            selectedOrder?.orderNumber ||
            "Order Details"
          }
          subtitle={
            selectedOrder ? getClientName(selectedOrder.clientId) : undefined
          }
        >
          <OrderInspectorContent
            order={selectedOrder}
            resolvedInvoiceId={selectedOrderInvoiceId}
            clientName={
              selectedOrder ? getClientName(selectedOrder.clientId) : ""
            }
            cogsLineItems={cogsLineItems}
            canViewCogsDetails={canViewCogsDetails}
            returnHistory={normalizedOrderReturns}
            shippingEnabled={shippingEnabled}
            canManageShipping={canManageShipping}
            canProcessReturns={canProcessReturns}
            canAccessAccounting={canAccessAccounting}
            canCreateAccounting={canCreateAccounting}
            onEdit={handleEdit}
            onMakePayment={handleMakePayment}
            onConfirm={handleConfirm}
            onConfirmFulfillment={handleConfirmFulfillment}
            onDelete={handleDelete}
            onShip={handleShip}
            onGenerateInvoice={handleGenerateInvoice}
            generatingInvoice={generateInvoiceMutation.isPending}
            onDownloadInvoice={handleDownloadInvoice}
            downloadingInvoice={downloadInvoiceMutation.isPending}
            onProcessReturn={handleProcessReturn}
            onProcessRestock={handleProcessRestock}
            onReturnToVendor={handleReturnToVendor}
            isStatusUpdating={updateOrderStatusMutation.isPending}
            onStatusChange={(orderId, newStatus) => {
              if (
                newStatus === "READY_FOR_PACKING" ||
                newStatus === "PACKED" ||
                newStatus === "SHIPPED" ||
                newStatus === "DELIVERED" ||
                newStatus === "CANCELLED"
              ) {
                updateOrderStatusMutation.mutate({
                  orderId,
                  newStatus,
                });
              }
            }}
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

      {/* Confirm Fulfillment Dialog */}
      <Dialog
        open={showConfirmFulfillmentDialog}
        onOpenChange={setShowConfirmFulfillmentDialog}
      >
        <DialogContent data-testid="confirm-modal">
          <DialogHeader>
            <DialogTitle>Confirm for Fulfillment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Confirm this order for fulfillment and reserve inventory.</p>
            <Input
              data-testid="confirm-notes"
              placeholder="Notes (optional)..."
              value={confirmFulfillmentNotes}
              onChange={e => setConfirmFulfillmentNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmFulfillmentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              data-testid="submit-confirm"
              onClick={() =>
                selectedOrderId &&
                confirmFulfillmentMutation.mutate({
                  id: selectedOrderId,
                  notes: confirmFulfillmentNotes || undefined,
                })
              }
              disabled={confirmFulfillmentMutation.isPending}
            >
              {confirmFulfillmentMutation.isPending
                ? "Confirming..."
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ship Dialog */}
      <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
        <DialogContent data-testid="ship-modal">
          <DialogHeader>
            <DialogTitle>Ship Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              data-testid="tracking-number"
              name="trackingNumber"
              placeholder="Tracking number"
              value={shipTrackingNumber}
              onChange={e => setShipTrackingNumber(e.target.value)}
            />
            <Input
              data-testid="carrier-input"
              name="carrier"
              placeholder="Carrier"
              value={shipCarrier}
              onChange={e => setShipCarrier(e.target.value)}
            />
            <Input
              data-testid="ship-notes"
              name="notes"
              placeholder="Shipping notes"
              value={shipNotes}
              onChange={e => setShipNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipDialog(false)}>
              Cancel
            </Button>
            <Button
              data-testid="confirm-ship"
              onClick={() =>
                selectedOrderId &&
                shipOrderMutation.mutate({
                  id: selectedOrderId,
                  trackingNumber: shipTrackingNumber || undefined,
                  carrier: shipCarrier || undefined,
                  notes: shipNotes || undefined,
                })
              }
              disabled={shipOrderMutation.isPending}
            >
              {shipOrderMutation.isPending ? "Shipping..." : "Ship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessReturnModal
        orderId={selectedOrderId ?? 0}
        orderItems={returnableItems}
        open={showProcessReturnDialog}
        onClose={() => setShowProcessReturnDialog(false)}
        onSuccess={() => {
          setSaved();
          void refetchConfirmed();
          void refetchOrderReturns();
        }}
      />

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
            <DialogTitle>Return to Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2">Select supplier:</p>
              <Select
                value={selectedVendorId}
                onValueChange={value => setSelectedVendorId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
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
            <p>Please provide a reason for returning to the supplier:</p>
            <Input
              placeholder="Supplier return reason..."
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
                : "Return to Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />

      {/* TER-1056: Bulk Actions Bar */}
      {activeTab === "confirmed" && selection.selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selection.selectedCount}
          totalCount={displayOrders.length}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          statusOptions={bulkStatusOptions}
          onStatusChange={handleBulkStatusChange}
        />
      )}
    </div>
  );
}

export default OrdersWorkSurface;
