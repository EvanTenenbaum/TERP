/**
 * ReturnsPilotSurface — sheet-native surface for Returns (TER-819)
 *
 * Family: Table + Support Cards (hybrid — composition dialog preserved)
 *
 * Layout:
 *   1. Stats summary band (RET-005, RET-029)
 *   2. Search bar + action buttons
 *   3. PowersheetGrid — returns queue (read-only, RET-001)
 *   4. Sidecar cards: Approve (RET-017), Reject (RET-018), Receive (RET-019)
 *      NOTE: RET-020 (process/credit) is intentionally excluded — DISC-RET-001
 *            (double-credit risk) must be resolved before process sidecar is built.
 *   5. WorkSurfaceStatusBar + KeyboardHintBar
 *   6. InspectorPanel — return detail (RET-022, RET-016 GL status)
 *   7. Return composition dialog (RET-007 through RET-015, preserved as sidecar)
 *
 * Accepted limitations:
 *   - RET-002: Status filter enabled (DISC-RET-002 resolved — dedicated status column)
 *   - RET-004: Client ID filter blocked (schema migration needed)
 *   - RET-020: Process/credit sidecar deferred — DISC-RET-001 unresolved
 *   - RET-021: Cancel procedure not yet in router — deferred
 *   - RET-024/025: Vendor return path has no UI — adopt-no-ui
 *   - RET-006: Monthly trend chart — P2, deferred
 */

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  CheckCircle,
  PackageX,
  Plus,
  RefreshCw,
  SquareArrowOutUpRight,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReturnGLStatus } from "@/components/accounting/GLReversalStatus";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ============================================================================
// Types
// ============================================================================

type ReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CUSTOMER_CHANGED_MIND"
  | "OTHER";

type ExpectedCondition = "SELLABLE" | "DAMAGED" | "DESTROYED";

const EXPECTED_CONDITIONS: { value: ExpectedCondition; label: string }[] = [
  { value: "SELLABLE", label: "Sellable" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "DESTROYED", label: "Destroyed" },
];

const RETURN_REASONS: ReturnReason[] = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
];

const isReturnReason = (value: string): value is ReturnReason =>
  RETURN_REASONS.includes(value as ReturnReason);

interface OrderLineItemOption {
  id: number;
  batchId: number;
  quantity: string;
  unitPrice?: string;
  productDisplayName?: string | null;
}

// Row type for the queue grid
interface ReturnQueueRow {
  identity: { rowKey: string };
  returnId: number;
  orderId: number;
  returnNumber: string;
  returnReason: string;
  processedBy: number;
  processedAt: string;
  notes: string | null;
  derivedStatus:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "RECEIVED"
    | "PROCESSED"
    | "CANCELLED";
}

// ============================================================================
// Status parsing
// ============================================================================

/**
 * Legacy fallback: derive workflow status from notes bracket markers.
 * DISC-RET-002: Prefer the dedicated `status` column; this is kept for pre-migration rows.
 * Terminal states take precedence (CANCELLED, REJECTED, PROCESSED).
 */
function extractWorkflowStatus(
  notes: string | null
): ReturnQueueRow["derivedStatus"] {
  if (!notes) return "PENDING";
  // Terminal states first
  if (notes.includes("[CANCELLED")) return "CANCELLED";
  if (notes.includes("[PROCESSED")) return "PROCESSED";
  if (notes.includes("[REJECTED")) return "REJECTED";
  // Intermediate states
  if (notes.includes("[RECEIVED")) return "RECEIVED";
  if (notes.includes("[APPROVED")) return "APPROVED";
  return "PENDING";
}

/**
 * Map workflow status to GL-relevant status (subset accepted by ReturnGLStatus).
 * DISC-RET-006: Client-side GL status derivation — no shared server code.
 */
