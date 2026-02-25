/**
 * InvoicesWorkSurface - Work Surface implementation for Invoices (Accounting)
 * UXS-501: Aligns Invoices page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract with arrow navigation
 * - Save state indicator
 * - Inspector panel for invoice details
 * - Status filtering with AR Aging view
 * - Payment recording and status updates
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { InvoiceGLStatus } from "@/components/accounting/GLReversalStatus";

// Work Surface Hooks
import {
  INVOICE_STATUS_TOKENS,
  INVOICE_AGING_TOKENS,
} from "../../lib/statusTokens";
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useToastConfig } from "@/hooks/work-surface/useToastConfig";
import { usePrint } from "@/hooks/work-surface/usePrint";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// WS-GF-001: Golden Flow for payment recording
import { InvoiceToPaymentFlow } from "./golden-flows/InvoiceToPaymentFlow";

// Icons
import {
  Search,
  FileText,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Send,
  Eye,
  XCircle,
  CreditCard,
  Mail,
  Download,
  Printer,
  CalendarClock,
  AlertTriangle,
  Receipt,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  invoiceDate: Date | string;
  dueDate: Date | string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  version?: number;
  lineItems?: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }>;
}

interface CustomerSummary {
  id: number;
  name?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INVOICE_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

const STATUS_ICONS: Record<string, ReactNode> = {
  DRAFT: <FileText className="h-4 w-4" />,
  SENT: <Send className="h-4 w-4" />,
  VIEWED: <Eye className="h-4 w-4" />,
  PARTIAL: <CreditCard className="h-4 w-4" />,
  PAID: <CheckCircle2 className="h-4 w-4" />,
  OVERDUE: <AlertTriangle className="h-4 w-4" />,
  VOID: <XCircle className="h-4 w-4" />,
};

const STATUS_COLORS = INVOICE_STATUS_TOKENS;

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : value || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "-";
  }
};

const getDaysOverdue = (dueDate: Date | string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  return Math.max(0, differenceInDays(today, due));
};

const getPaymentProgress = (invoice: Invoice): number => {
  const total = parseFloat(invoice.totalAmount);
  const paid = parseFloat(invoice.amountPaid);
  return total > 0 ? Math.round((paid / total) * 100) : 0;
};

const extractItems = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1", STATUS_COLORS[status] || STATUS_COLORS.DRAFT)}
    >
      {STATUS_ICONS[status]}
      {status}
    </Badge>
  );
}

// ============================================================================
// AR AGING CARD
// ============================================================================

function AgingBadge({ bucket, amount }: { bucket: string; amount: number }) {
  const labels: Record<string, string> = {
    current: "Current",
    "30": "1-30 Days",
    "60": "31-60 Days",
    "90": "61-90 Days",
    "90+": "90+ Days",
  };

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border",
        INVOICE_AGING_TOKENS[bucket]
      )}
    >
      <div className="text-xs font-medium">{labels[bucket]}</div>
      <div className="text-lg font-bold">{formatCurrency(amount)}</div>
    </div>
  );
}

// ============================================================================
// INVOICE INSPECTOR
// ============================================================================

interface InvoiceInspectorProps {
  invoice: Invoice | null;
  customerName: string;
  onMarkPaid: (invoiceId: number) => void;
  onSendReminder: (invoiceId: number) => void;
  onDownloadPDF: (invoiceId: number) => void;
  onPrint: (invoiceId: number) => void;
  onRecordPayment: (invoiceId: number) => void;
  onVoid: (invoiceId: number) => void;
  isPrinting?: boolean;
}

function InvoiceInspectorContent({
  invoice,
  customerName,
  onMarkPaid,
  onSendReminder,
  onDownloadPDF,
  onPrint,
  onRecordPayment,
  onVoid,
  isPrinting,
}: InvoiceInspectorProps) {
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Receipt className="h-12 w-12 mb-4 opacity-50" />
        <p>Select an invoice to view details</p>
      </div>
    );
  }

  const paymentProgress = getPaymentProgress(invoice);
  const daysOverdue =
    invoice.status === "OVERDUE" ? getDaysOverdue(invoice.dueDate) : 0;
  const isOverdue = daysOverdue > 0;

  return (
    <div className="space-y-6">
      <InspectorSection title="Invoice Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Invoice #">
            <p className="font-semibold text-lg font-mono">
              {invoice.invoiceNumber}
            </p>
          </InspectorField>
          <InspectorField label="Status">
            <InvoiceStatusBadge status={invoice.status} />
          </InspectorField>
        </div>

        <InspectorField label="Customer">
          <p className="font-medium">{customerName}</p>
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Invoice Date">
            <p>{formatDate(invoice.invoiceDate)}</p>
          </InspectorField>
          <InspectorField label="Due Date">
            <div className="flex items-center gap-2">
              <p className={isOverdue ? "text-red-600 font-medium" : ""}>
                {formatDate(invoice.dueDate)}
              </p>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  {daysOverdue}d overdue
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
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount Paid</span>
            <span className="font-mono text-green-600">
              {formatCurrency(invoice.amountPaid)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Amount Due</span>
            <span
              className={cn(
                "font-mono font-bold text-lg",
                isOverdue && "text-red-600"
              )}
            >
              {formatCurrency(invoice.amountDue)}
            </span>
          </div>

          {invoice.status !== "PAID" && invoice.status !== "VOID" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{paymentProgress}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2" />
            </div>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="GL Reversal & Posting" defaultOpen>
        <InvoiceGLStatus
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          amount={Number.parseFloat(invoice.totalAmount || "0")}
        />
      </InspectorSection>

      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <InspectorSection title={`Line Items (${invoice.lineItems.length})`}>
          <div className="space-y-2">
            {invoice.lineItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-sm">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}

      <InspectorSection title="Quick Actions" defaultOpen>
        <div className="space-y-2">
          {invoice.status !== "PAID" && invoice.status !== "VOID" && (
            <>
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => onRecordPayment(invoice.id)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onMarkPaid(invoice.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Paid (Full)
              </Button>
            </>
          )}

          {invoice.status !== "DRAFT" &&
            invoice.status !== "VOID" &&
            invoice.status !== "PAID" && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onSendReminder(invoice.id)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Payment Reminder
              </Button>
            )}

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onDownloadPDF(invoice.id)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onPrint(invoice.id)}
            disabled={isPrinting}
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Printing..." : "Print Invoice"}
          </Button>

          {invoice.status !== "VOID" && invoice.status !== "PAID" && (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => onVoid(invoice.id)}
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
// RECORD PAYMENT DIALOG
// ============================================================================

// WS-GF-001: RecordPaymentDialog removed - now using InvoiceToPaymentFlow Golden Flow

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvoicesWorkSurface() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showAging, setShowAging] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();
  const toasts = useToastConfig();
  const { print, isPrinting } = usePrint();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<Invoice>({
    entityType: "Invoice",
    onRefresh: async () => {
      await refetchInvoices();
    },
  });

  // tRPC utils
  const utils = trpc.useUtils();

  // Data queries
  const { data: customersData } = trpc.clients.list.useQuery({ limit: 1000 });
  const customers = useMemo(
    () => extractItems<CustomerSummary>(customersData),
    [customersData]
  );

  const {
    data: invoicesResponse,
    isLoading,
    refetch: refetchInvoices,
  } = trpc.accounting.invoices.list.useQuery({
    status:
      statusFilter !== "ALL" ? (statusFilter as Invoice["status"]) : undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const invoices = useMemo(
    () => extractItems<Invoice>(invoicesResponse),
    [invoicesResponse]
  );
  const totalInvoices = invoicesResponse?.pagination?.total ?? 0;

  const { data: arAging } = trpc.accounting.invoices.getARAging.useQuery(
    undefined,
    {
      enabled: showAging,
    }
  );

  // Helpers
  const getCustomerName = useCallback(
    (customerId: number) => {
      const customer = customers.find(c => c.id === customerId);
      return customer?.name || "Unknown Customer";
    },
    [customers]
  );

  // Filtered invoices
  const displayInvoices = useMemo(() => {
    if (!search) return invoices;
    const searchLower = search.toLowerCase();
    return invoices.filter(invoice => {
      const invoiceNumber = invoice.invoiceNumber || "";
      const customerName = getCustomerName(invoice.customerId);
      return (
        invoiceNumber.toLowerCase().includes(searchLower) ||
        customerName.toLowerCase().includes(searchLower)
      );
    });
  }, [invoices, search, getCustomerName]);

  // Selected invoice
  const selectedInvoice = useMemo(
    () => displayInvoices.find(i => i.id === selectedInvoiceId) || null,
    [displayInvoices, selectedInvoiceId]
  );

  // Statistics
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount),
      0
    );
    const totalDue = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.amountDue),
      0
    );
    const overdueCount = invoices.filter(
      inv => inv.status === "OVERDUE"
    ).length;
    return {
      count: invoices.length,
      totalBilled,
      totalDue,
      overdueCount,
    };
  }, [invoices]);

  // Mutations
  const markPaidMutation = trpc.accounting.invoices.updateStatus.useMutation({
    onMutate: () => setSaving("Marking as paid..."),
    onSuccess: () => {
      toasts.success("Invoice marked as paid");
      setSaved();
      utils.accounting.invoices.list.invalidate();
      inspector.close();
    },
    onError: err => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toasts.error(err.message || "Failed to mark as paid");
        setError(err.message);
      }
    },
  });

  const voidMutation = trpc.accounting.invoices.updateStatus.useMutation({
    onMutate: () => setSaving("Voiding invoice..."),
    onSuccess: () => {
      toasts.success("Invoice voided");
      setSaved();
      utils.accounting.invoices.list.invalidate();
      setShowVoidDialog(false);
      inspector.close();
    },
    onError: err => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(err)) {
        toasts.error(err.message || "Failed to void invoice");
        setError(err.message);
      }
    },
  });

  const downloadPdfMutation = trpc.invoices.downloadPdf.useMutation({
    onSuccess: result => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = result.fileName;
      link.click();
      toasts.success("Invoice PDF downloaded");
    },
    onError: err => {
      toasts.error(err.message || "Failed to download PDF");
    },
  });

  // WS-GF-001: recordPaymentMutation removed - now handled by InvoiceToPaymentFlow Golden Flow

  // Track version for optimistic locking when invoice is selected (UXS-705)
  useEffect(() => {
    if (selectedInvoice && selectedInvoice.version !== undefined) {
      trackVersion(selectedInvoice);
    }
  }, [selectedInvoice, trackVersion]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      arrowdown: e => {
        e.preventDefault();
        const newIndex = Math.min(
          displayInvoices.length - 1,
          selectedIndex + 1
        );
        setSelectedIndex(newIndex);
        const invoice = displayInvoices[newIndex];
        if (invoice) setSelectedInvoiceId(invoice.id);
      },
      arrowup: e => {
        e.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const invoice = displayInvoices[newIndex];
        if (invoice) setSelectedInvoiceId(invoice.id);
      },
      enter: e => {
        if (selectedInvoice) {
          e.preventDefault();
          inspector.open();
        }
      },
      "cmd+r": e => {
        e.preventDefault();
        refetchInvoices();
      },
      "ctrl+r": e => {
        e.preventDefault();
        refetchInvoices();
      },
    },
    onCancel: () => {
      if (showPaymentDialog) setShowPaymentDialog(false);
      else if (showVoidDialog) setShowVoidDialog(false);
      else if (inspector.isOpen) inspector.close();
    },
  });

  // Handlers
  const handleMarkPaid = (invoiceId: number) => {
    markPaidMutation.mutate({ id: invoiceId, status: "PAID" });
  };

  const handleSendReminder = (invoiceId: number) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    toasts.success(`Payment reminder sent for ${invoice?.invoiceNumber}`);
  };

  const handleDownloadPDF = useCallback(
    (invoiceId: number) => {
      const invoice = invoices.find(i => i.id === invoiceId);
      toasts.info(`Preparing PDF for ${invoice?.invoiceNumber ?? "invoice"}`);
      downloadPdfMutation.mutate({ id: invoiceId });
    },
    [downloadPdfMutation, invoices, toasts]
  );

  const handlePrintInvoice = async (invoiceId: number) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice) {
      await print({
        title: `Invoice ${invoice.invoiceNumber}`,
        addTimestamp: true,
        onBeforePrint: () => toasts.info("Preparing invoice for print..."),
        onAfterPrint: () => toasts.success("Print dialog closed"),
      });
    }
  };

  const handleRecordPayment = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setShowPaymentDialog(true);
  };

  const handleVoid = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setShowVoidDialog(true);
  };

  // WS-GF-001: handlePaymentSubmit removed - now handled by InvoiceToPaymentFlow Golden Flow

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-4 border-b bg-background md:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Receipt className="h-6 w-6" />
            Invoices
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer invoices and accounts receivable
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex flex-wrap gap-3 md:gap-4">
            <span>
              Total Billed:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(stats.totalBilled)}
              </span>
            </span>
            <span>
              Due:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(stats.totalDue)}
              </span>
            </span>
            {stats.overdueCount > 0 && (
              <span className="text-red-600">
                Overdue:{" "}
                <span className="font-semibold">{stats.overdueCount}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b bg-muted/30 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search invoices... (Cmd+K)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
                data-testid="invoices-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAging(!showAging)}
              data-testid="show-ar-aging-button"
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              {showAging ? "Hide" : "Show"} AR Aging
            </Button>
            <Button
              variant="outline"
              onClick={() => refetchInvoices()}
              data-testid="refresh-invoices-button"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* AR Aging Card */}
        {showAging && arAging && (
          <div className="mt-4 p-4 border rounded-lg bg-background">
            <h3 className="font-semibold mb-3">AR Aging Report</h3>
            <div className="flex flex-wrap gap-3">
              <AgingBadge bucket="current" amount={arAging.current} />
              <AgingBadge bucket="30" amount={arAging.days30} />
              <AgingBadge bucket="60" amount={arAging.days60} />
              <AgingBadge bucket="90" amount={arAging.days90} />
              <AgingBadge bucket="90+" amount={arAging.days90Plus} />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayInvoices.length === 0 ? (
            <div
              className="flex items-center justify-center h-64"
              data-testid="invoices-empty-state"
            >
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No invoices found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try adjusting your search"
                    : "Create invoices from sales orders"}
                </p>
              </div>
            </div>
          ) : (
            <Table data-testid="invoices-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayInvoices.map((invoice, index) => (
                  <TableRow
                    key={invoice.id}
                    data-testid={`invoice-row-${invoice.id}`}
                    data-invoiceid={invoice.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedInvoiceId === invoice.id && "bg-muted",
                      selectedIndex === index &&
                        "ring-1 ring-inset ring-primary"
                    )}
                    onClick={() => {
                      setSelectedInvoiceId(invoice.id);
                      setSelectedIndex(index);
                      inspector.open();
                    }}
                  >
                    <TableCell className="font-mono font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            invoice.status === "OVERDUE" ? "text-red-600" : ""
                          }
                        >
                          {formatDate(invoice.dueDate)}
                        </span>
                        {invoice.status === "OVERDUE" && (
                          <Badge variant="destructive" className="text-xs px-1">
                            {getDaysOverdue(invoice.dueDate)}d
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          parseFloat(invoice.amountDue) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        {formatCurrency(invoice.amountDue)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalInvoices > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, totalInvoices)} -{" "}
                {Math.min(page * pageSize, totalInvoices)} of {totalInvoices}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalInvoices}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedInvoice?.invoiceNumber || "Invoice Details"}
          subtitle={
            selectedInvoice
              ? getCustomerName(selectedInvoice.customerId)
              : undefined
          }
        >
          <InvoiceInspectorContent
            invoice={selectedInvoice}
            customerName={
              selectedInvoice ? getCustomerName(selectedInvoice.customerId) : ""
            }
            onMarkPaid={handleMarkPaid}
            onSendReminder={handleSendReminder}
            onDownloadPDF={handleDownloadPDF}
            onPrint={handlePrintInvoice}
            onRecordPayment={handleRecordPayment}
            onVoid={handleVoid}
            isPrinting={isPrinting}
          />
        </InspectorPanel>
      </div>

      {/* WS-GF-001: Golden Flow for Payment Recording */}
      {selectedInvoiceId && (
        <InvoiceToPaymentFlow
          invoiceId={selectedInvoiceId}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onPaymentRecorded={() => {
            utils.accounting.invoices.list.invalidate();
            utils.payments.list.invalidate();
            setShowPaymentDialog(false);
          }}
        />
      )}

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to void invoice{" "}
            <strong>{selectedInvoice?.invoiceNumber}</strong>? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedInvoice &&
                voidMutation.mutate({ id: selectedInvoice.id, status: "VOID" })
              }
              disabled={voidMutation.isPending}
            >
              {voidMutation.isPending ? "Voiding..." : "Void Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default InvoicesWorkSurface;
