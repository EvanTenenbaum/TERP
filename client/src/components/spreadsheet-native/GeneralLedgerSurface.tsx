/**
 * GeneralLedgerSurface — TER-976
 *
 * Account-scoped GL entry browser with Trial Balance support module.
 * Replaces the classic GeneralLedger.tsx page (561 lines).
 *
 * Layout (top -> bottom):
 *   1. Toolbar: "General Ledger" + AccountSelector + FiscalPeriodSelector
 *      + date range + Trial Balance toggle + search + refresh
 *   2. Action Bar: All/Posted/Draft filter tabs + running balance
 *      + Post Journal Entry / Reverse Entry / Export CSV
 *   3. PowersheetGrid (read-only) + Collapsible Inspector
 *   4. Trial Balance support module (collapsible, blue tone)
 *   5. Status Bar: WorkSurfaceStatusBar + KeyboardHintBar
 *   6. Post Journal Entry dialog (sidecar)
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Search,
  RotateCcw,
  Download,
  ChevronDown,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";

import { AccountSelector } from "@/components/accounting/AccountSelector";
import { FiscalPeriodSelector } from "@/components/accounting/FiscalPeriodSelector";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import { cn } from "@/lib/utils";
import {
  fmtCurrency,
  fmtDate,
  REGISTRY_KEYBOARD_HINTS,
} from "@/lib/powersheet/surface-helpers";

// ============================================================================
// TYPES
// ============================================================================

interface LedgerEntry {
  id: number;
  entryNumber: string;
  entryDate: string | Date;
  accountId: number;
  debit: string;
  credit: string;
  description: string | null;
  fiscalPeriodId: number;
  isPosted: boolean;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string | Date;
}

interface TrialBalanceItem {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface LedgerGridRow {
  rowKey: string;
  entryId: number;
  entryNumber: string;
  date: string;
  accountId: number;
  debit: string;
  debitNum: number;
  credit: string;
  creditNum: number;
  description: string;
  status: string;
  isPosted: boolean;
  referenceType: string | null;
  referenceId: number | null;
}

type StatusTab = "ALL" | "POSTED" | "DRAFT";

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "DRAFT", label: "Draft" },
];

/** GL uses "Workflow actions" instead of "Sort"/"Filter" — kept local. */
const registryAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

const PAGE_SIZE = 50;

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = fmtCurrency;
const formatDate = fmtDate;

// ============================================================================
// ROW MAPPING
// ============================================================================

function mapEntriesToGridRows(items: LedgerEntry[]): LedgerGridRow[] {
  return items.map(entry => {
    const debitNum = parseFloat(entry.debit);
    const creditNum = parseFloat(entry.credit);
    return {
      rowKey: String(entry.id),
      entryId: entry.id,
      entryNumber: entry.entryNumber,
      date: formatDate(entry.entryDate),
      accountId: entry.accountId,
      debit: debitNum > 0 ? formatCurrency(entry.debit) : "-",
      debitNum,
      credit: creditNum > 0 ? formatCurrency(entry.credit) : "-",
      creditNum,
      description: entry.description ?? "",
      status: entry.isPosted ? "POSTED" : "DRAFT",
      isPosted: entry.isPosted,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
    };
  });
}

// ============================================================================
// STATUS BADGE CELL RENDERER
// ============================================================================

