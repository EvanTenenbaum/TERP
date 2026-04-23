/**
 * PaymentsSurface — TER-976
 *
 * Unified sheet-native surface for Payments. Replaces PaymentsPilotSurface
 * (928 lines) and classic Payments.tsx (337 lines).
 *
 * Layout (top → bottom):
 *   1. Toolbar: title + KPI badges + search + refresh
 *   2. Action Bar: 3 type filter tabs + workflow actions
 *   3. Grid + Collapsible Inspector
 *   4. Status Bar: WorkSurfaceStatusBar + KeyboardHintBar
 *   5. Sidecar Dialogs: InvoiceToPaymentFlow, Void
 *
 * Deep-link support: ?id=, ?invoiceId=, ?orderId= via manual URL parsing.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { RefreshCw, Search, Ban } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";
import { PaymentModal } from "@/components/accounting/PaymentModal";

import { usePermissions } from "@/hooks/usePermissions";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import {
  fmtCurrency,
  fmtCurrencyCompact,
  fmtDate,
  REGISTRY_AFFORDANCES,
  REGISTRY_KEYBOARD_HINTS,
} from "@/lib/powersheet/surface-helpers";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PaymentListResponse = RouterOutputs["accounting"]["payments"]["list"];
type PaymentItem = PaymentListResponse extends { items: Array<infer Item> }
  ? Item
  : never;

type PaymentTypeFilter = "ALL" | "RECEIVED" | "SENT";

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_TABS: Array<{ value: PaymentTypeFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "SENT", label: "Sent" },
];

// ============================================================================
// HELPERS
// ============================================================================

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const formatCurrency = fmtCurrency;
const formatCurrencyCompact = fmtCurrencyCompact;
const formatDate = fmtDate;

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
    referenceNumber: p.referenceNumber ?? "No reference",
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
  },
  {
    field: "paymentDate",
    headerName: "Date",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "paymentType",
    headerName: "Type",
    minWidth: 100,
    maxWidth: 120,
    cellClass: "powersheet-cell--locked",
    cellRenderer: (params: { value: string }) => {
      if (!params.value || params.value === "-") return "-";
      const color =
        params.value === "RECEIVED"
          ? "text-[var(--success)] bg-[var(--success-bg)] border-green-200"
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
  },
  {
    field: "amountFormatted",
    headerName: "Amount",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    cellStyle: params => {
      const row = params.data as PaymentGridRow | undefined;
      if (!row) return undefined;
      return row.paymentType === "RECEIVED"
        ? { color: "var(--color-green-700)" }
        : row.paymentType === "SENT"
          ? { color: "var(--color-red-700)" }
          : undefined;
    },
  },
  {
    field: "invoiceId",
    headerName: "Invoice",
    minWidth: 90,
    maxWidth: 110,
    cellClass: "powersheet-cell--locked font-mono",
    valueFormatter: params => (params.value ? `#${String(params.value)}` : "-"),
  },
  {
    field: "referenceNumber",
    headerName: "Reference",
    flex: 1,
    minWidth: 120,
    cellClass: "powersheet-cell--locked text-muted-foreground",
  },
];

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

export function PaymentsSurface() {
  const search = useSearch();
  const { hasPermission } = usePermissions();
  const canVoid = hasPermission("accounting:delete");

  // Deep-link support: ?id=, ?invoiceId=, ?orderId=
  const routeParams = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      paymentId: parsePositiveInt(params.get("id")),
      invoiceId: parsePositiveInt(params.get("invoiceId")),
      orderId: parsePositiveInt(params.get("orderId")),
    };
  }, [search]);

  const orderInvoiceQuery = trpc.accounting.invoices.getByReference.useQuery(
    {
      referenceId: routeParams.orderId ?? 0,
      referenceTypes: ["ORDER", "SALE"],
    },
    { enabled: routeParams.orderId !== null }
  );

  const handoffInvoiceId = useMemo(() => {
    if (routeParams.invoiceId !== null) {
      return routeParams.invoiceId;
    }

    const resolvedInvoiceId = orderInvoiceQuery.data?.id;
    return typeof resolvedInvoiceId === "number" && resolvedInvoiceId > 0
      ? resolvedInvoiceId
      : null;
  }, [orderInvoiceQuery.data?.id, routeParams.invoiceId]);

  // Filter / search state
  const [searchTerm, setSearchTerm] = useState(() => {
    if (routeParams.paymentId !== null) return String(routeParams.paymentId);
    return "";
  });
  const [typeFilter, setTypeFilter] = useState<PaymentTypeFilter>("ALL");

  // Selection state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const lastEmittedRowIdRef = useRef<string | null>(null);

  // Dialog state
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  useEffect(() => {
    if (routeParams.paymentId !== null) {
      setSearchTerm(String(routeParams.paymentId));
      return;
    }

    setSearchTerm("");
  }, [routeParams.paymentId]);

  // Data query
  const paymentsQuery = trpc.accounting.payments.list.useQuery(
    {
      paymentType:
        typeFilter !== "ALL" ? (typeFilter as "RECEIVED" | "SENT") : undefined,
      invoiceId: handoffInvoiceId ?? undefined,
    },
    {
      enabled: routeParams.orderId === null || !orderInvoiceQuery.isLoading,
    }
  );

  // Void mutation
  const voidMutation = trpc.payments.void.useMutation({
    onSuccess: () => {
      toast.success("Payment voided successfully.");
      setVoidDialogOpen(false);
      lastEmittedRowIdRef.current = null;
      setSelectedRowId(null);
      void paymentsQuery.refetch();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to void payment.");
    },
  });

  // Build grid rows
  const gridRows = useMemo((): PaymentGridRow[] => {
    if (routeParams.orderId !== null && handoffInvoiceId === null) {
      return [];
    }

    const raw = paymentsQuery.data?.items ?? [];
    const normalizedQuery = searchTerm.trim().toLowerCase();

    const searched = normalizedQuery
      ? raw.filter(p => paymentMatchesSearch(p, normalizedQuery))
      : raw;

    const routeFiltered =
      routeParams.paymentId !== null
        ? searched.filter(p => p.id === routeParams.paymentId)
        : searched;

    return mapToGridRows(routeFiltered);
  }, [
    handoffInvoiceId,
    paymentsQuery.data,
    routeParams.orderId,
    routeParams.paymentId,
    searchTerm,
  ]);

  // KPI totals — computed client-side from gridRows
  const kpiTotals = useMemo(() => {
    const totalReceived = gridRows
      .filter(r => r.paymentType === "RECEIVED")
      .reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0);
    const totalSent = gridRows
      .filter(r => r.paymentType === "SENT")
      .reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0);
    return {
      totalCount:
        routeParams.orderId !== null
          ? gridRows.length
          : (paymentsQuery.data?.pagination?.total ?? gridRows.length),
      totalReceived,
      totalSent,
    };
  }, [gridRows, paymentsQuery.data?.pagination?.total, routeParams.orderId]);

  // Selected row lookup
  const selectedRow = useMemo(
    () => gridRows.find(r => r.rowKey === selectedRowId) ?? null,
    [gridRows, selectedRowId]
  );

  const invoiceIdForFlow = selectedRow?.invoiceId ?? handoffInvoiceId ?? null;

  const invoiceDetailsQuery = trpc.accounting.invoices.getById.useQuery(
    { id: invoiceIdForFlow ?? 0 },
    { enabled: invoiceIdForFlow !== null }
  );

  const handleCloseInspector = useCallback(() => {
    lastEmittedRowIdRef.current = null;
    setSelectedRowId(null);
  }, []);

  const handleSelectedRowChange = useCallback((row: PaymentGridRow | null) => {
    const nextId = row?.rowKey ?? null;
    if (nextId === lastEmittedRowIdRef.current) return;
    lastEmittedRowIdRef.current = nextId;
    setSelectedRowId(nextId);
  }, []);

  const handleVoidConfirm = useCallback(
    (paymentId: number, reason: string) => {
      voidMutation.mutate({ id: paymentId, reason });
    },
    [voidMutation]
  );

  const handlePaymentRecorded = useCallback(() => {
    setRecordPaymentOpen(false);
    void invoiceDetailsQuery.refetch();
    void orderInvoiceQuery.refetch();
    void paymentsQuery.refetch();
  }, [invoiceDetailsQuery, orderInvoiceQuery, paymentsQuery]);

  const invoiceForPaymentDialog = useMemo(() => {
    const invoice = invoiceDetailsQuery.data;
    if (!invoice) {
      return null;
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      status: invoice.status,
    };
  }, [invoiceDetailsQuery.data]);

  const handleRecordPaymentClick = useCallback(() => {
    if (invoiceIdForFlow === null) {
      toast.error("Select a payment linked to an invoice before recording.");
      return;
    }

    setRecordPaymentOpen(true);
  }, [invoiceIdForFlow]);

  const paymentDialogDescription = useMemo(() => {
    if (invoiceIdForFlow === null) {
      return "Select a payment with an invoice, or navigate from an invoice";
    }

    if (routeParams.orderId !== null) {
      return `Record a payment against invoice #${invoiceIdForFlow} for order #${routeParams.orderId}`;
    }

    return `Record a payment against invoice #${invoiceIdForFlow}`;
  }, [invoiceIdForFlow, routeParams.orderId]);

  const scopeEmptyDescription = useMemo(() => {
    if (searchTerm || typeFilter !== "ALL") {
      return "Adjust your search or filter to see more payments.";
    }

    if (routeParams.orderId !== null) {
      if (orderInvoiceQuery.isLoading) {
        return `Resolving order #${routeParams.orderId} into its invoice payment history...`;
      }
      return handoffInvoiceId !== null
        ? `Order #${routeParams.orderId} is linked to invoice #${handoffInvoiceId}, but no payments have been posted for it yet.`
        : `Order #${routeParams.orderId} does not have a linked invoice yet, so there are no payments to show.`;
    }

    if (handoffInvoiceId !== null) {
      return `Invoice #${handoffInvoiceId} does not have any recorded payments yet.`;
    }

    return "No payments have been recorded yet.";
  }, [
    handoffInvoiceId,
    orderInvoiceQuery.isLoading,
    routeParams.orderId,
    searchTerm,
    typeFilter,
  ]);

  // Status bar
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
  ) : selectionSummary ? (
    <span>
      {selectionSummary.selectedCellCount} cells selected &middot;{" "}
      {selectionSummary.selectedRowCount} rows
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* ── 1. Toolbar ── */}
      <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 shadow-sm">
        <span className="font-bold text-xs">Payments</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-[var(--info-bg)] text-[var(--info)] border-blue-200"
        >
          {kpiTotals.totalCount} total
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-[var(--success-bg)] text-[var(--success)] border-green-200"
        >
          {formatCurrencyCompact(kpiTotals.totalReceived)} received
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
        >
          {formatCurrencyCompact(kpiTotals.totalSent)} sent
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search payment # or ref"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="payments-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => void paymentsQuery.refetch()}
            disabled={paymentsQuery.isFetching}
            aria-label="Refresh payments"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {routeParams.orderId !== null && (
        <div
          className="mx-2 my-1.5 flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-[var(--info-bg)]/70 px-2 py-1.5"
          data-testid="payments-order-handoff-banner"
        >
          <Badge
            variant="outline"
            className="text-[9px] bg-[var(--info-bg)] text-[var(--info)] border-blue-200"
          >
            Sales handoff
          </Badge>
          <span className="text-[11px] text-blue-900">
            {orderInvoiceQuery.isLoading
              ? `Resolving order #${routeParams.orderId} into its invoice payment history...`
              : handoffInvoiceId !== null
                ? `Showing payments posted against invoice #${handoffInvoiceId} for order #${routeParams.orderId}.`
                : `Order #${routeParams.orderId} does not have a linked invoice yet, so there are no matching payments to show.`}
          </span>
        </div>
      )}

      {routeParams.orderId === null && handoffInvoiceId !== null && (
        <div
          className="mx-2 my-1.5 flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-1.5"
          data-testid="payments-invoice-scope-banner"
        >
          <Badge
            variant="outline"
            className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-200"
          >
            Invoice scope
          </Badge>
          <span className="text-[11px] text-emerald-900">
            Showing payments linked to invoice #{handoffInvoiceId}.
          </span>
        </div>
      )}

      {/* ── 2. Action Bar ── */}
      <div className="mx-2 flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex-wrap shadow-sm">
        {/* Type filter tabs */}
        {TYPE_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={typeFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => {
              setTypeFilter(tab.value);
              setSearchTerm("");
            }}
            data-testid={`type-tab-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={invoiceIdForFlow === null}
            onClick={handleRecordPaymentClick}
            title={paymentDialogDescription}
            data-testid="action-record-payment"
          >
            Record Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={selectedRow === null || !canVoid}
            onClick={() => setVoidDialogOpen(true)}
            title={
              !canVoid
                ? "You don't have permission to void payments"
                : selectedRow === null
                  ? "Select a payment row to void"
                  : `Void ${selectedRow.paymentNumber}`
            }
            data-testid="action-void"
          >
            <Ban className="h-3 w-3 mr-1" />
            Void
          </Button>
        </div>
      </div>

      {/* ── 3. Grid ── */}
      <PowersheetGrid
        surfaceId="payments-registry"
        requirementIds={["PAY-001", "PAY-002", "PAY-003", "PAY-004"]}
        affordances={REGISTRY_AFFORDANCES}
        title="Payments Registry"
        description="Read-only payment transaction ledger. Select a row to see details and take actions."
        rows={gridRows}
        columnDefs={columnDefs}
        getRowId={row => row.rowKey}
        selectedRowId={selectedRowId}
        onSelectedRowChange={handleSelectedRowChange}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSelectionSummary}
        isLoading={paymentsQuery.isLoading || orderInvoiceQuery.isLoading}
        errorMessage={
          paymentsQuery.error
            ? (paymentsQuery.error.message ?? "Failed to load payments")
            : null
        }
        emptyTitle="No payments found"
        emptyDescription={scopeEmptyDescription}
        summary={
          <span>
            {gridRows.length} payment{gridRows.length !== 1 ? "s" : ""} visible
          </span>
        }
        minHeight={360}
      />

      {/* ── 4. Inspector ── */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={handleCloseInspector}
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
                  ? "bg-[var(--success-bg)] text-[var(--success)] border-green-200"
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
              >
                <Ban className="h-4 w-4 mr-1" />
                Void
              </Button>
            </div>
          ) : null
        }
      >
        {selectedRow && (
          <InspectorSection title="Payment Details">
            <InspectorField label="Payment Number">
              <p className="font-mono">{selectedRow.paymentNumber}</p>
            </InspectorField>
            <InspectorField label="Date">
              <p>{selectedRow.paymentDate}</p>
            </InspectorField>
            <InspectorField label="Type">
              <Badge
                variant="outline"
                className={
                  selectedRow.paymentType === "RECEIVED"
                    ? "bg-[var(--success-bg)] text-[var(--success)] border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }
              >
                {selectedRow.paymentType}
              </Badge>
            </InspectorField>
            <InspectorField label="Method">
              <p>{selectedRow.paymentMethod}</p>
            </InspectorField>
            <InspectorField label="Amount">
              <p
                className={`font-mono font-semibold ${
                  selectedRow.paymentType === "RECEIVED"
                    ? "text-[var(--success)]"
                    : selectedRow.paymentType === "SENT"
                      ? "text-red-700"
                      : ""
                }`}
              >
                {selectedRow.amountFormatted}
              </p>
            </InspectorField>
            <InspectorField label="Reference">
              <p
                className={
                  selectedRow.referenceNumber === "No reference"
                    ? "text-muted-foreground italic"
                    : "font-mono"
                }
              >
                {selectedRow.referenceNumber}
              </p>
            </InspectorField>
            {selectedRow.invoiceId !== null && (
              <InspectorField label="Invoice">
                <p className="font-mono text-[var(--info)] cursor-pointer hover:underline">
                  #{selectedRow.invoiceId}
                </p>
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
        )}
      </InspectorPanel>

      {/* ── 5. Status Bar ── */}
      <WorkSurfaceStatusBar
        left={statusLeft}
        center={statusCenter}
        right={
          <KeyboardHintBar
            hints={REGISTRY_KEYBOARD_HINTS}
            className="text-xs"
          />
        }
      />

      {/* ── 6. Sidecar Dialogs ── */}
      <PaymentModal
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoice={invoiceForPaymentDialog}
        onSuccess={handlePaymentRecorded}
      />

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

export default PaymentsSurface;
