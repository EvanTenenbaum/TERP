/**
 * QuotesPilotSurface
 *
 * Sheet-native registry surface for Sales Quotes.
 * Family: Registry + Actions (hybrid — shared OrderCreatorPage composer).
 *
 * Architecture: Quote creation/editing navigates to OrderCreatorPage (the same
 * composer as Orders). This surface owns browse, filter, row-scoped actions, the
 * inspector, and the new QUO-026 rejection action. It does NOT build a separate
 * quote document editor.
 *
 * Capabilities covered:
 *   QUO-001  Quote registry browse (PowersheetGrid)
 *   QUO-002  Filter by status (7 values inc. ALL)
 *   QUO-003  Search by number/client
 *   QUO-004  Header stats band (Unsent / Sent / Converted)
 *   QUO-005  Arrow key navigation (grid native)
 *   QUO-006  Cmd+K search focus
 *   QUO-007  Cmd+N new quote
 *   QUO-008  Inspector — quote info
 *   QUO-009  Inspector — line items
 *   QUO-010  Inspector — totals
 *   QUO-011  Inspector — notes
 *   QUO-012  Edit quote (UNSENT only) → OrderCreatorPage
 *   QUO-013  Send to client (quotes.send)
 *   QUO-014  Send dialog — custom message
 *   QUO-015  Convert to sales order (orders.convertQuoteToSale)
 *   QUO-016  Convert confirm dialog
 *   QUO-017  Duplicate quote → OrderCreatorPage
 *   QUO-018  Delete quote (UNSENT only, soft delete via orders.delete)
 *   QUO-020  Creation via OrderCreatorPage (New Quote button)
 *   QUO-025  Expiry display (validUntil)
 *   QUO-026  Quote rejection (staff) — NEW: quotes.reject with reason field
 *   QUO-029  Email capability probe
 *   QUO-030  Status badge with icon
 *
 * TER-820 | Branch: feat/w3c-quotes-sheet-native
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import {
  extractItems,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";

// ─── Platform detection ───────────────────────────────────────────────────────

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

// ─── Affordances ──────────────────────────────────────────────────────────────

const registryAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

// ─── Keyboard hints ───────────────────────────────────────────────────────────

const registryKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
  { key: `${mod}+K`, label: "search" },
  { key: `${mod}+N`, label: "new quote" },
];

// ─── Status config ────────────────────────────────────────────────────────────

const QUOTE_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "UNSENT", label: "Unsent" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "CONVERTED", label: "Converted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
] as const;

type QuoteStatusFilter = (typeof QUOTE_STATUSES)[number]["value"];

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteStatus =
  | "UNSENT"
  | "SENT"
  | "VIEWED"
  | "CONVERTED"
  | "REJECTED"
  | "EXPIRED";

interface QuoteRecord {
  id: number;
  orderNumber: string;
  clientId: number;
  quoteStatus?: QuoteStatus | null;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  createdAt?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  items?: Array<{
    batchId?: number | null;
    displayName?: string | null;
    originalName?: string | null;
    productName?: string | null;
    quantity: number;
    price?: string | number | null;
    unitPrice?: string | number | null;
    lineTotal?: string | number | null;
  }> | null;
}

interface QuoteRegistryRow {
  identity: {
    entityType: string;
    entityId: number;
    rowKey: string;
    recordVersion: null;
    tableRole: "primary";
  };
  quoteId: number;
  orderNumber: string;
  clientName: string;
  status: QuoteStatus;
  statusLabel: string;
  total: number;
  lineItemCount: number;
  createdAt: string | null;
  validUntil: string | null;
  expiryLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

const getEffectiveStatus = (q: Pick<QuoteRecord, "quoteStatus">): QuoteStatus =>
  q.quoteStatus ?? "UNSENT";

const getItemDisplayName = (
  item: NonNullable<QuoteRecord["items"]>[number]
): string =>
  item.displayName || item.productName || item.originalName || "Product";

const getItemUnitPrice = (
  item: NonNullable<QuoteRecord["items"]>[number]
): number | null => {
  const value =
    item.unitPrice !== undefined && item.unitPrice !== null
      ? item.unitPrice
      : item.price;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : null;
};

const getItemLineTotal = (
  item: NonNullable<QuoteRecord["items"]>[number]
): number | null => {
  if (item.lineTotal !== undefined && item.lineTotal !== null) {
    const parsed =
      typeof item.lineTotal === "string"
        ? parseFloat(item.lineTotal)
        : item.lineTotal;
    if (Number.isFinite(parsed)) return parsed;
  }
  const unitPrice = getItemUnitPrice(item);
  return unitPrice !== null ? item.quantity * unitPrice : null;
};

const getQuoteValidUntilDisplay = (
  validUntil: string | null | undefined,
  createdAt: string | null | undefined
): string => {
  if (validUntil) {
    return formatDate(validUntil);
  }

  if (createdAt) {
    try {
      return format(addDays(new Date(createdAt), 30), "MMM d, yyyy");
    } catch {
      return "30 days from creation";
    }
  }

  return "30 days from creation";
};

const getExpiryLabel = (
  validUntil: string | null | undefined,
  createdAt: string | null | undefined
): string => {
  if (!validUntil) return createdAt ? "Default 30-day window" : "30-day window";
  try {
    const d = new Date(validUntil);
    if (Number.isNaN(d.getTime())) return "—";
    const diffDays = Math.floor(
      (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    return `Expires in ${diffDays}d`;
  } catch {
    return "—";
  }
};

function mapQuoteToRegistryRow(
  q: QuoteRecord,
  clientName: string
): QuoteRegistryRow {
  const status = getEffectiveStatus(q);
  const total = parseFloat(q.total);
  const items = q.items ?? [];
  return {
    identity: {
      entityType: "quote",
      entityId: q.id,
      rowKey: `quote:${q.id}`,
      recordVersion: null,
      tableRole: "primary" as const,
    },
    quoteId: q.id,
    orderNumber: q.orderNumber,
    clientName,
    status,
    statusLabel: status,
    total: Number.isFinite(total) ? total : 0,
    lineItemCount: items.length,
    createdAt: q.createdAt ?? null,
    validUntil: q.validUntil ?? null,
    expiryLabel: getExpiryLabel(q.validUntil, q.createdAt ?? null),
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_ICON_MAP: Record<QuoteStatus, ReactNode> = {
  UNSENT: <FileText className="h-3 w-3" />,
  SENT: <Clock className="h-3 w-3" />,
  VIEWED: <CheckCircle2 className="h-3 w-3" />,
  CONVERTED: <CheckCircle2 className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
  EXPIRED: <AlertTriangle className="h-3 w-3" />,
};

const STATUS_COLOR_MAP: Record<QuoteStatus, string> = {
  UNSENT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VIEWED:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  CONVERTED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  EXPIRED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-xs ${STATUS_COLOR_MAP[status]}`}
    >
      {STATUS_ICON_MAP[status]}
      {status}
    </Badge>
  );
}

// ─── Inspector content ────────────────────────────────────────────────────────

interface InspectorContentProps {
  quote: QuoteRecord | null;
  clientName: string;
  onEdit: (id: number) => void;
  onSend: (id: number) => void;
  onConvert: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
  onReject: (id: number) => void;
}

function QuoteInspectorContent({
  quote,
  clientName,
  onEdit,
  onSend,
  onConvert,
  onDuplicate,
  onDelete,
  onReject,
}: InspectorContentProps) {
  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Select a quote to view details</p>
      </div>
    );
  }

  const status = getEffectiveStatus(quote);
  const items = quote.items ?? [];
  const canEdit = status === "UNSENT";
  const canSend = status === "UNSENT";
  const canConvert =
    status === "UNSENT" || status === "SENT" || status === "VIEWED";
  const canDelete = status === "UNSENT";
  const canReject = status === "SENT" || status === "VIEWED";

  return (
    <div className="space-y-4">
      <InspectorSection title="Quote Information" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Quote #">
            <p className="font-semibold">{quote.orderNumber}</p>
          </InspectorField>
          <InspectorField label="Status">
            <QuoteStatusBadge status={status} />
          </InspectorField>
        </div>
        <InspectorField label="Client">
          <p className="font-medium">{clientName}</p>
        </InspectorField>
        <div className="grid grid-cols-2 gap-3">
          <InspectorField label="Created">
            <p className="text-sm">{formatDate(quote.createdAt)}</p>
          </InspectorField>
          <InspectorField label="Valid Until">
            <p className="text-sm">
              {getQuoteValidUntilDisplay(quote.validUntil, quote.createdAt)}
            </p>
          </InspectorField>
        </div>
        <InspectorField label="Expiry">
          <p className="text-sm text-muted-foreground">
            {getExpiryLabel(quote.validUntil, quote.createdAt)}
          </p>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title={`Line Items (${items.length})`} defaultOpen>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => {
              const unitPrice = getItemUnitPrice(item);
              const lineTotal = getItemLineTotal(item);
              const displayName = getItemDisplayName(item);
              return (
                <div
                  key={`item-${item.batchId ?? idx}-${displayName}`}
                  className="p-2.5 border rounded-md bg-muted/30 text-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{displayName}</p>
                      <p className="text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono">
                        {unitPrice !== null ? formatCurrency(unitPrice) : "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {lineTotal !== null ? formatCurrency(lineTotal) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Totals" defaultOpen>
        <div className="space-y-1.5">
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
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span className="font-mono">
                -{formatCurrency(quote.discount)}
              </span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </InspectorSection>

      {quote.notes && (
        <InspectorSection title="Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {quote.notes}
          </p>
        </InspectorSection>
      )}

      <InspectorSection title="Actions" defaultOpen>
        <div className="space-y-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onEdit(quote.id)}
            >
              <Edit className="h-3.5 w-3.5 mr-2" />
              Edit Quote
            </Button>
          )}
          {canSend && (
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start"
              onClick={() => onSend(quote.id)}
            >
              <Send className="h-3.5 w-3.5 mr-2" />
              Send to Client
            </Button>
          )}
          {canConvert && (
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start"
              onClick={() => onConvert(quote.id)}
            >
              <ArrowRight className="h-3.5 w-3.5 mr-2" />
              Convert to Sales Order
            </Button>
          )}
          {canReject && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-orange-600 hover:text-orange-700 dark:text-orange-400"
              onClick={() => onReject(quote.id)}
            >
              <XCircle className="h-3.5 w-3.5 mr-2" />
              Reject Quote
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onDuplicate(quote.id)}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Duplicate Quote
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400"
              onClick={() => onDelete(quote.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete Quote
            </Button>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface QuotesPilotSurfaceProps {
  onOpenClassic?: () => void;
}

export function QuotesPilotSurface({ onOpenClassic }: QuotesPilotSurfaceProps) {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selection via URL param (mirrors OrdersSheetPilotSurface pattern)
  const { selectedId: selectedQuoteId, setSelectedId: setSelectedQuoteId } =
    useSpreadsheetSelectionParam("quoteId");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>("ALL");
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Dialog state
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendCustomMessage, setSendCustomMessage] = useState("");
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ─── Data queries ───────────────────────────────────────────────────────────

  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });
  const clientNamesById = useMemo(
    () =>
      new Map(
        extractItems(clientsQuery.data).map(c => [c.id, c.name ?? "Unknown"])
      ),
    [clientsQuery.data]
  );

  const quotesQuery = trpc.orders.getAll.useQuery({
    orderType: "QUOTE",
    quoteStatus: statusFilter === "ALL" ? undefined : statusFilter,
  });
  // BUG-006: Filter client-side to ensure only QUOTE records appear.
  // The server uses orderType: "QUOTE" but if mixed results are returned
  // (e.g., due to caching or query bugs), this guard prevents ORD-... records
  // from polluting the quotes registry.
  const quotesRaw: QuoteRecord[] = useMemo(() => {
    const all = extractItems(quotesQuery.data) as Array<
      QuoteRecord & { orderType?: string | null }
    >;
    return all.filter(
      q => !q.orderType || q.orderType.toUpperCase() === "QUOTE"
    );
  }, [quotesQuery.data]);

  // Email capability probe (QUO-029)
  const emailEnabledQuery = trpc.quotes.isEmailEnabled.useQuery();

  // ─── Derived data ───────────────────────────────────────────────────────────

  const searchLower = searchTerm.trim().toLowerCase();

  const registryRows = useMemo(() => {
    const mapped = quotesRaw.map(q =>
      mapQuoteToRegistryRow(
        q,
        clientNamesById.get(q.clientId) ?? "Unknown Client"
      )
    );
    if (!searchLower) return mapped;
    return mapped.filter(
      r =>
        r.orderNumber.toLowerCase().includes(searchLower) ||
        r.clientName.toLowerCase().includes(searchLower)
    );
  }, [quotesRaw, clientNamesById, searchLower]);

  const selectedRow =
    registryRows.find(r => r.quoteId === selectedQuoteId) ?? null;

  const selectedQuote = quotesRaw.find(q => q.id === selectedQuoteId) ?? null;

  const stats = useMemo(() => {
    const all = quotesRaw;
    return {
      unsent: all.filter(q => getEffectiveStatus(q) === "UNSENT").length,
      sent: all.filter(q => getEffectiveStatus(q) === "SENT").length,
      converted: all.filter(q => getEffectiveStatus(q) === "CONVERTED").length,
    };
  }, [quotesRaw]);

  // ─── Column defs ────────────────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef<QuoteRegistryRow>[]>(
    () => [
      {
        field: "orderNumber",
        headerName: "Quote #",
        minWidth: 130,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: quote identifier",
      },
      {
        field: "clientName",
        headerName: "Client",
        flex: 1.4,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: client name",
      },
      {
        field: "statusLabel",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: quote status",
      },
      {
        field: "lineItemCount",
        headerName: "Lines",
        minWidth: 80,
        maxWidth: 100,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: number of line items",
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: quote total",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "createdAt",
        headerName: "Created",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: creation date",
        valueFormatter: params => formatDate(params.value as string | null),
      },
      {
        field: "expiryLabel",
        headerName: "Expiry",
        minWidth: 130,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: expiry status",
      },
    ],
    []
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────

  // BUG-010: Improved error handling for large quote conversions.
  // BUG-011: Navigate to the newly-created order after conversion.
  const convertMutation = trpc.orders.convertQuoteToSale.useMutation({
    onSuccess: result => {
      toast.success("Quote converted to sales order");
      void quotesQuery.refetch();
      setShowConvertDialog(false);
      setSelectedQuoteId(null);
      // Navigate to the created sales order if the ID is available
      const createdOrderId = (result as Record<string, unknown> | null)?.id;
      if (typeof createdOrderId === "number" && createdOrderId > 0) {
        setLocation(
          buildSalesWorkspacePath("orders", { orderId: createdOrderId })
        );
      }
    },
    onError: err => {
      // BUG-010: Provide actionable guidance on conversion failures.
      const raw = err.message || "";
      let friendly = raw;
      if (raw.toLowerCase().includes("insufficient")) {
        friendly =
          "Conversion failed: insufficient inventory for one or more line items. Review stock levels before retrying.";
      } else if (
        raw.toLowerCase().includes("expired") ||
        raw.toLowerCase().includes("expir")
      ) {
        friendly =
          "This quote has expired and can no longer be converted. Create a new quote with current pricing.";
      } else if (
        raw.toLowerCase().includes("converted") ||
        raw.toLowerCase().includes("invalid transition")
      ) {
        friendly =
          "This quote has already been converted or is in a state that does not allow conversion.";
      } else if (!raw) {
        friendly =
          "Conversion failed. The server did not return an error message — please try again or contact support.";
      }
      toast.error(friendly);
    },
  });

  const sendMutation = trpc.quotes.send.useMutation({
    onSuccess: result => {
      if (result.emailSent) {
        toast.success("Quote sent to client");
      } else {
        toast.info(
          "Quote marked as sent — email not configured or client has no email address"
        );
      }
      void quotesQuery.refetch();
      setShowSendDialog(false);
      setSendCustomMessage("");
    },
    onError: err => {
      toast.error(err.message || "Failed to send quote");
    },
  });

  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Quote deleted");
      void quotesQuery.refetch();
      setShowDeleteDialog(false);
      setSelectedQuoteId(null);
    },
    onError: err => {
      toast.error(err.message || "Failed to delete quote");
    },
  });

  const rejectMutation = trpc.quotes.reject.useMutation({
    onSuccess: () => {
      toast.success("Quote rejected");
      void quotesQuery.refetch();
      setShowRejectDialog(false);
      setRejectReason("");
    },
    onError: err => {
      toast.error(err.message || "Failed to reject quote");
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleEdit = useCallback(
    (id: number) => {
      // BUG-007/BUG-008: pass mode=quote so the creator labels correctly
      setLocation(
        buildSalesWorkspacePath("create-order", { quoteId: id, mode: "quote" })
      );
    },
    [setLocation]
  );

  const handleSend = useCallback(
    (id: number) => {
      setSelectedQuoteId(id);
      setSendCustomMessage("");
      setShowSendDialog(true);
    },
    [setSelectedQuoteId]
  );

  const handleConvert = useCallback(
    (id: number) => {
      setSelectedQuoteId(id);
      setShowConvertDialog(true);
    },
    [setSelectedQuoteId]
  );

  const handleDuplicate = useCallback(
    (id: number) => {
      setLocation(
        buildSalesWorkspacePath("create-order", {
          quoteId: id,
          mode: "duplicate",
          // Note: duplicate mode already implies quote context via quoteId
        })
      );
    },
    [setLocation]
  );

  const handleDelete = useCallback(
    (id: number) => {
      setSelectedQuoteId(id);
      setShowDeleteDialog(true);
    },
    [setSelectedQuoteId]
  );

  const handleReject = useCallback(
    (id: number) => {
      setSelectedQuoteId(id);
      setRejectReason("");
      setShowRejectDialog(true);
    },
    [setSelectedQuoteId]
  );

  // BUG-007: Navigate to the quote creation flow (create-order with mode=quote)
  const handleNewQuote = useCallback(() => {
    setLocation(buildSalesWorkspacePath("create-order", { mode: "quote" }));
  }, [setLocation]);

  // Keyboard handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (meta && e.key === "n") {
        e.preventDefault();
        handleNewQuote();
      }
    },
    [handleNewQuote]
  );

  // ─── Status bar content ──────────────────────────────────────────────────────

  const statusBarLeft = (
    <span>
      {registryRows.length} visible quotes ·{" "}
      {selectionSummary
        ? `${selectionSummary.selectedCellCount} cells / ${selectionSummary.selectedRowCount} rows`
        : "0 selected"}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? `Selected ${selectedRow.orderNumber} · ${selectedRow.statusLabel} · ${selectedRow.clientName}`
        : "Select a quote to load details and actions"}
    </span>
  );

  // ─── Workflow action bar ─────────────────────────────────────────────────────

  const selectedStatus = selectedRow ? selectedRow.status : null;
  const multiRowSelected = (selectionSummary?.selectedRowCount ?? 0) > 1;
  const actionsBlocked = multiRowSelected;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Stats band (QUO-004) */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/70 bg-muted/30 px-4 py-2.5 text-sm">
        <span>
          <span className="text-muted-foreground">Unsent</span>{" "}
          <span className="font-semibold">{stats.unsent}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Sent</span>{" "}
          <span className="font-semibold">{stats.sent}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Converted</span>{" "}
          <span className="font-semibold">{stats.converted}</span>
        </span>
        {emailEnabledQuery.data && (
          <Badge variant="outline" className="ml-auto text-xs">
            {emailEnabledQuery.data.enabled
              ? "Email: enabled"
              : "Email: not configured"}
          </Badge>
        )}
      </div>

      {/* Search + filter bar (QUO-002, QUO-003, QUO-006) */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={`Search quotes... (${mod}+K)`}
          className="max-w-xs"
          aria-label="Search quotes"
        />
        <Select
          value={statusFilter}
          onValueChange={v => setStatusFilter(v as QuoteStatusFilter)}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
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
        <Badge variant="outline" className="text-xs">
          Quotes · Registry
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="Refresh quotes"
            onClick={() => void quotesQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {/* BUG-007: Route to quote creation flow, not generic sales-order builder */}
          <Button size="sm" onClick={handleNewQuote}>
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
          {onOpenClassic && (
            <Button size="sm" variant="ghost" onClick={onOpenClassic}>
              Classic
            </Button>
          )}
        </div>
      </div>

      {/* Workflow action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedRow
            ? `${selectedRow.orderNumber} selected`
            : "Select a quote to take action"}
        </span>
        {actionsBlocked && (
          <span className="text-xs text-muted-foreground">
            Multiple rows selected — actions apply to one quote at a time.
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={selectedStatus !== "UNSENT" || actionsBlocked}
            onClick={() => selectedQuoteId && handleEdit(selectedQuoteId)}
          >
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedStatus !== "UNSENT" || actionsBlocked}
            onClick={() => selectedQuoteId && handleSend(selectedQuoteId)}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedRow ||
              !["UNSENT", "SENT", "VIEWED"].includes(selectedStatus ?? "") ||
              actionsBlocked
            }
            onClick={() => selectedQuoteId && handleConvert(selectedQuoteId)}
          >
            <ArrowRight className="mr-2 h-3.5 w-3.5" />
            Convert
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedRow ||
              !["SENT", "VIEWED"].includes(selectedStatus ?? "") ||
              actionsBlocked
            }
            onClick={() => selectedQuoteId && handleReject(selectedQuoteId)}
          >
            <XCircle className="mr-2 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedRow || actionsBlocked}
            onClick={() => selectedQuoteId && handleDuplicate(selectedQuoteId)}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selectedStatus !== "UNSENT" || actionsBlocked}
            onClick={() => selectedQuoteId && handleDelete(selectedQuoteId)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Registry grid (QUO-001, QUO-005) */}
      <PowersheetGrid
        surfaceId="quotes-registry"
        requirementIds={["QUO-WF-001", "QUO-WF-002"]}
        affordances={registryAffordances}
        title="Quotes Registry"
        description="Read-only registry of all quotes. Row selection drives inspector and workflow action context."
        rows={registryRows}
        columnDefs={columnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedQuoteId(row?.quoteId ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSelectionSummary}
        isLoading={quotesQuery.isLoading}
        errorMessage={quotesQuery.error?.message ?? null}
        emptyTitle="No quotes match"
        emptyDescription={
          searchTerm
            ? "Adjust search or clear the filter."
            : "Create your first quote with the New Quote button."
        }
        summary={
          <span>
            {registryRows.length} visible quotes · {stats.unsent} unsent ·{" "}
            {stats.sent} sent · {stats.converted} converted
          </span>
        }
        minHeight={360}
      />

      {/* Selected-row KPI cards */}
      {selectedRow && (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Client
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.clientName}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </div>
            <div className="mt-1">
              <QuoteStatusBadge status={selectedRow.status} />
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-sm font-medium font-mono">
              {formatCurrency(selectedRow.total)}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Expiry
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.expiryLabel}
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={registryKeyboardHints} className="text-xs" />
        }
      />

      {/* Inspector panel (QUO-008 through QUO-011) */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedQuoteId(null)}
        title={selectedRow?.orderNumber ?? "Quote Inspector"}
        subtitle={selectedRow?.clientName ?? "Select a quote"}
        headerActions={
          selectedRow ? <QuoteStatusBadge status={selectedRow.status} /> : null
        }
      >
        <QuoteInspectorContent
          quote={selectedQuote}
          clientName={selectedRow?.clientName ?? ""}
          onEdit={handleEdit}
          onSend={handleSend}
          onConvert={handleConvert}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onReject={handleReject}
        />
      </InspectorPanel>

      {/* Send dialog (QUO-013, QUO-014) */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote to Client</DialogTitle>
            <DialogDescription>
              Send this quote via email to the client. You can add an optional
              personalised message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="send-custom-message">
                Custom Message (optional)
              </Label>
              <Textarea
                id="send-custom-message"
                placeholder="Add a personal note to include with the quote email..."
                value={sendCustomMessage}
                onChange={e => setSendCustomMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              disabled={sendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedQuoteId) return;
                sendMutation.mutate({
                  id: selectedQuoteId,
                  sendEmail: true,
                  customMessage: sendCustomMessage || undefined,
                });
              }}
              disabled={sendMutation.isPending || !selectedQuoteId}
            >
              {sendMutation.isPending ? (
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

      {/* Convert dialog (QUO-015, QUO-016) — BUG-009: explicit aria-describedby */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent aria-describedby="quote-convert-description">
          <DialogHeader>
            <DialogTitle>Convert Quote to Sales Order?</DialogTitle>
            <DialogDescription id="quote-convert-description">
              This will create a new sales order from the quote and mark it as
              converted. Inventory will be reserved. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={convertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedQuoteId) return;
                convertMutation.mutate({ quoteId: selectedQuoteId });
              }}
              disabled={convertMutation.isPending || !selectedQuoteId}
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                "Convert to Sales Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog (QUO-018) */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Quote?"
        description="Are you sure you want to delete this quote? This action cannot be undone."
        confirmLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={() => {
          if (!selectedQuoteId) return;
          deleteMutation.mutate({ id: selectedQuoteId });
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Reject dialog (QUO-026 — new capability) */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Mark this quote as rejected. Optionally provide a reason — it will
              be appended to the quote notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Explain why this quote is being rejected..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedQuoteId) return;
                rejectMutation.mutate({
                  id: selectedQuoteId,
                  reason: rejectReason || undefined,
                });
              }}
              disabled={rejectMutation.isPending || !selectedQuoteId}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuotesPilotSurface;
