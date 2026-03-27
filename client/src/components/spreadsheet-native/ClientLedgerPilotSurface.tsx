/**
 * ClientLedgerPilotSurface (TER-813)
 *
 * Sheet-native surface for the Client Ledger — Ledger+Inspector family.
 *
 * Capabilities implemented:
 * - ACCT-LED-001: Client selection gate (combobox, empty state until selected)
 * - ACCT-LED-002: Transaction grid with keyboard nav (PowersheetGrid, read-only)
 * - ACCT-LED-003: Balance summary KPI cards (from getLedger response)
 * - ACCT-LED-004: Date range filter (calendar picker, P1)
 * - ACCT-LED-005: Transaction type filter multi-select (P1)
 * - ACCT-LED-006: Clear filters action
 * - ACCT-LED-007: Transaction inspector (right rail, running balance must stay visible)
 * - ACCT-LED-008: Reference navigation (ORDER → sales, PAYMENT → /accounting/payments, PO → /purchase-orders)
 * - ACCT-LED-009: Paginated browsing (50 rows/page, [/] shortcuts)
 * - ACCT-LED-010: Add adjustment two-step dialog (form → confirm)
 * - ACCT-LED-011: CSV export
 *
 * CRITICAL CONSTRAINT: Running balance column MUST stay visible when inspector is
 * open. The layout uses a flex row so the grid never gets hidden.
 *
 * Balance is NOT calculated client-side. All balance fields come from
 * clientLedger.getLedger which aggregates 5 data sources server-side.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import type { ColDef } from "ag-grid-community";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { LEDGER_TYPE_TOKENS } from "@/lib/statusTokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClientCombobox,
  type ClientOption,
} from "@/components/ui/client-combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 50;

const ADJUSTMENT_TYPES = [
  {
    value: "CREDIT" as const,
    label: "Credit Adjustment",
    description: "Decrease what they owe",
  },
  {
    value: "DEBIT" as const,
    label: "Debit Adjustment",
    description: "Increase what they owe",
  },
];

type AdjustmentType = "CREDIT" | "DEBIT";

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const ledgerKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Enter", label: "open inspector" },
  { key: "Escape", label: "close inspector" },
  { key: `${mod}+K`, label: "focus client search" },
  { key: "A", label: "add adjustment" },
  { key: "E", label: "export CSV" },
  { key: "C", label: "clear filters" },
  { key: "[", label: "previous page" },
  { key: "]", label: "next page" },
];

const ledgerAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Export", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
];

// ============================================================================
// Types
// ============================================================================

interface LedgerTransaction {
  id: string;
  date: Date | string;
  type: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
  createdBy: string;
}

// Row type for the AG Grid — flat primitive-valued shape
interface LedgerRow {
  rowKey: string;
  date: string;
  type: string;
  description: string;
  referenceLabel: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  createdBy: string;
  // Back-reference to original transaction for inspector
  _txn: LedgerTransaction;
}

// ============================================================================
// Transaction type badge (cell renderer helper)
// ============================================================================

const TYPE_BADGE_CONFIG: Record<string, { className: string; label: string }> =
  {
    SALE: { className: LEDGER_TYPE_TOKENS.INVOICE, label: "Sale" },
    PURCHASE: {
      className: "bg-purple-100 text-purple-700 border-purple-200",
      label: "Purchase",
    },
    PAYMENT_RECEIVED: {
      className: LEDGER_TYPE_TOKENS.PAYMENT,
      label: "Payment Received",
    },
    PAYMENT_SENT: {
      className: LEDGER_TYPE_TOKENS.ADJUSTMENT,
      label: "Payment Sent",
    },
    CREDIT: { className: LEDGER_TYPE_TOKENS.CREDIT, label: "Credit" },
    DEBIT: { className: LEDGER_TYPE_TOKENS.REFUND, label: "Debit" },
  };

function getTypeBadgeConfig(type: string) {
  return (
    TYPE_BADGE_CONFIG[type] ?? {
      className: "bg-gray-100 text-gray-700 border-gray-200",
      label: type,
    }
  );
}

// ============================================================================
// Map transactions → grid rows
// ============================================================================

function mapTransactionsToRows(transactions: LedgerTransaction[]): LedgerRow[] {
  return transactions.map(txn => ({
    rowKey: txn.id,
    date: formatDate(txn.date),
    type: txn.type,
    description: txn.description,
    referenceLabel:
      txn.referenceType && txn.referenceId
        ? `${txn.referenceType} #${txn.referenceId}`
        : "",
    debitAmount: txn.debitAmount ?? 0,
    creditAmount: txn.creditAmount ?? 0,
    runningBalance: txn.runningBalance,
    createdBy: txn.createdBy,
    _txn: txn,
  }));
}

// ============================================================================
// Column definitions
// ============================================================================

const ledgerColumnDefs: ColDef<LedgerRow>[] = [
  {
    field: "date",
    headerName: "Date",
    minWidth: 110,
    maxWidth: 130,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: transaction date.",
  },
  {
    field: "type",
    headerName: "Type",
    minWidth: 140,
    maxWidth: 170,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: transaction type.",
    cellRenderer: (params: { value: string }) => {
      if (!params.value) return null;
      const cfg = getTypeBadgeConfig(params.value);
      return `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}">${cfg.label}</span>`;
    },
  },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    minWidth: 200,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: transaction description.",
  },
  {
    field: "referenceLabel",
    headerName: "Reference",
    minWidth: 140,
    maxWidth: 180,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: originating document reference.",
  },
  {
    field: "debitAmount",
    headerName: "Debit",
    minWidth: 110,
    maxWidth: 130,
    type: "rightAligned",
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: debit amount.",
    valueFormatter: params =>
      params.value ? formatCurrency(params.value as number) : "-",
    cellStyle: params =>
      params.value ? { color: "var(--destructive, #dc2626)" } : null,
  },
  {
    field: "creditAmount",
    headerName: "Credit",
    minWidth: 110,
    maxWidth: 130,
    type: "rightAligned",
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: credit amount.",
    valueFormatter: params =>
      params.value ? formatCurrency(params.value as number) : "-",
    cellStyle: params =>
      params.value ? { color: "oklch(0.52 0.14 155)" } : null,
  },
  {
    // CRITICAL: Running balance column — must remain visible when inspector is open
    field: "runningBalance",
    headerName: "Balance",
    minWidth: 120,
    maxWidth: 140,
    type: "rightAligned",
    cellClass: "powersheet-cell--locked",
    headerTooltip:
      "Read-only: running balance after this transaction (server-computed).",
    valueFormatter: params => formatCurrency(params.value as number),
    cellStyle: params => {
      const val = params.value as number;
      if (val > 0)
        return { color: "var(--destructive, #dc2626)", fontWeight: "600" };
      if (val < 0) return { color: "oklch(0.52 0.14 155)", fontWeight: "600" };
      return { color: "inherit", fontWeight: "600" };
    },
  },
];

// ============================================================================
// KPI Cards
// ============================================================================

interface SummaryCardsProps {
  totalCount: number;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  balanceDescription?: string;
}

function SummaryCards({
  totalCount,
  totalDebits,
  totalCredits,
  currentBalance,
  balanceDescription,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Transactions
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          <TrendingUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(totalDebits)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          <TrendingDown className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalCredits)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-bold",
              currentBalance > 0
                ? "text-destructive"
                : currentBalance < 0
                  ? "text-green-600"
                  : ""
            )}
          >
            {formatCurrency(currentBalance)}
          </div>
          {balanceDescription && (
            <p className="text-xs text-muted-foreground mt-1">
              {balanceDescription}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Transaction Inspector panel content
// ============================================================================

interface TransactionInspectorContentProps {
  transaction: LedgerTransaction;
  onNavigateToReference: (refType: string, refId: number) => void;
}

function TransactionInspectorContent({
  transaction,
  onNavigateToReference,
}: TransactionInspectorContentProps) {
  const hasReference = Boolean(
    transaction.referenceType && transaction.referenceId
  );
  const typeCfg = getTypeBadgeConfig(transaction.type);

  return (
    <>
      <InspectorSection title="Transaction">
        <InspectorField label="Type">
          <Badge variant="outline" className={typeCfg.className}>
            {typeCfg.label}
          </Badge>
        </InspectorField>
        <InspectorField label="Date">
          <p className="text-sm">{formatDate(transaction.date)}</p>
        </InspectorField>
        <InspectorField label="Description">
          <p className="text-sm">{transaction.description}</p>
        </InspectorField>
        <InspectorField label="Created By">
          <p className="text-sm flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {transaction.createdBy}
          </p>
        </InspectorField>
        <InspectorField label="Transaction ID">
          <p className="text-xs font-mono text-muted-foreground">
            {transaction.id}
          </p>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="Amounts">
        <InspectorField label="Debit">
          {transaction.debitAmount ? (
            <p className="text-lg font-semibold text-destructive">
              {formatCurrency(transaction.debitAmount)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </InspectorField>
        <InspectorField label="Credit">
          {transaction.creditAmount ? (
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(transaction.creditAmount)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </InspectorField>
        <InspectorField label="Running Balance">
          <p
            className={cn(
              "text-xl font-bold",
              transaction.runningBalance > 0
                ? "text-destructive"
                : transaction.runningBalance < 0
                  ? "text-green-600"
                  : ""
            )}
          >
            {formatCurrency(transaction.runningBalance)}
          </p>
        </InspectorField>
      </InspectorSection>

      {hasReference &&
        transaction.referenceType &&
        transaction.referenceId &&
        (() => {
          const refType = transaction.referenceType;
          const refId = transaction.referenceId;
          // Both values are truthy here — captured in local vars to avoid
          // non-null assertions in the callback.
          return refType && refId ? (
            <InspectorSection title="Reference">
              <InspectorField label="Document">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToReference(refType, refId)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {refType} #{refId}
                </Button>
              </InspectorField>
            </InspectorSection>
          ) : null;
        })()}
    </>
  );
}

// ============================================================================
// Add Adjustment Dialog (two-step: form → confirm)
// ============================================================================

interface AddAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName: string;
  onSuccess: () => void;
}

function AddAdjustmentDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: AddAdjustmentDialogProps) {
  const [type, setType] = useState<AdjustmentType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const addAdjustment = trpc.clientLedger.addLedgerAdjustment.useMutation({
    onSuccess: () => {
      toast.success("Adjustment added successfully");
      onSuccess();
      resetForm();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Failed to add adjustment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setType("CREDIT");
    setAmount("");
    setNotes("");
  };

  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const notesValid = notes.trim().length > 0 && notes.trim().length <= 1000;
  const canSubmit = amountValid && notesValid;

  const handleSubmit = () => {
    if (!notesValid) {
      toast.error("Notes are required (1–1000 characters)");
      return;
    }
    if (!amountValid) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    addAdjustment.mutate({
      clientId,
      transactionType: type,
      amount: parsedAmount,
      description: notes.trim(),
    });
  };

  const selectedType = ADJUSTMENT_TYPES.find(t => t.value === type);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Ledger Adjustment</DialogTitle>
            <DialogDescription>
              Add a manual adjustment for <strong>{clientName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adj-type">Adjustment Type *</Label>
              <Select
                value={type}
                onValueChange={v => setType(v as AdjustmentType)}
              >
                <SelectTrigger id="adj-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adj-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adj-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adj-notes">Notes *</Label>
              <Textarea
                id="adj-notes"
                placeholder="Reason for adjustment (required)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/1000 characters — required.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || addAdjustment.isPending}
            >
              {addAdjustment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Review Adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Adjustment"
        description={
          <div className="space-y-2">
            <p>Are you sure you want to add this adjustment?</p>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p>
                <strong>Type:</strong> {selectedType?.label}
              </p>
              <p>
                <strong>Amount:</strong> {formatCurrency(parsedAmount || 0)}
              </p>
              <p>
                <strong>Client:</strong> {clientName}
              </p>
              <p>
                <strong>Notes:</strong> {notes.trim()}
              </p>
            </div>
          </div>
        }
        confirmLabel="Confirm Adjustment"
        onConfirm={handleConfirm}
        isLoading={addAdjustment.isPending}
      />
    </>
  );
}

// ============================================================================
// Main surface
// ============================================================================

export interface ClientLedgerPilotSurfaceProps {
  /** Called when the user clicks the classic fallback action */
  onOpenClassic?: () => void;
}

