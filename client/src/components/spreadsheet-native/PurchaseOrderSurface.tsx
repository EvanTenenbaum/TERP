/**
 * PurchaseOrderSurface — Unified sheet-native surface for Purchase Orders
 *
 * TER-976: Replaces PurchaseOrdersPilotSurface with a cleaner layout following
 * the InventoryManagementSurface pattern (toolbar -> action bar -> grid -> cards -> status bar).
 *
 * Queue mode (default) — this file.
 * Creation mode — Task 4 (placeholder for now).
 *
 * Layout:
 *   1. Toolbar — title, status count badges, "+ New PO", Export CSV
 *   2. Action Bar — search, status filter, context hint
 *   3. PowersheetGrid — PO queue (cell-range, read-only)
 *   4. Selected-PO KPI cards (4-up)
 *   5. PowersheetGrid — PO line items (support grid)
 *   6. WorkSurfaceStatusBar + KeyboardHintBar
 *   7. InspectorPanel — PO detail
 *   8. ConfirmDialogs — delete, status change, receiving handoff
 */

import { useMemo, useState, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import { Building, Download, Package, Plus, Trash2, Truck } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
import { useAuth } from "@/hooks/useAuth";
import {
  createProductIntakeDraftFromPO,
  upsertProductIntakeDraft,
} from "@/lib/productIntakeDrafts";
import type { ProductIntakeDraftLine } from "@/lib/productIntakeDrafts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
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
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type POStatus =
  | "DRAFT"
  | "SENT"
  | "CONFIRMED"
  | "RECEIVING"
  | "RECEIVED"
  | "CANCELLED";

type CogsMode = "FIXED" | "RANGE";

interface POQueueRecord {
  id: number;
  poNumber: string;
  supplierClientId: number | null;
  vendorId?: number | null;
  purchaseOrderStatus: string;
  orderDate: Date | string;
  expectedDeliveryDate?: Date | string | null;
  total: string | number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdAt?: Date | string | null;
}

interface POLineItem {
  id: number;
  productId: number;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  quantityOrdered: string | number;
  quantityReceived?: string | number | null;
  cogsMode?: CogsMode | null;
  unitCost: string | number;
  unitCostMin?: string | number | null;
  unitCostMax?: string | number | null;
  totalCost?: string | number | null;
  notes?: string | null;
}

interface POQueueRow {
  identity: { rowKey: string; entityId: number | string; entityType: string };
  poId: number;
  poNumber: string;
  supplierName: string;
  status: string;
  statusLabel: string;
  orderDate: Date | string;
  expectedDeliveryDate: Date | string;
  total: number;
  lineItemCount: number;
  paymentTerms: string;
  isReceivable: boolean;
  isDraft: boolean;
}

interface POLineRow {
  identity: { rowKey: string; entityId: number | string; entityType: string };
  lineId: number;
  productName: string;
  category: string;
  quantityOrdered: number;
  quantityReceived: number;
  cogsMode: string;
  unitCost: number;
  unitCostDisplay: string;
  lineTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  CONFIRMED: "Confirmed",
  RECEIVING: "Receiving",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const RECEIVABLE_STATUSES = new Set(["CONFIRMED", "RECEIVING"]);

const PO_ALLOWED_TRANSITIONS: Record<string, POStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECEIVING", "CANCELLED"],
  RECEIVING: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

const queueAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

const supportAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  } catch {
    return "-";
  }
};

const formatAgeLabel = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = value instanceof Date ? value : new Date(value);
    const ms = Date.now() - d.getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days === 0) return "today";
    if (days === 1) return "1d";
    return `${days}d`;
  } catch {
    return "-";
  }
};

function buildRowKey(entityType: string, id: number): string {
  return `${entityType}:${id}`;
}

