/**
 * InvoicesSurface — TER-976
 *
 * Unified sheet-native surface for Invoices. Replaces InvoicesPilotSurface,
 * InvoicesWorkSurface, and ClientLedgerPilotSurface into a single compact
 * component with embedded Client Ledger sub-view.
 *
 * Layout (top → bottom):
 *   1. Toolbar: title + KPI badges + AR Aging toggle + search + refresh
 *   2. Action Bar: 8 status filter tabs + workflow actions
 *   3. Grid + Collapsible Inspector
 *   4. AR Aging Panel (collapsible)
 *   5. Client Ledger Sub-View (collapsible, auto on row select)
 *   6. Status Bar: WorkSurfaceStatusBar + KeyboardHintBar
 *   7. Sidecar Dialogs: InvoiceToPaymentFlow, Void, Create
 *
 * Critical bugs preserved:
 *   BUG-053: Dedup invoices by ID (Set-based filter)
 *   BUG-054/055/057: Clamp amountDue to [0, totalAmount]. PAID/VOID → $0.00.
 *
 * Spec: docs/superpowers/specs/2026-03-27-unified-sheet-native-accounting-design.md
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import type { ColDef } from "ag-grid-community";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  Send,
  CreditCard,
  XCircle,
  CalendarClock,
  Download,
  Printer,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import { InvoiceGLStatus } from "@/components/accounting/GLReversalStatus";

import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import {
  INVOICE_STATUS_TOKENS,
  INVOICE_AGING_TOKENS,
  LEDGER_TYPE_TOKENS,
} from "@/lib/statusTokens";
import { cn } from "@/lib/utils";
import { parseInvoiceDeepLink } from "@/components/work-surface/invoiceDeepLink";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InvoiceListOutput = RouterOutputs["invoices"]["list"];
type InvoiceItem = InvoiceListOutput["items"][number];

export interface InvoiceGridRow {
  rowKey: string;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  dueDateRaw: string;
  totalAmount: string;
  totalAmountFormatted: string;
  amountDue: string;
  amountDueFormatted: string;
  amountPaid: string;
  paymentPct: number;
  status: string;
  daysOverdue: number;
  version: number | null;
}

export interface LedgerGridRow {
  rowKey: string;
  date: string;
  type: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  debit: string;
  credit: string;
  balance: string;
  balanceNum: number;
}

export type StatusTab =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const INVOICE_STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
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
const LEDGER_PAGE_SIZE = 50;

const AGING_STORAGE_KEY = "invoices-surface-ar-aging-open";

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

const formatCurrencyCompact = (
  value: string | number | null | undefined
): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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

const getDaysOverdue = (dueDate: Date | string): number => {
  const due = new Date(dueDate);
  return Math.max(0, differenceInDays(new Date(), due));
};

const getPaymentProgress = (item: InvoiceItem): number => {
  const total = parseFloat(String(item.totalAmount ?? "0"));
  const paid = parseFloat(String(item.amountPaid ?? "0"));
  return total > 0 ? Math.round((paid / total) * 100) : 0;
};

// ============================================================================
// ROW MAPPING (with bug-fix dedup + clamp)
// ============================================================================

function mapInvoicesToGridRows(
  items: InvoiceItem[],
  clientNamesById: Map<number, string>
): InvoiceGridRow[] {
  // BUG-053: deduplicate by invoice ID
  const seen = new Set<number>();
  const uniqueItems = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return uniqueItems.map(item => {
    const customerId = item.customerId ?? 0;
    const clientName =
      (item as InvoiceItem & { client?: { name?: string | null } }).client
        ?.name ??
      clientNamesById.get(customerId) ??
      `Client #${customerId}`;

    const totalAmount = String(item.totalAmount ?? "0");
    const totalAmountNum = parseFloat(totalAmount);
    const amountPaidRaw = parseFloat(String(item.amountPaid ?? "0"));
    const status = item.status ?? "DRAFT";

    // BUG-054/055/057: Clamp amountDue to [0, totalAmount]. PAID/VOID → $0.00.
    const rawAmountDue = parseFloat(String(item.amountDue ?? "0"));
    const amountDueNum =
      status === "PAID" || status === "VOID"
        ? 0
        : Math.max(0, Math.min(rawAmountDue, totalAmountNum));
    const amountDue = amountDueNum.toFixed(2);
    const amountPaid = Math.min(amountPaidRaw, totalAmountNum).toFixed(2);

    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const daysOverdue =
      status === "OVERDUE" && dueDate ? getDaysOverdue(dueDate) : 0;

    return {
      rowKey: String(item.id),
      invoiceId: item.id,
      invoiceNumber: item.invoiceNumber ?? "-",
      clientName,
      customerId,
      invoiceDate: formatDate(item.invoiceDate),
      dueDate: formatDate(item.dueDate),
      dueDateRaw: dueDate ? dueDate.toISOString() : "",
      totalAmount,
      totalAmountFormatted: formatCurrency(totalAmount),
      amountDue,
      amountDueFormatted: formatCurrency(amountDue),
      amountPaid,
      paymentPct: getPaymentProgress(item),
      status,
      daysOverdue,
      version:
        (item as InvoiceItem & { version?: number | null }).version ?? null,
    };
  });
}

// ============================================================================
// STATUS BADGE CELL RENDERER
// ============================================================================

function statusCellRenderer(params: { value: string }): string {
  const status = params.value ?? "DRAFT";
  const colorMap: Record<string, string> = {
    DRAFT: "text-slate-700 bg-slate-50 border-slate-200",
    SENT: "text-blue-700 bg-blue-50 border-blue-200",
    VIEWED: "text-purple-700 bg-purple-50 border-purple-200",
    PARTIAL: "text-amber-700 bg-amber-50 border-amber-200",
    PAID: "text-green-700 bg-green-50 border-green-200",
    OVERDUE: "text-red-700 bg-red-50 border-red-200",
    VOID: "text-gray-500 bg-gray-50 border-gray-200 line-through",
  };
  const color = colorMap[status] ?? colorMap.DRAFT;
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}">${status}</span>`;
}

// ============================================================================
// COLUMN DEFS — Invoice grid
// ============================================================================

const invoiceColumnDefs: ColDef<InvoiceGridRow>[] = [
  {
    field: "invoiceNumber",
    headerName: "Invoice #",
    minWidth: 130,
    maxWidth: 160,
    cellClass: "powersheet-cell--locked font-mono",
  },
  {
    field: "clientName",
    headerName: "Client",
    flex: 1.4,
    minWidth: 180,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "invoiceDate",
    headerName: "Invoice Date",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "dueDate",
    headerName: "Due Date",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    cellRenderer: (params: { data?: InvoiceGridRow; value: string }) => {
      if (!params.data) return params.value ?? "-";
      if (params.data.daysOverdue > 0) {
        return `<span class="text-red-600 font-medium">${params.value}</span> <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium ml-1">${params.data.daysOverdue}d</span>`;
      }
      return params.value ?? "-";
    },
  },
  {
    field: "totalAmountFormatted",
    headerName: "Total",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
  },
  {
    field: "amountDueFormatted",
    headerName: "Amount Due",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    cellRenderer: (params: { data?: InvoiceGridRow; value: string }) => {
      if (!params.data) return params.value ?? "-";
      const due = parseFloat(params.data.amountDue);
      const color = due > 0 ? "text-red-600" : "text-green-600";
      return `<span class="${color} font-mono">${params.value}</span>`;
    },
  },
  {
    field: "paymentPct",
    headerName: "Paid %",
    minWidth: 80,
    maxWidth: 100,
    cellClass: "powersheet-cell--locked text-right",
    headerClass: "text-right",
    valueFormatter: params => `${String(params.value ?? 0)}%`,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    cellRenderer: statusCellRenderer,
  },
];

// ============================================================================
// COLUMN DEFS — Client Ledger sub-view
// ============================================================================

const ledgerColumnDefs: ColDef<LedgerGridRow>[] = [
  {
    field: "date",
    headerName: "Date",
    minWidth: 110,
    maxWidth: 130,
    cellClass: "powersheet-cell--locked",
  },
  {
    field: "type",
    headerName: "Type",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked",
    cellRenderer: (params: { value: string }) => {
      if (!params.value) return "";
      const cfgMap: Record<string, string> = {
        SALE: LEDGER_TYPE_TOKENS.INVOICE ?? "bg-blue-100 text-blue-700",
        PAYMENT_RECEIVED:
          LEDGER_TYPE_TOKENS.PAYMENT ?? "bg-green-100 text-green-700",
        CREDIT: LEDGER_TYPE_TOKENS.CREDIT ?? "bg-teal-100 text-teal-700",
        DEBIT: LEDGER_TYPE_TOKENS.REFUND ?? "bg-red-100 text-red-700",
      };
      const cls =
        cfgMap[params.value] ?? "bg-gray-100 text-gray-700 border-gray-200";
      return `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}">${params.value}</span>`;
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
    field: "debit",
    headerName: "Debit",
    minWidth: 100,
    maxWidth: 130,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
  },
  {
    field: "credit",
    headerName: "Credit",
    minWidth: 100,
    maxWidth: 130,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
  },
  {
    // CRITICAL: Running balance must stay visible when inspector is open
    field: "balance",
    headerName: "Balance",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
  },
];

// ============================================================================
// MAIN SURFACE
// ============================================================================

export function InvoicesSurface() {
  const routeSearch = useSearch();
  const deepLink = useMemo(
    () => parseInvoiceDeepLink(routeSearch),
    [routeSearch]
  );

  // Selection tracked in URL param
  const { selectedId: selectedInvoiceId, setSelectedId: setSelectedInvoiceId } =
    useSpreadsheetSelectionParam("invoiceId");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>(() => {
    if (
      deepLink.statusFilter &&
      INVOICE_STATUS_TABS.some(t => t.value === deepLink.statusFilter)
    ) {
      return deepLink.statusFilter as StatusTab;
    }
    return "ALL";
  });
  const [page, setPage] = useState(1);
  const [showAging, setShowAging] = useState(() => {
    try {
      return localStorage.getItem(AGING_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [createForm, setCreateForm] = useState({
    customerId: 0,
    dueDate: "",
    notes: "",
  });

  // Persist aging panel state
  const toggleAging = useCallback(() => {
    setShowAging(v => {
      const next = !v;
      try {
        localStorage.setItem(AGING_STORAGE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const summaryQuery = trpc.invoices.getSummary.useQuery();
  const invoicesQuery = trpc.invoices.list.useQuery({
    status:
      statusFilter !== "ALL"
        ? (statusFilter as Exclude<StatusTab, "ALL">)
        : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });

  const generateNumberQuery = trpc.accounting.invoices.generateNumber.useQuery(
    undefined,
    { enabled: showCreateDialog }
  );

  const arAgingQuery = trpc.accounting.invoices.getARAging.useQuery(undefined, {
    enabled: showAging,
  });

  // Client ledger query — enabled when a client is selected and ledger visible
  const selectedClientId = useMemo(() => {
    if (!selectedInvoiceId) return null;
    const row = (invoicesQuery.data?.items ?? []).find(
      i => i.id === selectedInvoiceId
    );
    return row?.customerId ?? null;
  }, [selectedInvoiceId, invoicesQuery.data]);

  const ledgerQuery = trpc.clientLedger.getLedger.useQuery(
    {
      clientId: selectedClientId ?? 0,
      limit: LEDGER_PAGE_SIZE,
      offset: (ledgerPage - 1) * LEDGER_PAGE_SIZE,
    },
    { enabled: showLedger && selectedClientId !== null }
  );

  const utils = trpc.useUtils();

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const clientNamesById = useMemo(
    () =>
      new Map(
        (clientsQuery.data?.items ?? []).map(c => [
          c.id,
          c.name ?? `Client #${c.id}`,
        ])
      ),
    [clientsQuery.data]
  );

  const rawItems = useMemo(
    () => (invoicesQuery.data?.items ?? []) as InvoiceItem[],
    [invoicesQuery.data]
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return rawItems;
    const q = searchTerm.trim().toLowerCase();
    return rawItems.filter(item => {
      const invNum = (item.invoiceNumber ?? "").toLowerCase();
      const clientName = (
        (item as InvoiceItem & { client?: { name?: string | null } }).client
          ?.name ??
        clientNamesById.get(item.customerId ?? 0) ??
        ""
      ).toLowerCase();
      return invNum.includes(q) || clientName.includes(q);
    });
  }, [rawItems, searchTerm, clientNamesById]);

  const gridRows = useMemo(
    () => mapInvoicesToGridRows(filteredItems, clientNamesById),
    [filteredItems, clientNamesById]
  );

  const selectedRow =
    gridRows.find(r => r.invoiceId === selectedInvoiceId) ?? null;

  // KPI values
  const summaryTotals = summaryQuery.data?.totals ?? {
    totalInvoices: 0,
    totalAmount: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
  };
  const overdueCount = useMemo(() => {
    const byStatus = summaryQuery.data?.byStatus ?? [];
    const overdueRow = byStatus.find(
      (s: { status: string; count: number }) => s.status === "OVERDUE"
    );
    return overdueRow?.count ?? 0;
  }, [summaryQuery.data]);

  // Ledger rows
  const ledgerRows = useMemo<LedgerGridRow[]>(() => {
    const transactions =
      (ledgerQuery.data as { transactions?: unknown[] } | null)?.transactions ??
      [];
    return (
      transactions as Array<{
        id: string;
        date: Date | string;
        type: string;
        description: string;
        referenceType?: string;
        referenceId?: number;
        debitAmount?: number;
        creditAmount?: number;
        runningBalance: number;
      }>
    ).map(txn => ({
      rowKey: txn.id,
      date: formatDate(txn.date),
      type: txn.type,
      description: txn.description,
      referenceType: txn.referenceType,
      referenceId: txn.referenceId,
      debit: txn.debitAmount ? formatCurrency(txn.debitAmount) : "-",
      credit: txn.creditAmount ? formatCurrency(txn.creditAmount) : "-",
      balance: formatCurrency(txn.runningBalance),
      balanceNum: txn.runningBalance,
    }));
  }, [ledgerQuery.data]);

  // AR Aging buckets
  const agingBuckets = useMemo(() => {
    const data = arAgingQuery.data as
      | {
          current: number;
          days30: number;
          days60: number;
          days90: number;
          days90Plus: number;
        }
      | null
      | undefined;
    if (!data) return [];
    return [
      {
        key: "current",
        label: "Current",
        amount: data.current,
        colorClass:
          INVOICE_AGING_TOKENS.current ??
          "bg-green-50 border-green-200 text-green-700",
      },
      {
        key: "30",
        label: "1-30 Days",
        amount: data.days30,
        colorClass:
          INVOICE_AGING_TOKENS["30"] ??
          "bg-yellow-50 border-yellow-200 text-yellow-700",
      },
      {
        key: "60",
        label: "31-60 Days",
        amount: data.days60,
        colorClass:
          INVOICE_AGING_TOKENS["60"] ??
          "bg-orange-50 border-orange-200 text-orange-700",
      },
      {
        key: "90",
        label: "61-90 Days",
        amount: data.days90,
        colorClass:
          INVOICE_AGING_TOKENS["90"] ?? "bg-red-50 border-red-200 text-red-700",
      },
      {
        key: "90+",
        label: "90+ Days",
        amount: data.days90Plus,
        colorClass:
          INVOICE_AGING_TOKENS["90+"] ??
          "bg-red-100 border-red-300 text-red-800",
      },
    ];
  }, [arAgingQuery.data]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const markSentMutation = trpc.invoices.markSent.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as sent");
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to mark as sent"),
  });

  const voidMutation = trpc.invoices.void.useMutation({
    onSuccess: () => {
      toast.success("Invoice voided with GL reversal");
      setShowVoidDialog(false);
      setVoidReason("");
      setSelectedInvoiceId(null);
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to void invoice"),
  });

  const createMutation = trpc.accounting.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created");
      setShowCreateDialog(false);
      setCreateForm({ customerId: 0, dueDate: "", notes: "" });
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to create invoice"),
  });

  const downloadPdfMutation = trpc.invoices.downloadPdf.useMutation({
    onSuccess: result => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = result.fileName;
      link.click();
      toast.success("Invoice PDF downloaded");
    },
    onError: err => toast.error(err.message || "Failed to download PDF"),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkSent = useCallback(() => {
    if (!selectedRow) return;
    markSentMutation.mutate({ id: selectedRow.invoiceId });
  }, [selectedRow, markSentMutation]);

  const handleOpenVoidDialog = useCallback(() => setShowVoidDialog(true), []);

  const handleVoidConfirm = useCallback(() => {
    if (!selectedRow || !voidReason.trim()) return;
    voidMutation.mutate({
      id: selectedRow.invoiceId,
      reason: voidReason.trim(),
    });
  }, [selectedRow, voidReason, voidMutation]);

  const handleRecordPayment = useCallback(() => {
    if (!selectedRow) return;
    setShowPaymentDialog(true);
  }, [selectedRow]);

  const handleDownloadPdf = useCallback(() => {
    if (!selectedRow) return;
    downloadPdfMutation.mutate({ id: selectedRow.invoiceId });
  }, [selectedRow, downloadPdfMutation]);

  const handlePrint = useCallback(() => {
    if (!selectedRow) return;
    window.print();
  }, [selectedRow]);

  const handleCreateSubmit = useCallback(() => {
    if (!createForm.customerId || !createForm.dueDate) return;
    const invoiceNumber = generateNumberQuery.data ?? `INV-${Date.now()}`;
    createMutation.mutate({
      invoiceNumber,
      customerId: createForm.customerId,
      invoiceDate: new Date(),
      dueDate: new Date(createForm.dueDate),
      subtotal: "0.00",
      totalAmount: "0.00",
      notes: createForm.notes || undefined,
      lineItems: [],
    });
  }, [createForm, generateNumberQuery.data, createMutation]);

  // Auto-open ledger on row selection
  useEffect(() => {
    if (selectedRow) {
      setShowLedger(true);
      setLedgerPage(1);
    }
  }, [selectedRow?.invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Action-state helpers ──────────────────────────────────────────────────

  const isActionable =
    selectedRow &&
    selectedRow.status !== "PAID" &&
    selectedRow.status !== "VOID";
  const canSend = selectedRow?.status === "DRAFT";
  const canVoid = selectedRow && selectedRow.status !== "VOID";

  // ─── Status bar ────────────────────────────────────────────────────────────

  const statusBarLeft = (
    <span className="text-[10px]">
      {selectionSummary
        ? `${selectionSummary.selectedRowCount} selected`
        : "0 selected"}{" "}
      | {statusFilter !== "ALL" ? statusFilter : "All"} |{" "}
      {invoicesQuery.data?.total ?? 0} total
      {selectedRow ? ` | ${selectedRow.clientName}` : ""}
    </span>
  );

  const clientsList = clientsQuery.data?.items ?? [];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── 1. Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 border-b">
        <span className="font-bold text-xs">Invoices</span>

        {/* KPI badges */}
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200"
        >
          {formatCurrencyCompact(summaryTotals.totalOutstanding)} AR
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
        >
          {overdueCount} overdue
        </Badge>
        <Badge
          variant="outline"
          className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
        >
          {summaryTotals.totalInvoices} total
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[9px] px-2 ml-1"
          onClick={toggleAging}
          data-testid="ar-aging-toggle"
        >
          <CalendarClock className="h-3 w-3 mr-1" />
          AR Aging
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="h-5 pl-6 text-[10px] w-40"
              placeholder="Search invoice # or client"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              data-testid="invoices-search-input"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => void invoicesQuery.refetch()}
            aria-label="Refresh invoices"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── 2. Action Bar ── */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b flex-wrap">
        {/* Status filter tabs */}
        {INVOICE_STATUS_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className="h-5 text-[9px] px-2"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
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
            className="h-5 text-[9px] px-2"
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-invoice-button"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!canSend || markSentMutation.isPending}
            onClick={handleMarkSent}
            data-testid="action-mark-sent"
          >
            <Send className="h-3 w-3 mr-1" />
            Mark Sent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!isActionable}
            onClick={handleRecordPayment}
            data-testid="action-record-payment"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Record Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2 text-red-600 hover:text-red-700"
            disabled={!canVoid}
            onClick={handleOpenVoidDialog}
            data-testid="action-void"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Void
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!selectedRow || downloadPdfMutation.isPending}
            onClick={handleDownloadPdf}
            data-testid="action-pdf"
          >
            <Download className="h-3 w-3 mr-1" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[9px] px-2"
            disabled={!selectedRow}
            onClick={handlePrint}
            data-testid="action-print"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* ── 3. Grid + Collapsible Inspector ── */}
      <div className="flex flex-1 min-h-0">
        <div className={cn("flex-1", selectedRow && "flex-[3]")}>
          <PowersheetGrid
            surfaceId="invoices-unified"
            requirementIds={[
              "INV-001",
              "INV-002",
              "INV-003",
              "INV-009",
              "INV-020",
            ]}
            affordances={registryAffordances}
            title="Invoices"
            rows={gridRows}
            columnDefs={invoiceColumnDefs}
            getRowId={row => row.rowKey}
            selectedRowId={selectedRow?.rowKey ?? null}
            onSelectedRowChange={row =>
              setSelectedInvoiceId(row?.invoiceId ?? null)
            }
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={false}
            onSelectionSummaryChange={setSelectionSummary}
            isLoading={invoicesQuery.isLoading}
            errorMessage={invoicesQuery.error?.message ?? null}
            emptyTitle="No invoices match"
            emptyDescription="Adjust the search or status filter, or create a new invoice."
            summary={
              <span className="text-[10px]">
                {gridRows.length} visible · {invoicesQuery.data?.total ?? 0}{" "}
                total · {statusFilter !== "ALL" ? statusFilter : "All statuses"}
              </span>
            }
            minHeight={320}
          />
        </div>

        {/* Inspector panel (~25% right) */}
        {selectedRow && (
          <InspectorPanel
            isOpen
            onClose={() => setSelectedInvoiceId(null)}
            title={selectedRow.invoiceNumber}
            subtitle={selectedRow.clientName}
            headerActions={
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px]",
                  INVOICE_STATUS_TOKENS[selectedRow.status] ??
                    INVOICE_STATUS_TOKENS.DRAFT
                )}
              >
                {selectedRow.status}
              </Badge>
            }
          >
            {/* Overview */}
            <InspectorSection title="Overview" defaultOpen>
              <InspectorField label="Client">
                <p className="text-sm font-medium">{selectedRow.clientName}</p>
              </InspectorField>
              <InspectorField label="Invoice Date">
                <p className="text-sm">{selectedRow.invoiceDate}</p>
              </InspectorField>
              <InspectorField label="Due Date">
                <div className="flex items-center gap-1">
                  <p
                    className={
                      selectedRow.daysOverdue > 0
                        ? "text-red-600 font-medium text-sm"
                        : "text-sm"
                    }
                  >
                    {selectedRow.dueDate}
                  </p>
                  {selectedRow.daysOverdue > 0 && (
                    <Badge variant="destructive" className="text-[9px]">
                      {selectedRow.daysOverdue}d overdue
                    </Badge>
                  )}
                </div>
              </InspectorField>
            </InspectorSection>

            {/* Amounts */}
            <InspectorSection title="Amounts" defaultOpen>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(selectedRow.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono text-green-600">
                    {formatCurrency(selectedRow.amountPaid)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-sm">Due</span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      selectedRow.daysOverdue > 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(selectedRow.amountDue)}
                  </span>
                </div>
                {selectedRow.status !== "PAID" &&
                  selectedRow.status !== "VOID" && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{selectedRow.paymentPct}%</span>
                      </div>
                      <Progress
                        value={selectedRow.paymentPct}
                        className="h-1.5"
                      />
                    </div>
                  )}
              </div>
            </InspectorSection>

            {/* GL Status */}
            <InspectorSection title="GL Status" defaultOpen>
              <InvoiceGLStatus
                invoiceId={selectedRow.invoiceId}
                invoiceNumber={selectedRow.invoiceNumber}
                status={
                  selectedRow.status as
                    | "DRAFT"
                    | "SENT"
                    | "VIEWED"
                    | "PARTIAL"
                    | "PAID"
                    | "OVERDUE"
                    | "VOID"
                }
                amount={parseFloat(selectedRow.totalAmount)}
              />
            </InspectorSection>

            {/* Quick actions */}
            <InspectorSection title="Quick Actions" defaultOpen>
              <div className="space-y-1">
                {isActionable && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start h-6 text-xs"
                    onClick={handleRecordPayment}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Record Payment
                  </Button>
                )}
                {canSend && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-6 text-xs"
                    onClick={handleMarkSent}
                    disabled={markSentMutation.isPending}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Mark as Sent
                  </Button>
                )}
                {canVoid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-6 text-xs text-red-600"
                    onClick={handleOpenVoidDialog}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Void Invoice
                  </Button>
                )}
              </div>
            </InspectorSection>
          </InspectorPanel>
        )}
      </div>

      {/* ── 4. AR Aging Panel (collapsible) ── */}
      {showAging && (
        <div className="mx-2 my-1.5 p-2 bg-amber-50/60 border border-amber-200 rounded-md">
          <h3 className="font-semibold text-xs mb-1.5">AR Aging Report</h3>
          {arAgingQuery.isLoading ? (
            <p className="text-[10px] text-muted-foreground">
              Loading aging data...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {agingBuckets.map(bucket => (
                <div
                  key={bucket.key}
                  className={cn(
                    "px-2 py-1 rounded border text-center",
                    bucket.colorClass
                  )}
                >
                  <div className="text-[9px] font-medium">{bucket.label}</div>
                  <div className="text-sm font-bold">
                    {formatCurrency(bucket.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Client Ledger Sub-View (collapsible) ── */}
      {selectedRow && (
        <div className="mx-2 mb-1.5 p-2 bg-blue-50/40 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setShowLedger(v => !v)}
            >
              {showLedger ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
            <span className="font-semibold text-xs">
              Client Ledger — {selectedRow.clientName}
            </span>
            {ledgerQuery.data &&
              typeof (ledgerQuery.data as { currentBalance?: number })
                .currentBalance === "number" && (
                <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                  Balance:{" "}
                  {formatCurrency(
                    (ledgerQuery.data as { currentBalance: number })
                      .currentBalance
                  )}
                </Badge>
              )}
          </div>

          {showLedger && (
            <>
              <PowersheetGrid
                surfaceId="invoices-client-ledger"
                requirementIds={["ACCT-LED-002"]}
                title="Client Ledger"
                rows={ledgerRows}
                columnDefs={ledgerColumnDefs}
                getRowId={row => row.rowKey}
                selectedRowId={null}
                onSelectedRowChange={() => {}}
                selectionMode="cell-range"
                enableFillHandle={false}
                enableUndoRedo={false}
                isLoading={ledgerQuery.isLoading}
                errorMessage={null}
                emptyTitle="No ledger entries"
                emptyDescription="This client has no transaction history."
                minHeight={180}
              />

              {/* Pagination */}
              {ledgerRows.length >= LEDGER_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    Page {ledgerPage}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      disabled={ledgerPage === 1}
                      onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Prev
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      onClick={() => setLedgerPage(p => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 6. Status Bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        right={<KeyboardHintBar hints={keyboardHints} />}
      />

      {/* ── 7. Sidecar Dialogs ── */}

      {/* InvoiceToPaymentFlow */}
      {selectedInvoiceId !== null && (
        <InvoiceToPaymentFlow
          invoiceId={selectedInvoiceId}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onPaymentRecorded={() => {
            void utils.invoices.list.invalidate();
            void utils.invoices.getSummary.invalidate();
            void utils.payments.list.invalidate();
            setShowPaymentDialog(false);
          }}
        />
      )}

      {/* Void with Reason dialog */}
      <Dialog
        open={showVoidDialog}
        onOpenChange={open => {
          setShowVoidDialog(open);
          if (!open) setVoidReason("");
        }}
      >
        <DialogContent data-testid="void-invoice-dialog">
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
            <DialogDescription>
              Voiding <strong>{selectedRow?.invoiceNumber}</strong> will reverse
              GL entries and reduce AR. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason (required)</Label>
            <Textarea
              id="void-reason"
              placeholder="Describe why this invoice is being voided..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              data-testid="void-reason-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVoidDialog(false);
                setVoidReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!voidReason.trim() || voidMutation.isPending}
              onClick={handleVoidConfirm}
              data-testid="void-confirm-button"
            >
              {voidMutation.isPending ? "Voiding..." : "Void Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent
          data-testid="create-invoice-dialog"
          aria-describedby="create-invoice-description"
        >
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription id="create-invoice-description">
              Invoice number is assigned by the server.
              {generateNumberQuery.data
                ? ` Next: ${generateNumberQuery.data}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-client">Client</Label>
              <Select
                value={
                  createForm.customerId ? String(createForm.customerId) : ""
                }
                onValueChange={v =>
                  setCreateForm(f => ({ ...f, customerId: Number(v) }))
                }
              >
                <SelectTrigger id="create-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name ?? `Client #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-due-date">Due Date</Label>
              <input
                id="create-due-date"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={createForm.dueDate}
                onChange={e =>
                  setCreateForm(f => ({ ...f, dueDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <input
                id="create-notes"
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="Optional notes"
                value={createForm.notes}
                onChange={e =>
                  setCreateForm(f => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !createForm.customerId ||
                !createForm.dueDate ||
                createMutation.isPending
              }
              onClick={handleCreateSubmit}
              data-testid="create-invoice-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoicesSurface;
