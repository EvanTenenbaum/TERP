/**
 * QuotesWorkSurface - Work Surface implementation for Sales Quotes
 * UXS-302: Aligns Quotes page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract with arrow navigation
 * - Save state indicator
 * - Inspector panel for quote details
 * - Status filtering (Draft, Sent, Accepted, Rejected, Expired)
 * - Convert to sale workflow
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import type { ReactNode } from "react";
import { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// TER-212: Workflow state machine visualization
import { QuoteWorkflowTracker } from "@/components/orders/WorkflowStatusTracker";

// Icons
import {
  Search,
  Plus,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Send,
  Edit,
  Copy,
  Trash2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ClientItem {
  id: number;
  name: string;
}

interface Quote {
  id: number;
  orderNumber: string;
  clientId: number;
  quoteStatus: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  createdAt?: string;
  validUntil?: string;
  notes?: string;
  items?: Array<{
    displayName: string;
    quantity: number;
    price: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUOTE_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

const STATUS_CONFIG: Record<string, { icon: ReactNode; color: string }> = {
  DRAFT: {
    icon: <FileText className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-800",
  },
  SENT: {
    icon: <Clock className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800",
  },
  ACCEPTED: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-800",
  },
  REJECTED: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-800",
  },
  EXPIRED: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-800",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "-";
  }
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function QuoteStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      {config.icon}
      {status}
    </Badge>
  );
}

// ============================================================================
// QUOTE INSPECTOR
// ============================================================================

interface QuoteInspectorProps {
  quote: Quote | null;
  clientName: string;
  onEdit: (quoteId: number) => void;
  onSend: (quoteId: number) => void;
  onConvert: (quoteId: number) => void;
  onDuplicate: (quoteId: number) => void;
  onDelete: (quoteId: number) => void;
}

function QuoteInspectorContent({
  quote,
  clientName,
  onEdit,
  onSend,
  onConvert,
  onDuplicate,
  onDelete,
}: QuoteInspectorProps) {
  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a quote to view details</p>
      </div>
    );
  }

  const items = quote.items || [];

  return (
    <div className="space-y-6">
      <InspectorSection title="Quote Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Quote #">
            <p className="font-semibold text-lg">{quote.orderNumber}</p>
          </InspectorField>
          <InspectorField label="Status">
            <QuoteStatusBadge status={quote.quoteStatus} />
          </InspectorField>
        </div>

        {/* TER-212: Workflow state machine tracker */}
        <InspectorField label="Workflow">
          <QuoteWorkflowTracker status={quote.quoteStatus} />
        </InspectorField>

        <InspectorField label="Client">
          <p className="font-medium">{clientName}</p>
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Created">
            <p>{formatDate(quote.createdAt)}</p>
          </InspectorField>
          {quote.validUntil && (
            <InspectorField label="Valid Until">
              <p>{formatDate(quote.validUntil)}</p>
            </InspectorField>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title={`Line Items (${items.length})`} defaultOpen>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={`${item.displayName}-${item.quantity}`}
                className="p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{formatCurrency(item.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.quantity * parseFloat(item.price))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Totals" defaultOpen>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
          </div>
          {parseFloat(quote.tax) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-mono">{formatCurrency(quote.tax)}</span>
            </div>
          )}
          {parseFloat(quote.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span className="font-mono">
                -{formatCurrency(quote.discount)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono text-lg">
              {formatCurrency(quote.total)}
            </span>
          </div>
        </div>
      </InspectorSection>

      {quote.notes && (
        <InspectorSection title="Notes">
          <p className="text-sm text-muted-foreground">{quote.notes}</p>
        </InspectorSection>
      )}

      <InspectorSection title="Actions" defaultOpen>
        <div className="space-y-2">
          {quote.quoteStatus === "DRAFT" && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onEdit(quote.id)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Quote
              </Button>
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => onSend(quote.id)}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Client
              </Button>
            </>
          )}
          {quote.quoteStatus === "ACCEPTED" && (
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={() => onConvert(quote.id)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert to Sale
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onDuplicate(quote.id)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate Quote
          </Button>
          {quote.quoteStatus === "DRAFT" && (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => onDelete(quote.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Quote
            </Button>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuotesWorkSurface() {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false); // API-016
  const [sendCustomMessage, setSendCustomMessage] = useState(""); // API-016

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Data queries
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients: ClientItem[] = useMemo(() => {
    if (Array.isArray(clientsData)) return clientsData;
    const paginated = clientsData as { items?: ClientItem[] } | undefined;
    return paginated?.items ?? [];
  }, [clientsData]);

  const {
    data: quotesData,
    isLoading,
    refetch: refetchQuotes,
  } = trpc.orders.getAll.useQuery({
    orderType: "QUOTE",
    quoteStatus: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const quotes: Quote[] = useMemo(() => {
    if (Array.isArray(quotesData)) return quotesData;
    const paginated = quotesData as { items?: Quote[] } | undefined;
    return paginated?.items ?? [];
  }, [quotesData]);

  // Helpers
  const getClientName = useCallback(
    (clientId: number) => {
      const client = clients.find((c: ClientItem) => c.id === clientId);
      return client?.name || "Unknown";
    },
    [clients]
  );

  // Filtered quotes
  const displayQuotes = useMemo(() => {
    if (!search) return quotes;
    const searchLower = search.toLowerCase();
    return quotes.filter(quote => {
      const clientName = getClientName(quote.clientId);
      return (
        quote.orderNumber.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower)
      );
    });
  }, [quotes, search, getClientName]);

  // Selected quote
  const selectedQuote = useMemo(
    () => displayQuotes.find(q => q.id === selectedQuoteId) || null,
    [displayQuotes, selectedQuoteId]
  );

  // Statistics
  const stats = useMemo(
    () => ({
      draft: quotes.filter(q => q.quoteStatus === "DRAFT").length,
      sent: quotes.filter(q => q.quoteStatus === "SENT").length,
      accepted: quotes.filter(q => q.quoteStatus === "ACCEPTED").length,
      total: quotes.length,
    }),
    [quotes]
  );

  // Mutations
  const convertMutation = trpc.orders.convertQuoteToSale.useMutation({
    onMutate: () => setSaving("Converting to sale..."),
    onSuccess: () => {
      toast.success("Quote converted to sale");
      setSaved();
      refetchQuotes();
      setShowConvertDialog(false);
      inspector.close();
    },
    onError: err => {
      toast.error(err.message || "Failed to convert quote");
      setError(err.message);
    },
  });

  // API-016: Send quote via email
  const sendQuoteMutation = trpc.quotes.send.useMutation({
    onMutate: () => setSaving("Sending quote..."),
    onSuccess: result => {
      if (result.emailSent) {
        toast.success("Quote sent successfully");
      } else {
        toast.info(
          "Quote marked as sent (email not configured or no client email)"
        );
      }
      setSaved();
      refetchQuotes();
      setShowSendDialog(false);
      setSendCustomMessage("");
      inspector.close();
    },
    onError: err => {
      toast.error(err.message || "Failed to send quote");
      setError(err.message);
    },
  });

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
      "cmd+n": e => {
        e.preventDefault();
        setLocation("/orders/create");
      },
      arrowdown: e => {
        e.preventDefault();
        const newIndex = Math.min(displayQuotes.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const quote = displayQuotes[newIndex];
        if (quote) setSelectedQuoteId(quote.id);
      },
      arrowup: e => {
        e.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const quote = displayQuotes[newIndex];
        if (quote) setSelectedQuoteId(quote.id);
      },
      enter: e => {
        if (selectedQuote) {
          e.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (showSendDialog) setShowSendDialog(false);
      else if (showConvertDialog) setShowConvertDialog(false);
      else if (showDeleteDialog) setShowDeleteDialog(false);
      else if (inspector.isOpen) inspector.close();
    },
  });

  // Handlers
  const handleEdit = (quoteId: number) =>
    setLocation(`/orders/create?quoteId=${quoteId}`);
  // API-016: Open send dialog
  const handleSend = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setSendCustomMessage("");
    setShowSendDialog(true);
  };
  const handleConvert = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setShowConvertDialog(true);
  };
  const handleDuplicate = (_quoteId: number) =>
    toast.info("Duplicate quote functionality coming soon");
  const handleDelete = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setShowDeleteDialog(true);
  };

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Sales Quotes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage quotes and convert them to orders
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Draft:{" "}
              <span className="font-semibold text-foreground">
                {stats.draft}
              </span>
            </span>
            <span>
              Sent:{" "}
              <span className="font-semibold text-foreground">
                {stats.sent}
              </span>
            </span>
            <span>
              Accepted:{" "}
              <span className="font-semibold text-foreground">
                {stats.accepted}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search quotes... (Cmd+K)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setLocation("/orders/create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>
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
          ) : displayQuotes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No quotes found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try adjusting your search"
                    : "Create your first quote"}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayQuotes.map((quote, index) => (
                  <TableRow
                    key={quote.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedQuoteId === quote.id && "bg-muted",
                      selectedIndex === index &&
                        "ring-1 ring-inset ring-primary"
                    )}
                    onClick={() => {
                      setSelectedQuoteId(quote.id);
                      setSelectedIndex(index);
                      inspector.open();
                    }}
                  >
                    <TableCell className="font-medium">
                      {quote.orderNumber}
                    </TableCell>
                    <TableCell>{getClientName(quote.clientId)}</TableCell>
                    <TableCell>{formatDate(quote.createdAt)}</TableCell>
                    <TableCell>{formatDate(quote.validUntil)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.quoteStatus} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(quote.total)}
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
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedQuote?.orderNumber || "Quote Details"}
          subtitle={
            selectedQuote ? getClientName(selectedQuote.clientId) : undefined
          }
        >
          <QuoteInspectorContent
            quote={selectedQuote}
            clientName={
              selectedQuote ? getClientName(selectedQuote.clientId) : ""
            }
            onEdit={handleEdit}
            onSend={handleSend}
            onConvert={handleConvert}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </InspectorPanel>
      </div>

      {/* Convert Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Quote to Sale</DialogTitle>
          </DialogHeader>
          <p>
            Convert this quote to a sales order? This will create a new order
            and mark the quote as accepted.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedQuoteId &&
                convertMutation.mutate({ quoteId: selectedQuoteId })
              }
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Convert to Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this quote? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => toast.info("Delete functionality coming soon")}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API-016: Send Quote Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote to Client</DialogTitle>
            <DialogDescription>
              Send this quote via email to the client. You can add an optional
              personalized message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (Optional)</Label>
              <Textarea
                id="customMessage"
                placeholder="Add a personal note to include with the quote email..."
                value={sendCustomMessage}
                onChange={e => setSendCustomMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedQuoteId &&
                sendQuoteMutation.mutate({
                  id: selectedQuoteId,
                  sendEmail: true,
                  customMessage: sendCustomMessage || undefined,
                })
              }
              disabled={sendQuoteMutation.isPending}
            >
              {sendQuoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuotesWorkSurface;