function statusCellRenderer(params: { value: string }): string {
  const status = params.value ?? "DRAFT";
  if (status === "POSTED") {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] border-green-200">POST</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-gray-50 text-gray-700 border-gray-200">DRAFT</span>`;
}

// ============================================================================
// COLUMN DEFS
// ============================================================================

const glColumnDefs: ColDef<LedgerGridRow>[] = [
  {
    field: "entryNumber",
    headerName: "Entry #",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono",
  },
  {
    field: "date",
    headerName: "Date",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "accountId",
    headerName: "Account",
    minWidth: 80,
    maxWidth: 110,
    cellClass: "powersheet-cell--locked font-mono",
  },
  {
    field: "debit",
    headerName: "Debit",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    cellRenderer: (params: { value: string; data?: LedgerGridRow }) => {
      if (!params.data || params.data.debitNum <= 0) return params.value ?? "-";
      return `<span class="font-bold">${params.value}</span>`;
    },
  },
  {
    field: "credit",
    headerName: "Credit",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    cellRenderer: (params: { value: string; data?: LedgerGridRow }) => {
      if (!params.data || params.data.creditNum <= 0)
        return params.value ?? "-";
      return `<span class="text-destructive">${params.value}</span>`;
    },
  },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    minWidth: 200,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 90,
    maxWidth: 120,
    cellClass: "powersheet-cell--locked",
    cellRenderer: statusCellRenderer,
  },
];

// ============================================================================
// MAIN SURFACE
// ============================================================================

export function GeneralLedgerSurface() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("ALL");
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showTrialBalance, setShowTrialBalance] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  // ─── Queries ────────────────────────────────────────────────────────────────

  const ledgerQuery = trpc.accounting.ledger.list.useQuery({
    accountId: selectedAccount,
    fiscalPeriodId: selectedPeriod,
    startDate: dateFrom ? new Date(dateFrom) : undefined,
    endDate: dateTo ? new Date(dateTo) : undefined,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const trialBalanceQuery = trpc.accounting.ledger.getTrialBalance.useQuery(
    { fiscalPeriodId: selectedPeriod ?? 0 },
    { enabled: showTrialBalance && !!selectedPeriod }
  );

  const postJournalEntry = trpc.accounting.ledger.postJournalEntry.useMutation({
    onSuccess: () => {
      toast.success("Journal entry posted successfully");
      setShowPostDialog(false);
      void ledgerQuery.refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });

  const _utils = trpc.useUtils();

  const reverseMutation = trpc.accountingHooks.reverseGLEntries.useMutation({
    onSuccess: () => {
      toast.success("GL entry reversed successfully");
      setShowReverseDialog(false);
      setReverseReason("");
      void ledgerQuery.refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to reverse entry: ${error.message}`);
    },
  });

  // ─── Derived Data ───────────────────────────────────────────────────────────

  const rawEntries = useMemo(() => {
    const items =
      (ledgerQuery.data as { items?: LedgerEntry[] } | null)?.items ?? [];
    return items as LedgerEntry[];
  }, [ledgerQuery.data]);

  const filteredEntries = useMemo(() => {
    let entries = rawEntries;

    // Status filter
    if (statusFilter === "POSTED") {
      entries = entries.filter(e => e.isPosted);
    } else if (statusFilter === "DRAFT") {
      entries = entries.filter(e => !e.isPosted);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      entries = entries.filter(
        e =>
          e.entryNumber.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    return entries;
  }, [rawEntries, statusFilter, searchTerm]);

  const gridRows = useMemo(
    () => mapEntriesToGridRows(filteredEntries),
    [filteredEntries]
  );

  const selectedRow = gridRows.find(r => r.entryId === selectedRowId) ?? null;

  // Running account balance
  const runningBalance = useMemo(() => {
    const totalDebits = filteredEntries.reduce(
      (sum, e) => sum + parseFloat(e.debit),
      0
    );
    const totalCredits = filteredEntries.reduce(
      (sum, e) => sum + parseFloat(e.credit),
      0
    );
    return totalDebits - totalCredits;
  }, [filteredEntries]);

  // Trial balance data
  const trialBalanceData = trialBalanceQuery.data as
    | {
        accounts?: TrialBalanceItem[];
        totalDebits?: number;
        totalCredits?: number;
        isBalanced?: boolean;
      }
    | TrialBalanceItem[]
    | null;

  const trialBalanceAccounts = useMemo(() => {
    if (!trialBalanceData) return [];
    if (Array.isArray(trialBalanceData)) return trialBalanceData;
    return (
      (trialBalanceData as { accounts?: TrialBalanceItem[] }).accounts ?? []
    );
  }, [trialBalanceData]);

  const trialBalanceTotals = useMemo(() => {
    if (!trialBalanceData)
      return { totalDebits: 0, totalCredits: 0, isBalanced: true };
    if (Array.isArray(trialBalanceData)) {
      const totalDebits = trialBalanceData.reduce(
        (s, i) => s + i.totalDebit,
        0
      );
      const totalCredits = trialBalanceData.reduce(
        (s, i) => s + i.totalCredit,
        0
      );
      return {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      };
    }
    const obj = trialBalanceData as {
      totalDebits?: number;
      totalCredits?: number;
      isBalanced?: boolean;
    };
    return {
      totalDebits: obj.totalDebits ?? 0,
      totalCredits: obj.totalCredits ?? 0,
      isBalanced: obj.isBalanced ?? true,
    };
  }, [trialBalanceData]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    const header = "Entry #,Date,Account,Debit,Credit,Description,Status";
    const rows = gridRows.map(
      r =>
        `"${r.entryNumber}","${r.date}","${r.accountId}","${r.debit}","${r.credit}","${r.description}","${r.status}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "general-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [gridRows]);

  const handleExportTrialBalanceCsv = useCallback(() => {
    const header = "Account #,Name,Total Debit,Total Credit";
    const rows = trialBalanceAccounts.map(
      a =>
        `"${a.accountNumber}","${a.accountName}","${formatCurrency(a.totalDebit)}","${formatCurrency(a.totalCredit)}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trial-balance.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Trial Balance CSV exported");
  }, [trialBalanceAccounts]);

  const getReferenceLink = (type: string | null, id: number | null) => {
    if (!type || !id) return null;
    switch (type) {
      case "PAYMENT":
        return `?tab=payments&id=${id}`;
      case "INVOICE":
        return `?tab=invoices&invoiceId=${id}`;
      default:
        return null;
    }
  };

  // ─── Status Bar ─────────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {selectedAccount ? `Account #${selectedAccount}` : "All accounts"} |{" "}
      Balance: {formatCurrency(runningBalance)}
    </span>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* ── 1. Toolbar ── */}
      <div className="mx-2 mt-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 flex-wrap shadow-sm">
        <span className="font-bold text-xs">General Ledger</span>

        <div className="w-40">
          <AccountSelector
            value={selectedAccount}
            onChange={setSelectedAccount}
          />
        </div>
        <div className="w-44">
          <FiscalPeriodSelector
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            showStatus={false}
          />
        </div>

        {/* Date range inputs */}
        <Input
          type="date"
          className="h-5 text-[10px] w-28"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          aria-label="Start date"
        />
        <Input
          type="date"
          className="h-5 text-[10px] w-28"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          aria-label="End date"
        />

        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[9px] px-2"
          onClick={() => setShowTrialBalance(v => !v)}
          data-testid="trial-balance-toggle"
        >
          <FileText className="h-3 w-3 mr-1" />
          Trial Balance
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search entry # or description"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="gl-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => void ledgerQuery.refetch()}
            aria-label="Refresh ledger"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="mx-2 flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex-wrap shadow-sm">
        {/* Status filter tabs */}
        {STATUS_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => setStatusFilter(tab.value)}
            data-testid={`status-tab-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}

        {/* Running balance display */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 ml-2 bg-[var(--info-bg)] text-[var(--info)] border-blue-200"
        >
          Balance: {formatCurrency(runningBalance)}
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => setShowPostDialog(true)}
            data-testid="post-journal-entry-button"
          >
            <Plus className="h-3 w-3 mr-1" />
            Post Journal Entry
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!selectedRow || !selectedRow.isPosted}
            onClick={() => setShowReverseDialog(true)}
            data-testid="reverse-entry-button"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reverse Entry
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

      {/* ── 3. Grid + Collapsible Inspector ── */}
      <div className="flex flex-1 min-h-0">
        <div className={cn("flex-1", selectedRow && "flex-[3]")}>
          <PowersheetGrid
            surfaceId="general-ledger"
            requirementIds={["GL-001"]}
            affordances={registryAffordances}
            title="General Ledger"
            rows={gridRows}
            columnDefs={glColumnDefs}
            getRowId={row => row.rowKey}
            selectedRowId={selectedRow?.rowKey ?? null}
            onSelectedRowChange={row => setSelectedRowId(row?.entryId ?? null)}
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={false}
            onSelectionSummaryChange={setSelectionSummary}
            isLoading={ledgerQuery.isLoading}
            errorMessage={ledgerQuery.error?.message ?? null}
            emptyTitle="No ledger entries"
            emptyDescription="Adjust filters or post a new journal entry."
            minHeight={320}
          />
        </div>

        {/* Inspector panel (~25% right) */}
        {selectedRow && (
          <InspectorPanel
            isOpen
            onClose={() => setSelectedRowId(null)}
            title={selectedRow.entryNumber}
            subtitle={selectedRow.date}
            headerActions={
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px]",
                  selectedRow.isPosted
                    ? "bg-[var(--success-bg)] text-[var(--success)] border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                )}
              >
                {selectedRow.status}
              </Badge>
            }
          >
            {/* Overview */}
            <InspectorSection title="Entry Details" defaultOpen>
              <InspectorField label="Entry #">
                <p className="text-sm font-mono font-medium">
                  {selectedRow.entryNumber}
                </p>
              </InspectorField>
              <InspectorField label="Date">
                <p className="text-sm">{selectedRow.date}</p>
              </InspectorField>
              <InspectorField label="Account">
                <p className="text-sm font-mono">{selectedRow.accountId}</p>
              </InspectorField>
              <InspectorField label="Debit">
                <p className="text-sm font-mono font-bold">
                  {selectedRow.debit}
                </p>
              </InspectorField>
              <InspectorField label="Credit">
                <p className="text-sm font-mono text-destructive">
                  {selectedRow.credit}
                </p>
              </InspectorField>
              <InspectorField label="Description">
                <p className="text-sm">{selectedRow.description}</p>
              </InspectorField>
            </InspectorSection>

            {/* Source Reference */}
            {selectedRow.referenceType && selectedRow.referenceId && (
              <InspectorSection title="Source Reference" defaultOpen>
                <InspectorField label="Type">
                  <p className="text-sm">{selectedRow.referenceType}</p>
                </InspectorField>
                <InspectorField label="Reference">
                  {getReferenceLink(
                    selectedRow.referenceType,
                    selectedRow.referenceId
                  ) ? (
                    <a
                      href={
                        getReferenceLink(
                          selectedRow.referenceType,
                          selectedRow.referenceId
                        ) ?? "#"
                      }
                      className="text-sm text-[var(--info)] hover:underline"
                    >
                      {selectedRow.referenceType} #{selectedRow.referenceId}
                    </a>
                  ) : (
                    <p className="text-sm">
                      {selectedRow.referenceType} #{selectedRow.referenceId}
                    </p>
                  )}
                </InspectorField>
              </InspectorSection>
            )}

            {/* Quick action: Reverse */}
            {selectedRow.isPosted && (
              <InspectorSection title="Actions" defaultOpen>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowReverseDialog(true)}
                  data-testid="inspector-reverse-button"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reverse Entry
                </Button>
              </InspectorSection>
            )}
          </InspectorPanel>
        )}
      </div>

      {/* ── 4. Trial Balance support module ── */}
      {showTrialBalance && (
        <div className="mx-2 mb-1.5 p-2 bg-[var(--info-bg)]/40 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setShowTrialBalance(false)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
            <span className="font-semibold text-xs">Trial Balance</span>
            {trialBalanceTotals.isBalanced ? (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1.5 bg-[var(--success-bg)] text-[var(--success)] border-green-200"
              >
                Balanced
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1.5 bg-destructive/10 text-destructive border-red-200"
              >
                Out of Balance
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-5 text-[9px] px-2 ml-auto"
              onClick={handleExportTrialBalanceCsv}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          {!selectedPeriod ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Select a fiscal period to view trial balance.
            </p>
          ) : trialBalanceAccounts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No trial balance data for this period.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 font-medium">Account #</th>
                  <th className="text-left py-1 px-2 font-medium">Name</th>
                  <th className="text-right py-1 px-2 font-medium">
                    Total Debit
                  </th>
                  <th className="text-right py-1 px-2 font-medium">
                    Total Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {trialBalanceAccounts.map(item => (
                  <tr key={item.accountId} className="border-b border-blue-100">
                    <td className="py-1 px-2 font-mono">
                      {item.accountNumber}
                    </td>
                    <td className="py-1 px-2">{item.accountName}</td>
                    <td className="py-1 px-2 text-right font-mono">
                      {item.totalDebit > 0
                        ? formatCurrency(item.totalDebit)
                        : "-"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono">
                      {item.totalCredit > 0
                        ? formatCurrency(item.totalCredit)
                        : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-[var(--info-bg)]/50">
                  <td className="py-1 px-2" colSpan={2}>
                    Total
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatCurrency(trialBalanceTotals.totalDebits)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatCurrency(trialBalanceTotals.totalCredits)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── 5. Status Bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        right={<KeyboardHintBar hints={REGISTRY_KEYBOARD_HINTS} />}
      />

      {/* ── 6. Post Journal Entry Dialog ── */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Post Journal Entry</DialogTitle>
            <DialogDescription>
              Create a new double-entry journal entry
            </DialogDescription>
          </DialogHeader>
          <JournalEntryForm
            onSubmit={data => {
              postJournalEntry.mutate({
                entryDate: data.entryDate,
                debitAccountId: data.debitAccountId,
                creditAccountId: data.creditAccountId,
                amount: data.amount,
                description: data.description,
                fiscalPeriodId: data.fiscalPeriodId,
              });
            }}
            onCancel={() => setShowPostDialog(false)}
            isSubmitting={postJournalEntry.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── 7. Reverse Entry Confirmation Dialog ── */}
      <Dialog
        open={showReverseDialog}
        onOpenChange={open => {
          setShowReverseDialog(open);
          if (!open) setReverseReason("");
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reverse GL Entry</DialogTitle>
            <DialogDescription>
              This will create offsetting entries to reverse{" "}
              {selectedRow?.entryNumber ?? "this entry"}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label
              htmlFor="reverse-reason"
              className="text-sm font-medium mb-1.5 block"
            >
              Reason for reversal <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="reverse-reason"
              placeholder="Enter reason for reversing this entry..."
              value={reverseReason}
              onChange={e => setReverseReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowReverseDialog(false);
                setReverseReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !reverseReason.trim() ||
                reverseMutation.isPending ||
                !selectedRow?.referenceType ||
                !selectedRow?.referenceId
              }
              onClick={() => {
                if (!selectedRow?.referenceType || !selectedRow?.referenceId)
                  return;
                reverseMutation.mutate({
                  referenceType: selectedRow.referenceType,
                  referenceId: selectedRow.referenceId,
                  reason: reverseReason.trim(),
                });
              }}
            >
              {reverseMutation.isPending ? "Reversing..." : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GeneralLedgerSurface;
