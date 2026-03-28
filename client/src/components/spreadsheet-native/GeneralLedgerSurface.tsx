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
import { format } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

import { AccountSelector } from "@/components/accounting/AccountSelector";
import { FiscalPeriodSelector } from "@/components/accounting/FiscalPeriodSelector";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import { cn } from "@/lib/utils";

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

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "DRAFT", label: "Draft" },
];

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

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, "MMM d, yyyy");
  } catch {
    return "-";
  }
};

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
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium bg-green-50 text-green-700 border-green-200">POST</span>`;
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
      return `<span class="text-red-600">${params.value}</span>`;
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
    <div className="flex flex-col">
      {/* ── 1. Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border-b flex-wrap">
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
      <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b flex-wrap">
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
          className="text-[9px] py-0 px-1.5 ml-2 bg-blue-50 text-blue-700 border-blue-200"
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
                    ? "bg-green-100 text-green-700 border-green-200"
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
                <p className="text-sm font-mono text-red-600">
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
                      className="text-sm text-blue-600 hover:underline"
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
        <div className="mx-2 mb-1.5 p-2 bg-blue-50/40 border border-blue-200 rounded-md">
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
                className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
              >
                Balanced
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200"
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
                <tr className="font-bold bg-blue-100/50">
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
        right={<KeyboardHintBar hints={keyboardHints} />}
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
    </div>
  );
}

export default GeneralLedgerSurface;