function mapPOsToQueueRows(
  pos: POQueueRecord[],
  supplierNamesById: Map<number, string>
): POQueueRow[] {
  return pos.map(po => {
    const supplierId = po.supplierClientId ?? null;
    const supplierName =
      supplierId !== null
        ? (supplierNamesById.get(supplierId) ?? "Unknown Supplier")
        : "Unknown Supplier";
    const status = po.purchaseOrderStatus;
    const total = toNumber(po.total);
    return {
      identity: {
        rowKey: buildRowKey("po", po.id),
        entityId: po.id,
        entityType: "po",
      },
      poId: po.id,
      poNumber: po.poNumber,
      supplierName,
      status,
      statusLabel: PO_STATUS_LABELS[status] ?? status,
      orderDate: po.orderDate ?? "",
      expectedDeliveryDate: po.expectedDeliveryDate ?? "",
      total,
      lineItemCount: 0,
      paymentTerms: po.paymentTerms ?? "-",
      isReceivable: RECEIVABLE_STATUSES.has(status),
      isDraft: status === "DRAFT",
    };
  });
}

function mapLineItemsToRows(items: POLineItem[]): POLineRow[] {
  return items.map(item => {
    const cogsMode = item.cogsMode ?? "FIXED";
    const unitCost = toNumber(item.unitCost);
    const unitCostMin = toNumber(item.unitCostMin);
    const unitCostMax = toNumber(item.unitCostMax);
    const unitCostDisplay =
      cogsMode === "RANGE"
        ? `${formatCurrency(unitCostMin)}\u2013${formatCurrency(unitCostMax)}`
        : formatCurrency(unitCost);
    const quantityOrdered = toNumber(item.quantityOrdered);
    const lineTotal = quantityOrdered * unitCost;
    return {
      identity: {
        rowKey: buildRowKey("poLine", item.id),
        entityId: item.id,
        entityType: "poLine",
      },
      lineId: item.id,
      productName: item.productName ?? `Product #${item.productId}`,
      category: item.category ?? "-",
      quantityOrdered,
      quantityReceived: toNumber(item.quantityReceived),
      cogsMode,
      unitCost,
      unitCostDisplay,
      lineTotal,
    };
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PurchaseOrderSurfaceProps {
  defaultStatusFilter?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrderSurface({
  defaultStatusFilter,
}: PurchaseOrderSurfaceProps) {
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const { user } = useAuth();
  const { selectedId: selectedPoId, setSelectedId: setSelectedPoId } =
    useSpreadsheetSelectionParam("poId");

  // Check for creation/edit mode URL params
  const searchParams = useMemo(
    () => new URLSearchParams(routeSearch),
    [routeSearch]
  );
  const poView = searchParams.get("poView");

  // If creation/edit mode, render placeholder (Task 4)
  if (poView === "create" || poView === "edit") {
    return <div>Creation mode — coming in Task 4</div>;
  }

  // Filter state — initialize from defaultStatusFilter if provided
  const initialStatus =
    defaultStatusFilter && defaultStatusFilter.length === 1
      ? defaultStatusFilter[0]
      : "all";

  return (
    <PurchaseOrderQueueMode
      defaultStatusFilter={defaultStatusFilter}
      initialStatusFilter={initialStatus}
      selectedPoId={selectedPoId}
      setSelectedPoId={setSelectedPoId}
      setLocation={setLocation}
      userId={user?.id ?? null}
    />
  );
}

// ---------------------------------------------------------------------------
// Queue Mode (extracted to avoid hooks-after-early-return)
// ---------------------------------------------------------------------------

function PurchaseOrderQueueMode({
  defaultStatusFilter,
  initialStatusFilter,
  selectedPoId,
  setSelectedPoId,
  setLocation,
  userId,
}: {
  defaultStatusFilter?: string[];
  initialStatusFilter: string;
  selectedPoId: number | null;
  setSelectedPoId: (id: number | null) => void;
  setLocation: (path: string) => void;
  userId: number | null;
}) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showReceivingConfirmDialog, setShowReceivingConfirmDialog] =
    useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    poId: number;
    status: POStatus;
  } | null>(null);

  // Selection summaries
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [supportSelectionSummary, setSupportSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Toast dedup refs
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef(0);

  const notifyToast = (level: "success" | "error" | "warning", msg: string) => {
    const now = Date.now();
    const key = `${level}:${msg}`;
    if (
      key !== lastToastKeyRef.current ||
      now - lastToastTimeRef.current > 300
    ) {
      if (level === "success") toast.success(msg);
      else if (level === "warning") toast.warning(msg);
      else toast.error(msg);
      lastToastKeyRef.current = key;
      lastToastTimeRef.current = now;
    }
  };

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const posQuery = trpc.purchaseOrders.getAll.useQuery({
    limit: 500,
    offset: 0,
  });

  const suppliersQuery = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });

  const detailQuery = trpc.purchaseOrders.getById.useQuery(
    { id: selectedPoId ?? 0 },
    { enabled: selectedPoId !== null }
  );

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const rawPos = useMemo((): POQueueRecord[] => {
    const data = posQuery.data as unknown;
    if (!data) return [];
    if (Array.isArray(data)) return data as POQueueRecord[];
    const withItems = data as { items?: POQueueRecord[] };
    return Array.isArray(withItems.items) ? withItems.items : [];
  }, [posQuery.data]);

  const supplierNamesById = useMemo(() => {
    const data = suppliersQuery.data as unknown;
    let items: Array<{ id: number; name: string }> = [];
    if (Array.isArray(data)) {
      items = data as Array<{ id: number; name: string }>;
    } else if (data && typeof data === "object") {
      const withItems = data as {
        items?: Array<{ id: number; name: string }>;
      };
      if (Array.isArray(withItems.items)) {
        items = withItems.items;
      }
    }
    return new Map(items.map(s => [s.id, s.name ?? "Unknown"]));
  }, [suppliersQuery.data]);

  const searchLower = searchTerm.trim().toLowerCase();

  const queueRows = useMemo(() => {
    const rows = mapPOsToQueueRows(rawPos, supplierNamesById);
    return rows.filter(row => {
      // Apply defaultStatusFilter if status is "all"
      if (statusFilter === "all") {
        if (
          defaultStatusFilter &&
          defaultStatusFilter.length > 0 &&
          !defaultStatusFilter.includes(row.status)
        ) {
          return false;
        }
      } else if (row.status !== statusFilter) {
        return false;
      }
      if (!searchLower) return true;
      return (
        row.poNumber.toLowerCase().includes(searchLower) ||
        row.supplierName.toLowerCase().includes(searchLower)
      );
    });
  }, [
    rawPos,
    supplierNamesById,
    statusFilter,
    searchLower,
    defaultStatusFilter,
  ]);

  const selectedRow = queueRows.find(row => row.poId === selectedPoId) ?? null;

  const lineItemRows = useMemo(() => {
    const items = detailQuery.data?.items ?? [];
    return mapLineItemsToRows(items as POLineItem[]);
  }, [detailQuery.data]);

  // Counts by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of queueRows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [queueRows]);

  const draftCount = statusCounts["DRAFT"] ?? 0;
  const confirmedCount = statusCounts["CONFIRMED"] ?? 0;
  const receivingCount = statusCounts["RECEIVING"] ?? 0;

  // Workflow guards
  const queueSelectionTouchesMultipleRows =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;
  const rowScopedActionsBlocked = queueSelectionTouchesMultipleRows;
  const canLaunchReceiving = Boolean(
    selectedRow?.isReceivable && !rowScopedActionsBlocked
  );
  const canDeleteDraft = Boolean(
    selectedRow?.isDraft && !rowScopedActionsBlocked
  );

  // Available transitions for selected PO
  const availableTransitions = useMemo<POStatus[]>(() => {
    if (!selectedRow) return [];
    return PO_ALLOWED_TRANSITIONS[selectedRow.status] ?? [];
  }, [selectedRow]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const deletePO = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order deleted");
      setShowDeleteDialog(false);
      setSelectedPoId(null);
      void posQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to delete purchase order");
    },
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      const label = PO_STATUS_LABELS[variables.status] ?? variables.status;
      notifyToast("success", `Status updated to ${label}`);
      setShowStatusDialog(false);
      setPendingStatusChange(null);
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to update status");
    },
  });

  const submitPO = trpc.purchaseOrders.submit.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order submitted");
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to submit purchase order");
    },
  });

  const confirmPO = trpc.purchaseOrders.confirm.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order confirmed");
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to confirm purchase order");
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleNewPO = () => {
    // Set URL param to trigger creation mode (Task 4)
    const params = new URLSearchParams(window.location.search);
    params.set("poView", "create");
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
    window.dispatchEvent(new Event("popstate"));
  };

  const handleExport = () => {
    if (queueRows.length === 0) {
      notifyToast("warning", "No rows to export");
      return;
    }
    const header = [
      "PO Number",
      "Supplier",
      "Status",
      "Order Date",
      "Expected Delivery",
      "Total",
      "Payment Terms",
      "Line Count",
    ];
    const rows = queueRows.map(row => [
      row.poNumber,
      row.supplierName,
      row.statusLabel,
      formatDate(row.orderDate),
      formatDate(row.expectedDeliveryDate),
      row.total.toFixed(2),
      row.paymentTerms,
      String(row.lineItemCount),
    ]);
    const csv = [header, ...rows]
      .map(cols =>
        cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notifyToast("success", `Exported ${queueRows.length} rows`);
  };

  const handleStatusTransition = (status: POStatus) => {
    if (!selectedRow) return;
    const currentStatus = selectedRow.status;
    const allowed = PO_ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(status)) {
      notifyToast(
        "error",
        `Cannot transition from ${PO_STATUS_LABELS[currentStatus] ?? currentStatus} to ${PO_STATUS_LABELS[status] ?? status}`
      );
      return;
    }
    setPendingStatusChange({ poId: selectedRow.poId, status });
    setShowStatusDialog(true);
  };

  const handleStatusConfirm = () => {
    if (!pendingStatusChange) return;
    // Use specific mutations for DRAFT->SENT and SENT->CONFIRMED
    if (pendingStatusChange.status === "SENT") {
      submitPO.mutate({ id: pendingStatusChange.poId });
      setShowStatusDialog(false);
      setPendingStatusChange(null);
    } else if (pendingStatusChange.status === "CONFIRMED") {
      confirmPO.mutate({ id: pendingStatusChange.poId });
      setShowStatusDialog(false);
      setPendingStatusChange(null);
    } else {
      updateStatus.mutate({
        id: pendingStatusChange.poId,
        status: pendingStatusChange.status,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedRow?.isDraft) return;
    deletePO.mutate({ id: selectedRow.poId });
  };

  const handleStartReceiving = () => {
    if (!selectedRow) return;
    // Create product intake draft from PO detail
    const detail = detailQuery.data;
    if (detail?.items) {
      const lines: ProductIntakeDraftLine[] = (
        detail.items as POLineItem[]
      ).map(item => ({
        id: `line-${item.id}`,
        poItemId: item.id,
        productId: item.productId,
        productName: item.productName ?? `Product #${item.productId}`,
        category: item.category,
        quantityOrdered: toNumber(item.quantityOrdered),
        quantityReceived: toNumber(item.quantityReceived),
        intakeQty: 0,
        cogsMode: item.cogsMode ?? "FIXED",
        unitCost: toNumber(item.unitCost),
        unitCostMin: toNumber(item.unitCostMin),
        unitCostMax: toNumber(item.unitCostMax),
      }));

      const supplierData = detail.supplier as
        | { id?: number; name?: string }
        | undefined;
      const draft = createProductIntakeDraftFromPO({
        poId: selectedRow.poId,
        poNumber: selectedRow.poNumber,
        vendorId: supplierData?.id ?? null,
        vendorName: selectedRow.supplierName,
        warehouseId: null,
        warehouseName: "Default",
        lines,
      });
      upsertProductIntakeDraft(draft, userId);
    }

    setLocation(
      buildOperationsWorkspacePath("receiving", {
        poId: selectedRow.poId,
        poNumber: selectedRow.poNumber,
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const queueColumnDefs = useMemo<ColDef<POQueueRow>[]>(
    () => [
      {
        field: "poNumber",
        headerName: "PO Number",
        minWidth: 130,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "supplierName",
        headerName: "Supplier",
        flex: 1.5,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "statusLabel",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "orderDate",
        headerName: "Order Date",
        minWidth: 120,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          formatDate(params.value as Date | string | null | undefined),
      },
      {
        field: "expectedDeliveryDate",
        headerName: "Est. Delivery",
        minWidth: 120,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => {
          const value = params.value as Date | string | null | undefined;
          if (!value || value === "") return "Not set";
          return formatDate(value);
        },
      },
      {
        field: "total",
        headerName: "Total ($)",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "paymentTerms",
        headerName: "Payment Terms",
        minWidth: 100,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "lineItemCount",
        headerName: "Line Count",
        minWidth: 90,
        maxWidth: 110,
        cellClass: "powersheet-cell--locked",
      },
    ],
    []
  );

  const lineItemColumnDefs = useMemo<ColDef<POLineRow>[]>(
    () => [
      {
        field: "productName",
        headerName: "Product",
        flex: 1.5,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantityOrdered",
        headerName: "Ordered",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantityReceived",
        headerName: "Received",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "cogsMode",
        headerName: "COGS Mode",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "unitCostDisplay",
        headerName: "Unit Cost",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "lineTotal",
        headerName: "Line Total",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
    ],
    []
  );

  // ---------------------------------------------------------------------------
  // Status bar content
  // ---------------------------------------------------------------------------

  const statusBarLeft = (
    <span>
      {queueRows.length} visible POs · {draftCount} draft · {confirmedCount}{" "}
      confirmed · {receivingCount} receiving
      {queueSelectionSummary
        ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows`
        : ""}
      {supportSelectionSummary
        ? ` · lines ${supportSelectionSummary.selectedCellCount} cells`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? `Selected ${selectedRow.poNumber} · ${selectedRow.statusLabel} · ${selectedRow.supplierName}`
        : "Select a purchase order to load line items and action context"}
      {queueSelectionSummary?.hasDiscontiguousSelection
        ? " · discontiguous selection"
        : ""}
    </span>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Toolbar */}
      <div className="flex items-center gap-2 py-1">
        <h2 className="text-lg font-semibold">Purchase Orders</h2>
        {draftCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {draftCount} draft
          </Badge>
        )}
        {confirmedCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {confirmedCount} confirmed
          </Badge>
        )}
        {receivingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {receivingCount} receiving
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handleNewPO}>
            <Plus className="mr-1 h-4 w-4" />+ New PO
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Export visible POs to CSV"
            onClick={handleExport}
          >
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center gap-2 py-0.5">
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search PO number or supplier"
          className="max-w-xs"
          aria-label="Search purchase orders"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RECEIVING">Receiving</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {selectedRow
            ? `${selectedRow.poNumber} selected`
            : "Select a row to see details and actions"}
        </span>
      </div>

      {/* 3. PO Queue Grid */}
      <PowersheetGrid
        surfaceId="po-queue"
        requirementIds={["PROC-PO-001", "PROC-PO-005"]}
        affordances={queueAffordances}
        title="Purchase Orders Queue"
        description="Unified PO queue — status, supplier, dates, total, terms, and line count at a glance."
        rows={queueRows}
        columnDefs={queueColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedPoId(row?.poId ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setQueueSelectionSummary}
        isLoading={posQuery.isLoading}
        errorMessage={posQuery.error?.message ?? null}
        emptyTitle="No purchase orders match"
        emptyDescription="Adjust the search or status filter, or create a new PO."
        summary={
          <span>
            {queueRows.length} visible · {draftCount} draft ·{" "}
            {confirmedCount + receivingCount} active
          </span>
        }
        minHeight={360}
      />

      {/* 4. Selected PO KPI Cards */}
      {selectedRow ? (
        <div className="grid gap-3 md:grid-cols-4">
          {/* Supplier card */}
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Building className="h-3 w-3" />
              Supplier
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.supplierName}
            </div>
            {detailQuery.data?.supplier?.email ? (
              <div className="text-xs text-muted-foreground">
                {(detailQuery.data.supplier as { email?: string }).email}
              </div>
            ) : null}
            {detailQuery.data?.supplier?.phone ? (
              <div className="text-xs text-muted-foreground">
                {(detailQuery.data.supplier as { phone?: string }).phone}
              </div>
            ) : null}
          </div>

          {/* Status + age card */}
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Package className="h-3 w-3" />
              Status
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.statusLabel} · created{" "}
              {formatAgeLabel(selectedRow.orderDate)}
            </div>
          </div>

          {/* Total + line count card */}
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-sm font-medium">
              {formatCurrency(selectedRow.total)} · {lineItemRows.length} line
              {lineItemRows.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Actions card */}
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Actions
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {/* Draft actions */}
              {selectedRow.isDraft && (
                <>
                  {availableTransitions
                    .filter(s => s !== "CANCELLED")
                    .map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={rowScopedActionsBlocked}
                        onClick={() => handleStatusTransition(status)}
                      >
                        {PO_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!canDeleteDraft}
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </>
              )}

              {/* Receivable actions */}
              {selectedRow.isReceivable && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canLaunchReceiving}
                  onClick={() => setShowReceivingConfirmDialog(true)}
                >
                  <Truck className="mr-1 h-3 w-3" />
                  Start Receiving
                </Button>
              )}

              {/* Other transitions (non-draft, non-terminal) */}
              {!selectedRow.isDraft &&
                availableTransitions.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={rowScopedActionsBlocked}
                    onClick={() => handleStatusTransition(status)}
                  >
                    {PO_STATUS_LABELS[status]}
                  </Button>
                ))}

              {/* Terminal states */}
              {availableTransitions.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No actions available
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Line Items Support Grid */}
      <PowersheetGrid
        surfaceId="po-line-items"
        requirementIds={["PROC-PO-003", "PROC-PO-004"]}
        affordances={supportAffordances}
        title="Line Items"
        description="Line items for the selected purchase order."
        rows={lineItemRows}
        columnDefs={lineItemColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSupportSelectionSummary}
        isLoading={detailQuery.isLoading}
        errorMessage={detailQuery.error?.message ?? null}
        emptyTitle={
          selectedRow
            ? `No line items for ${selectedRow.poNumber}`
            : "No PO selected"
        }
        emptyDescription={
          selectedRow
            ? "This purchase order has no line items yet."
            : "Select a purchase order above to see its line items."
        }
        summary={
          selectedRow ? (
            <span>
              {selectedRow.poNumber} · {lineItemRows.length} line{" "}
              {lineItemRows.length === 1 ? "item" : "items"} ·{" "}
              {formatCurrency(
                lineItemRows.reduce((sum, row) => sum + row.lineTotal, 0)
              )}{" "}
              total
            </span>
          ) : undefined
        }
        minHeight={220}
      />

      {/* 6. Status Bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* 7. Inspector Panel */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedPoId(null)}
        title={selectedRow?.poNumber ?? "PO Inspector"}
        subtitle={selectedRow?.supplierName ?? "Select a purchase order"}
        headerActions={
          selectedRow ? (
            <Badge variant="outline">{selectedRow.statusLabel}</Badge>
          ) : null
        }
      >
        {selectedRow ? (
          <div className="space-y-4">
            <InspectorSection title="PO Details" defaultOpen>
              <InspectorField label="PO Number">
                <p className="font-semibold">{selectedRow.poNumber}</p>
              </InspectorField>
              <InspectorField label="Supplier">
                <p>{selectedRow.supplierName}</p>
                {detailQuery.data?.supplier?.email ? (
                  <p className="text-xs text-muted-foreground">
                    {(detailQuery.data.supplier as { email?: string }).email}
                  </p>
                ) : null}
                {detailQuery.data?.supplier?.phone ? (
                  <p className="text-xs text-muted-foreground">
                    {(detailQuery.data.supplier as { phone?: string }).phone}
                  </p>
                ) : null}
              </InspectorField>
              <InspectorField label="Status">
                <p>{selectedRow.statusLabel}</p>
              </InspectorField>
              <InspectorField label="Order Date">
                <p>
                  {formatDate(selectedRow.orderDate)} (
                  {formatAgeLabel(selectedRow.orderDate)} ago)
                </p>
              </InspectorField>
              <InspectorField label="Expected Delivery">
                {selectedRow.expectedDeliveryDate ? (
                  <p>{formatDate(selectedRow.expectedDeliveryDate)}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not set</p>
                )}
              </InspectorField>
              <InspectorField label="Payment Terms">
                <p>{selectedRow.paymentTerms}</p>
              </InspectorField>
              <InspectorField label="Total">
                <p className="text-lg font-semibold">
                  {formatCurrency(selectedRow.total)}
                </p>
              </InspectorField>
              {detailQuery.data?.notes ? (
                <InspectorField label="Notes">
                  <p className="text-sm">
                    {(detailQuery.data as { notes?: string }).notes}
                  </p>
                </InspectorField>
              ) : null}
            </InspectorSection>

            <InspectorSection title="Receiving Handoff">
              {selectedRow.isReceivable ? (
                <>
                  <p className="mb-2 text-sm text-muted-foreground">
                    This PO is ready for receiving. Use the button below to open
                    the receiving workflow.
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setShowReceivingConfirmDialog(true)}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Start Receiving
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not eligible — status must be Confirmed or Receiving (current:{" "}
                  {selectedRow.statusLabel}).
                </p>
              )}
            </InspectorSection>

            <InspectorSection title="Next Steps">
              <div className="grid grid-cols-2 gap-2">
                {availableTransitions.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition(status)}
                    disabled={
                      updateStatus.isPending ||
                      submitPO.isPending ||
                      confirmPO.isPending
                    }
                  >
                    {PO_STATUS_LABELS[status]}
                  </Button>
                ))}
                {availableTransitions.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    No further status changes available for{" "}
                    {selectedRow.statusLabel} POs.
                  </p>
                )}
              </div>
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>

      {/* 8. Confirm Dialogs */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Draft Purchase Order?"
        description={
          selectedRow?.isDraft
            ? `Delete ${selectedRow.poNumber}? This cannot be undone.`
            : "Delete the selected draft PO? This cannot be undone."
        }
        confirmLabel={deletePO.isPending ? "Deleting..." : "Delete Draft"}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={open => {
          setShowStatusDialog(open);
          if (!open) setPendingStatusChange(null);
        }}
        title="Confirm Status Change"
        description={
          pendingStatusChange
            ? `Change ${selectedRow?.poNumber ?? "this PO"} to ${PO_STATUS_LABELS[pendingStatusChange.status] ?? pendingStatusChange.status}?`
            : "Confirm status change?"
        }
        confirmLabel={
          updateStatus.isPending || submitPO.isPending || confirmPO.isPending
            ? "Updating..."
            : `Set to ${pendingStatusChange ? (PO_STATUS_LABELS[pendingStatusChange.status] ?? pendingStatusChange.status) : ""}`
        }
        onConfirm={handleStatusConfirm}
      />

      <ConfirmDialog
        open={showReceivingConfirmDialog}
        onOpenChange={setShowReceivingConfirmDialog}
        title="Start Receiving?"
        description={
          selectedRow
            ? `You will be taken to the Receiving workspace for ${selectedRow.poNumber} (${selectedRow.supplierName}). Any unsaved work in the PO queue will remain.`
            : "Open the Receiving workspace for this PO?"
        }
        confirmLabel="Go to Receiving"
        onConfirm={() => {
          setShowReceivingConfirmDialog(false);
          handleStartReceiving();
        }}
      />
    </div>
  );
}

export default PurchaseOrderSurface;
