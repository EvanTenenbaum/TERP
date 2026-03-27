/**
 * InvoicesPilotSurface — TER-818
 *
 * Sheet-native invoices registry (Registry+Actions family — hybrid).
 * Registry and status actions are sheet-native.
 * PDF/print and payment golden flow remain as sidecars.
 *
 * Layout:
 *   1. KPI summary band (invoices.getSummary — DISC-INV-005 fix)
 *   2. Status filter tabs + search bar (INV-001, INV-002, INV-003)
 *   3. PowersheetGrid registry, read-only (INV-001)
 *   4. Workflow action bar: Void (with reason), Mark Sent,
 *      Record Payment, Download PDF, Print (INV-013–INV-018)
 *      (INV-P1: "Mark Paid" removed — bypassed GL; use Record Payment instead)
 *   5. AR Aging toggle panel (INV-007)
 *   6. WorkSurfaceStatusBar + KeyboardHintBar (INV-020)
 *   7. InvoiceToPaymentFlow sidecar dialog (INV-016)
 *   8. Void with reason dialog — calls invoices.void (DISC-INV-001 fix)
 *   9. Create Invoice dialog — uses accounting.invoices.generateNumber
 *      (DISC-INV-003 fix)
 *  10. InspectorPanel for invoice detail + GL status (INV-008, INV-010)
 *
 * Critical fixes included:
 *   DISC-INV-001: Void calls invoices.void (with reason + GL reversal)
 *   DISC-INV-002: Mark as Sent calls invoices.markSent mutation
 *   DISC-INV-003: Invoice number from accounting.invoices.generateNumber
 */

import { useMemo, useState, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  FileText,
  Send,
  CreditCard,
  AlertTriangle,
  XCircle,
  CalendarClock,
  Download,
  Printer,
  Plus,
  RefreshCw,
  Search,
  Receipt,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/lib/statusTokens";
import { cn } from "@/lib/utils";
import { parseInvoiceDeepLink } from "@/components/work-surface/invoiceDeepLink";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;

// Use invoices.list response shape (the standalone router with client attached)
type InvoiceListOutput = RouterOutputs["invoices"]["list"];
type InvoiceItem = InvoiceListOutput["items"][number];

// ============================================================================
// CONSTANTS
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const INVOICE_STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
] as const;

type StatusTab = (typeof INVOICE_STATUS_TABS)[number]["value"];

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
  { key: `${mod}+A`, label: "select all" },
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
// GRID ROW TYPE
// ============================================================================

