/**
 * PaymentsPilotSurface — TER-812
 *
 * Sheet-native payments registry (Ledger+Inspector family).
 * Implements PAY-001 through PAY-014 capability ledger.
 *
 * Layout:
 *   1. KPI summary cards (PAY-005)
 *   2. Search + type filter bar (PAY-001, PAY-002)
 *   3. PowersheetGrid registry (PAY-001, PAY-003)
 *   4. Action buttons: Record Payment, Void Payment
 *   5. WorkSurfaceStatusBar + KeyboardHintBar
 *   6. InvoiceToPaymentFlow dialog (PAY-006 through PAY-013)
 *   7. Void confirmation dialog (PAY-014)
 *
 * Deep-link support: ?id=, ?invoiceId=, ?orderId= (PAY-004)
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Ban,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { InvoiceToPaymentFlow } from "@/components/work-surface/golden-flows/InvoiceToPaymentFlow";

import { usePermissions } from "@/hooks/usePermissions";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PaymentListResponse = RouterOutputs["accounting"]["payments"]["list"];
type PaymentItem = PaymentListResponse extends { items: Array<infer Item> }
  ? Item
  : never;

type PaymentSortField =
  | "paymentDate"
  | "amount"
  | "paymentType"
  | "paymentNumber";

type PaymentTypeFilter = "ALL" | "RECEIVED" | "SENT";

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const registryAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Sort", available: true },
  { label: "Filter", available: true },
];

const keyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

// ============================================================================
// HELPERS
// ============================================================================

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, "MMM dd, yyyy");
  } catch {
    return "-";
  }
};

function paymentMatchesSearch(payment: PaymentItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return [
    String(payment.id),
    payment.paymentNumber ?? "",
    payment.referenceNumber ?? "",
    payment.invoiceId ? String(payment.invoiceId) : "",
  ].some(v => v.toLowerCase().includes(q));
}

// ============================================================================
// PAYMENT ROW (grid row shape)
// ============================================================================

interface PaymentGridRow {
  /** Stable rowKey for AG Grid */
  rowKey: string;
  id: number;
  paymentNumber: string;
  paymentDate: string;
  paymentType: string;
  paymentMethod: string;
  amount: string;
  amountFormatted: string;
  referenceNumber: string;
  invoiceId: number | null;
  notes: string;
}

function mapToGridRows(payments: PaymentItem[]): PaymentGridRow[] {
  return payments.map(p => ({
    rowKey: String(p.id),
    id: p.id,
    paymentNumber: p.paymentNumber ?? "-",
    paymentDate: formatDate(p.paymentDate as string | Date | null | undefined),
    paymentType: p.paymentType ?? "-",
    paymentMethod: (p.paymentMethod ?? "-").replace(/_/g, " "),
    amount: p.amount ?? "0",
    amountFormatted: formatCurrency(p.amount ?? "0"),
    referenceNumber: p.referenceNumber ?? "-",
    invoiceId: p.invoiceId ?? null,
    notes: p.notes ?? "",
  }));
}

// ============================================================================
// COLUMN DEFS
// ============================================================================

const columnDefs: ColDef<PaymentGridRow>[] = [
  {
    field: "paymentNumber",
    headerName: "Payment #",
    minWidth: 130,
    maxWidth: 160,
    cellClass: "powersheet-cell--locked font-mono",
    headerTooltip: "Read-only: payment number assigned at creation.",
  },
  {
    field: "paymentDate",
    headerName: "Date",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: date payment was recorded.",
  },
  {
    field: "paymentType",
    headerName: "Type",
    minWidth: 100,
    maxWidth: 120,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: RECEIVED or SENT.",
    cellRenderer: (params: { value: string }) => {
      if (!params.value || params.value === "-") return "-";
      const color =
        params.value === "RECEIVED"
          ? "text-green-700 bg-green-50 border-green-200"
          : "text-red-700 bg-red-50 border-red-200";
      return `<span class="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${color}">${params.value}</span>`;
    },
  },
  {
    field: "paymentMethod",
    headerName: "Method",
    minWidth: 120,
    maxWidth: 160,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: payment method used.",
  },
  {
    field: "amountFormatted",
    headerName: "Amount",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    headerTooltip: "Read-only: payment amount.",
  },
  {
    field: "referenceNumber",
    headerName: "Reference",
    flex: 1,
    minWidth: 120,
    cellClass: "powersheet-cell--locked text-muted-foreground",
    headerTooltip: "Read-only: reference number or check number.",
  },
  {
    field: "invoiceId",
    headerName: "Invoice",
    minWidth: 90,
    maxWidth: 110,
    cellClass: "powersheet-cell--locked font-mono",
    headerTooltip: "Read-only: linked invoice ID.",
    valueFormatter: params => (params.value ? `#${String(params.value)}` : "-"),
  },
];

