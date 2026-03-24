/**
 * PurchaseOrdersPilotSurface — Sheet-native surface for Purchase Orders
 *
 * TER-816: Queue + Detail family (same pattern as OrdersSheetPilotSurface).
 * Covers capability ledger rows PROC-PO-001 through PROC-PO-006.
 *
 * Layout:
 *   1. Search bar + status filter + action buttons
 *   2. Workflow action bar (status transitions, COGS, receiving handoff, classic fallback)
 *   3. PowersheetGrid — PO queue (cell-range, read-only)
 *   4. Selected-PO KPI cards
 *   5. PowersheetGrid — PO line items (support grid)
 *   6. WorkSurfaceStatusBar + KeyboardHintBar
 *   7. InspectorPanel — deep context for selected PO
 *   8. ConfirmDialog — destructive actions
 *
 * Classic fallback remains wired and is never removed.
 */

import { useMemo, useState, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import {
  Building,
  Calendar,
  Download,
  Package,
  Plus,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
  Truck,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
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
  subcategory: string;
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

/**
 * PO-P2: Client-side state machine for valid PO status transitions.
 * Prevents invalid transitions before hitting the server.
 */
const PO_ALLOWED_TRANSITIONS: Record<string, POStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECEIVING", "CANCELLED"],
  RECEIVING: ["RECEIVED", "CANCELLED"],
  RECEIVED: [], // terminal
  CANCELLED: [], // terminal
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
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

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
        ? `${formatCurrency(unitCostMin)}-${formatCurrency(unitCostMax)}`
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
      subcategory: item.subcategory ?? "-",
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

interface PurchaseOrdersPilotSurfaceProps {
  onOpenClassic: (poId?: number | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrdersPilotSurface({
  onOpenClassic,
}: PurchaseOrdersPilotSurfaceProps) {
  const [, setLocation] = useLocation();
  const { selectedId: selectedPoId, setSelectedId: setSelectedPoId } =
    useSpreadsheetSelectionParam("poId");

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    poId: number;
    status: POStatus;
  } | null>(null);

  // Selection summaries
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [supportSelectionSummary, setSupportSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Export dedup refs
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
      const withItems = data as { items?: Array<{ id: number; name: string }> };
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
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!searchLower) return true;
      return (
        row.poNumber.toLowerCase().includes(searchLower) ||
        row.supplierName.toLowerCase().includes(searchLower)
      );
    });
  }, [rawPos, supplierNamesById, statusFilter, searchLower]);

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

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRefresh = () => {
    void posQuery.refetch();
    void detailQuery.refetch();
  };

  const handleLaunchReceiving = () => {
    if (!selectedRow) return;
    setLocation(
      buildOperationsWorkspacePath("receiving", {
        poId: selectedRow.poId,
        poNumber: selectedRow.poNumber,
      })
    );
  };

  const handleDeleteConfirm = () => {
    if (!selectedRow?.isDraft) return;
    deletePO.mutate({ id: selectedRow.poId });
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
    updateStatus.mutate({
      id: pendingStatusChange.poId,
      status: pendingStatusChange.status,
    });
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
    ];
    const rows = queueRows.map(row => [
      row.poNumber,
      row.supplierName,
      row.statusLabel,
      formatDate(row.orderDate),
      formatDate(row.expectedDeliveryDate),
      row.total.toFixed(2),
      row.paymentTerms,
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

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const queueColumnDefs = useMemo<ColDef<POQueueRow>[]>(
    () => [
      {
        field: "statusLabel",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
      },
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
        valueFormatter: params =>
          formatDate(params.value as Date | string | null | undefined),
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "paymentTerms",
        headerName: "Terms",
        minWidth: 100,
        maxWidth: 130,
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
  // Status bar
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

  const workflowTargetLabel = selectedRow
    ? `Workflow target: ${selectedRow.poNumber}`
    : "Workflow target: select a PO";

  const workflowGuardrail = queueSelectionTouchesMultipleRows
    ? "Selection spans multiple rows — workflow actions stay locked until focused row is the only selection."
    : "Workflow actions are row-scoped. Cell selections do not change ownership.";

  // Status transition options for selected PO — filtered by state machine
  const availableTransitions = useMemo<POStatus[]>(() => {
    if (!selectedRow) return [];
    return PO_ALLOWED_TRANSITIONS[selectedRow.status] ?? [];
  }, [selectedRow]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* Search + controls bar */}
      <div className="flex flex-wrap items-center gap-2">
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
        <Badge variant="outline">Sheet-native Pilot · PO Queue + Detail</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="Refresh purchase orders"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Export visible POs to CSV"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenClassic(selectedPoId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic
          </Button>
        </div>
      </div>

      {/* Workflow action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedRow ? `${selectedRow.poNumber} selected` : "PO Queue active"}
        </span>
        <Badge
          variant={rowScopedActionsBlocked ? "secondary" : "outline"}
          className="max-w-full"
        >
          {workflowTargetLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {workflowGuardrail}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Status transitions dropdown-style buttons */}
          {availableTransitions.slice(0, 3).map(status => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={!selectedRow || rowScopedActionsBlocked}
              onClick={() => handleStatusTransition(status)}
            >
              {PO_STATUS_LABELS[status]}
            </Button>
          ))}

          {/* Launch Receiving — row-scoped handoff CTA */}
          <Button
            size="sm"
            variant={canLaunchReceiving ? "default" : "outline"}
            disabled={!canLaunchReceiving}
            onClick={handleLaunchReceiving}
            aria-label="Launch receiving for selected PO"
          >
            <Truck className="mr-2 h-4 w-4" />
            Launch Receiving
          </Button>

          {/* Delete draft */}
          <Button
            size="sm"
            variant="outline"
            disabled={!canDeleteDraft}
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Draft
          </Button>

          {/* Classic fallback — always accessible */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenClassic(selectedPoId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic
          </Button>
        </div>
      </div>

      {/* Primary queue grid */}
      <PowersheetGrid
        surfaceId="po-queue"
        requirementIds={["PROC-PO-001", "PROC-PO-005"]}
        releaseGateIds={["PROC-PO-001", "PROC-PO-002", "PROC-PO-005"]}
        affordances={queueAffordances}
        title="Purchase Orders Queue"
        description="One dominant queue — status, supplier, dates, total, and terms visible at a glance. Select a row to load line items and workflow actions."
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
        emptyDescription="Adjust the search or status filter, or create a new PO from the classic surface."
        summary={
          <span>
            {queueRows.length} visible · {draftCount} draft ·{" "}
            {confirmedCount + receivingCount} active
          </span>
        }
        antiDriftSummary="Queue release gates: row-selection driving detail, status filter parity, explicit row-scoped receiving handoff."
        minHeight={360}
      />

      {/* Selected PO KPI cards */}
      {selectedRow ? (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3" />
              Supplier
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.supplierName}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              Status
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.statusLabel}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Order Date
            </div>
            <div className="mt-1 text-sm font-medium">
              {formatDate(selectedRow.orderDate)} ·{" "}
              {formatAgeLabel(selectedRow.orderDate)} old
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-sm font-medium">
              {formatCurrency(selectedRow.total)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Line items support grid */}
      <PowersheetGrid
        surfaceId="po-line-items"
        requirementIds={["PROC-PO-003", "PROC-PO-004"]}
        releaseGateIds={["PROC-PO-003", "PROC-PO-004"]}
        affordances={supportAffordances}
        title="Line Items"
        description="Line items for the selected purchase order. Quantity, COGS mode, and cost visible for quick verification before receiving."
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
            ? "This purchase order has no line items yet. Open Classic to add lines."
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
        antiDriftSummary="Support-grid release gate: COGS mode and quantity parity with the selected PO."
        minHeight={220}
      />

      {/* Status bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* Inspector panel */}
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
        footer={
          selectedRow ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenClassic(selectedRow.poId)}
            >
              <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
              Open Classic PO Surface
            </Button>
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
              </InspectorField>
              <InspectorField label="Status">
                <p>{selectedRow.statusLabel}</p>
              </InspectorField>
              <InspectorField label="Order Date">
                <p>{formatDate(selectedRow.orderDate)}</p>
              </InspectorField>
              {selectedRow.expectedDeliveryDate ? (
                <InspectorField label="Expected Delivery">
                  <p>{formatDate(selectedRow.expectedDeliveryDate)}</p>
                </InspectorField>
              ) : null}
              <InspectorField label="Payment Terms">
                <p>{selectedRow.paymentTerms}</p>
              </InspectorField>
              <InspectorField label="Total">
                <p className="font-semibold">
                  {formatCurrency(selectedRow.total)}
                </p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Line Items">
              {lineItemRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {detailQuery.isLoading
                    ? "Loading..."
                    : "No line items for this PO."}
                </p>
              ) : (
                <div className="space-y-2">
                  {lineItemRows.map(line => (
                    <div
                      key={line.lineId}
                      className="rounded border p-2 text-sm bg-muted/20"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{line.productName}</span>
                        <span>{formatCurrency(line.lineTotal)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Qty: {line.quantityOrdered} · Cost:{" "}
                        {line.unitCostDisplay} · COGS: {line.cogsMode}
                        {line.quantityReceived > 0
                          ? ` · Received: ${line.quantityReceived}`
                          : ""}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-sm font-medium">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        lineItemRows.reduce((sum, r) => sum + r.lineTotal, 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Receiving Handoff">
              <InspectorField label="Receivable">
                <p>
                  {selectedRow.isReceivable
                    ? "Yes — PO is eligible for receiving"
                    : `No — status must be Confirmed or Receiving (current: ${selectedRow.statusLabel})`}
                </p>
              </InspectorField>
              {selectedRow.isReceivable ? (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleLaunchReceiving}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Launch Receiving
                </Button>
              ) : null}
            </InspectorSection>

            <InspectorSection title="Status Transitions">
              <div className="grid grid-cols-2 gap-2">
                {availableTransitions.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition(status)}
                    disabled={updateStatus.isPending}
                  >
                    {PO_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>

      {/* Delete draft confirmation */}
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

      {/* Status transition confirmation */}
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
          updateStatus.isPending
            ? "Updating..."
            : `Set to ${pendingStatusChange ? (PO_STATUS_LABELS[pendingStatusChange.status] ?? pendingStatusChange.status) : ""}`
        }
        onConfirm={handleStatusConfirm}
      />

      {/* COGS note: Bulk COGS update is available via Classic surface until a dedicated
          document grid is built for this pilot. This is documented as an accepted limitation
          for PROC-PO-004 pending a follow-up document-sheet implementation. */}
      {selectedRow && !selectedRow.isDraft ? (
        <div className="flex items-center gap-2 rounded border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Plus className="h-3 w-3 shrink-0" />
          Bulk COGS update and inline line editing are available in the Classic
          surface. Use{" "}
          <button
            className="underline underline-offset-2"
            onClick={() => onOpenClassic(selectedRow.poId)}
          >
            Open Classic PO Surface
          </button>{" "}
          for those operations.
        </div>
      ) : null}
    </div>
  );
}

export default PurchaseOrdersPilotSurface;
