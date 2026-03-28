/**
 * FiscalPeriodsSurface — TER-976
 *
 * Editable fiscal periods registry with row grouping and close/lock workflow.
 * Replaces the classic FiscalPeriods.tsx page (678 lines).
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "Fiscal Periods" + KPI badges + search + refresh
 *   2. Action Bar: Status filter tabs + Close Period + Lock Period buttons
 *   3. PowersheetGrid (EDITABLE, GROUPED by fiscalYear) + Collapsible Inspector
 *   4. Status Bar
 *
 * Key differentiator: status-dependent dynamic editability — only OPEN periods
 * have editable cells; CLOSED/LOCKED periods are fully locked.
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { toast } from "sonner";
import { RefreshCw, Search, Lock, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ============================================================================
// TYPES
// ============================================================================

type PeriodStatus = "OPEN" | "CLOSED" | "LOCKED";

interface FiscalPeriodGridRow {
  id: number;
  periodName: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
}

type StatusTab = "ALL" | PeriodStatus;

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "LOCKED", label: "Locked" },
];

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

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// STATUS BADGE RENDERER
// ============================================================================

function StatusBadgeCellRenderer(params: { value: PeriodStatus }) {
  const status = params.value;
  if (status === "OPEN") {
    return (
      <Badge
        variant="outline"
        className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
      >
        OPEN
      </Badge>
    );
  }
  if (status === "CLOSED") {
    return (
      <Badge
        variant="outline"
        className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
      >
        CLOSED
      </Badge>
    );
  }
  if (status === "LOCKED") {
    return (
      <Badge
        variant="outline"
        className="text-[9px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200"
      >
        LOCKED
      </Badge>
    );
  }
  return <span>{status}</span>;
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function buildColumnDefs(): ColDef<FiscalPeriodGridRow>[] {
  return [
    {
      headerName: "Period Name",
      field: "periodName",
      flex: 1,
      editable: params => params.data?.status === "OPEN",
      cellClass: params =>
        params.data?.status === "OPEN"
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      singleClickEdit: true,
    },
    {
      headerName: "Fiscal Year",
      field: "fiscalYear",
      width: 100,
      editable: params => params.data?.status === "OPEN",
      cellClass: params =>
        params.data?.status === "OPEN"
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      singleClickEdit: true,
      rowGroup: true,
      hide: true,
    },
    {
      headerName: "Start Date",
      field: "startDate",
      width: 130,
      editable: params => params.data?.status === "OPEN",
      cellClass: params =>
        params.data?.status === "OPEN"
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      valueFormatter: params => formatDate(params.value as string),
      singleClickEdit: true,
    },
    {
      headerName: "End Date",
      field: "endDate",
      width: 130,
      editable: params => params.data?.status === "OPEN",
      cellClass: params =>
        params.data?.status === "OPEN"
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      valueFormatter: params => formatDate(params.value as string),
      singleClickEdit: true,
    },
    {
      headerName: "Status",
      field: "status",
      width: 90,
      editable: false,
      cellClass: "powersheet-cell--locked",
      cellRenderer: StatusBadgeCellRenderer,
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FiscalPeriodsSurface() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("ALL");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Close/Lock confirmation dialogs
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const periodsQuery = trpc.accounting.fiscalPeriods.list.useQuery({
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
  });

  const currentPeriodQuery =
    trpc.accounting.fiscalPeriods.getCurrent.useQuery();

  const utils = trpc.useUtils();

  // ─── Mutations ────────────────────────────────────────────────────────────

  const closeMutation = trpc.accounting.fiscalPeriods.close.useMutation({
    onSuccess: () => {
      toast.success("Period closed");
      void utils.accounting.fiscalPeriods.list.invalidate();
      void utils.accounting.fiscalPeriods.getCurrent.invalidate();
    },
    onError: err => toast.error(`Close failed: ${err.message}`),
  });

  const lockMutation = trpc.accounting.fiscalPeriods.lock.useMutation({
    onSuccess: () => {
      toast.success("Period locked");
      void utils.accounting.fiscalPeriods.list.invalidate();
      void utils.accounting.fiscalPeriods.getCurrent.invalidate();
    },
    onError: err => toast.error(`Lock failed: ${err.message}`),
  });

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const serverRows: FiscalPeriodGridRow[] = useMemo(() => {
    const items = periodsQuery.data ?? [];
    return items.map(
      (item: {
        id: number;
        periodName: string;
        fiscalYear: number;
        startDate: Date | string;
        endDate: Date | string;
        status: string;
      }) => ({
        id: item.id,
        periodName: item.periodName,
        fiscalYear: item.fiscalYear,
        startDate:
          typeof item.startDate === "string"
            ? item.startDate
            : item.startDate.toISOString(),
        endDate:
          typeof item.endDate === "string"
            ? item.endDate
            : item.endDate.toISOString(),
        status: item.status as PeriodStatus,
      })
    );
  }, [periodsQuery.data]);

  const filteredRows = useMemo(() => {
    let rows = serverRows;
    if (statusFilter !== "ALL") {
      rows = rows.filter(r => r.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter(
        r =>
          r.periodName.toLowerCase().includes(q) ||
          String(r.fiscalYear).includes(q)
      );
    }
    return rows;
  }, [serverRows, statusFilter, searchTerm]);

  // KPIs
  const totalPeriods = serverRows.length;
  const currentPeriodName = currentPeriodQuery.data?.periodName ?? null;

  // Selected row data
  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return serverRows.find(r => String(r.id) === selectedRowId) ?? null;
  }, [selectedRowId, serverRows]);

  // Column definitions (stable reference)
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCellValueChanged = useCallback(
    (_event: CellValueChangedEvent<FiscalPeriodGridRow>) => {
      // Cell editing is allowed only for OPEN periods.
      // Future: wire to an update mutation if the server exposes one.
      // For now the grid allows inline editing for OPEN rows but does not persist.
    },
    []
  );

  const handleRefresh = useCallback(() => {
    void periodsQuery.refetch();
    void currentPeriodQuery.refetch();
  }, [periodsQuery, currentPeriodQuery]);

  const handleClosePeriod = useCallback(() => {
    if (!selectedRow || selectedRow.status !== "OPEN") return;
    setShowCloseDialog(true);
  }, [selectedRow]);

  const handleLockPeriod = useCallback(() => {
    if (!selectedRow || selectedRow.status !== "CLOSED") return;
    setShowLockDialog(true);
  }, [selectedRow]);

  const confirmClose = useCallback(() => {
    if (!selectedRow) return;
    closeMutation.mutate({ id: selectedRow.id });
    setShowCloseDialog(false);
  }, [selectedRow, closeMutation]);

  const confirmLock = useCallback(() => {
    if (!selectedRow) return;
    lockMutation.mutate({ id: selectedRow.id });
    setShowLockDialog(false);
  }, [selectedRow, lockMutation]);

  // ─── Status Bar ───────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {statusFilter !== "ALL" ? statusFilter : "All Statuses"} |{" "}
      {totalPeriods} total
    </span>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── 1. Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border-b">
        <span className="font-bold text-xs">Fiscal Periods</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
        >
          {totalPeriods} periods
        </Badge>
        {currentPeriodName && (
          <Badge
            variant="outline"
            className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
          >
            {currentPeriodName}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search periods..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="fp-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleRefresh}
            aria-label="Refresh periods"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b flex-wrap">
        {/* Status filter tabs */}
        {STATUS_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => {
              setStatusFilter(tab.value);
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
            variant="outline"
            className="h-5 text-[9px] px-2"
            disabled={!selectedRow || selectedRow.status !== "OPEN"}
            onClick={handleClosePeriod}
            data-testid="close-period-button"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Close Period
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-5 text-[9px] px-2"
            disabled={!selectedRow || selectedRow.status !== "CLOSED"}
            onClick={handleLockPeriod}
            data-testid="lock-period-button"
          >
            <Lock className="h-3 w-3 mr-1" />
            Lock Period
          </Button>
        </div>
      </div>

      {/* ── 3. PowersheetGrid (EDITABLE, grouped by fiscalYear) ── */}
      <PowersheetGrid<FiscalPeriodGridRow>
        surfaceId="fiscal-periods"
        requirementIds={["TER-976-fiscal-periods"]}
        affordances={editableAffordances}
        title="Fiscal Periods"
        rows={filteredRows}
        columnDefs={columnDefs}
        getRowId={row => String(row.id)}
        isLoading={periodsQuery.isLoading}
        emptyTitle="No fiscal periods"
        emptyDescription="No fiscal periods match your filters"
        selectionMode="cell-range"
        enableFillHandle={true}
        enableUndoRedo={true}
        stopEditingWhenCellsLoseFocus={true}
        onCellValueChanged={handleCellValueChanged}
        onSelectionSummaryChange={setSelectionSummary}
        selectedRowId={selectedRowId}
        onSelectedRowChange={row =>
          setSelectedRowId(row ? String(row.id) : null)
        }
      />

      {/* ── 4. Status Bar ── */}
      <WorkSurfaceStatusBar left={statusBarLeft} />
      <KeyboardHintBar hints={keyboardHints} />

      {/* ── Confirmation Dialogs ── */}
      <ConfirmDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        title={`Close period ${selectedRow?.periodName ?? ""}?`}
        description="This will prevent new transactions in this period."
        confirmLabel="Close Period"
        onConfirm={confirmClose}
        isLoading={closeMutation.isPending}
      />
      <ConfirmDialog
        open={showLockDialog}
        onOpenChange={setShowLockDialog}
        title={`Lock period ${selectedRow?.periodName ?? ""}?`}
        description="This cannot be undone. Locked periods cannot be reopened."
        confirmLabel="Lock Period"
        variant="destructive"
        onConfirm={confirmLock}
        isLoading={lockMutation.isPending}
      />
    </div>
  );
}

export default FiscalPeriodsSurface;
