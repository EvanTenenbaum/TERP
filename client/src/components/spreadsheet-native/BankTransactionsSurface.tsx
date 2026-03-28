/**
 * BankTransactionsSurface — TER-976
 *
 * EDITABLE bank transactions registry with reconciliation.
 * Replaces classic BankTransactions.tsx (377 lines).
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "Bank Transactions" + KPI badges + search + refresh
 *   2. Action Bar: Type filter tabs + Reconciled/Unreconciled toggle
 *      + Toggle Reconciled action + Export CSV
 *   3. PowersheetGrid (EDITABLE) + Collapsible Inspector
 *   4. Status Bar
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { toast } from "sonner";
import { Download, RefreshCw, Search, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type {
  PowersheetSelectionSet,
  PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";

// ============================================================================
// TYPES
// ============================================================================

interface BankTransactionGridRow {
  id: number;
  transactionDate: string;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE";
  description: string;
  referenceNumber: string;
  amount: string;
  isReconciled: boolean;
}

type TypeTab = "ALL" | "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE";
type ReconciledFilter = "ALL" | "RECONCILED" | "UNRECONCILED";

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const TYPE_TABS: Array<{ value: TypeTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "FEE", label: "Fee" },
];

const TYPE_BADGE_STYLES: Record<string, string> = {
  DEPOSIT: "bg-green-100 text-green-700 border-green-200",
  WITHDRAWAL: "bg-red-100 text-red-700 border-red-200",
  TRANSFER: "bg-blue-100 text-blue-700 border-blue-200",
  FEE: "bg-orange-100 text-orange-700 border-orange-200",
};

const editableAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: true },
  { label: "Fill", available: true },
  { label: "Edit", available: true },
  { label: "Undo/Redo", available: true },
];

const keyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select cell" },
  { key: "Double-click", label: "edit cell" },
  { key: `${mod}+C`, label: "copy" },
  { key: `${mod}+V`, label: "paste" },
  { key: `${mod}+Z`, label: "undo" },
  { key: "Escape", label: "cancel edit" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function buildColumnDefs(): ColDef<BankTransactionGridRow>[] {
  return [
    {
      headerName: "Date",
      field: "transactionDate",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable",
      singleClickEdit: true,
    },
    {
      headerName: "Type",
      field: "transactionType",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE"],
      },
      cellRenderer: (params: { value: string }) => {
        const val = params.value;
        const style = TYPE_BADGE_STYLES[val] ?? "";
        return `<span class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${style}">${val}</span>`;
      },
      singleClickEdit: true,
    },
    {
      headerName: "Description",
      field: "description",
      flex: 1,
      editable: true,
      cellClass: "powersheet-cell--editable",
      singleClickEdit: true,
    },
    {
      headerName: "Reference #",
      field: "referenceNumber",
      width: 130,
      editable: true,
      cellClass: "powersheet-cell--editable font-mono",
      singleClickEdit: true,
    },
    {
      headerName: "Amount",
      field: "amount",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable font-mono text-right",
      type: "rightAligned",
      cellStyle: params => {
        const type = params.data?.transactionType;
        if (type === "DEPOSIT") return { color: "var(--color-green-600)" };
        if (type === "WITHDRAWAL") return { color: "var(--color-red-600)" };
        return null;
      },
      singleClickEdit: true,
    },
    {
      headerName: "Reconciled",
      field: "isReconciled",
      width: 80,
      editable: true,
      cellClass: "powersheet-cell--editable",
      cellRenderer: "agCheckboxCellRenderer",
      cellEditor: "agCheckboxCellEditor",
      singleClickEdit: true,
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BankTransactionsSurface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeTab>("ALL");
  const [reconciledFilter, setReconciledFilter] =
    useState<ReconciledFilter>("ALL");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const transactionsQuery = trpc.accounting.bankTransactions.list.useQuery({
    ...(typeFilter !== "ALL"
      ? {
          transactionType: typeFilter as
            | "DEPOSIT"
            | "WITHDRAWAL"
            | "TRANSFER"
            | "FEE",
        }
      : {}),
    ...(reconciledFilter === "RECONCILED"
      ? { isReconciled: true }
      : reconciledFilter === "UNRECONCILED"
        ? { isReconciled: false }
        : {}),
  });

  const utils = trpc.useUtils();

  // ─── Mutations ────────────────────────────────────────────────────────────

  const reconcileMutation =
    trpc.accounting.bankTransactions.reconcile.useMutation({
      onSuccess: () => {
        toast.success("Transaction reconciled");
        void utils.accounting.bankTransactions.list.invalidate();
      },
      onError: err => toast.error(`Reconcile failed: ${err.message}`),
    });

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const gridRows: BankTransactionGridRow[] = useMemo(() => {
    const items = transactionsQuery.data?.items ?? [];
    return items.map(
      (item: {
        id: number;
        transactionDate: Date | string;
        transactionType: string;
        description: string | null;
        referenceNumber: string | null;
        amount: string;
        isReconciled: boolean;
      }) => ({
        id: item.id,
        transactionDate:
          typeof item.transactionDate === "string"
            ? item.transactionDate
            : new Date(item.transactionDate).toISOString().slice(0, 10),
        transactionType:
          item.transactionType as BankTransactionGridRow["transactionType"],
        description: item.description ?? "",
        referenceNumber: item.referenceNumber ?? "",
        amount: item.amount,
        isReconciled: item.isReconciled,
      })
    );
  }, [transactionsQuery.data]);

  const filteredRows = useMemo(() => {
    let rows = gridRows;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter(
        r =>
          r.description.toLowerCase().includes(q) ||
          r.referenceNumber.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [gridRows, searchTerm]);

  // KPIs (aggregated from gridRows)
  const deposits = gridRows
    .filter(r => r.transactionType === "DEPOSIT")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const withdrawals = gridRows
    .filter(r => r.transactionType === "WITHDRAWAL")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const unreconciled = gridRows.filter(r => !r.isReconciled).length;

  // Column definitions (stable reference)
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectionSetChange = useCallback(
    (selectionSet: PowersheetSelectionSet) => {
      setSelectedRowId(selectionSet.focusedRowId);
    },
    []
  );

  const handleCellValueChanged = useCallback(
    (_event: CellValueChangedEvent<BankTransactionGridRow>) => {
      // Cell edits are handled inline; no server update for now
      // (task spec only wires reconcile mutation for the action button)
    },
    []
  );

  const handleToggleReconciled = useCallback(() => {
    if (!selectedRowId) {
      toast.info("Select a row first");
      return;
    }
    reconcileMutation.mutate({ id: Number(selectedRowId) });
  }, [selectedRowId, reconcileMutation]);

  const handleExportCsv = useCallback(() => {
    const header = "Date,Type,Description,Reference #,Amount,Reconciled";
    const rows = filteredRows.map(
      r =>
        `${r.transactionDate},"${r.transactionType}","${r.description}","${r.referenceNumber}",${r.amount},${r.isReconciled ? "Yes" : "No"}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [filteredRows]);

  const handleRefresh = useCallback(() => {
    void transactionsQuery.refetch();
  }, [transactionsQuery]);

  // ─── Status Bar ───────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {typeFilter !== "ALL" ? typeFilter : "All Types"} | {gridRows.length}{" "}
      total
    </span>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── 1. Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border-b">
        <span className="font-bold text-xs">Bank Transactions</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
          data-testid="kpi-deposits"
        >
          {formatCurrency(deposits)} deposits
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200"
          data-testid="kpi-withdrawals"
        >
          {formatCurrency(withdrawals)} withdrawals
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
          data-testid="kpi-unreconciled"
        >
          {unreconciled} unreconciled
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="bank-tx-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleRefresh}
            aria-label="Refresh transactions"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b flex-wrap">
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

        {/* Separator */}
        <div className="w-px h-4 bg-border mx-1" />

        {/* Reconciled/Unreconciled toggle */}
        {(["ALL", "RECONCILED", "UNRECONCILED"] as ReconciledFilter[]).map(
          value => (
            <Button
              key={value}
              variant={reconciledFilter === value ? "default" : "ghost"}
              size="sm"
              className="h-5 text-[9px] px-2"
              onClick={() => setReconciledFilter(value)}
              data-testid={`reconciled-tab-${value}`}
            >
              {value === "ALL"
                ? "All Status"
                : value === "RECONCILED"
                  ? "Reconciled"
                  : "Unreconciled"}
            </Button>
          )
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={handleToggleReconciled}
            disabled={!selectedRowId}
            data-testid="toggle-reconciled-button"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Toggle Reconciled
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={handleExportCsv}
            data-testid="export-csv-button"
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── 3. PowersheetGrid (EDITABLE) ── */}
      <PowersheetGrid<BankTransactionGridRow>
        surfaceId="bank-transactions"
        requirementIds={["TER-976-bank-transactions"]}
        affordances={editableAffordances}
        title="Bank Transactions"
        rows={filteredRows}
        columnDefs={columnDefs}
        getRowId={row => String(row.id)}
        isLoading={transactionsQuery.isLoading}
        emptyTitle="No transactions"
        emptyDescription="No bank transactions match your filters"
        selectionMode="cell-range"
        enableFillHandle={true}
        enableUndoRedo={true}
        stopEditingWhenCellsLoseFocus={true}
        onCellValueChanged={handleCellValueChanged}
        onSelectionSetChange={handleSelectionSetChange}
        onSelectionSummaryChange={setSelectionSummary}
      />

      {/* ── 4. Status Bar ── */}
      <WorkSurfaceStatusBar left={statusBarLeft} />
      <KeyboardHintBar hints={keyboardHints} />
    </div>
  );
}

export default BankTransactionsSurface;