interface InvoiceGridRow {
  rowKey: string;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  dueDateRaw: string; // for overdue detection in renderer
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

function mapToGridRows(
  items: InvoiceItem[],
  clientNamesById: Map<number, string>
): InvoiceGridRow[] {
  // BUG-053: deduplicate by invoice ID to prevent duplicate row rendering
  const seen = new Set<number>();
  const uniqueItems = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return uniqueItems.map(item => {
    const customerId = item.customerId ?? 0;
    const clientName =
      // The list endpoint joins client and returns it under item.client
      (item as InvoiceItem & { client?: { name?: string | null } }).client
        ?.name ??
      clientNamesById.get(customerId) ??
      `Client #${customerId}`;

    const totalAmount = String(item.totalAmount ?? "0");
    const totalAmountNum = parseFloat(totalAmount);
    const amountPaidRaw = parseFloat(String(item.amountPaid ?? "0"));
    const status = item.status ?? "DRAFT";

    // BUG-054/055/057: Clamp amountDue to [0, totalAmount]. Never display negative due.
    // PAID invoices always show $0.00 due regardless of DB value (BUG-055).
    const rawAmountDue = parseFloat(String(item.amountDue ?? "0"));
    const amountDueNum =
      status === "PAID" || status === "VOID"
        ? 0
        : Math.max(0, Math.min(rawAmountDue, totalAmountNum));
    const amountDue = amountDueNum.toFixed(2);

    // Clamp amountPaid to [0, totalAmount] for display (BUG-057)
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

const STATUS_ICON_HTML: Record<string, string> = {
  DRAFT: "📄",
  SENT: "📤",
  VIEWED: "👁️",
  PARTIAL: "💳",
  PAID: "✅",
  OVERDUE: "⚠️",
  VOID: "❌",
};

function statusCellRenderer(params: { value: string }): string {
  const status = params.value ?? "DRAFT";
  const icon = STATUS_ICON_HTML[status] ?? "";
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
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}">${icon} ${status}</span>`;
}

// ============================================================================
// COLUMN DEFS
// ============================================================================

const columnDefs: ColDef<InvoiceGridRow>[] = [
  {
    field: "invoiceNumber",
    headerName: "Invoice #",
    minWidth: 130,
    maxWidth: 160,
    cellClass: "powersheet-cell--locked font-mono",
    headerTooltip: "Read-only: invoice number.",
  },
  {
    field: "clientName",
    headerName: "Client",
    flex: 1.4,
    minWidth: 180,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: billed-to client.",
  },
  {
    field: "invoiceDate",
    headerName: "Invoice Date",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: date invoice was issued.",
  },
  {
    field: "dueDate",
    headerName: "Due Date",
    minWidth: 120,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: payment due date.",
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
    headerTooltip: "Read-only: invoice total amount.",
  },
  {
    field: "amountDueFormatted",
    headerName: "Amount Due",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "powersheet-cell--locked font-mono text-right",
    headerClass: "text-right",
    headerTooltip: "Read-only: remaining amount due.",
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
    headerTooltip: "Read-only: percentage of total that has been paid.",
    valueFormatter: params => `${String(params.value ?? 0)}%`,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 110,
    maxWidth: 140,
    cellClass: "powersheet-cell--locked",
    headerTooltip: "Read-only: current invoice status.",
    cellRenderer: statusCellRenderer,
  },
];

// ============================================================================
// KPI CARDS
// ============================================================================

interface KpiCardsProps {
  totalInvoices: number;
  totalAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  isLoading: boolean;
}

function KpiCards({
  totalInvoices,
  totalAmount,
  totalOutstanding,
  overdueAmount,
  isLoading,
}: KpiCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : totalInvoices}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : formatCurrency(totalAmount)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding AR</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "—" : formatCurrency(totalOutstanding)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-bold",
              overdueAmount > 0 ? "text-red-600" : ""
            )}
          >
            {isLoading ? "—" : formatCurrency(overdueAmount)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// AR AGING PANEL
// ============================================================================

interface AgingPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

function AgingPanel({ isVisible, onToggle }: AgingPanelProps) {
  const { data: arAging, isLoading } =
    trpc.accounting.invoices.getARAging.useQuery(undefined, {
      enabled: isVisible,
    });

  const buckets: Array<{
    key: string;
    label: string;
    amount: number;
    colorClass: string;
  }> = arAging
    ? [
        {
          key: "current",
          label: "Current",
          amount: arAging.current,
          colorClass:
            INVOICE_AGING_TOKENS.current ??
            "bg-green-50 border-green-200 text-green-700",
        },
        {
          key: "30",
          label: "1-30 Days",
          amount: arAging.days30,
          colorClass:
            INVOICE_AGING_TOKENS["30"] ??
            "bg-yellow-50 border-yellow-200 text-yellow-700",
        },
        {
          key: "60",
          label: "31-60 Days",
          amount: arAging.days60,
          colorClass:
            INVOICE_AGING_TOKENS["60"] ??
            "bg-orange-50 border-orange-200 text-orange-700",
        },
        {
          key: "90",
          label: "61-90 Days",
          amount: arAging.days90,
          colorClass:
            INVOICE_AGING_TOKENS["90"] ??
            "bg-red-50 border-red-200 text-red-700",
        },
        {
          key: "90+",
          label: "90+ Days",
          amount: arAging.days90Plus,
          colorClass:
            INVOICE_AGING_TOKENS["90+"] ??
            "bg-red-100 border-red-300 text-red-800",
        },
      ]
    : [];

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        onClick={onToggle}
        data-testid="ar-aging-toggle"
      >
        <CalendarClock className="h-4 w-4 mr-2" />
        {isVisible ? "Hide AR Aging" : "Show AR Aging"}
      </Button>

      {isVisible && (
        <div className="mt-3 p-4 border rounded-lg bg-background">
          <h3 className="font-semibold mb-3 text-sm">AR Aging Report</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading aging data…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {buckets.map(bucket => (
                <div
                  key={bucket.key}
                  className={cn(
                    "px-3 py-2 rounded-lg border",
                    bucket.colorClass
                  )}
                >
                  <div className="text-xs font-medium">{bucket.label}</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(bucket.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INSPECTOR CONTENT
// ============================================================================

interface InspectorContentProps {
  selectedRow: InvoiceGridRow | null;
  onMarkSent: () => void;
  onVoid: () => void;
  onRecordPayment: () => void;
  onDownloadPdf: () => void;
  onPrint: () => void;
  isMarkSentPending: boolean;
  isDownloadPending: boolean;
}

function InspectorContent({
  selectedRow,
  onMarkSent,
  onVoid,
  onRecordPayment,
  onDownloadPdf,
  onPrint,
  isMarkSentPending,
  isDownloadPending,
}: InspectorContentProps) {
  if (!selectedRow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Receipt className="h-12 w-12 mb-4 opacity-50" />
        <p>Select an invoice to view details</p>
      </div>
    );
  }

  const isActionable =
    selectedRow.status !== "PAID" && selectedRow.status !== "VOID";
  const canSend = selectedRow.status === "DRAFT";
  const canPay = isActionable;
  const canVoid = selectedRow.status !== "VOID";

  return (
    <div className="space-y-6">
      <InspectorSection title="Invoice Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Invoice #">
            <p className="font-semibold text-lg font-mono">
              {selectedRow.invoiceNumber}
            </p>
          </InspectorField>
          <InspectorField label="Status">
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                INVOICE_STATUS_TOKENS[selectedRow.status] ??
                  INVOICE_STATUS_TOKENS.DRAFT
              )}
            >
              {selectedRow.status}
            </Badge>
          </InspectorField>
        </div>
        <InspectorField label="Client">
          <p className="font-medium">{selectedRow.clientName}</p>
        </InspectorField>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Invoice Date">
            <p>{selectedRow.invoiceDate}</p>
          </InspectorField>
          <InspectorField label="Due Date">
            <div className="flex items-center gap-2">
              <p
                className={
                  selectedRow.daysOverdue > 0 ? "text-red-600 font-medium" : ""
                }
              >
                {selectedRow.dueDate}
              </p>
              {selectedRow.daysOverdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {selectedRow.daysOverdue}d overdue
                </Badge>
              )}
            </div>
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="Payment Summary" defaultOpen>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="font-mono font-semibold">
              {formatCurrency(selectedRow.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount Paid</span>
            <span className="font-mono text-green-600">
              {formatCurrency(selectedRow.amountPaid)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Amount Due</span>
            <span
              className={cn(
                "font-mono font-bold text-lg",
                selectedRow.daysOverdue > 0 && "text-red-600"
              )}
            >
              {formatCurrency(selectedRow.amountDue)}
            </span>
          </div>
          {selectedRow.status !== "PAID" && selectedRow.status !== "VOID" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{selectedRow.paymentPct}%</span>
              </div>
              <Progress value={selectedRow.paymentPct} className="h-2" />
            </div>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="GL Reversal & Posting" defaultOpen>
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

      <InspectorSection title="Quick Actions" defaultOpen>
        <div className="space-y-2">
          {canPay && (
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={onRecordPayment}
              data-testid="inspector-record-payment"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          {canSend && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onMarkSent}
              disabled={isMarkSentPending}
              data-testid="inspector-mark-sent"
            >
              <Send className="h-4 w-4 mr-2" />
              {isMarkSentPending ? "Sending…" : "Mark as Sent"}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onDownloadPdf}
            disabled={isDownloadPending}
            data-testid="inspector-download-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloadPending ? "Preparing PDF…" : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onPrint}
            data-testid="inspector-print"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          {canVoid && (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={onVoid}
              data-testid="inspector-void"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Void Invoice
            </Button>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN SURFACE
// ============================================================================

export interface InvoicesPilotSurfaceProps {
  onOpenClassic: () => void;
}

export function InvoicesPilotSurface({
  onOpenClassic,
}: InvoicesPilotSurfaceProps) {
  const routeSearch = useSearch();
  const deepLink = useMemo(
    () => parseInvoiceDeepLink(routeSearch),
    [routeSearch]
  );

  // Selection tracked in URL param (INV-005: deep-link by invoiceId)
  const { selectedId: selectedInvoiceId, setSelectedId: setSelectedInvoiceId } =
    useSpreadsheetSelectionParam("invoiceId");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>(() => {
    if (deepLink.statusFilter) {
      return deepLink.statusFilter as StatusTab;
    }
    return "ALL";
  });
  const [page, setPage] = useState(1);
  const [showAging, setShowAging] = useState(false);
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

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  // INV-006 (DISC-INV-005 fix): Summary from server, not client-side aggregate
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

  // DISC-INV-003: Invoice number generated server-side
  const generateNumberQuery = trpc.accounting.invoices.generateNumber.useQuery(
    undefined,
    {
      enabled: showCreateDialog,
    }
  );

  const utils = trpc.useUtils();

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

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
    () => mapToGridRows(filteredItems, clientNamesById),
    [filteredItems, clientNamesById]
  );

  const selectedRow =
    gridRows.find(r => r.invoiceId === selectedInvoiceId) ?? null;

  const totalInvoices = invoicesQuery.data?.total ?? 0;

  const summary = summaryQuery.data?.totals ?? {
    totalInvoices: 0,
    totalAmount: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
  };

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  // DISC-INV-002: Mark as Sent uses invoices.markSent mutation
  const markSentMutation = trpc.invoices.markSent.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as sent");
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to mark as sent");
    },
  });

  // DISC-INV-001: Void uses invoices.void (with reason + GL reversal)
  const voidMutation = trpc.invoices.void.useMutation({
    onSuccess: () => {
      toast.success("Invoice voided with GL reversal");
      setShowVoidDialog(false);
      setVoidReason("");
      setSelectedInvoiceId(null);
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to void invoice");
    },
  });

  // Create invoice — DISC-INV-003: number from server
  const createMutation = trpc.accounting.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created");
      setShowCreateDialog(false);
      setCreateForm({ customerId: 0, dueDate: "", notes: "" });
      void utils.invoices.list.invalidate();
      void utils.invoices.getSummary.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to create invoice");
    },
  });

  // PDF download
  const downloadPdfMutation = trpc.invoices.downloadPdf.useMutation({
    onSuccess: result => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = result.fileName;
      link.click();
      toast.success("Invoice PDF downloaded");
    },
    onError: err => {
      toast.error(err.message || "Failed to download PDF");
    },
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleMarkSent = useCallback(() => {
    if (!selectedRow) return;
    markSentMutation.mutate({ id: selectedRow.invoiceId });
  }, [selectedRow, markSentMutation]);

  const handleOpenVoidDialog = useCallback(() => {
    setShowVoidDialog(true);
  }, []);

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
    toast.info(`Preparing PDF for ${selectedRow.invoiceNumber}`);
    downloadPdfMutation.mutate({ id: selectedRow.invoiceId });
  }, [selectedRow, downloadPdfMutation]);

  const handlePrint = useCallback(() => {
    if (!selectedRow) return;
    window.print();
  }, [selectedRow]);

  const handleCreateSubmit = useCallback(() => {
    if (!createForm.customerId || !createForm.dueDate) return;

    // DISC-INV-003: Use server-generated invoice number
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

  // -------------------------------------------------------------------------
  // Deep-link: auto-select invoice from URL ?invoiceId param
  // -------------------------------------------------------------------------
  // The useSpreadsheetSelectionParam hook already reads from ?invoiceId, so
  // selectedInvoiceId is populated. If deepLink.openRecordPayment is set we
  // open the payment dialog once the row is available.

  // -------------------------------------------------------------------------
  // Status-bar content
  // -------------------------------------------------------------------------

  const statusBarLeft = (
    <span>
      {gridRows.length} visible invoices
      {selectionSummary
        ? ` · ${selectionSummary.selectedCellCount} cells / ${selectionSummary.selectedRowCount} rows selected`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? `Selected ${selectedRow.invoiceNumber} · ${selectedRow.clientName} · ${selectedRow.status}`
        : "Select an invoice to view details and take action"}
    </span>
  );

  const clientsList = clientsQuery.data?.items ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* KPI Summary Band — INV-006, DISC-INV-005 fix (server getSummary) */}
      <KpiCards
        totalInvoices={summary.totalInvoices}
        totalAmount={summary.totalAmount}
        totalOutstanding={summary.totalOutstanding}
        overdueAmount={summary.overdueAmount}
        isLoading={summaryQuery.isLoading}
      />

      {/* Search + Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 max-w-xs"
            placeholder="Search invoice # or client"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            data-testid="invoices-search-input"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1">
          {INVOICE_STATUS_TABS.map(tab => (
            <Button
              key={tab.value}
              size="sm"
              variant={statusFilter === tab.value ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              data-testid={`status-tab-${tab.value}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void invoicesQuery.refetch()}
            aria-label="Refresh invoices"
            data-testid="refresh-invoices"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-invoice-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenClassic}
            data-testid="open-classic-button"
          >
            Classic Surface
          </Button>
        </div>
      </div>

      {/* AR Aging toggle panel — INV-007 */}
      <AgingPanel
        isVisible={showAging}
        onToggle={() => setShowAging(v => !v)}
      />

      {/* Workflow action bar — row-scoped actions */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedRow
            ? `${selectedRow.invoiceNumber} selected`
            : "Select an invoice to enable actions"}
        </span>
        {selectedRow && (
          <Badge variant="outline" className="text-xs">
            {selectedRow.status}
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedRow ||
              selectedRow.status === "PAID" ||
              selectedRow.status === "VOID"
            }
            onClick={handleRecordPayment}
            data-testid="action-record-payment"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedRow ||
              selectedRow.status !== "DRAFT" ||
              markSentMutation.isPending
            }
            onClick={handleMarkSent}
            data-testid="action-mark-sent"
          >
            <Send className="mr-2 h-4 w-4" />
            Mark Sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedRow || selectedRow.status === "VOID"}
            onClick={handleOpenVoidDialog}
            className="text-red-600 hover:text-red-700"
            data-testid="action-void"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Void
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedRow || downloadPdfMutation.isPending}
            onClick={handleDownloadPdf}
            data-testid="action-download-pdf"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedRow}
            onClick={handlePrint}
            data-testid="action-print"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Registry grid — INV-001 through INV-005, INV-020 */}
      <PowersheetGrid
        surfaceId="invoices-registry"
        requirementIds={["INV-001", "INV-002", "INV-003", "INV-009", "INV-020"]}
        affordances={registryAffordances}
        title="Invoices Registry"
        description="Read-only registry of all invoices. Row selection enables status actions and opens the inspector for full detail."
        rows={gridRows}
        columnDefs={columnDefs}
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
          <span>
            {gridRows.length} visible · {totalInvoices} total ·{" "}
            {statusFilter !== "ALL" ? statusFilter : "All statuses"}
          </span>
        }
        minHeight={360}
      />

      {/* Pagination */}
      {totalInvoices > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalInvoices)}–
            {Math.min(page * PAGE_SIZE, totalInvoices)} of {totalInvoices}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * PAGE_SIZE >= totalInvoices}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {/* Inspector panel — INV-008, INV-010 */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedInvoiceId(null)}
        title={selectedRow?.invoiceNumber ?? "Invoice Details"}
        subtitle={selectedRow?.clientName}
        headerActions={
          selectedRow ? (
            <Badge
              variant="outline"
              className={cn(
                INVOICE_STATUS_TOKENS[selectedRow.status] ??
                  INVOICE_STATUS_TOKENS.DRAFT
              )}
            >
              {selectedRow.status}
            </Badge>
          ) : null
        }
      >
        <InspectorContent
          selectedRow={selectedRow}
          onMarkSent={handleMarkSent}
          onVoid={handleOpenVoidDialog}
          onRecordPayment={handleRecordPayment}
          onDownloadPdf={handleDownloadPdf}
          onPrint={handlePrint}
          isMarkSentPending={markSentMutation.isPending}
          isDownloadPending={downloadPdfMutation.isPending}
        />
      </InspectorPanel>

      {/* InvoiceToPaymentFlow sidecar — INV-016 */}
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

      {/* Void dialog — DISC-INV-001: calls invoices.void with reason + GL reversal */}
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
              its GL entries and reduce the AR balance. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason (required)</Label>
            <Textarea
              id="void-reason"
              placeholder="Describe why this invoice is being voided…"
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
              {voidMutation.isPending ? "Voiding…" : "Void Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice dialog — DISC-INV-003: server-generated number */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        {/* BUG-059: aria-describedby explicitly links dialog content to its description */}
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
                <SelectTrigger
                  id="create-client"
                  data-testid="invoice-client-select"
                >
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
                name="dueDate"
                aria-label="Due date"
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
                name="notes"
                aria-label="Notes"
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
              {createMutation.isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoicesPilotSurface;