// ============================================================================
// KPI CARDS
// ============================================================================

interface KpiCardsProps {
  totalCount: number;
  totalReceived: number;
  totalSent: number;
  isLoading: boolean;
}

function KpiCards({
  totalCount,
  totalReceived,
  totalSent,
  isLoading,
}: KpiCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : totalCount}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Received</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {isLoading ? "—" : formatCurrency(totalReceived)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sent</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {isLoading ? "—" : formatCurrency(totalSent)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// VOID DIALOG
// ============================================================================

interface VoidDialogProps {
  payment: PaymentGridRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paymentId: number, reason: string) => void;
  isPending: boolean;
}

function VoidDialog({
  payment,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: VoidDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = useCallback(() => {
    if (!payment) return;
    if (!reason.trim()) {
      toast.error("A void reason is required.");
      return;
    }
    onConfirm(payment.id, reason.trim());
  }, [payment, reason, onConfirm]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setReason("");
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            Void Payment
          </DialogTitle>
          <DialogDescription>
            This action is irreversible. The payment will be marked as voided
            and the linked invoice balance will be restored.
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-mono font-medium">
                  {payment.paymentNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-semibold text-red-600">
                  {payment.amountFormatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{payment.paymentDate}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="void-reason">
                Reason for void{" "}
                <span className="text-red-500" aria-label="required">
                  *
                </span>
              </Label>
              <Textarea
                id="void-reason"
                placeholder="Describe why this payment is being voided..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                disabled={isPending}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Voiding..." : "Void Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN SURFACE
// ============================================================================

interface PaymentsPilotSurfaceProps {
  onOpenClassic?: () => void;
}

export function PaymentsPilotSurface({
  onOpenClassic,
}: PaymentsPilotSurfaceProps) {
  const search = useSearch();
  const { hasPermission } = usePermissions();
  const canVoid = hasPermission("accounting:delete");

  // PAY-004: Deep-link support (?id=, ?invoiceId= only — orderId not supported by API)
  const routeParams = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      paymentId: parsePositiveInt(params.get("id")),
      invoiceId: parsePositiveInt(params.get("invoiceId")),
    };
  }, [search]);

  // Filter/search state — PAY-001, PAY-002, PAY-003
  const [searchQuery, setSearchQuery] = useState(() => {
    if (routeParams.paymentId !== null) return String(routeParams.paymentId);
    return "";
  });
  const [typeFilter, setTypeFilter] = useState<PaymentTypeFilter>("ALL");
  const [sortField, setSortField] = useState<PaymentSortField>("paymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Selection state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [registrySelectionSummary, setRegistrySelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Dialog state
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  // Data query — PAY-001
  const paymentsQuery = trpc.accounting.payments.list.useQuery({
    paymentType:
      typeFilter !== "ALL" ? (typeFilter as "RECEIVED" | "SENT") : undefined,
    invoiceId: routeParams.invoiceId ?? undefined,
  });

  // Void mutation — PAY-014, DISC-PAY-005
  const voidMutation = trpc.payments.void.useMutation({
    onSuccess: () => {
      toast.success("Payment voided successfully.");
      setVoidDialogOpen(false);
      setSelectedRowId(null);
      void paymentsQuery.refetch();
    },
    onError: err => {
      console.error("[PaymentsPilotSurface] void mutation error:", err);
      toast.error(err.message || "Failed to void payment. Please try again.");
    },
  });

  // Build grid rows — PAY-001, PAY-003
  const gridRows = useMemo((): PaymentGridRow[] => {
    const raw = paymentsQuery.data?.items ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Client-side search filter
    const searched = normalizedQuery
      ? raw.filter(p => paymentMatchesSearch(p, normalizedQuery))
      : raw;

    // Deep-link filter by paymentId
    const routeFiltered =
      routeParams.paymentId !== null
        ? searched.filter(p => p.id === routeParams.paymentId)
        : searched;

    // Sort — PAY-003
    const sorted = [...routeFiltered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "paymentDate": {
          const aDate =
            a.paymentDate instanceof Date
              ? a.paymentDate
              : new Date(String(a.paymentDate));
          const bDate =
            b.paymentDate instanceof Date
              ? b.paymentDate
              : new Date(String(b.paymentDate));
          cmp = aDate.getTime() - bDate.getTime();
          break;
        }
        case "amount":
          cmp = parseFloat(a.amount ?? "0") - parseFloat(b.amount ?? "0");
          break;
        case "paymentType":
          cmp = (a.paymentType ?? "").localeCompare(b.paymentType ?? "");
          break;
        case "paymentNumber":
          cmp = (a.paymentNumber ?? "").localeCompare(b.paymentNumber ?? "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return mapToGridRows(sorted);
  }, [
    paymentsQuery.data,
    searchQuery,
    sortField,
    sortDirection,
    routeParams.paymentId,
  ]);

  // KPI totals — PAY-005 (computed from filtered gridRows, not raw API response)
  const kpiTotals = useMemo(() => {
    return {
      totalCount: gridRows.length,
      totalReceived: gridRows
        .filter(r => r.paymentType === "RECEIVED")
        .reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0),
      totalSent: gridRows
        .filter(r => r.paymentType === "SENT")
        .reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0),
    };
  }, [gridRows]);

  // Selected row lookup
  const selectedRow = useMemo(
    () => gridRows.find(r => r.rowKey === selectedRowId) ?? null,
    [gridRows, selectedRowId]
  );

  // Invoice ID to open the payment flow dialog.
  // If a row is selected and has an invoiceId, use it. Fall back to URL invoiceId.
  const invoiceIdForFlow =
    selectedRow?.invoiceId ?? routeParams.invoiceId ?? null;

  const handleVoidConfirm = useCallback(
    (paymentId: number, reason: string) => {
      voidMutation.mutate({ id: paymentId, reason });
    },
    [voidMutation]
  );

  const handlePaymentRecorded = useCallback(
    (_paymentId: number) => {
      void paymentsQuery.refetch();
    },
    [paymentsQuery]
  );

  // Status bar copy
  const statusLeft = (
    <span>
      {gridRows.length} payment{gridRows.length !== 1 ? "s" : ""} visible
      {typeFilter !== "ALL" ? ` \u00b7 ${typeFilter.toLowerCase()} only` : ""}
    </span>
  );

  const statusCenter = selectedRow ? (
    <span>
      Selected: {selectedRow.paymentNumber} &middot;{" "}
      {selectedRow.amountFormatted}
    </span>
  ) : registrySelectionSummary ? (
    <span>
      {registrySelectionSummary.selectedCellCount} cells selected &middot;{" "}
      {registrySelectionSummary.selectedRowCount} rows
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* PAY-005: KPI Summary Cards */}
      <KpiCards
        totalCount={kpiTotals.totalCount}
        totalReceived={kpiTotals.totalReceived}
        totalSent={kpiTotals.totalSent}
        isLoading={paymentsQuery.isLoading}
      />

      {/* Search + Filter + Sort bar — PAY-001, PAY-002, PAY-003 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px] max-w-sm relative">
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-8"
            aria-label="Search payments"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {/* PAY-002: Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <div className="flex gap-1">
            {(["ALL", "RECEIVED", "SENT"] as const).map(t => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {t === "ALL" ? "All" : t === "RECEIVED" ? "Received" : "Sent"}
              </Button>
            ))}
          </div>
        </div>

        {/* PAY-003: Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <select
            className="text-sm border rounded px-2 py-1 bg-background"
            value={sortField}
            onChange={e => setSortField(e.target.value as PaymentSortField)}
            aria-label="Sort field"
          >
            <option value="paymentDate">Date</option>
            <option value="amount">Amount</option>
            <option value="paymentType">Type</option>
            <option value="paymentNumber">Payment #</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
            }
            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
          >
            {sortDirection === "asc" ? "\u2191" : "\u2193"}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void paymentsQuery.refetch()}
            disabled={paymentsQuery.isFetching}
            aria-label="Refresh payments"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${paymentsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          {/* PAY-006 through PAY-013: Open guided payment flow */}
          <Button
            size="sm"
            onClick={() => setRecordPaymentOpen(true)}
            disabled={invoiceIdForFlow === null}
            title={
              invoiceIdForFlow === null
                ? "Select a payment with an invoice, or navigate from an invoice"
                : "Record a payment against the linked invoice"
            }
          >
            Record Payment
          </Button>

          {/* PAY-014: Void payment (gated on accounting:delete — PAY-P2-PERM) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVoidDialogOpen(true)}
            disabled={selectedRow === null || !canVoid}
            title={
              !canVoid
                ? "You don't have permission to void payments"
                : selectedRow === null
                  ? "Select a payment row to void"
                  : `Void ${selectedRow.paymentNumber}`
            }
          >
            <Ban className="h-4 w-4 mr-1" />
            Void
          </Button>

          {/* Classic fallback toggle */}
          {onOpenClassic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenClassic}
              className="text-muted-foreground"
            >
              Classic View
            </Button>
          )}
        </div>
      </div>

      {/* PAY-001, PAY-003: Payment registry grid */}
      <PowersheetGrid
        surfaceId="payments-registry"
        requirementIds={["PAY-001", "PAY-002", "PAY-003", "PAY-004", "PAY-014"]}
        affordances={registryAffordances}
        title="Payments Registry"
        description="Read-only payment transaction ledger. Select a row to see details and take actions."
        rows={gridRows}
        columnDefs={columnDefs}
        getRowId={row => row.rowKey}
        selectedRowId={selectedRowId}
        onSelectedRowChange={row => setSelectedRowId(row?.rowKey ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setRegistrySelectionSummary}
        isLoading={paymentsQuery.isLoading}
        errorMessage={
          paymentsQuery.error
            ? (paymentsQuery.error.message ?? "Failed to load payments")
            : null
        }
        emptyTitle="No payments found"
        emptyDescription={
          searchQuery || typeFilter !== "ALL"
            ? "Adjust your search or filter to see more payments."
            : "No payments have been recorded yet."
        }
        summary={
          <span>
            {gridRows.length} payment{gridRows.length !== 1 ? "s" : ""} visible
          </span>
        }
        minHeight={360}
      />

      {/* Inspector panel — selected payment detail */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedRowId(null)}
        title={selectedRow?.paymentNumber ?? "Payment"}
        subtitle={
          selectedRow
            ? `${selectedRow.paymentType} \u00b7 ${selectedRow.paymentDate}`
            : undefined
        }
        headerActions={
          selectedRow ? (
            <Badge
              variant="outline"
              className={
                selectedRow.paymentType === "RECEIVED"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }
            >
              {selectedRow.paymentType}
            </Badge>
          ) : null
        }
        footer={
          selectedRow ? (
            <div className="flex gap-2 w-full">
              {invoiceIdForFlow !== null && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setRecordPaymentOpen(true)}
                >
                  Record Payment
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setVoidDialogOpen(true)}
                disabled={!canVoid}
                title={
                  !canVoid
                    ? "You don't have permission to void payments"
                    : undefined
                }
              >
                <Ban className="h-4 w-4 mr-1" />
                Void
              </Button>
            </div>
          ) : null
        }
      >
        {selectedRow && (
          <>
            <InspectorSection title="Payment Details">
              <InspectorField label="Payment Number">
                <p className="font-mono">{selectedRow.paymentNumber}</p>
              </InspectorField>
              <InspectorField label="Date">
                <p>{selectedRow.paymentDate}</p>
              </InspectorField>
              <InspectorField label="Type">
                <p>{selectedRow.paymentType}</p>
              </InspectorField>
              <InspectorField label="Method">
                <p>{selectedRow.paymentMethod}</p>
              </InspectorField>
              <InspectorField label="Amount">
                <p className="font-mono font-semibold">
                  {selectedRow.amountFormatted}
                </p>
              </InspectorField>
              {selectedRow.referenceNumber !== "-" && (
                <InspectorField label="Reference">
                  <p className="font-mono">{selectedRow.referenceNumber}</p>
                </InspectorField>
              )}
              {selectedRow.invoiceId !== null && (
                <InspectorField label="Invoice">
                  <p className="font-mono">#{selectedRow.invoiceId}</p>
                </InspectorField>
              )}
              {selectedRow.notes && (
                <InspectorField label="Notes">
                  <p className="text-sm text-muted-foreground">
                    {selectedRow.notes}
                  </p>
                </InspectorField>
              )}
            </InspectorSection>
          </>
        )}
      </InspectorPanel>

      {/* Status bar */}
      <WorkSurfaceStatusBar
        left={statusLeft}
        center={statusCenter}
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {/* PAY-006 through PAY-013: Guided payment flow dialog */}
      {invoiceIdForFlow !== null && (
        <InvoiceToPaymentFlow
          invoiceId={invoiceIdForFlow}
          open={recordPaymentOpen}
          onOpenChange={setRecordPaymentOpen}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {/* PAY-014, DISC-PAY-005: Void payment dialog */}
      <VoidDialog
        payment={selectedRow}
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        onConfirm={handleVoidConfirm}
        isPending={voidMutation.isPending}
      />
    </div>
  );
}

export default PaymentsPilotSurface;
