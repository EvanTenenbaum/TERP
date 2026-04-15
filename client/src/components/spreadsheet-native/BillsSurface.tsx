/**
 * BillsSurface — TER-976
 *
 * Unified sheet-native surface for Bills (AP). Replaces the classic Bills.tsx
 * page (543 lines) with the same layout pattern as InvoicesSurface.
 *
 * Layout (top -> bottom):
 *   1. Toolbar: title + KPI badges + AP Aging toggle + search + refresh
 *   2. Action Bar: 8 status filter tabs + workflow actions
 *   3. Grid + Collapsible Inspector (with Vendor AP Context card)
 *   4. AP Aging Panel (collapsible, red tone)
 *   5. Status Bar: WorkSurfaceStatusBar + KeyboardHintBar
 *   6. Sidecar: PayVendorModal
 *
 * Spec: docs/superpowers/specs/2026-03-27-unified-sheet-native-accounting-design.md
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  DollarSign,
  PackageCheck,
  XCircle,
  CalendarClock,
  RefreshCw,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PayVendorModal } from "@/components/accounting/PayVendorModal";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import { getInvoiceStatusLabel, getInvoiceStatusClass } from "@/lib/statusTokens";
import { cn } from "@/lib/utils";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
import { buildRelationshipProfilePath } from "@/lib/relationshipProfile";

// ============================================================================
// TYPES
// ============================================================================

export type BillStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

interface BillItem {
  id: number;
  billNumber: string;
  vendorId: number;
  vendorName?: string;
  billDate: Date | string;
  dueDate: Date | string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: BillStatus;
}

export interface BillGridRow {
  rowKey: string;
  billId: number;
  billNumber: string;
  vendorName: string;
  vendorId: number;
  billDate: string;
  dueDate: string;
  dueDateRaw: string;
  totalAmount: string;
  totalAmountFormatted: string;
  amountDue: string;
  amountDueFormatted: string;
  amountPaid: string;
  status: string;
  daysOverdue: number;
}

export type BillStatusTab =
  | "ALL"
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const BILL_STATUS_TABS: Array<{ value: BillStatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

// Bill-specific status overrides for AP-only workflow states
const BILL_STATUS_OVERRIDES: Record<string, string> = {
  PENDING: "bg-blue-50 text-blue-700 border border-blue-200",
  APPROVED: "bg-purple-50 text-purple-700 border border-purple-200",
  VOID: "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

function getBillStatusClass(status: string): string {
  return BILL_STATUS_OVERRIDES[status] ?? getInvoiceStatusClass(status);
}

function getBillStatusLabel(status: string): string {
  return getInvoiceStatusLabel(status);
}

const AP_AGING_TOKENS: Record<string, string> = {
  current: "bg-green-50 border-green-200 text-green-700",
  "30": "bg-yellow-50 border-yellow-200 text-yellow-700",
  "60": "bg-orange-50 border-orange-200 text-orange-700",
  "90": "bg-red-50 border-red-200 text-red-700",
  "90+": "bg-red-100 border-red-300 text-red-800",
};

const registryAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

const keyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: "Escape", label: "close inspector" },
];

const PAGE_SIZE = 50;

const AGING_STORAGE_KEY = "bills-surface-ap-aging-open";

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatCurrencyCompact = (
  value: string | number | null | undefined
): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, "MMM d, yyyy");
  } catch {
    return "-";
  }
};

const getDaysOverdue = (dueDate: Date | string): number => {
  const due = new Date(dueDate);
  return Math.max(0, differenceInDays(new Date(), due));
};

// ============================================================================
// ROW MAPPING
// ============================================================================

function mapBillsToGridRows(items: BillItem[]): BillGridRow[] {
  // Deduplicate by bill ID
  const seen = new Set<number>();
  const uniqueItems = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return uniqueItems.map(item => {
    const vendorName = item.vendorName ?? `Vendor #${item.vendorId}`;
    const totalAmount = String(item.totalAmount ?? "0");
    const totalAmountNum = parseFloat(totalAmount);
    const amountPaidRaw = parseFloat(String(item.amountPaid ?? "0"));
    const status = item.status ?? "DRAFT";

    // Clamp amountDue. PAID/VOID -> $0.00.
    const rawAmountDue = parseFloat(String(item.amountDue ?? "0"));
    const amountDueNum =
      status === "PAID" || status === "VOID"
        ? 0
        : Math.max(0, Math.min(rawAmountDue, totalAmountNum));
    const amountDue = amountDueNum.toFixed(2);
    const amountPaid = Math.min(amountPaidRaw, totalAmountNum).toFixed(2);

    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const daysOverdue =
      status === "OVERDUE" && dueDate ? getDaysOverdue(dueDate) : 0;

    return {
      rowKey: String(item.id),
      billId: item.id,
      billNumber: item.billNumber ?? "-",
      vendorName,
      vendorId: item.vendorId,
      billDate: formatDate(item.billDate),
      dueDate: formatDate(item.dueDate),
      dueDateRaw: dueDate ? dueDate.toISOString() : "",
      totalAmount,
      totalAmountFormatted: formatCurrency(totalAmount),
      amountDue,
      amountDueFormatted: formatCurrency(amountDue),
      amountPaid,
      status,
      daysOverdue,
    };
  });
}

// ============================================================================
// STATUS BADGE CELL RENDERER
// ============================================================================

function statusCellRenderer(params: { value: string }): string {
  const status = params.value ?? "DRAFT";
  const color = getBillStatusClass(status);
  const label = getBillStatusLabel(status);
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}">${label}</span>`;
}

// ============================================================================
// COLUMN DEFS — Bill grid
// ============================================================================

const billColumnDefs: ColDef<BillGridRow>[] = [
  {
    field: "billNumber",
    headerName: "Bill #",
    minWidth: 130,
    maxWidth: 160,
    cellClass: "powersheet-cell--locked font-mono",
  },
  {
    field: "vendorName",
    headerName: "Vendor",
    flex: 1.4,
    minWidth: 180,
    cellClass: "powersheet-cell--locked text-blue-600 cursor-pointer",
  },
  {
    field: "billDate",
    headerName: "Date",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "dueDate",
    headerName: "Due",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    cellRenderer: (params: { data?: BillGridRow; value: string }) => {
      if (!params.data) return params.value ?? "-";
      if (params.data.daysOverdue > 0) {
        return `<span class="text-red-600 font-medium">${params.value}</span> <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium ml-1">${params.data.daysOverdue}d</span>`;
      }
      return params.value ?? "-";
    },
  },
  {
    field: "totalAmountFormatted",
    headerName: "Total",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
  },
  {
    field: "amountDueFormatted",
    headerName: "Due Amt",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    cellRenderer: (params: { data?: BillGridRow; value: string }) => {
      if (!params.data) return params.value ?? "-";
      const due = parseFloat(params.data.amountDue);
      if (due > 0) {
        return `<span class="text-red-600 font-bold font-mono">${params.value}</span>`;
      }
      return `<span class="font-mono">${params.value}</span>`;
    },
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    cellRenderer: statusCellRenderer,
  },
];

// ============================================================================
// MAIN SURFACE
// ============================================================================

export function BillsSurface() {
  const _routeSearch = useSearch();
  const [, navigate] = useLocation();

  // Selection tracked in URL param
  const { selectedId: selectedBillId, setSelectedId: setSelectedBillId } =
    useSpreadsheetSelectionParam("billId");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillStatusTab>("ALL");
  const [page, setPage] = useState(1);
  const [showAging, setShowAging] = useState(() => {
    try {
      return localStorage.getItem(AGING_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [showPayVendorModal, setShowPayVendorModal] = useState(false);
  const [payVendorPreselectedBillId, setPayVendorPreselectedBillId] = useState<
    number | undefined
  >(undefined);
  const [payVendorPreselectedVendorId, setPayVendorPreselectedVendorId] =
    useState<number | undefined>(undefined);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  // Persist aging panel state
  const toggleAging = useCallback(() => {
    setShowAging(v => {
      const next = !v;
      try {
        localStorage.setItem(AGING_STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const billsQuery = trpc.accounting.bills.list.useQuery({
    status:
      statusFilter !== "ALL"
        ? (statusFilter as Exclude<BillStatusTab, "ALL">)
        : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const apSummaryQuery = trpc.accounting.arApDashboard.getAPSummary.useQuery();
  const overdueBillsQuery =
    trpc.accounting.arApDashboard.getOverdueBills.useQuery({ limit: 100 });

  const billDetailQuery = trpc.accounting.bills.getById.useQuery(
    { id: selectedBillId ?? 0 },
    { enabled: selectedBillId !== null }
  );

  const apAgingQuery = trpc.accounting.bills.getAPAging.useQuery(undefined, {
    enabled: showAging,
  });

  const updateStatusMutation = trpc.accounting.bills.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Bill status updated");
      void utils.accounting.bills.list.invalidate();
      void utils.accounting.arApDashboard.getAPSummary.invalidate();
    },
    onError: (err: { message: string }) =>
      toast.error(err.message || "Failed to update status"),
  });

  const utils = trpc.useUtils();

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const rawItems = useMemo(
    () => (billsQuery.data?.items ?? []) as BillItem[],
    [billsQuery.data]
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return rawItems;
    const q = searchTerm.trim().toLowerCase();
    return rawItems.filter(item => {
      const billNum = (item.billNumber ?? "").toLowerCase();
      const vendor = (item.vendorName ?? "").toLowerCase();
      return billNum.includes(q) || vendor.includes(q);
    });
  }, [rawItems, searchTerm]);

  const gridRows = useMemo(
    () => mapBillsToGridRows(filteredItems),
    [filteredItems]
  );

  const selectedRow = gridRows.find(r => r.billId === selectedBillId) ?? null;

  // KPI values
  const apSummary = apSummaryQuery.data ?? { totalAP: 0, billCount: 0 };
  const overdueCount = overdueBillsQuery.data?.pagination?.total ?? 0;

  // Vendor AP context: bills from the same vendor as selected bill
  const vendorAPContext = useMemo(() => {
    if (!selectedRow) return null;
    const vendorBills = gridRows.filter(
      r => r.vendorId === selectedRow.vendorId
    );
    const openBills = vendorBills.filter(
      r =>
        r.status !== "PAID" &&
        r.status !== "VOID" &&
        r.billId !== selectedRow.billId
    );
    const totalOwed = vendorBills
      .filter(r => r.status !== "PAID" && r.status !== "VOID")
      .reduce((sum, r) => sum + parseFloat(r.amountDue), 0);
    return {
      vendorName: selectedRow.vendorName,
      vendorId: selectedRow.vendorId,
      totalOwed,
      openBillCount: openBills.length,
      openBills,
    };
  }, [selectedRow, gridRows]);

  // AP Aging buckets
  const agingBuckets = useMemo(() => {
    const data = apAgingQuery.data as
      | {
          current: number;
          days30: number;
          days60: number;
          days90: number;
          days90Plus: number;
          currentCount?: number;
          days30Count?: number;
          days60Count?: number;
          days90Count?: number;
          days90PlusCount?: number;
        }
      | null
      | undefined;
    if (!data) return [];
    return [
      {
        key: "current",
        label: "Current",
        amount: data.current,
        count: data.currentCount ?? 0,
        colorClass: AP_AGING_TOKENS.current,
      },
      {
        key: "30",
        label: "1-30 Days",
        amount: data.days30,
        count: data.days30Count ?? 0,
        colorClass: AP_AGING_TOKENS["30"],
      },
      {
        key: "60",
        label: "31-60 Days",
        amount: data.days60,
        count: data.days60Count ?? 0,
        colorClass: AP_AGING_TOKENS["60"],
      },
      {
        key: "90",
        label: "61-90 Days",
        amount: data.days90,
        count: data.days90Count ?? 0,
        colorClass: AP_AGING_TOKENS["90"],
      },
      {
        key: "90+",
        label: "90+ Days",
        amount: data.days90Plus,
        count: data.days90PlusCount ?? 0,
        colorClass: AP_AGING_TOKENS["90+"],
      },
    ];
  }, [apAgingQuery.data]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handlePayVendor = useCallback(() => {
    if (!selectedRow) return;
    setPayVendorPreselectedBillId(selectedRow.billId);
    setPayVendorPreselectedVendorId(selectedRow.vendorId);
    setShowPayVendorModal(true);
  }, [selectedRow]);

  const handlePayAllOpen = useCallback(() => {
    if (!selectedRow) return;
    setPayVendorPreselectedBillId(undefined);
    setPayVendorPreselectedVendorId(selectedRow.vendorId);
    setShowPayVendorModal(true);
  }, [selectedRow]);

  const handleMarkReceived = useCallback(() => {
    if (!selectedRow) return;
    updateStatusMutation.mutate({
      id: selectedRow.billId,
      status: "APPROVED",
    });
  }, [selectedRow, updateStatusMutation]);

  const handleVoid = useCallback(() => {
    if (!selectedRow) return;
    setShowVoidDialog(true);
  }, [selectedRow]);

  const handleVoidConfirm = useCallback(() => {
    if (!selectedRow) return;
    updateStatusMutation.mutate(
      { id: selectedRow.billId, status: "VOID" },
      { onSuccess: () => setShowVoidDialog(false) }
    );
  }, [selectedRow, updateStatusMutation]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayVendorModal(false);
    void utils.accounting.bills.list.invalidate();
    void utils.accounting.arApDashboard.getAPSummary.invalidate();
    void utils.accounting.arApDashboard.getOverdueBills.invalidate();
  }, [utils]);

  // ─── Action-state helpers ──────────────────────────────────────────────────

  const isActionable =
    selectedRow &&
    selectedRow.status !== "PAID" &&
    selectedRow.status !== "VOID";
  const canMarkReceived =
    selectedRow?.status === "PENDING" || selectedRow?.status === "DRAFT";
  const canVoid = selectedRow && selectedRow.status !== "VOID";

  // ─── Status bar ────────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {statusFilter !== "ALL" ? statusFilter : "All"} |{" "}
      {billsQuery.data?.pagination?.total ?? 0} total
      {selectedRow ? ` | ${selectedRow.vendorName}` : ""}
    </span>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* ── 1. Toolbar ── */}
      <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 shadow-sm">
        <span className="font-bold text-xs">Bills</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
        >
          {formatCurrencyCompact(apSummary.totalAP)} AP
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200"
        >
          {overdueCount} overdue
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
        >
          {apSummary.billCount} total
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[9px] px-2 ml-1"
          onClick={toggleAging}
          data-testid="ap-aging-toggle"
        >
          <CalendarClock className="h-3 w-3 mr-1" />
          AP Aging
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search bill # or vendor"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              data-testid="bills-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => void billsQuery.refetch()}
            aria-label="Refresh bills"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="mx-2 flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex-wrap shadow-sm">
        {/* Status filter tabs */}
        {BILL_STATUS_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
              setSearchTerm("");
            }}
            data-testid={`status-tab-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="h-5 text-[9px] px-2 bg-amber-600 hover:bg-amber-700 text-white"
            disabled={!isActionable}
            onClick={handlePayVendor}
            data-testid="action-pay-vendor"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Pay Vendor
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!canMarkReceived || updateStatusMutation.isPending}
            onClick={handleMarkReceived}
            data-testid="action-mark-received"
          >
            <PackageCheck className="h-3 w-3 mr-1" />
            Mark Received
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2 text-red-600 hover:text-red-700"
            disabled={!canVoid}
            onClick={handleVoid}
            data-testid="action-void"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Void
          </Button>
        </div>
      </div>

      {/* ── 3. Grid + Collapsible Inspector ── */}
      <div className="flex flex-1 min-h-0">
        <div className={cn("flex-1", selectedRow && "flex-[3]")}>
          <PowersheetGrid
            surfaceId="bills-unified"
            requirementIds={["BILL-001", "BILL-002", "BILL-003"]}
            affordances={registryAffordances}
            title="Bills"
            rows={gridRows}
            columnDefs={billColumnDefs}
            getRowId={row => row.rowKey}
            selectedRowId={selectedRow?.rowKey ?? null}
            onSelectedRowChange={row => setSelectedBillId(row?.billId ?? null)}
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={false}
            onSelectionSummaryChange={setSelectionSummary}
            isLoading={billsQuery.isLoading}
            errorMessage={billsQuery.error?.message ?? null}
            emptyTitle="No bills match"
            emptyDescription="Adjust the search or status filter."
            summary={
              <span className="text-[10px]">
                {gridRows.length} visible ·{" "}
                {billsQuery.data?.pagination?.total ?? 0} total ·{" "}
                {statusFilter !== "ALL" ? statusFilter : "All statuses"}
              </span>
            }
            minHeight={320}
          />
        </div>

        {/* Inspector panel (~25% right) */}
        {selectedRow && (
          <InspectorPanel
            isOpen
            onClose={() => setSelectedBillId(null)}
            title={selectedRow.billNumber}
            subtitle={selectedRow.vendorName}
            headerActions={
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px]",
                  getBillStatusClass(selectedRow.status)
                )}
              >
                {getBillStatusLabel(selectedRow.status)}
              </Badge>
            }
          >
            {/* Overview */}
            <InspectorSection title="Overview" defaultOpen>
              <InspectorField label="Vendor">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600">
                    {selectedRow.vendorName}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        buildRelationshipProfilePath(selectedRow.vendorId)
                      )
                    }
                  >
                    Open vendor profile
                  </Button>
                </div>
              </InspectorField>
              <InspectorField label="Bill Date">
                <p className="text-sm">{selectedRow.billDate}</p>
              </InspectorField>
              <InspectorField label="Due Date">
                <div className="flex items-center gap-1">
                  <p
                    className={
                      selectedRow.daysOverdue > 0
                        ? "text-red-600 font-medium text-sm"
                        : "text-sm"
                    }
                  >
                    {selectedRow.dueDate}
                  </p>
                  {selectedRow.daysOverdue > 0 && (
                    <Badge variant="destructive" className="text-[9px]">
                      {selectedRow.daysOverdue}d overdue
                    </Badge>
                  )}
                </div>
              </InspectorField>
            </InspectorSection>

            {/* Amounts */}
            <InspectorSection title="Amounts" defaultOpen>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(selectedRow.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono text-green-600">
                    {formatCurrency(selectedRow.amountPaid)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Due</span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      parseFloat(selectedRow.amountDue) > 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(selectedRow.amountDue)}
                  </span>
                </div>
              </div>
            </InspectorSection>

            {/* Line Items */}
            <InspectorSection title="Line Items" defaultOpen>
              {billDetailQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading line items...
                </p>
              ) : (billDetailQuery.data as { lineItems?: unknown[] } | null)
                  ?.lineItems?.length ? (
                <div className="space-y-2">
                  {(
                    billDetailQuery.data as unknown as {
                      lineItems: Array<{
                        id: number;
                        description: string;
                        quantity: string;
                        unitPrice: string;
                        lineTotal: string;
                      }>;
                    }
                  ).lineItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between text-sm border rounded p-2"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">
                          {item.description}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Qty {item.quantity} &times;{" "}
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-mono font-medium shrink-0">
                        {formatCurrency(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No line items recorded for this bill.
                </p>
              )}
            </InspectorSection>

            {/* Vendor AP Context — key differentiator */}
            {vendorAPContext && (
              <InspectorSection title="Vendor AP Context" defaultOpen>
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total owed to {vendorAPContext.vendorName}
                    </span>
                    <span className="font-mono font-bold text-orange-700">
                      {formatCurrency(vendorAPContext.totalOwed)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Open bills from vendor
                    </span>
                    <span className="font-semibold">
                      {vendorAPContext.openBillCount}
                    </span>
                  </div>
                  {vendorAPContext.openBills.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-orange-200">
                      <p className="text-xs text-muted-foreground font-medium">
                        Other open bills:
                      </p>
                      {vendorAPContext.openBills.map(b => (
                        <div
                          key={b.billId}
                          className="flex justify-between text-xs"
                        >
                          <span className="font-mono">{b.billNumber}</span>
                          <span className="font-mono text-red-600">
                            {formatCurrency(b.amountDue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </InspectorSection>
            )}

            {/* Quick Actions */}
            <InspectorSection title="Quick Actions" defaultOpen>
              <div className="space-y-1">
                {isActionable && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start h-6 text-xs bg-amber-600 hover:bg-amber-700"
                    onClick={handlePayVendor}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Pay This Bill
                  </Button>
                )}
                {isActionable &&
                  vendorAPContext &&
                  vendorAPContext.openBillCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-6 text-xs"
                      onClick={handlePayAllOpen}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Pay All Open
                    </Button>
                  )}
                {canVoid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-6 text-xs text-red-600"
                    onClick={handleVoid}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Void Bill
                  </Button>
                )}
              </div>
            </InspectorSection>
          </InspectorPanel>
        )}
      </div>

      {/* ── 4. AP Aging Panel (collapsible, red tone) ── */}
      {showAging && (
        <div className="mx-2 my-1.5 p-2 bg-red-50/40 border border-red-200 rounded-md">
          <h3 className="font-semibold text-xs mb-1.5">AP Aging Report</h3>
          {apAgingQuery.isLoading ? (
            <p className="text-[10px] text-muted-foreground">
              Loading aging data...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {agingBuckets.map(bucket => (
                <div
                  key={bucket.key}
                  className={cn(
                    "px-2 py-1 rounded border text-center",
                    bucket.colorClass
                  )}
                >
                  <div className="text-[9px] font-medium">{bucket.label}</div>
                  <div className="text-sm font-bold">
                    {formatCurrency(bucket.amount)}
                  </div>
                  <div className="text-[8px] text-muted-foreground">
                    {bucket.count} {bucket.count === 1 ? "bill" : "bills"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Status Bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        right={<KeyboardHintBar hints={keyboardHints} />}
      />

      {/* ── 6. Sidecar: PayVendorModal ── */}
      <PayVendorModal
        open={showPayVendorModal}
        onOpenChange={setShowPayVendorModal}
        preselectedBillId={payVendorPreselectedBillId}
        preselectedVendorId={payVendorPreselectedVendorId}
        onSuccess={handlePaymentSuccess}
      />

      {/* Void Confirmation Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent data-testid="void-bill-dialog">
          <DialogHeader>
            <DialogTitle>Void Bill</DialogTitle>
            <DialogDescription>
              Void bill <strong>{selectedRow?.billNumber}</strong>? This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={updateStatusMutation.isPending}
              onClick={handleVoidConfirm}
              data-testid="void-bill-confirm"
            >
              {updateStatusMutation.isPending ? "Voiding..." : "Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BillsSurface;
