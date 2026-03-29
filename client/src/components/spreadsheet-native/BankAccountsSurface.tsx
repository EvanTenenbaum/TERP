/**
 * BankAccountsSurface — TER-976
 *
 * Editable bank accounts registry.
 * Replaces classic BankAccounts.tsx (199 lines).
 * Simplest Phase 3 surface — no grouping, no support modules.
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "Bank Accounts" + KPI badges + search + refresh
 *   2. Action Bar: Type filter dropdown + Add Row
 *   3. PowersheetGrid (EDITABLE) + Collapsible Inspector
 *   4. Status Bar
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { toast } from "sonner";
import { Plus, RefreshCw, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import {
  fmtCurrency,
  EDITABLE_AFFORDANCES,
  EDITABLE_KEYBOARD_HINTS,
} from "@/lib/powersheet/surface-helpers";

// ============================================================================
// TYPES
// ============================================================================

type BankAccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "MONEY_MARKET";

interface BankAccountGridRow {
  id: number | string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: BankAccountType;
  currentBalance: string;
  isActive: boolean;
}

type TypeFilter = "ALL" | BankAccountType;

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "ALL", label: "All Types" },
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "MONEY_MARKET", label: "Money Market" },
];


// ============================================================================
// HELPERS
// ============================================================================

function isNewRow(id: number | string): boolean {
  return String(id).startsWith("new-");
}

const formatCurrency = fmtCurrency;

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function buildColumnDefs(): ColDef<BankAccountGridRow>[] {
  return [
    {
      headerName: "Account Name",
      field: "accountName",
      flex: 1,
      editable: true,
      cellClass: "powersheet-cell--editable",
      singleClickEdit: true,
    },
    {
      headerName: "Account #",
      field: "accountNumber",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable font-mono",
      singleClickEdit: true,
    },
    {
      headerName: "Bank Name",
      field: "bankName",
      flex: 1,
      editable: true,
      cellClass: "powersheet-cell--editable",
      singleClickEdit: true,
    },
    {
      headerName: "Type",
      field: "accountType",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["CHECKING", "SAVINGS", "CREDIT_CARD", "MONEY_MARKET"],
      },
      singleClickEdit: true,
    },
    {
      headerName: "Balance",
      field: "currentBalance",
      width: 120,
      editable: true,
      cellClass: "powersheet-cell--editable font-mono text-right",
      type: "rightAligned",
      valueFormatter: params =>
        params.value !== null && params.value !== undefined
          ? formatCurrency(params.value)
          : "",
      singleClickEdit: true,
    },
    {
      headerName: "Active",
      field: "isActive",
      width: 55,
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

export function BankAccountsSurface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [localRows, setLocalRows] = useState<BankAccountGridRow[]>([]);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const accountsQuery = trpc.accounting.bankAccounts.list.useQuery({
    ...(typeFilter !== "ALL" ? { accountType: typeFilter } : {}),
  });

  const totalCashQuery =
    trpc.accounting.bankAccounts.getTotalCashBalance.useQuery();

  const utils = trpc.useUtils();

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = trpc.accounting.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Bank account created");
      void utils.accounting.bankAccounts.list.invalidate();
      void utils.accounting.bankAccounts.getTotalCashBalance.invalidate();
    },
    onError: err => toast.error(`Create failed: ${err.message}`),
  });

  const updateMutation = trpc.accounting.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Bank account updated");
      void utils.accounting.bankAccounts.list.invalidate();
      void utils.accounting.bankAccounts.getTotalCashBalance.invalidate();
    },
    onError: err => toast.error(`Update failed: ${err.message}`),
  });

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const serverRows: BankAccountGridRow[] = useMemo(() => {
    const items = accountsQuery.data?.items ?? [];
    return items.map(
      (item: {
        id: number;
        accountName: string;
        accountNumber: string;
        bankName: string;
        accountType: string;
        currentBalance: string;
        isActive: boolean;
      }) => ({
        id: item.id,
        accountName: item.accountName,
        accountNumber: item.accountNumber,
        bankName: item.bankName,
        accountType: item.accountType as BankAccountType,
        currentBalance: item.currentBalance,
        isActive: item.isActive,
      })
    );
  }, [accountsQuery.data]);

  const allRows = useMemo(() => {
    const newRows = localRows.filter(r => isNewRow(r.id));
    return [...serverRows, ...newRows];
  }, [serverRows, localRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (typeFilter !== "ALL") {
      rows = rows.filter(r => r.accountType === typeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter(
        r =>
          r.accountName.toLowerCase().includes(q) ||
          r.accountNumber.toLowerCase().includes(q) ||
          r.bankName.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, typeFilter, searchTerm]);

  // KPIs
  const totalCash = totalCashQuery.data ?? 0;
  const totalAccounts = allRows.length;
  const activeAccounts = allRows.filter(r => r.isActive).length;

  // Column definitions (stable reference)
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddRow = useCallback(() => {
    const newRow: BankAccountGridRow = {
      id: `new-${Date.now()}`,
      accountName: "",
      accountNumber: "",
      bankName: "",
      accountType: "CHECKING",
      currentBalance: "0.00",
      isActive: true,
    };
    setLocalRows(prev => [...prev, newRow]);
  }, []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<BankAccountGridRow>) => {
      const row = event.data;
      if (!row) return;
      const field = event.colDef.field as keyof BankAccountGridRow | undefined;
      if (!field) return;

      if (isNewRow(row.id)) {
        // Update local state for new rows
        setLocalRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, [field]: event.newValue } : r
          )
        );

        // Check if required fields are filled to auto-create
        const accountName =
          field === "accountName"
            ? String(event.newValue ?? "")
            : row.accountName;
        const accountNumber =
          field === "accountNumber"
            ? String(event.newValue ?? "")
            : row.accountNumber;
        const bankName =
          field === "bankName" ? String(event.newValue ?? "") : row.bankName;

        if (accountName && accountNumber && bankName) {
          createMutation.mutate(
            {
              accountName,
              accountNumber,
              bankName,
              accountType: row.accountType,
              currentBalance: row.currentBalance,
              isActive: row.isActive,
            },
            {
              onSuccess: () => {
                setLocalRows(prev => prev.filter(r => r.id !== row.id));
                void utils.accounting.bankAccounts.list.invalidate();
                toast.success(`Bank account "${accountName}" created`);
              },
            }
          );
        }
      } else {
        // Existing row — send update (only fields the update mutation accepts)
        const updatePayload: {
          id: number;
          accountName?: string;
          currentBalance?: string;
          isActive?: boolean;
        } = { id: row.id as number };

        if (field === "accountName") {
          updatePayload.accountName = String(event.newValue ?? "");
        } else if (field === "currentBalance") {
          updatePayload.currentBalance = String(event.newValue ?? "0");
        } else if (field === "isActive") {
          updatePayload.isActive = Boolean(event.newValue);
        } else {
          // accountNumber, bankName, accountType are not updatable via the update mutation
          toast.error(
            `Field "${field}" cannot be updated for existing accounts`
          );
          return;
        }

        updateMutation.mutate(updatePayload);
      }
    },
    [createMutation, updateMutation, utils]
  );

  const handleRefresh = useCallback(() => {
    void accountsQuery.refetch();
    void totalCashQuery.refetch();
  }, [accountsQuery, totalCashQuery]);

  // ─── Status Bar ───────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {typeFilter !== "ALL" ? typeFilter : "All Types"} | {totalAccounts}{" "}
      total
    </span>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── 1. Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border-b">
        <span className="font-bold text-xs">Bank Accounts</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
        >
          {formatCurrency(totalCash)}
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
        >
          {totalAccounts} accounts
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
        >
          {activeAccounts} active
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="bank-accounts-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleRefresh}
            aria-label="Refresh accounts"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b flex-wrap">
        {/* Type filter dropdown as buttons */}
        {TYPE_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={typeFilter === opt.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => {
              setTypeFilter(opt.value);
              setSearchTerm("");
            }}
            data-testid={`type-filter-${opt.value}`}
          >
            {opt.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={handleAddRow}
            data-testid="add-row-button"
          >
            <Plus className="h-3 w-3 mr-1" />+ Add Row
          </Button>
        </div>
      </div>

      {/* ── 3. PowersheetGrid (EDITABLE) ── */}
      <PowersheetGrid<BankAccountGridRow>
        surfaceId="bank-accounts"
        requirementIds={["TER-976-bank-accounts"]}
        affordances={EDITABLE_AFFORDANCES}
        title="Bank Accounts"
        rows={filteredRows}
        columnDefs={columnDefs}
        getRowId={row => String(row.id)}
        isLoading={accountsQuery.isLoading}
        emptyTitle="No bank accounts"
        emptyDescription="No bank accounts match your filters"
        selectionMode="cell-range"
        enableFillHandle={true}
        enableUndoRedo={true}
        stopEditingWhenCellsLoseFocus={true}
        onCellValueChanged={handleCellValueChanged}
        onSelectionSummaryChange={setSelectionSummary}
      />

      {/* ── 4. Status Bar ── */}
      <WorkSurfaceStatusBar left={statusBarLeft} right={<KeyboardHintBar hints={EDITABLE_KEYBOARD_HINTS} />} />
    </div>
  );
}

export default BankAccountsSurface;