export function ClientLedgerPilotSurface({
  onOpenClassic,
}: ClientLedgerPilotSurfaceProps) {
  // ── Routing ────────────────────────────────────────────────────────────────
  const [, setLocation] = useLocation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [inspectorTransaction, setInspectorTransaction] =
    useState<LedgerTransaction | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const clientSearchRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: clientsData, isLoading: clientsLoading } =
    trpc.clients.list.useQuery({ limit: 1000 });

  const { data: transactionTypes } =
    trpc.clientLedger.getTransactionTypes.useQuery();

  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
  } = trpc.clientLedger.getLedger.useQuery(
    {
      clientId: selectedClientId ?? 0,
      startDate: dateRange.from,
      endDate: dateRange.to,
      transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    },
    { enabled: selectedClientId !== null }
  );

  const utils = trpc.useUtils();

  // ── Derived ────────────────────────────────────────────────────────────────
  const clientOptions: ClientOption[] = useMemo(() => {
    if (!clientsData?.items) return [];
    return clientsData.items.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      clientType: client.isBuyer
        ? "buyer"
        : client.isSeller
          ? "seller"
          : undefined,
    }));
  }, [clientsData]);

  const selectedClient = useMemo(
    () => clientOptions.find(c => c.id === selectedClientId) ?? null,
    [clientOptions, selectedClientId]
  );

  const transactions: LedgerTransaction[] = useMemo(
    () => ledgerData?.transactions ?? [],
    [ledgerData]
  );

  const rows: LedgerRow[] = useMemo(
    () => mapTransactionsToRows(transactions),
    [transactions]
  );

  const totalPages = ledgerData
    ? Math.ceil(ledgerData.totalCount / ITEMS_PER_PAGE)
    : 0;

  const hasFilters =
    Boolean(dateRange.from) ||
    Boolean(dateRange.to) ||
    selectedTypes.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClientChange = useCallback((id: number | null) => {
    setSelectedClientId(id);
    setPage(0);
    setInspectorTransaction(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedTypes([]);
    setPage(0);
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }
    setIsExporting(true);
    try {
      // Always fetch fresh data with current filter state to avoid stale cache
      const data = await utils.clientLedger.exportLedger.fetch({
        clientId: selectedClientId,
        startDate: dateRange.from,
        endDate: dateRange.to,
        transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      });
      if (data) {
        const blob = new Blob([data.content], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", data.filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${data.totalTransactions} transactions`);
      }
    } catch {
      toast.error("Failed to export ledger");
    } finally {
      setIsExporting(false);
    }
  }, [selectedClientId, dateRange, selectedTypes, utils]);

  const navigateToReference = useCallback(
    (refType: string, refId: number) => {
      let path = "";
      switch (refType) {
        case "ORDER":
          path = buildSalesWorkspacePath("orders", { id: refId });
          break;
        case "INVOICE":
          path = `/accounting?tab=invoices&id=${refId}`;
          break;
        case "PAYMENT":
          path = `/accounting/payments?id=${refId}`;
          break;
        case "PURCHASE_ORDER":
          path = `/purchase-orders?id=${refId}`;
          break;
        default:
          break;
      }
      if (path) {
        setLocation(path);
      }
    },
    [setLocation]
  );

  // ── Keyboard handler (attached to surface div) ─────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Skip if inside a form element — let the element handle it
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      ) {
        return;
      }

      const isModKey = e.metaKey || e.ctrlKey;

      if (isModKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        clientSearchRef.current?.focus();
        return;
      }

      switch (e.key) {
        case "Escape":
          if (inspectorTransaction) {
            e.preventDefault();
            setInspectorTransaction(null);
          }
          break;
        case "a":
        case "A":
          if (!isModKey && selectedClientId) {
            e.preventDefault();
            setShowAdjustmentDialog(true);
          }
          break;
        case "e":
        case "E":
          if (!isModKey && selectedClientId) {
            e.preventDefault();
            void handleExport();
          }
          break;
        case "c":
        case "C":
          if (!isModKey) {
            e.preventDefault();
            handleClearFilters();
          }
          break;
        case "[":
          e.preventDefault();
          setPage(p => Math.max(0, p - 1));
          break;
        case "]":
          e.preventDefault();
          setPage(p => Math.min(totalPages > 0 ? totalPages - 1 : 0, p + 1));
          break;
        default:
          break;
      }
    },
    [
      inspectorTransaction,
      selectedClientId,
      handleExport,
      handleClearFilters,
      totalPages,
    ]
  );

  // ── Row selection → inspector ──────────────────────────────────────────────
  const handleSelectedRowChange = useCallback((row: LedgerRow | null) => {
    if (row) {
      setInspectorTransaction(row._txn);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={surfaceRef}
      className="flex flex-col h-full bg-background"
      data-testid="client-ledger-pilot"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Client Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View transactions and balance history for a client
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={!selectedClientId || isExporting}
            data-testid="ledger-export"
            title="Export CSV (E)"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Export (E)
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAdjustmentDialog(true)}
            disabled={!selectedClientId}
            data-testid="ledger-add-adjustment"
            title="Add Adjustment (A)"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Adjustment (A)
          </Button>
          {onOpenClassic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenClassic}
              title="Switch to classic surface"
            >
              Classic View
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Client selector — gate */}
          <div className="space-y-1 min-w-[220px]">
            <Label className="text-xs text-muted-foreground">
              Client (required)
            </Label>
            <ClientCombobox
              value={selectedClientId}
              onValueChange={handleClientChange}
              clients={clientOptions}
              isLoading={clientsLoading}
              placeholder="Select a client..."
            />
          </div>

          {/* Date range */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} –{" "}
                        {format(dateRange.to, "LLL dd, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, yyyy")
                    )
                  ) : (
                    <span>Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={range => {
                    setDateRange({ from: range?.from, to: range?.to });
                    setPage(0);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Transaction type filter (multi-select via Popover+Checkbox) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Transaction Type
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[180px] h-8 justify-start text-left font-normal"
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  {selectedTypes.length > 0
                    ? `${selectedTypes.length} selected`
                    : "All types"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                <div className="space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      setSelectedTypes([]);
                      setPage(0);
                    }}
                  >
                    All Types
                  </button>
                  {transactionTypes?.map(t => (
                    <label
                      key={t.value}
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTypes.includes(t.value)}
                        onCheckedChange={checked => {
                          setPage(0);
                          if (checked) {
                            setSelectedTypes(prev => [...prev, t.value]);
                          } else {
                            setSelectedTypes(prev =>
                              prev.filter(v => v !== t.value)
                            );
                          }
                        }}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-muted-foreground"
              title="Clear Filters (C)"
            >
              Clear Filters (C)
            </Button>
          )}
        </div>
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedClientId ? (
          /* Empty state — client gate */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Select a Client</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a client from the dropdown above to view their ledger
                history.
              </p>
            </div>
          </div>
        ) : ledgerLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 p-4">
            {/* KPI cards */}
            <SummaryCards
              totalCount={ledgerData?.totalCount ?? 0}
              totalDebits={ledgerData?.summary?.totalDebits ?? 0}
              totalCredits={ledgerData?.summary?.totalCredits ?? 0}
              currentBalance={ledgerData?.currentBalance ?? 0}
              balanceDescription={ledgerData?.balanceDescription}
            />

            {/* Grid + Inspector — flex row so running balance stays visible */}
            {/*
              CRITICAL: Running balance column must remain visible when the
              inspector is open. The grid and inspector are side-by-side in a
              flex row. The grid keeps its minimum width and the running balance
              column is always rendered regardless of inspector state.
            */}
            <div className="flex-1 overflow-hidden flex flex-row gap-3 min-h-0">
              {/* Transaction grid */}
              <div
                className={cn(
                  "flex-1 min-w-0 overflow-hidden flex flex-col",
                  // When inspector is open, constrain grid width so it stays
                  // readable alongside the 380px inspector panel.
                  inspectorTransaction ? "max-w-[calc(100%-400px)]" : "w-full"
                )}
              >
                <PowersheetGrid
                  surfaceId="client-ledger-transactions"
                  requirementIds={[
                    "ACCT-LED-002",
                    "ACCT-LED-003",
                    "ACCT-LED-007",
                    "ACCT-LED-009",
                  ]}
                  affordances={ledgerAffordances}
                  title={
                    selectedClient ? `Ledger: ${selectedClient.name}` : "Ledger"
                  }
                  description={
                    selectedClient
                      ? `${ledgerData?.totalCount ?? 0} transactions · page ${page + 1} of ${Math.max(1, totalPages)}`
                      : undefined
                  }
                  rows={rows}
                  columnDefs={ledgerColumnDefs}
                  getRowId={row => row.rowKey}
                  selectedRowId={
                    inspectorTransaction ? inspectorTransaction.id : null
                  }
                  onSelectedRowChange={handleSelectedRowChange}
                  selectionMode="cell-range"
                  enableFillHandle={false}
                  enableUndoRedo={false}
                  onSelectionSummaryChange={setSelectionSummary}
                  isLoading={ledgerLoading}
                  errorMessage={null}
                  emptyTitle="No transactions found"
                  emptyDescription={
                    hasFilters
                      ? "Try adjusting your filters or clearing them (C)."
                      : "This client has no ledger entries yet."
                  }
                  summary={
                    <span>
                      {rows.length} visible · {ledgerData?.totalCount ?? 0}{" "}
                      total
                      {hasFilters && " (filtered)"}
                    </span>
                  }
                  minHeight={280}
                />

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages} · {ITEMS_PER_PAGE}{" "}
                      rows/page
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        title="Previous page ([)"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev ([)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(p => Math.min(totalPages - 1, p + 1))
                        }
                        disabled={page >= totalPages - 1}
                        title="Next page (])"
                      >
                        Next (])
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right-rail inspector */}
              <InspectorPanel
                isOpen={inspectorTransaction !== null}
                onClose={() => setInspectorTransaction(null)}
                title="Transaction Details"
                subtitle={
                  inspectorTransaction
                    ? formatDate(inspectorTransaction.date)
                    : undefined
                }
                headerActions={
                  inspectorTransaction ? (
                    <Badge
                      variant="outline"
                      className={
                        getTypeBadgeConfig(inspectorTransaction.type).className
                      }
                    >
                      {getTypeBadgeConfig(inspectorTransaction.type).label}
                    </Badge>
                  ) : undefined
                }
                width={380}
                closeOnEsc
              >
                {inspectorTransaction && (
                  <TransactionInspectorContent
                    transaction={inspectorTransaction}
                    onNavigateToReference={navigateToReference}
                  />
                )}
              </InspectorPanel>
            </div>

            {/* Empty state overlay for no transactions */}
            {!ledgerLoading && transactions.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium text-sm">No transactions found</p>
                {hasFilters && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-1 text-xs"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <WorkSurfaceStatusBar
        left={
          selectedClient ? (
            <span>
              <strong>{selectedClient.name}</strong>
              {ledgerData?.balanceDescription
                ? ` · ${ledgerData.balanceDescription}`
                : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">No client selected</span>
          )
        }
        center={
          selectionSummary ? (
            <span>
              {selectionSummary.selectedCellCount} cells ·{" "}
              {selectionSummary.selectedRowCount} rows selected
            </span>
          ) : (
            <span>{rows.length} transactions on page</span>
          )
        }
        right={
          <KeyboardHintBar hints={ledgerKeyboardHints} className="text-xs" />
        }
      />

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      {selectedClientId !== null && selectedClient && (
        <AddAdjustmentDialog
          open={showAdjustmentDialog}
          onOpenChange={setShowAdjustmentDialog}
          clientId={selectedClientId}
          clientName={selectedClient.name}
          onSuccess={() => void refetchLedger()}
        />
      )}
    </div>
  );
}

export default ClientLedgerPilotSurface;