function deriveGLStatus(
  statusOrNotes: string | null,
  notes?: string | null
): "PENDING" | "APPROVED" | "PROCESSED" | "CANCELLED" {
  // DISC-RET-002: If first arg is a known status value, use it directly; otherwise parse notes
  const knownStatuses = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "RECEIVED",
    "PROCESSED",
    "CANCELLED",
  ];
  const status =
    statusOrNotes && knownStatuses.includes(statusOrNotes)
      ? (statusOrNotes as ReturnQueueRow["derivedStatus"])
      : extractWorkflowStatus(notes ?? statusOrNotes);
  if (status === "CANCELLED" || status === "REJECTED") return "CANCELLED";
  if (status === "PROCESSED") return "PROCESSED";
  if (status === "RECEIVED" || status === "APPROVED") return "APPROVED";
  return "PENDING";
}

const STATUS_BADGES: Record<
  ReturnQueueRow["derivedStatus"],
  { label: string; variant: "outline" | "secondary" | "destructive" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "secondary" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  RECEIVED: { label: "Received", variant: "secondary" },
  PROCESSED: { label: "Processed", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

// ============================================================================
// Constants
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

const queueAffordances: PowersheetAffordance[] = [
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
// Data mapping
// ============================================================================

interface ReturnListItem {
  id: number;
  orderId: number;
  returnReason: string;
  status: string; // DISC-RET-002: dedicated column
  processedBy: number;
  processedAt: string | Date;
  notes: string | null;
}

function mapReturnsToQueueRows(items: ReturnListItem[]): ReturnQueueRow[] {
  return items.map(item => ({
    identity: { rowKey: `return:${item.id}` },
    returnId: item.id,
    orderId: item.orderId,
    returnNumber: `RET-${item.id}`,
    returnReason: item.returnReason,
    processedBy: item.processedBy,
    processedAt:
      item.processedAt instanceof Date
        ? item.processedAt.toISOString()
        : item.processedAt,
    notes: item.notes,
    derivedStatus:
      (item.status as ReturnQueueRow["derivedStatus"]) ??
      extractWorkflowStatus(item.notes),
  }));
}

// ============================================================================
// Format helpers
// ============================================================================

const formatDate = (value: string | Date | null): string => {
  if (!value) return "-";
  const parsed = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
};

// ============================================================================
// Sub-components: sidecar action cards
// ============================================================================

interface ApproveCardProps {
  returnId: number;
  returnNumber: string;
  currentStatus: ReturnQueueRow["derivedStatus"];
  onSuccess: () => void;
}

function ApproveCard({
  returnId,
  returnNumber,
  currentStatus,
  onSuccess,
}: ApproveCardProps) {
  const [approvalNotes, setApprovalNotes] = useState("");
  const canApprove = currentStatus === "PENDING";

  const approveMutation = trpc.returns.approve.useMutation({
    onSuccess: () => {
      toast.success(`${returnNumber} approved`);
      setApprovalNotes("");
      onSuccess();
    },
    onError: error => {
      toast.error(error.message || "Failed to approve return");
    },
  });

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm font-semibold">Approve Return</span>
        <Badge variant="outline" className="ml-auto text-xs">
          RET-017
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Mark return as approved. Required before items can be received.
      </p>
      {!canApprove && (
        <p className="text-xs text-muted-foreground italic">
          Approval only available for Pending returns. Current status:{" "}
          {currentStatus}
        </p>
      )}
      {canApprove && (
        <div className="space-y-2">
          <Label htmlFor="approvalNotes" className="text-xs">
            Approval notes (optional)
          </Label>
          <Textarea
            id="approvalNotes"
            value={approvalNotes}
            onChange={e => setApprovalNotes(e.target.value)}
            placeholder="Add approval notes..."
            rows={2}
            className="text-sm"
          />
        </div>
      )}
      <Button
        size="sm"
        className="w-full"
        disabled={!canApprove || approveMutation.isPending}
        onClick={() => {
          approveMutation.mutate({
            id: returnId,
            approvalNotes: approvalNotes || undefined,
          });
        }}
      >
        {approveMutation.isPending ? "Approving..." : "Approve"}
      </Button>
    </div>
  );
}

interface RejectCardProps {
  returnId: number;
  returnNumber: string;
  currentStatus: ReturnQueueRow["derivedStatus"];
  onSuccess: () => void;
}

function RejectCard({
  returnId,
  returnNumber,
  currentStatus,
  onSuccess,
}: RejectCardProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const canReject = currentStatus === "PENDING";

  const rejectMutation = trpc.returns.reject.useMutation({
    onSuccess: () => {
      toast.success(`${returnNumber} rejected`);
      setRejectionReason("");
      setShowConfirm(false);
      onSuccess();
    },
    onError: error => {
      toast.error(error.message || "Failed to reject return");
      setShowConfirm(false);
    },
  });

  return (
    <>
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold">Reject Return</span>
          <Badge variant="outline" className="ml-auto text-xs">
            RET-018
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Reject the return request. Rejection is final and cannot be reversed.
        </p>
        {!canReject && (
          <p className="text-xs text-muted-foreground italic">
            Rejection only available for Pending returns. Current status:{" "}
            {currentStatus}
          </p>
        )}
        {canReject && (
          <div className="space-y-2">
            <Label htmlFor="rejectionReason" className="text-xs">
              Rejection reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="w-full"
          disabled={
            !canReject || !rejectionReason.trim() || rejectMutation.isPending
          }
          onClick={() => setShowConfirm(true)}
        >
          {rejectMutation.isPending ? "Rejecting..." : "Reject"}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={open => !open && setShowConfirm(false)}
        title="Reject Return?"
        description={`Reject ${returnNumber}? This cannot be undone. Reason: "${rejectionReason}"`}
        confirmLabel="Reject Return"
        variant="destructive"
        onConfirm={() => {
          rejectMutation.mutate({ id: returnId, rejectionReason });
        }}
      />
    </>
  );
}

interface ReceiveCardProps {
  returnId: number;
  returnNumber: string;
  currentStatus: ReturnQueueRow["derivedStatus"];
  returnItems: Array<{ batchId: number; quantity: string }>;
  onSuccess: () => void;
}

type ItemCondition = "SELLABLE" | "DAMAGED" | "QUARANTINE" | "DESTROYED";

const ITEM_CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "SELLABLE", label: "Sellable" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "QUARANTINE", label: "Quarantine" },
  { value: "DESTROYED", label: "Destroyed" },
];

function ReceiveCard({
  returnId,
  returnNumber,
  currentStatus,
  returnItems,
  onSuccess,
}: ReceiveCardProps) {
  const canReceive = currentStatus === "APPROVED";

  const [receivedItems, setReceivedItems] = useState<
    Array<{
      batchId: number;
      receivedQuantity: string;
      actualCondition: ItemCondition;
      notes: string;
    }>
  >(
    returnItems.map(item => ({
      batchId: item.batchId,
      receivedQuantity: item.quantity,
      actualCondition: "SELLABLE" as ItemCondition,
      notes: "",
    }))
  );

  const receiveMutation = trpc.returns.receive.useMutation({
    onSuccess: () => {
      toast.success(`${returnNumber} items received`);
      onSuccess();
    },
    onError: error => {
      toast.error(error.message || "Failed to receive return items");
    },
  });

  const updateItem = (
    index: number,
    field: "receivedQuantity" | "actualCondition" | "notes",
    value: string
  ) => {
    setReceivedItems(prev => {
      const updated = [...prev];
      if (field === "actualCondition") {
        updated[index] = {
          ...updated[index],
          actualCondition: value as ItemCondition,
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  if (!canReceive) {
    return (
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <PackageX className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Receive Items</span>
          <Badge variant="outline" className="ml-auto text-xs">
            RET-019
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Receive only available for Approved returns. Current status:{" "}
          {currentStatus}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <PackageX className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold">Receive Items</span>
        <Badge variant="outline" className="ml-auto text-xs">
          RET-019
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Record physical receipt of returned items. Condition determines restock
        path.
      </p>

      {receivedItems.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No items to receive for this return.
        </p>
      )}

      <div className="space-y-3">
        {receivedItems.map((item, index) => (
          <div
            key={`receive-item-${item.batchId}`}
            className="rounded border border-border/50 p-3 space-y-2 bg-muted/20"
          >
            <div className="text-xs font-medium">Batch #{item.batchId}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Qty received</Label>
                <Input
                  type="number"
                  value={item.receivedQuantity}
                  onChange={e =>
                    updateItem(index, "receivedQuantity", e.target.value)
                  }
                  className="text-sm h-8"
                  min="0"
                />
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Select
                  value={item.actualCondition}
                  onValueChange={value =>
                    updateItem(index, "actualCondition", value)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CONDITIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={item.notes}
                onChange={e => updateItem(index, "notes", e.target.value)}
                placeholder="Condition notes..."
                className="text-sm h-8"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={receivedItems.length === 0 || receiveMutation.isPending}
        onClick={() => {
          receiveMutation.mutate({
            id: returnId,
            receivedItems: receivedItems.map(item => ({
              batchId: item.batchId,
              receivedQuantity: item.receivedQuantity,
              actualCondition: item.actualCondition,
              notes: item.notes || undefined,
            })),
          });
        }}
      >
        {receiveMutation.isPending ? "Recording receipt..." : "Record Receipt"}
      </Button>
    </div>
  );
}

// ============================================================================
// Main surface
// ============================================================================

interface ReturnsPilotSurfaceProps {
  onOpenClassic: () => void;
}

export function ReturnsPilotSurface({
  onOpenClassic,
}: ReturnsPilotSurfaceProps) {
  const { selectedId: selectedReturnId, setSelectedId: setSelectedReturnId } =
    useSpreadsheetSelectionParam("returnId");

  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectionSummary, setSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Composition dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason | "">("");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<
    Array<{
      batchId: number;
      quantity: string;
      reason?: string;
      expectedCondition?: ExpectedCondition;
    }>
  >([]);
  const [restockInventory, setRestockInventory] = useState(true);
  const [deleteReturnItemConfirm, setDeleteReturnItemConfirm] = useState<
    number | null
  >(null);

  // Query: returns list (RET-001, pagination support)
  const returnsQuery = trpc.returns.list.useQuery({
    limit: PAGE_SIZE,
    offset,
  });

  // Query: stats summary (RET-005, RET-029)
  const statsQuery = trpc.returns.getStats.useQuery();

  // Query: order details for composition dialog (RET-008)
  const orderDetailsQuery = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  // Query: detail for selected return (RET-022)
  const selectedReturnDetailQuery = trpc.returns.getById.useQuery(
    { id: selectedReturnId ?? 0 },
    { enabled: !!selectedReturnId }
  );

  // Mutation: create return (RET-015)
  const createReturnMutation = trpc.returns.create.useMutation({
    onSuccess: () => {
      toast.success("Return processed successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      void returnsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Error processing return");
    },
  });

  const resetForm = () => {
    setOrderIdInput("");
    setSelectedOrderId(null);
    setReturnReason("");
    setNotes("");
    setReturnItems([]);
    setRestockInventory(true);
  };

  // Map API data to queue rows
  const rawItems = useMemo(() => {
    const data = returnsQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if ("items" in data && Array.isArray(data.items)) return data.items;
    return [];
  }, [returnsQuery.data]);

  const searchLower = searchTerm.trim().toLowerCase();

  const allQueueRows = useMemo(
    () => mapReturnsToQueueRows(rawItems),
    [rawItems]
  );

  const queueRows = useMemo(
    () =>
      !searchLower
        ? allQueueRows
        : allQueueRows.filter(
            row =>
              (row.returnNumber ?? "").toLowerCase().includes(searchLower) ||
              String(row.orderId).includes(searchLower) ||
              (row.returnReason ?? "").toLowerCase().includes(searchLower) ||
              (row.derivedStatus ?? "").toLowerCase().includes(searchLower)
          ),
    [allQueueRows, searchLower]
  );

  const selectedRow =
    queueRows.find(row => row.returnId === selectedReturnId) ?? null;

  // Column definitions — read-only queue grid
  const columnDefs = useMemo<ColDef<ReturnQueueRow>[]>(
    () => [
      {
        field: "returnNumber",
        headerName: "Return",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "orderId",
        headerName: "Order",
        minWidth: 90,
        maxWidth: 110,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => `#${String(params.value ?? "")}`,
      },
      {
        field: "returnReason",
        headerName: "Reason",
        flex: 1,
        minWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "derivedStatus",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          STATUS_BADGES[params.value as ReturnQueueRow["derivedStatus"]]
            ?.label ?? String(params.value ?? ""),
      },
      {
        field: "processedAt",
        headerName: "Date",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatDate(params.value as string | null),
      },
      {
        field: "processedBy",
        headerName: "By",
        minWidth: 80,
        maxWidth: 100,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => `#${String(params.value ?? "")}`,
      },
    ],
    []
  );

  // Composition dialog handlers
  const handleOrderIdChange = (value: string) => {
    setOrderIdInput(value);
    const orderId = parseInt(value, 10);
    if (!isNaN(orderId) && orderId > 0) {
      setSelectedOrderId(orderId);
      setReturnItems([]);
    } else {
      setSelectedOrderId(null);
    }
  };

  const addOrderItemToReturn = (lineItem: OrderLineItemOption) => {
    const exists = returnItems.some(item => item.batchId === lineItem.batchId);
    if (exists) {
      toast.warning("Item already added to return");
      return;
    }
    setReturnItems(prev => [
      ...prev,
      {
        batchId: lineItem.batchId,
        quantity: lineItem.quantity.toString(),
        reason: "",
        expectedCondition: undefined,
      },
    ]);
  };

  const updateReturnItem = (
    index: number,
    field: "quantity" | "reason" | "expectedCondition",
    value: string
  ) => {
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeReturnItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateReturn = () => {
    if (!selectedOrderId || !returnReason || returnItems.length === 0) {
      toast.error(
        "Please fill in all required fields and select at least one item"
      );
      return;
    }

    createReturnMutation.mutate({
      orderId: selectedOrderId,
      items: returnItems.map(item => ({
        batchId: item.batchId,
        quantity: item.quantity,
        reason: item.reason || undefined,
        expectedCondition: item.expectedCondition || undefined,
      })),
      reason: returnReason,
      notes,
      restockInventory,
    });
  };

  const handleWorkflowSuccess = () => {
    void returnsQuery.refetch();
    void selectedReturnDetailQuery.refetch();
  };

  // Extract return items for receive card from selected return detail
  const selectedReturnItems = useMemo(() => {
    const detail = selectedReturnDetailQuery.data;
    if (!detail) return [];
    const rawItems = detail.items as
      | Array<{ batchId: number; quantity: string }>
      | null
      | undefined;
    if (!Array.isArray(rawItems)) return [];
    return rawItems;
  }, [selectedReturnDetailQuery.data]);

  // Status bar content
  const totalCount =
    "total" in (returnsQuery.data ?? {})
      ? ((returnsQuery.data as { total?: number }).total ?? allQueueRows.length)
      : allQueueRows.length;

  const statusBarLeft = (
    <span>
      {queueRows.length} visible ·{" "}
      {selectionSummary
        ? `${selectionSummary.selectedCellCount} cells / ${selectionSummary.selectedRowCount} rows selected · `
        : ""}
      page {Math.floor(offset / PAGE_SIZE) + 1}
    </span>
  );

  const statusBarCenter = selectedRow ? (
    <span>
      {selectedRow.returnNumber} · Order #{selectedRow.orderId} ·{" "}
      {STATUS_BADGES[selectedRow.derivedStatus]?.label ??
        selectedRow.derivedStatus}
    </span>
  ) : (
    <span>Select a return to load workflow actions and detail</span>
  );

  const stats = statsQuery.data;

  return (
    <div className="flex flex-col gap-2">
      {/* Stats summary band — RET-005, RET-029 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <PackageX className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Total Returns
              </span>
            </div>
            <p className="text-2xl font-bold">{stats.totalReturns}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Defective
              </span>
            </div>
            <p className="text-2xl font-bold">{stats.defectiveCount}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-4 py-3">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium block mb-1">
              Reason Breakdown
            </span>
            <div className="text-xs space-y-0.5 text-muted-foreground">
              <div>Wrong Item: {stats.wrongItemCount}</div>
              <div>Not As Described: {stats.notAsDescribedCount}</div>
              <div>Changed Mind: {stats.customerChangedMindCount}</div>
              <div>Other: {stats.otherCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search bar + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search return, order, reason, or status"
          className="max-w-sm"
        />
        <Badge variant="outline">Sheet-native Returns</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="Refresh returns data"
            onClick={() => {
              void returnsQuery.refetch();
              void statsQuery.refetch();
              void selectedReturnDetailQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Process Return
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpenClassic}>
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic
          </Button>
        </div>
      </div>

      {/* Returns queue grid — RET-001 */}
      <PowersheetGrid
        surfaceId="returns-queue"
        requirementIds={["RET-001", "RET-003"]}
        releaseGateIds={[
          "RET-001",
          "RET-005",
          "RET-016",
          "RET-017",
          "RET-018",
          "RET-019",
        ]}
        affordances={queueAffordances}
        title="Returns Queue"
        description="Read-only queue. Select a row to load workflow cards and inspector detail. Composition dialog opens via Process Return."
        rows={queueRows}
        columnDefs={columnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedReturnId(row?.returnId ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSelectionSummary}
        isLoading={returnsQuery.isLoading}
        errorMessage={returnsQuery.error?.message ?? null}
        emptyTitle="No returns match"
        emptyDescription="Adjust the search or process a new return."
        summary={
          <span>
            {queueRows.length} visible · {totalCount} total
          </span>
        }
        antiDriftSummary="Returns queue: status parsing via bracket markers, workflow actions scoped to focused row."
        minHeight={320}
      />

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {Math.floor(offset / PAGE_SIZE) + 1} /{" "}
            {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={offset + PAGE_SIZE >= totalCount}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Workflow sidecar cards — shown when a return is selected */}
      {selectedRow && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* RET-017: Approve */}
          <ApproveCard
            returnId={selectedRow.returnId}
            returnNumber={selectedRow.returnNumber}
            currentStatus={selectedRow.derivedStatus}
            onSuccess={handleWorkflowSuccess}
          />
          {/* RET-018: Reject */}
          <RejectCard
            returnId={selectedRow.returnId}
            returnNumber={selectedRow.returnNumber}
            currentStatus={selectedRow.derivedStatus}
            onSuccess={handleWorkflowSuccess}
          />
          {/* RET-019: Receive — key forces state reset on return change (RET-P3-B) */}
          <ReceiveCard
            key={selectedRow.returnId}
            returnId={selectedRow.returnId}
            returnNumber={selectedRow.returnNumber}
            currentStatus={selectedRow.derivedStatus}
            returnItems={selectedReturnItems}
            onSuccess={handleWorkflowSuccess}
          />
        </div>
      )}

      {/*
        RET-020 (process/credit sidecar) is intentionally excluded.
        DISC-RET-001: returns.create and returns.process both issue credit memos
        independently. Building the process sidecar before this is resolved creates
        a double-credit risk surface. Deferred to GF-012 resolution.
      */}

      {/* Status bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* Inspector panel — RET-022, RET-016 GL status */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedReturnId(null)}
        title={selectedRow?.returnNumber ?? "Inspector"}
        subtitle={selectedRow ? `Order #${selectedRow.orderId}` : undefined}
        headerActions={
          selectedRow ? (
            <Badge
              variant={
                STATUS_BADGES[selectedRow.derivedStatus]?.variant ?? "outline"
              }
            >
              {STATUS_BADGES[selectedRow.derivedStatus]?.label ??
                selectedRow.derivedStatus}
            </Badge>
          ) : null
        }
      >
        {selectedRow && (
          <div className="space-y-4">
            <InspectorSection title="Return Context">
              <InspectorField label="Return">
                <p>{selectedRow.returnNumber}</p>
              </InspectorField>
              <InspectorField label="Order">
                <p>Order #{selectedRow.orderId}</p>
              </InspectorField>
              <InspectorField label="Reason">
                <p>{selectedRow.returnReason}</p>
              </InspectorField>
              <InspectorField label="Status">
                <p>
                  {STATUS_BADGES[selectedRow.derivedStatus]?.label ??
                    selectedRow.derivedStatus}
                </p>
              </InspectorField>
              <InspectorField label="Processed">
                <p>{formatDate(selectedRow.processedAt)}</p>
              </InspectorField>
              <InspectorField label="Notes">
                <p className="text-xs whitespace-pre-wrap break-words">
                  {selectedRow.notes || "—"}
                </p>
              </InspectorField>
            </InspectorSection>

            {/* GL status — RET-016 */}
            <InspectorSection title="GL Status">
              <ReturnGLStatus
                returnId={selectedRow.returnId}
                returnNumber={selectedRow.returnNumber}
                status={deriveGLStatus(
                  selectedRow.derivedStatus,
                  selectedRow.notes
                )}
                processedAt={new Date(selectedRow.processedAt)}
                reason={selectedRow.returnReason}
              />
            </InspectorSection>

            {/* Return detail items — RET-022 */}
            {selectedReturnDetailQuery.isLoading && (
              <InspectorSection title="Items">
                <p className="text-xs text-muted-foreground">Loading...</p>
              </InspectorSection>
            )}
            {selectedReturnItems.length > 0 && (
              <InspectorSection title="Items">
                {selectedReturnItems.map(item => (
                  <InspectorField
                    key={`insp-item-${item.batchId}`}
                    label={`Batch #${item.batchId}`}
                  >
                    <p>Qty: {item.quantity}</p>
                  </InspectorField>
                ))}
              </InspectorSection>
            )}
          </div>
        )}
        footer=
        {selectedRow ? (
          <Button variant="outline" className="w-full" onClick={onOpenClassic}>
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Open Classic Returns
          </Button>
        ) : null}
      </InspectorPanel>

      {/* Return composition dialog — RET-007 through RET-015 (preserved) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
              Process a customer return and optionally restock inventory.
              Restock decision is irreversible at create time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* RET-008: Order context load */}
            <div>
              <Label htmlFor="orderId">Order ID *</Label>
              <Input
                id="orderId"
                type="number"
                value={orderIdInput}
                onChange={e => handleOrderIdChange(e.target.value)}
                placeholder="Enter order ID"
              />
              {selectedOrderId && orderDetailsQuery.data && (
                <div className="mt-2 p-3 bg-accent rounded-lg">
                  <div className="font-medium">
                    Order #
                    {orderDetailsQuery.data.order.orderNumber ||
                      orderDetailsQuery.data.order.id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Client ID: {orderDetailsQuery.data.order.clientId || "N/A"}{" "}
                    · Total: $
                    {parseFloat(
                      orderDetailsQuery.data.order.total || "0"
                    ).toFixed(2)}
                  </div>
                </div>
              )}
              {selectedOrderId && !orderDetailsQuery.data && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    Loading order details...
                  </div>
                </div>
              )}
            </div>

            {/* RET-009: Line-item selection */}
            {orderDetailsQuery.data?.lineItems &&
              orderDetailsQuery.data.lineItems.length > 0 && (
                <div>
                  <Label>Select Items to Return</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {orderDetailsQuery.data.lineItems.map(
                      (lineItem: OrderLineItemOption) => {
                        const isSelected = returnItems.some(
                          item => item.batchId === lineItem.batchId
                        );
                        return (
                          <div
                            key={lineItem.id}
                            className={`p-2 border rounded cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent"
                            }`}
                            onClick={() =>
                              !isSelected && addOrderItemToReturn(lineItem)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {lineItem.productDisplayName ||
                                    `Batch #${lineItem.batchId}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Qty: {lineItem.quantity} × $
                                  {Number.parseFloat(
                                    lineItem.unitPrice ?? "0"
                                  ).toFixed(2)}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="text-sm text-primary font-medium">
                                  Added
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

            {/* RET-012: Return reason code */}
            <div>
              <Label htmlFor="returnReason">Return Reason *</Label>
              <Select
                value={returnReason}
                onValueChange={value => {
                  if (isReturnReason(value)) {
                    setReturnReason(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFECTIVE">Defective</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="NOT_AS_DESCRIBED">
                    Not As Described
                  </SelectItem>
                  <SelectItem value="CUSTOMER_CHANGED_MIND">
                    Customer Changed Mind
                  </SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* RET-014: Return notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes about the return"
                rows={3}
              />
            </div>

            {/* RET-013: Restock decision — irreversible, must be explicit */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restockInventory"
                  checked={restockInventory}
                  onCheckedChange={checked =>
                    setRestockInventory(checked as boolean)
                  }
                />
                <Label
                  htmlFor="restockInventory"
                  className="cursor-pointer font-medium"
                >
                  Restock inventory automatically
                </Label>
              </div>
              <p className="text-xs text-amber-800">
                This decision is irreversible at create time. Enable only if
                returned items should be immediately returned to available
                inventory.
              </p>
            </div>

            {/* RET-010, RET-011: Per-item quantity override and reason */}
            {returnItems.length > 0 && (
              <div>
                <Label>Return Items ({returnItems.length})</Label>
                <div className="mt-2 space-y-2">
                  {returnItems.map((item, index) => {
                    const lineItem = orderDetailsQuery.data?.lineItems?.find(
                      (li: OrderLineItemOption) => li.batchId === item.batchId
                    );
                    return (
                      <div
                        key={`dialog-item-${item.batchId}`}
                        className="p-2 border rounded-lg space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {lineItem?.productDisplayName ||
                                `Batch #${item.batchId}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteReturnItemConfirm(index)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="text"
                            placeholder="Item reason (optional)"
                            value={item.reason || ""}
                            onChange={e =>
                              updateReturnItem(index, "reason", e.target.value)
                            }
                            className="flex-1 text-sm"
                          />
                          <Select
                            value={item.expectedCondition ?? ""}
                            onValueChange={value =>
                              updateReturnItem(
                                index,
                                "expectedCondition",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-[140px] text-sm">
                              <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPECTED_CONDITIONS.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {returnItems.length === 0 && selectedOrderId && (
              <p className="text-sm text-muted-foreground">
                Select items from the order above to add them to the return.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={createReturnMutation.isPending}
            >
              {createReturnMutation.isPending
                ? "Processing..."
                : "Process Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RET-028: Remove item confirmation */}
      <ConfirmDialog
        open={deleteReturnItemConfirm !== null}
        onOpenChange={open => !open && setDeleteReturnItemConfirm(null)}
        title="Remove Return Item"
        description="Are you sure you want to remove this item from the return?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteReturnItemConfirm !== null) {
            removeReturnItem(deleteReturnItemConfirm);
          }
          setDeleteReturnItemConfirm(null);
        }}
      />
    </div>
  );
}

export default ReturnsPilotSurface;
