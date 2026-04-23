/**
 * ChartOfAccountsSurface — TER-976
 *
 * Grouped EDITABLE grid for managing the chart of accounts.
 * Replaces the classic ChartOfAccounts.tsx page (714 lines).
 * This is the first editable surface.
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "Chart of Accounts" + KPI badges + search + refresh
 *   2. Action Bar: Type filter tabs + Add Row + Edit buttons
 *   3. PowersheetGrid (EDITABLE, grouped) + Collapsible Inspector
 *   4. Status Bar
 *
 * Spec: docs/superpowers/plans/2026-03-27-sales-catalogue-unified-surface.md
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { toast } from "sonner";
import { Plus, RefreshCw, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AccountType } from "@/components/accounting";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import {
  EDITABLE_AFFORDANCES,
  EDITABLE_KEYBOARD_HINTS,
} from "@/lib/powersheet/surface-helpers";

// ============================================================================
// TYPES
// ============================================================================

interface AccountGridRow {
  id: number | string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: "DEBIT" | "CREDIT";
  isActive: boolean;
  description: string | null;
}

type TypeTab = "ALL" | AccountType;

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_TABS: Array<{ value: TypeTab; label: string }> = [
  { value: "ALL", label: "All Types" },
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "EQUITY", label: "Equity" },
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expense" },
];

// ============================================================================
// HELPERS
// ============================================================================

function isNewRow(id: number | string): boolean {
  return String(id).startsWith("new-");
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function buildColumnDefs(): ColDef<AccountGridRow>[] {
  return [
    {
      headerName: "Acct #",
      field: "accountNumber",
      width: 80,
      editable: params => isNewRow(params.data?.id ?? ""),
      cellClass: params =>
        isNewRow(params.data?.id ?? "")
          ? "powersheet-cell--editable font-mono"
          : "powersheet-cell--locked font-mono",
      singleClickEdit: true,
    },
    {
      headerName: "Account Name",
      field: "accountName",
      flex: 1,
      editable: true,
      cellClass: "powersheet-cell--editable",
      singleClickEdit: true,
    },
    {
      headerName: "Type",
      field: "accountType",
      width: 90,
      editable: params => isNewRow(params.data?.id ?? ""),
      cellClass: params =>
        isNewRow(params.data?.id ?? "")
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      },
      singleClickEdit: true,
      rowGroup: true,
      hide: true,
    },
    {
      headerName: "Normal Balance",
      field: "normalBalance",
      width: 80,
      editable: true,
      cellClass: "powersheet-cell--editable",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["DEBIT", "CREDIT"],
      },
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

export function ChartOfAccountsSurface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeTab>("ALL");
  const [localRows, setLocalRows] = useState<AccountGridRow[]>([]);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const accountsQuery = trpc.accounting.accounts.list.useQuery({
    ...(typeFilter !== "ALL" ? { accountType: typeFilter } : {}),
  });

  const utils = trpc.useUtils();

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = trpc.accounting.accounts.create.useMutation({
    onSuccess: () => {
      toast.success("Account created");
      void utils.accounting.accounts.list.invalidate();
    },
    onError: err => toast.error(`Create failed: ${err.message}`),
  });

  const updateMutation = trpc.accounting.accounts.update.useMutation({
    onSuccess: () => {
      toast.success("Account updated");
      void utils.accounting.accounts.list.invalidate();
    },
    onError: err => toast.error(`Update failed: ${err.message}`),
  });

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const serverRows: AccountGridRow[] = useMemo(() => {
    const items = accountsQuery.data?.items ?? [];
    return items.map(item => ({
      id: item.id,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      accountType: item.accountType as AccountType,
      normalBalance: item.normalBalance as "DEBIT" | "CREDIT",
      isActive: item.isActive,
      description: item.description ?? null,
    }));
  }, [accountsQuery.data]);

  const allRows = useMemo(() => {
    // Merge server rows with local new rows (temp rows that haven't been saved)
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
          r.accountNumber.toLowerCase().includes(q) ||
          r.accountName.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, typeFilter, searchTerm]);

  // KPIs
  const totalAccounts = allRows.length;
  const activeAccounts = allRows.filter(r => r.isActive).length;

  // Column definitions (stable reference)
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddRow = useCallback(() => {
    const newRow: AccountGridRow = {
      id: `new-${Date.now()}`,
      accountNumber: "",
      accountName: "",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      description: "",
    };
    setLocalRows(prev => [...prev, newRow]);
  }, []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<AccountGridRow>) => {
      const row = event.data;
      if (!row) return;
      const field = event.colDef.field as keyof AccountGridRow | undefined;
      if (!field) return;

      if (isNewRow(row.id)) {
        // Update local state for new rows
        setLocalRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, [field]: event.newValue } : r
          )
        );

        // Check if required fields are filled to auto-create
        const accountNumber =
          field === "accountNumber"
            ? String(event.newValue ?? "")
            : row.accountNumber;
        const accountName =
          field === "accountName"
            ? String(event.newValue ?? "")
            : row.accountName;

        if (accountNumber && accountName) {
          createMutation.mutate(
            {
              accountNumber,
              accountName,
              accountType: row.accountType,
              normalBalance: row.normalBalance,
              description: row.description ?? undefined,
              isActive: row.isActive,
            },
            {
              onSuccess: () => {
                // Replace temp row with server-returned id
                setLocalRows(prev => prev.filter(r => r.id !== row.id));
                // The server row will appear via query invalidation
                void utils.accounting.accounts.list.invalidate();
                toast.success(`Account "${accountName}" created`);
              },
            }
          );
        }
      } else {
        // Existing row — send update
        updateMutation.mutate({
          id: row.id as number,
          [field]: event.newValue,
        });
      }
    },
    [createMutation, updateMutation, utils]
  );

  const handleRefresh = useCallback(() => {
    void accountsQuery.refetch();
  }, [accountsQuery]);

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
    <div className="flex flex-col gap-2">
      {/* ── 1. Toolbar ── */}
      <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 shadow-sm">
        <span className="font-bold text-xs">Chart of Accounts</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-[var(--info-bg)] text-[var(--info)] border-blue-200"
        >
          {totalAccounts} accounts
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-[var(--success-bg)] text-[var(--success)] border-green-200"
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
              data-testid="coa-search-input"
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
            onClick={handleAddRow}
            data-testid="add-row-button"
          >
            <Plus className="h-3 w-3 mr-1" />+ Add Row
          </Button>
        </div>
      </div>

      {/* ── 3. PowersheetGrid (EDITABLE, grouped) ── */}
      <PowersheetGrid<AccountGridRow>
        surfaceId="chart-of-accounts"
        requirementIds={["TER-976-chart-of-accounts"]}
        affordances={EDITABLE_AFFORDANCES}
        title="Chart of Accounts"
        rows={filteredRows}
        columnDefs={columnDefs}
        getRowId={row => String(row.id)}
        isLoading={accountsQuery.isLoading}
        emptyTitle="No accounts"
        emptyDescription="No accounts match your filters"
        selectionMode="cell-range"
        enableFillHandle={true}
        enableUndoRedo={true}
        stopEditingWhenCellsLoseFocus={true}
        onCellValueChanged={handleCellValueChanged}
        onSelectionSummaryChange={setSelectionSummary}
      />

      {/* ── 4. Status Bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        right={<KeyboardHintBar hints={EDITABLE_KEYBOARD_HINTS} />}
      />
    </div>
  );
}

export default ChartOfAccountsSurface;
