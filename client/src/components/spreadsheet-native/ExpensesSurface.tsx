/**
 * ExpensesSurface -- TER-976
 *
 * EDITABLE expense registry surface. Replaces classic Expenses.tsx (421 lines).
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "Expenses" + KPI badges + search + refresh
 *   2. Action Bar: Category dropdown filter + "Reimbursable only" checkbox + Export CSV
 *   3. PowersheetGrid (EDITABLE) + Collapsible Inspector
 *   4. Status Bar
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { toast } from "sonner";
import { Plus, RefreshCw, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ExpenseGridRow {
  id: number | string;
  expenseNumber: string;
  expenseDate: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string;
  amount: string;
  isReimbursable: boolean;
  isReimbursed: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// HELPERS
// ============================================================================

function isNewRow(id: number | string): boolean {
  return String(id).startsWith("new-");
}

const formatCurrency = fmtCurrency;

// ============================================================================
// COMPONENT
// ============================================================================

export function ExpensesSurface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [reimbursableOnly, setReimbursableOnly] = useState(false);
  const [localRows, setLocalRows] = useState<ExpenseGridRow[]>([]);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // --- Queries ---------------------------------------------------------------

  const expensesQuery = trpc.accounting.expenses.list.useQuery({
    ...(categoryFilter !== "ALL"
      ? { categoryId: parseInt(categoryFilter, 10) }
      : {}),
  });

  const categoriesQuery = trpc.accounting.expenseCategories.list.useQuery({});

  const pendingReimbursementsQuery =
    trpc.accounting.expenses.getPendingReimbursements.useQuery();

  const breakdownQuery =
    trpc.accounting.expenses.getBreakdownByCategory.useQuery({});

  const utils = trpc.useUtils();

  // --- Mutations -------------------------------------------------------------

  const createMutation = trpc.accounting.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense created");
      void utils.accounting.expenses.list.invalidate();
      void utils.accounting.expenses.getBreakdownByCategory.invalidate();
      void utils.accounting.expenses.getPendingReimbursements.invalidate();
    },
    onError: (err: { message: string }) =>
      toast.error(`Create failed: ${err.message}`),
  });

  const updateMutation = trpc.accounting.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated");
      void utils.accounting.expenses.list.invalidate();
      void utils.accounting.expenses.getBreakdownByCategory.invalidate();
    },
    onError: (err: { message: string }) =>
      toast.error(`Update failed: ${err.message}`),
  });

  // --- Category map ----------------------------------------------------------

  const categoryList = useMemo(() => {
    return categoriesQuery.data?.items ?? [];
  }, [categoriesQuery.data]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categoryList) {
      map.set(cat.id as number, (cat as { categoryName: string }).categoryName);
    }
    return map;
  }, [categoryList]);

  // --- Derived data ----------------------------------------------------------

  const serverRows: ExpenseGridRow[] = useMemo(() => {
    const items = expensesQuery.data?.items ?? [];
    return items.map(
      (item: {
        id: number;
        expenseNumber: string;
        expenseDate: Date | string;
        description: string | null;
        categoryId: number | null;
        amount: string;
        isReimbursable: boolean;
        isReimbursed: boolean;
      }) => ({
        id: item.id,
        expenseNumber: item.expenseNumber,
        expenseDate:
          typeof item.expenseDate === "string"
            ? item.expenseDate
            : format(item.expenseDate, "yyyy-MM-dd"),
        description: item.description ?? null,
        categoryId: item.categoryId,
        categoryName: item.categoryId
          ? (categoryMap.get(item.categoryId) ?? "Unknown")
          : "Uncategorized",
        amount: item.amount,
        isReimbursable: item.isReimbursable,
        isReimbursed: item.isReimbursed,
      })
    );
  }, [expensesQuery.data, categoryMap]);

  const allRows = useMemo(() => {
    const newRows = localRows.filter(r => isNewRow(r.id));
    return [...serverRows, ...newRows];
  }, [serverRows, localRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (reimbursableOnly) {
      rows = rows.filter(r => r.isReimbursable && !r.isReimbursed);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter(
        r =>
          r.expenseNumber.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, reimbursableOnly, searchTerm]);

  // --- KPIs ------------------------------------------------------------------

  const totalAmount = useMemo(() => {
    return allRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [allRows]);

  const totalEntries = allRows.length;

  const pendingReimbursementCount = useMemo(() => {
    const pending = pendingReimbursementsQuery.data;
    if (Array.isArray(pending)) return pending.length;
    return 0;
  }, [pendingReimbursementsQuery.data]);

  // --- Column definitions ----------------------------------------------------

  const columnDefs = useMemo<ColDef<ExpenseGridRow>[]>(() => {
    const categoryValues = categoryList.map(
      (c: { categoryName: string }) => c.categoryName
    );

    return [
      {
        headerName: "Expense #",
        field: "expenseNumber",
        width: 140,
        editable: false,
        cellClass: "powersheet-cell--locked font-mono",
      },
      {
        headerName: "Date",
        field: "expenseDate",
        width: 110,
        editable: true,
        cellClass: "powersheet-cell--editable",
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
        headerName: "Category",
        field: "categoryName",
        width: 140,
        editable: true,
        cellClass: "powersheet-cell--editable",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: categoryValues,
        },
        singleClickEdit: true,
      },
      {
        headerName: "Amount",
        field: "amount",
        width: 110,
        editable: true,
        cellClass: "powersheet-cell--editable font-mono text-right",
        valueFormatter: params => formatCurrency(params.value ?? "0"),
        singleClickEdit: true,
      },
      {
        headerName: "Reimbursable",
        field: "isReimbursable",
        width: 80,
        editable: true,
        cellClass: "powersheet-cell--editable",
        cellRenderer: "agCheckboxCellRenderer",
        cellEditor: "agCheckboxCellEditor",
        singleClickEdit: true,
      },
      {
        headerName: "Reimbursed",
        field: "isReimbursed",
        width: 80,
        editable: true,
        cellClass: "powersheet-cell--editable",
        cellRenderer: "agCheckboxCellRenderer",
        cellEditor: "agCheckboxCellEditor",
        singleClickEdit: true,
      },
    ];
  }, [categoryList]);

  // --- Handlers --------------------------------------------------------------

  const handleAddRow = useCallback(() => {
    // Generate expense number via query, then add row
    utils.accounting.expenses.generateNumber
      .fetch()
      .then(expenseNumber => {
        const today = format(new Date(), "yyyy-MM-dd");
        const newRow: ExpenseGridRow = {
          id: `new-${Date.now()}`,
          expenseNumber: expenseNumber as string,
          expenseDate: today,
          description: "",
          categoryId: null,
          categoryName: "",
          amount: "0.00",
          isReimbursable: false,
          isReimbursed: false,
        };
        setLocalRows(prev => [...prev, newRow]);
      })
      .catch(() => {
        toast.error("Failed to generate expense number");
      });
  }, [utils]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ExpenseGridRow>) => {
      const row = event.data;
      if (!row) return;
      const field = event.colDef.field as keyof ExpenseGridRow | undefined;
      if (!field) return;

      if (isNewRow(row.id)) {
        // Update local state for new rows
        setLocalRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, [field]: event.newValue } : r
          )
        );

        // Resolve categoryId from categoryName when category changes
        let resolvedCategoryId = row.categoryId;
        if (field === "categoryName") {
          const cat = categoryList.find(
            (c: { categoryName: string }) => c.categoryName === event.newValue
          );
          if (cat) {
            resolvedCategoryId = cat.id as number;
            setLocalRows(prev =>
              prev.map(r =>
                r.id === row.id ? { ...r, categoryId: cat.id as number } : r
              )
            );
          }
        }

        // Check if required fields are filled to auto-create
        const amount =
          field === "amount" ? String(event.newValue ?? "0") : row.amount;
        const categoryId =
          field === "categoryName" ? resolvedCategoryId : row.categoryId;

        if (categoryId && parseFloat(amount) > 0) {
          createMutation.mutate(
            {
              expenseNumber: row.expenseNumber,
              expenseDate: new Date(row.expenseDate),
              categoryId: categoryId,
              amount: amount,
              totalAmount: amount,
              paymentMethod: "CASH",
              description: row.description ?? undefined,
              isReimbursable: row.isReimbursable,
            },
            {
              onSuccess: () => {
                setLocalRows(prev => prev.filter(r => r.id !== row.id));
              },
            }
          );
        }
      } else {
        // Existing row -- send update
        const updatePayload: Record<string, unknown> = {
          id: row.id as number,
        };

        if (field === "categoryName") {
          // Resolve category name back to categoryId
          const cat = categoryList.find(
            (c: { categoryName: string }) => c.categoryName === event.newValue
          );
          if (cat) {
            updatePayload.categoryId = cat.id;
          }
        } else if (field === "expenseDate") {
          updatePayload.expenseDate = new Date(event.newValue as string);
        } else if (field === "amount") {
          updatePayload.amount = String(event.newValue);
        } else if (field === "description") {
          updatePayload.description = event.newValue;
        }

        updateMutation.mutate(
          updatePayload as { id: number; [key: string]: unknown }
        );
      }
    },
    [createMutation, updateMutation, categoryList]
  );

  const handleRefresh = useCallback(() => {
    void expensesQuery.refetch();
    void categoriesQuery.refetch();
    void pendingReimbursementsQuery.refetch();
    void breakdownQuery.refetch();
  }, [
    expensesQuery,
    categoriesQuery,
    pendingReimbursementsQuery,
    breakdownQuery,
  ]);

  const handleExportCsv = useCallback(() => {
    if (filteredRows.length === 0) {
      toast.info("No data to export");
      return;
    }
    const csv = [
      "Expense #,Date,Description,Category,Amount,Reimbursable,Reimbursed",
      ...filteredRows.map(
        r =>
          `"${r.expenseNumber}","${r.expenseDate}","${r.description ?? ""}","${r.categoryName}","${r.amount}",${r.isReimbursable},${r.isReimbursed}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [filteredRows]);

  // --- Status bar ------------------------------------------------------------

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      |{" "}
      {categoryFilter !== "ALL"
        ? (categoryMap.get(parseInt(categoryFilter, 10)) ?? categoryFilter)
        : "All Categories"}{" "}
      | {totalEntries} total
    </span>
  );

  // --- Render ----------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Toolbar */}
      <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 shadow-sm">
        <span className="font-bold text-xs">Expenses</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
          data-testid="kpi-total-amount"
        >
          {formatCurrency(totalAmount)} total
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-[var(--info-bg)] text-[var(--info)] border-blue-200"
          data-testid="kpi-entries"
        >
          {totalEntries} entries
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-pink-50 text-pink-700 border-pink-200"
          data-testid="kpi-pending-reimbursement"
        >
          {pendingReimbursementCount} pending reimbursement
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="expenses-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleRefresh}
            aria-label="Refresh expenses"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="mx-2 flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex-wrap shadow-sm">
        {/* Category dropdown filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            className="h-5 text-[9px] w-36"
            data-testid="category-filter"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categoryList.map((cat: { id: number; categoryName: string }) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reimbursable only checkbox */}
        <label className="flex items-center gap-1 text-[9px] cursor-pointer">
          <input
            type="checkbox"
            checked={reimbursableOnly}
            onChange={e => setReimbursableOnly(e.target.checked)}
            className="h-3 w-3"
            data-testid="reimbursable-only-checkbox"
          />
          Reimbursable only
        </label>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-5 text-[9px] px-2"
            onClick={handleExportCsv}
            data-testid="export-csv-button"
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
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

      {/* 3. PowersheetGrid (EDITABLE) */}
      <PowersheetGrid<ExpenseGridRow>
        surfaceId="expenses"
        requirementIds={["TER-976-expenses"]}
        affordances={EDITABLE_AFFORDANCES}
        title="Expenses"
        rows={filteredRows}
        columnDefs={columnDefs}
        getRowId={row => String(row.id)}
        isLoading={expensesQuery.isLoading}
        emptyTitle="No expenses"
        emptyDescription="No expenses match your filters"
        selectionMode="cell-range"
        enableFillHandle={true}
        enableUndoRedo={true}
        stopEditingWhenCellsLoseFocus={true}
        onCellValueChanged={handleCellValueChanged}
        onSelectionSummaryChange={setSelectionSummary}
      />

      {/* 4. Status Bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        right={<KeyboardHintBar hints={EDITABLE_KEYBOARD_HINTS} />}
      />
    </div>
  );
}

export default ExpensesSurface;
