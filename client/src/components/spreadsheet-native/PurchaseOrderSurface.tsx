/**
 * PurchaseOrderSurface — Unified sheet-native surface for Purchase Orders
 *
 * TER-976: Replaces PurchaseOrdersPilotSurface with a cleaner layout following
 * the InventoryManagementSurface pattern (toolbar -> action bar -> grid -> cards -> status bar).
 *
 * Queue mode (default) — this file.
 * Creation mode — Task 4 (placeholder for now).
 *
 * Layout:
 *   1. Toolbar — title, status count badges, "+ New PO", Export CSV
 *   2. Action Bar — search, status filter, context hint
 *   3. PowersheetGrid — PO queue (cell-range, read-only)
 *   4. Selected-PO KPI cards (4-up)
 *   5. PowersheetGrid — PO line items (support grid)
 *   6. WorkSurfaceStatusBar + KeyboardHintBar
 *   7. InspectorPanel — PO detail
 *   8. ConfirmDialogs — delete, status change, receiving handoff
 */

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useExport } from "@/hooks/work-surface/useExport";
import type { ExportColumn } from "@/hooks/work-surface/useExport";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import {
  ArrowLeft,
  Building,
  Download,
  Package,
  Plus,
  Pencil,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
import { useAuth } from "@/hooks/useAuth";
import {
  createProductIntakeDraftFromPO,
  upsertProductIntakeDraft,
} from "@/lib/productIntakeDrafts";
import type { ProductIntakeDraftLine } from "@/lib/productIntakeDrafts";
import {
  createDefaultPoDocument,
  createEmptyLineItem,
  createLineItemFromProduct,
  validatePoDocument,
  buildCreatePayload,
  getLineTotal,
  getDocumentTotal,
  type PoDocumentState,
  type PoLineItem,
} from "@/hooks/usePoDocument";
import { ProductBrowserGrid } from "./ProductBrowserGrid";
import type { AddProductPayload } from "./ProductBrowserGrid";
import { parsePurchaseOrderDeepLink } from "@/components/uiux-slice/purchaseOrdersDeepLink";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import type { SupplierOption } from "@/components/ui/supplier-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type POStatus =
  | "DRAFT"
  | "SENT"
  | "CONFIRMED"
  | "RECEIVING"
  | "RECEIVED"
  | "CANCELLED";

type CogsMode = "FIXED" | "RANGE";

interface POQueueRecord {
  id: number;
  poNumber: string;
  supplierClientId: number | null;
  vendorId?: number | null;
  purchaseOrderStatus: string;
  orderDate: Date | string;
  expectedDeliveryDate?: Date | string | null;
  total: string | number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdAt?: Date | string | null;
}

interface POLineItem {
  id: number;
  productId: number;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  quantityOrdered: string | number;
  quantityReceived?: string | number | null;
  cogsMode?: CogsMode | null;
  unitCost: string | number;
  unitCostMin?: string | number | null;
  unitCostMax?: string | number | null;
  totalCost?: string | number | null;
  notes?: string | null;
}

interface POQueueRow {
  identity: { rowKey: string; entityId: number | string; entityType: string };
  poId: number;
  poNumber: string;
  supplierName: string;
  status: string;
  statusLabel: string;
  orderDate: Date | string;
  expectedDeliveryDate: Date | string;
  total: number;
  paymentTerms: string;
  isReceivable: boolean;
  isDraft: boolean;
}

interface POLineRow {
  identity: { rowKey: string; entityId: number | string; entityType: string };
  lineId: number;
  productName: string;
  category: string;
  quantityOrdered: number;
  quantityReceived: number;
  cogsMode: string;
  unitCost: number;
  unitCostDisplay: string;
  lineTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  CONFIRMED: "Confirmed",
  RECEIVING: "Receiving",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const RECEIVABLE_STATUSES = new Set(["CONFIRMED", "RECEIVING"]);

const PO_ALLOWED_TRANSITIONS: Record<string, POStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECEIVING", "CANCELLED"],
  RECEIVING: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Enter", label: "focus selection" },
  { key: "Esc", label: "clear dialogs" },
];

const surfacePanelClass =
  "rounded-xl border border-border/70 bg-card/80 shadow-sm";

const queueAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: false },
  { label: "Copy", available: false },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

const supportAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPaginatedData<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.items)) return obj.items as T[];
  return [];
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  } catch {
    return "-";
  }
};

const formatAgeLabel = (value: Date | string | null | undefined): string => {
  if (!value) return "-";
  try {
    const d = value instanceof Date ? value : new Date(value);
    const ms = Date.now() - d.getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days === 0) return "today";
    if (days === 1) return "1d";
    return `${days}d`;
  } catch {
    return "-";
  }
};

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isPastExpectedDate(
  value: Date | string | null | undefined,
  currentStatus?: string
) {
  if (!value || currentStatus === "RECEIVED" || currentStatus === "CANCELLED") {
    return false;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(parsed);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}

function getExpectedDeliveryLabel(
  value: Date | string | null | undefined,
  currentStatus?: string
) {
  if (!value || value === "") return "Not set";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";

  const base = formatDate(parsed);
  const today = new Date();

  if (isSameCalendarDay(parsed, today)) {
    return `${base} · Today`;
  }

  if (isPastExpectedDate(parsed, currentStatus)) {
    return `${base} · Late`;
  }

  return base;
}

function isExpectedToday(
  value: Date | string | null | undefined,
  currentStatus?: string
) {
  if (!value || currentStatus === "RECEIVED" || currentStatus === "CANCELLED") {
    return false;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  return isSameCalendarDay(parsed, new Date());
}

function buildRowKey(entityType: string, id: number): string {
  return `${entityType}:${id}`;
}

function hasExpectedDeliveryDate(
  value: Date | string | null | undefined
): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
}

function mapPOsToQueueRows(
  pos: POQueueRecord[],
  supplierNamesById: Map<number, string>
): POQueueRow[] {
  return pos.map(po => {
    const supplierId = po.supplierClientId ?? null;
    const supplierName =
      supplierId !== null
        ? (supplierNamesById.get(supplierId) ?? "Unknown Supplier")
        : "Unknown Supplier";
    const status = po.purchaseOrderStatus;
    const total = toNumber(po.total);
    return {
      identity: {
        rowKey: buildRowKey("po", po.id),
        entityId: po.id,
        entityType: "po",
      },
      poId: po.id,
      poNumber: po.poNumber,
      supplierName,
      status,
      statusLabel: PO_STATUS_LABELS[status] ?? status,
      orderDate: po.orderDate ?? "",
      expectedDeliveryDate: po.expectedDeliveryDate ?? "",
      total,
      paymentTerms: po.paymentTerms ?? "-",
      isReceivable: RECEIVABLE_STATUSES.has(status),
      isDraft: status === "DRAFT",
    };
  });
}

function mapLineItemsToRows(items: POLineItem[]): POLineRow[] {
  return items.map(item => {
    const cogsMode = item.cogsMode ?? "FIXED";
    const unitCost = toNumber(item.unitCost);
    const unitCostMin = toNumber(item.unitCostMin);
    const unitCostMax = toNumber(item.unitCostMax);
    const unitCostDisplay =
      cogsMode === "RANGE"
        ? `${formatCurrency(unitCostMin)}\u2013${formatCurrency(unitCostMax)}`
        : formatCurrency(unitCost);
    const quantityOrdered = toNumber(item.quantityOrdered);
    const effectiveUnitCost =
      cogsMode === "RANGE" ? (unitCostMin + unitCostMax) / 2 : unitCost;
    const lineTotal = quantityOrdered * effectiveUnitCost;
    return {
      identity: {
        rowKey: buildRowKey("poLine", item.id),
        entityId: item.id,
        entityType: "poLine",
      },
      lineId: item.id,
      productName: item.productName ?? `Product #${item.productId}`,
      category: item.category ?? "-",
      quantityOrdered,
      quantityReceived: toNumber(item.quantityReceived),
      cogsMode,
      unitCost,
      unitCostDisplay,
      lineTotal,
    };
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PurchaseOrderSurfaceProps {
  defaultStatusFilter?: string[];
  autoLaunchReceivingOnRowClick?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrderSurface({
  defaultStatusFilter,
  autoLaunchReceivingOnRowClick = false,
}: PurchaseOrderSurfaceProps) {
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const { user } = useAuth();
  const deepLink = useMemo(
    () => parsePurchaseOrderDeepLink(routeSearch),
    [routeSearch]
  );
  const { selectedId: selectedPoId, setSelectedId: setSelectedPoId } =
    useSpreadsheetSelectionParam("poId");

  // Check for creation/edit mode URL params
  const searchParams = useMemo(
    () => new URLSearchParams(routeSearch),
    [routeSearch]
  );
  const poView = searchParams.get("poView");

  useEffect(() => {
    if (poView) return;
    if (selectedPoId !== null || deepLink.poId === null) return;
    setSelectedPoId(deepLink.poId);
  }, [deepLink.poId, poView, selectedPoId, setSelectedPoId]);

  // If creation/edit mode, render the split-surface editor
  if (poView === "create" || poView === "edit") {
    const editPoId =
      poView === "edit" ? Number(searchParams.get("poId")) || null : null;
    return <PurchaseOrderCreateEditMode editPoId={editPoId} />;
  }

  // Filter state — initialize from defaultStatusFilter if provided
  const initialStatus =
    defaultStatusFilter && defaultStatusFilter.length === 1
      ? defaultStatusFilter[0]
      : "all";

  return (
    <PurchaseOrderQueueMode
      defaultStatusFilter={defaultStatusFilter}
      initialStatusFilter={initialStatus}
      autoLaunchReceivingOnRowClick={autoLaunchReceivingOnRowClick}
      selectedPoId={selectedPoId}
      setSelectedPoId={setSelectedPoId}
      setLocation={setLocation}
      routeSearch={routeSearch}
      supplierFilterId={deepLink.supplierClientId}
      userId={user?.id ?? null}
    />
  );
}

// ---------------------------------------------------------------------------
// Payment Terms
// ---------------------------------------------------------------------------

const PAYMENT_TERMS_OPTIONS = [
  "CONSIGNMENT",
  "COD",
  "NET_7",
  "NET_15",
  "NET_30",
  "PARTIAL",
] as const;

function buildPoDraftStorageKey(editPoId: number | null) {
  return `terp.purchase-order-document.v1:${editPoId ?? "create"}`;
}

// ---------------------------------------------------------------------------
// Creation / Edit Mode
// ---------------------------------------------------------------------------

const createKeyboardHints: KeyboardHint[] = [
  { key: "Tab", label: "next cell" },
  { key: "Enter", label: "confirm edit" },
  { key: "Esc", label: "cancel edit" },
];

function PurchaseOrderCreateEditMode({
  editPoId,
}: {
  editPoId: number | null;
}) {
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const isEditMode = editPoId !== null;
  const deepLink = useMemo(
    () => parsePurchaseOrderDeepLink(routeSearch),
    [routeSearch]
  );
  const draftStorageKey = useMemo(
    () => buildPoDraftStorageKey(editPoId),
    [editPoId]
  );

  // ── State ───────────────────────────────────────────────────────────────────
  const [doc, setDoc] = useState<PoDocumentState>(createDefaultPoDocument);
  const [notesMode, setNotesMode] = useState<"internal" | "supplier" | null>(
    null
  );
  const [selectedDocLineId, setSelectedDocLineId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "dirty" | "saved"
  >("idle");
  const submitAfterCreateRef = useRef(false);
  const hasLoadedInitialStateRef = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const updateDoc = useCallback((partial: Partial<PoDocumentState>) => {
    setDoc(d => ({ ...d, ...partial }));
  }, []);

  const updateLineItem = useCallback(
    (tempId: string, partial: Partial<PoLineItem>) => {
      setDoc(d => ({
        ...d,
        lineItems: d.lineItems.map(item =>
          item.tempId === tempId ? { ...item, ...partial } : item
        ),
      }));
    },
    []
  );

  useEffect(() => {
    if (isEditMode || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) {
      if (deepLink.supplierClientId) {
        setDoc(prev => ({ ...prev, supplierId: deepLink.supplierClientId }));
      }
      hasLoadedInitialStateRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PoDocumentState>;
      setDoc(prev => ({
        ...prev,
        ...parsed,
        supplierId:
          parsed.supplierId ?? deepLink.supplierClientId ?? prev.supplierId,
        lineItems:
          Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0
            ? parsed.lineItems
            : prev.lineItems,
      }));
      setAutosaveState("saved");
    } catch {
      setDoc(prev => ({
        ...prev,
        supplierId: deepLink.supplierClientId ?? prev.supplierId,
      }));
    } finally {
      hasLoadedInitialStateRef.current = true;
    }
  }, [deepLink.supplierClientId, draftStorageKey, isEditMode]);

  // ── Supplier query ──────────────────────────────────────────────────────────
  const suppliersQuery = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });

  const supplierOptions = useMemo<SupplierOption[]>(() => {
    const items = extractPaginatedData<{
      id: number;
      name: string;
      email?: string | null;
      phone?: string | null;
      city?: string | null;
      state?: string | null;
    }>(suppliersQuery.data);
    return items.map(s => ({
      id: s.id,
      name: s.name ?? "Unknown",
      email: s.email,
      phone: s.phone,
      city: s.city,
      state: s.state,
    }));
  }, [suppliersQuery.data]);

  const selectedSupplierName = useMemo(() => {
    if (!doc.supplierId) return null;
    return supplierOptions.find(s => s.id === doc.supplierId)?.name ?? null;
  }, [doc.supplierId, supplierOptions]);

  // ── Edit mode: load existing PO ────────────────────────────────────────────
  const editQuery = trpc.purchaseOrders.getById.useQuery(
    { id: editPoId ?? 0 },
    { enabled: isEditMode }
  );

  const editDetail = editQuery.data as
    | {
        id: number;
        poNumber?: string;
        supplierClientId?: number | null;
        orderDate?: string | Date | null;
        expectedDeliveryDate?: string | Date | null;
        paymentTerms?: string | null;
        notes?: string | null;
        vendorNotes?: string | null;
        items?: Array<{
          id: number;
          productId?: number | null;
          productName?: string | null;
          category?: string | null;
          subcategory?: string | null;
          quantityOrdered?: string | number | null;
          cogsMode?: string | null;
          unitCost?: string | number | null;
          unitCostMin?: string | number | null;
          unitCostMax?: string | number | null;
          notes?: string | null;
        }>;
      }
    | null
    | undefined;

  useEffect(() => {
    if (!isEditMode || !editDetail) return;
    const po = editDetail;
    const toNum = (v: string | number | null | undefined): number => {
      if (v === null || v === undefined || v === "") return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };
    const toDateStr = (v: string | Date | null | undefined): string => {
      if (!v) return "";
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    };
    setDoc({
      supplierId: po.supplierClientId ?? null,
      lineItems: (po.items ?? []).map((item, idx) => ({
        tempId: `edit-${item.id ?? idx}-${Date.now()}`,
        existingItemId: item.id ?? null,
        productId: item.productId ?? null,
        productName: item.productName ?? "",
        category: item.category ?? "",
        subcategory: item.subcategory ?? "",
        quantityOrdered: toNum(item.quantityOrdered),
        cogsMode: item.cogsMode === "RANGE" ? "RANGE" : "FIXED",
        unitCost: toNum(item.unitCost),
        unitCostMin: toNum(item.unitCostMin),
        unitCostMax: toNum(item.unitCostMax),
        notes: item.notes ?? "",
      })),
      orderDate:
        toDateStr(po.orderDate) || new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: toDateStr(po.expectedDeliveryDate),
      paymentTerms: po.paymentTerms ?? "",
      internalNotes: po.notes ?? "",
      supplierNotes: po.vendorNotes ?? "",
      draftId: editPoId,
    });
    hasLoadedInitialStateRef.current = true;
    setAutosaveState("saved");
  }, [isEditMode, editDetail, editPoId]);

  useEffect(() => {
    if (!hasLoadedInitialStateRef.current || typeof window === "undefined") {
      return;
    }
    if (isSubmitting) return;

    setAutosaveState("dirty");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(doc));
      setAutosaveState("saved");
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [doc, draftStorageKey, isSubmitting]);

  useEffect(() => {
    if (
      selectedDocLineId &&
      !doc.lineItems.some(item => item.tempId === selectedDocLineId)
    ) {
      setSelectedDocLineId(null);
    }
  }, [doc.lineItems, selectedDocLineId]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: data => {
      const newId = (data as { id?: number })?.id;
      if (submitAfterCreateRef.current && newId) {
        submitAfterCreateRef.current = false;
        submitMutation.mutate(
          { id: newId },
          {
            onSuccess: () => navigateBackToQueue(newId),
            onError: () => navigateBackToQueue(newId),
          }
        );
      } else {
        toast.success("Purchase order created");
        setIsSubmitting(false);
        navigateBackToQueue(newId ?? null);
      }
    },
    onError: error => {
      submitAfterCreateRef.current = false;
      toast.error(error.message || "Failed to create purchase order");
      setIsSubmitting(false);
    },
  });

  const updateMutation = trpc.purchaseOrders.update.useMutation();
  const addItemMutation = trpc.purchaseOrders.addItem.useMutation();
  const updateItemMutation = trpc.purchaseOrders.updateItem.useMutation();
  const deleteItemMutation = trpc.purchaseOrders.deleteItem.useMutation();

  const submitMutation = trpc.purchaseOrders.submit.useMutation({
    onSuccess: () => {
      toast.success("Purchase order submitted");
      setIsSubmitting(false);
    },
    onError: error => {
      toast.error(error.message || "Failed to submit purchase order");
      setIsSubmitting(false);
    },
  });

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigateBackToQueue = useCallback(
    (poId?: number | null) => {
      const params = new URLSearchParams(routeSearch);
      params.delete("poView");
      if (poId) {
        params.set("poId", String(poId));
      }
      const qs = params.toString();
      setLocation(qs ? `?${qs}` : "?tab=purchase-orders");
    },
    [routeSearch, setLocation]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddProduct = useCallback((product: AddProductPayload) => {
    const newItem = createLineItemFromProduct(product);
    setDoc(d => {
      const hasOnlyPlaceholder =
        d.lineItems.length === 1 &&
        !d.lineItems[0].productId &&
        !d.lineItems[0].productName;
      return {
        ...d,
        lineItems: hasOnlyPlaceholder ? [newItem] : [...d.lineItems, newItem],
      };
    });
  }, []);

  const handleAddBlankLine = useCallback(() => {
    setDoc(d => ({ ...d, lineItems: [...d.lineItems, createEmptyLineItem()] }));
  }, []);

  const handleRemoveLineItem = useCallback((tempId: string) => {
    setDoc(d => {
      if (d.lineItems.length <= 1) return d;
      return {
        ...d,
        lineItems: d.lineItems.filter(item => item.tempId !== tempId),
      };
    });
  }, []);

  const handleDocCellChanged = useCallback(
    (event: CellValueChangedEvent<PoLineItem>) => {
      if (!event.data) return;
      const field = event.colDef.field as keyof PoLineItem;
      const value = event.newValue;
      if (field === "cogsMode") {
        const nextMode = value === "RANGE" ? "RANGE" : "FIXED";
        updateLineItem(event.data.tempId, {
          cogsMode: nextMode,
          unitCost:
            nextMode === "FIXED"
              ? event.data.unitCost || event.data.unitCostMin || 0
              : event.data.unitCost,
          unitCostMin:
            nextMode === "RANGE"
              ? event.data.unitCostMin || event.data.unitCost || 0
              : 0,
          unitCostMax:
            nextMode === "RANGE"
              ? event.data.unitCostMax ||
                event.data.unitCostMin ||
                event.data.unitCost ||
                0
              : 0,
        });
        return;
      }
      updateLineItem(event.data.tempId, {
        [field]:
          field === "quantityOrdered" ||
          field === "unitCost" ||
          field === "unitCostMin" ||
          field === "unitCostMax"
            ? Number(value)
            : value,
      });
    },
    [updateLineItem]
  );

  const handleSubmit = useCallback(
    async (andSubmit = false) => {
      const errors = validatePoDocument(doc);
      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }
      setIsSubmitting(true);
      if (!isEditMode) {
        submitAfterCreateRef.current = andSubmit;
        const payload = buildCreatePayload(doc);
        createMutation.mutate(
          payload as Parameters<typeof createMutation.mutate>[0]
        );
        return;
      }

      if (!editPoId) {
        toast.error("Missing purchase order id");
        setIsSubmitting(false);
        return;
      }

      const buildItemCostFields = (item: PoLineItem) =>
        item.cogsMode === "RANGE"
          ? {
              cogsMode: "RANGE" as const,
              unitCostMin: item.unitCostMin,
              unitCostMax: item.unitCostMax,
            }
          : {
              cogsMode: "FIXED" as const,
              unitCost: item.unitCost,
            };

      try {
        await updateMutation.mutateAsync({
          id: editPoId,
          supplierClientId: doc.supplierId ?? undefined,
          orderDate: doc.orderDate,
          expectedDeliveryDate: doc.expectedDeliveryDate || null,
          paymentTerms: doc.paymentTerms || null,
          notes: doc.internalNotes || null,
          vendorNotes: doc.supplierNotes || null,
        });

        const originalItems = editDetail?.items ?? [];
        const originalIds = new Set(originalItems.map(item => item.id));
        const retainedExistingIds = new Set<number>();

        for (const item of doc.lineItems) {
          if (item.existingItemId) {
            retainedExistingIds.add(item.existingItemId);
            await updateItemMutation.mutateAsync({
              id: item.existingItemId,
              quantityOrdered: item.quantityOrdered,
              notes: item.notes || undefined,
              ...buildItemCostFields(item),
            });
            continue;
          }

          if (!item.productId) {
            throw new Error(
              "New line items must be selected from the product browser before saving"
            );
          }

          await addItemMutation.mutateAsync({
            purchaseOrderId: editPoId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            notes: item.notes || undefined,
            ...buildItemCostFields(item),
          });
        }

        for (const originalId of originalIds) {
          if (!retainedExistingIds.has(originalId)) {
            await deleteItemMutation.mutateAsync({ id: originalId });
          }
        }

        toast.success("Purchase order updated");
        setIsSubmitting(false);
        navigateBackToQueue(editPoId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update purchase order";
        toast.error(message);
        setIsSubmitting(false);
      }
    },
    [
      addItemMutation,
      createMutation,
      deleteItemMutation,
      doc,
      editDetail,
      editPoId,
      isEditMode,
      navigateBackToQueue,
      updateItemMutation,
      updateMutation,
    ]
  );

  // ── Derived ─────────────────────────────────────────────────────────────────
  const addedProductIds = useMemo(
    () =>
      new Set(
        doc.lineItems
          .filter(l => l.productId !== null)
          .map(l => l.productId as number)
      ),
    [doc.lineItems]
  );

  const documentTotal = useMemo(
    () => getDocumentTotal(doc.lineItems),
    [doc.lineItems]
  );

  // ── Doc grid column defs ────────────────────────────────────────────────────
  const docColumnDefs = useMemo<ColDef<PoLineItem>[]>(
    () => [
      {
        headerName: "#",
        valueGetter: p => (p.node?.rowIndex ?? 0) + 1,
        width: 40,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "productName",
        headerName: "Product",
        flex: 1.5,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "category",
        headerName: "Category",
        width: 90,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantityOrdered",
        headerName: "Qty",
        width: 80,
        editable: true,
        cellClass: "powersheet-cell--editable",
      },
      {
        field: "cogsMode",
        headerName: "COGS",
        width: 80,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["FIXED", "RANGE"] },
        cellClass: "powersheet-cell--editable",
      },
      {
        field: "unitCost",
        headerName: "Unit Cost",
        width: 90,
        editable: params => params.data?.cogsMode !== "RANGE",
        valueFormatter: p => {
          const row = p.data;
          if (row?.cogsMode === "RANGE") {
            return `${formatCurrency(row.unitCostMin)}–${formatCurrency(row.unitCostMax)}`;
          }
          return formatCurrency(Number(p.value ?? 0));
        },
        cellClass: "powersheet-cell--editable",
      },
      {
        field: "unitCostMin",
        headerName: "Min",
        width: 80,
        editable: params => params.data?.cogsMode === "RANGE",
        valueFormatter: p => formatCurrency(Number(p.value ?? 0)),
        cellClass: "powersheet-cell--editable",
      },
      {
        field: "unitCostMax",
        headerName: "Max",
        width: 80,
        editable: params => params.data?.cogsMode === "RANGE",
        valueFormatter: p => formatCurrency(Number(p.value ?? 0)),
        cellClass: "powersheet-cell--editable",
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1,
        minWidth: 160,
        editable: true,
        cellClass: "powersheet-cell--editable",
      },
      {
        headerName: "Total",
        width: 90,
        valueGetter: p => (p.data ? getLineTotal(p.data) : 0),
        valueFormatter: p => formatCurrency(Number(p.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
    ],
    []
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (editPoId && editQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading purchase order...
      </div>
    );
  }

  const editPoNumber =
    isEditMode && editDetail ? (editDetail.poNumber ?? `PO-${editPoId}`) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Toolbar */}
      <div className="flex items-center gap-3 py-1">
        <Button size="sm" variant="ghost" onClick={() => navigateBackToQueue()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Queue
        </Button>
        <h2 className="text-lg font-semibold">
          {isEditMode
            ? `Edit ${editPoNumber ?? "Purchase Order"}`
            : "New Purchase Order"}
        </h2>
        <div className="w-64">
          <SupplierCombobox
            value={doc.supplierId}
            onValueChange={id => updateDoc({ supplierId: id })}
            suppliers={supplierOptions}
            isLoading={suppliersQuery.isLoading}
            placeholder="Select supplier..."
            className="h-8 text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {autosaveState === "dirty" ? "DIRTY" : "AUTO / saved"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmit(!isEditMode)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
                ? "Update PO"
                : "Submit PO"}
          </Button>
        </div>
      </div>

      {/* 2. Split Layout */}
      <div className="flex gap-1.5" style={{ minHeight: 480 }}>
        {/* Left: Product Browser (flex: 2) */}
        <div className="flex-[2] min-w-0 rounded-lg border border-border/70 bg-card p-2 overflow-auto">
          <ProductBrowserGrid
            supplierId={doc.supplierId}
            addedProductIds={addedProductIds}
            onAddProduct={handleAddProduct}
          />
        </div>

        {/* Right: PO Document (flex: 3) */}
        <div className="flex-[3] min-w-0 flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-2">
          {/* Document Grid */}
          <PowersheetGrid<PoLineItem>
            surfaceId="po-document"
            requirementIds={["PROC-PO-CREATE-001"]}
            title="PO Line Items"
            rows={doc.lineItems}
            columnDefs={docColumnDefs}
            getRowId={row => row.tempId}
            selectedRowId={selectedDocLineId}
            onSelectedRowChange={row =>
              setSelectedDocLineId(row ? row.tempId : null)
            }
            onCellValueChanged={handleDocCellChanged}
            selectionMode="cell-range"
            enableFillHandle
            enableUndoRedo={true}
            isLoading={false}
            emptyTitle="No line items"
            emptyDescription="Use the product browser on the left to add items."
            minHeight={240}
            headerActions={
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={handleAddBlankLine}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Line
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (selectedDocLineId) {
                      handleRemoveLineItem(selectedDocLineId);
                    }
                  }}
                  disabled={!selectedDocLineId || doc.lineItems.length <= 1}
                  title="Remove selected line item"
                >
                  <X className="mr-1 h-3 w-3" />
                  Remove Selected
                </Button>
              </div>
            }
          />

          {/* Invoice Bottom */}
          <div className="border-t border-border/40 pt-2 mt-auto space-y-3">
            {/* Subtotal */}
            <div className="flex justify-end items-center gap-2 px-2">
              <span className="text-sm text-muted-foreground">
                Subtotal ({doc.lineItems.length} line
                {doc.lineItems.length === 1 ? "" : "s"})
              </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(documentTotal)}
              </span>
            </div>

            {/* Terms Row */}
            <div className="grid grid-cols-4 gap-2 px-2">
              {/* Order Date */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Order Date
                </label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={doc.orderDate}
                  onChange={e => updateDoc({ orderDate: e.target.value })}
                />
              </div>
              {/* Expected Delivery */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Expected Delivery
                </label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={doc.expectedDeliveryDate}
                  onChange={e =>
                    updateDoc({ expectedDeliveryDate: e.target.value })
                  }
                />
              </div>
              {/* Payment Terms */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Payment Terms
                </label>
                <Select
                  value={doc.paymentTerms || "none"}
                  onValueChange={v =>
                    updateDoc({ paymentTerms: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {PAYMENT_TERMS_OPTIONS.map(term => (
                      <SelectItem key={term} value={term}>
                        {term.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Notes Toggle */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Notes
                </label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={notesMode === "internal" ? "default" : "outline"}
                    className="h-8 text-xs flex-1"
                    onClick={() =>
                      setNotesMode(notesMode === "internal" ? null : "internal")
                    }
                  >
                    Internal
                  </Button>
                  <Button
                    size="sm"
                    variant={notesMode === "supplier" ? "default" : "outline"}
                    className="h-8 text-xs flex-1"
                    onClick={() =>
                      setNotesMode(notesMode === "supplier" ? null : "supplier")
                    }
                  >
                    Supplier
                  </Button>
                </div>
              </div>
            </div>

            {/* Notes Textarea */}
            {notesMode && (
              <div className="px-2">
                <Textarea
                  className="text-xs min-h-[60px]"
                  placeholder={
                    notesMode === "internal"
                      ? "Internal notes..."
                      : "Notes for supplier..."
                  }
                  value={
                    notesMode === "internal"
                      ? doc.internalNotes
                      : doc.supplierNotes
                  }
                  onChange={e =>
                    updateDoc(
                      notesMode === "internal"
                        ? { internalNotes: e.target.value }
                        : { supplierNotes: e.target.value }
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Status Bar */}
      <WorkSurfaceStatusBar
        left={
          <span>
            {doc.lineItems.length} line{doc.lineItems.length === 1 ? "" : "s"} ·{" "}
            {formatCurrency(documentTotal)}
            {selectedSupplierName ? ` · ${selectedSupplierName}` : ""}
          </span>
        }
        center={
          <span>
            {isEditMode ? "Editing" : "Creating"} purchase order
            {doc.supplierId ? "" : " — select a supplier to begin"}
          </span>
        }
        right={
          <KeyboardHintBar hints={createKeyboardHints} className="text-xs" />
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queue Mode (extracted to avoid hooks-after-early-return)
// ---------------------------------------------------------------------------

function PurchaseOrderQueueMode({
  defaultStatusFilter,
  initialStatusFilter,
  autoLaunchReceivingOnRowClick,
  selectedPoId,
  setSelectedPoId,
  setLocation,
  routeSearch,
  supplierFilterId,
  userId,
}: {
  defaultStatusFilter?: string[];
  initialStatusFilter: string;
  autoLaunchReceivingOnRowClick: boolean;
  selectedPoId: number | null;
  setSelectedPoId: (id: number | null) => void;
  setLocation: (path: string) => void;
  routeSearch: string;
  supplierFilterId: number | null;
  userId: number | null;
}) {
  // Export hook
  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [showExpectedTodayOnly, setShowExpectedTodayOnly] = useState(false);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    poId: number;
    status: POStatus;
  } | null>(null);

  // Selection summaries
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [supportSelectionSummary, setSupportSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Toast dedup refs
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef(0);

  const notifyToast = useCallback(
    (level: "success" | "error" | "warning", msg: string) => {
      const now = Date.now();
      const key = `${level}:${msg}`;
      if (
        key !== lastToastKeyRef.current ||
        now - lastToastTimeRef.current > 300
      ) {
        if (level === "success") toast.success(msg);
        else if (level === "warning") toast.warning(msg);
        else toast.error(msg);
        lastToastKeyRef.current = key;
        lastToastTimeRef.current = now;
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const posQuery = trpc.purchaseOrders.getAll.useQuery({
    limit: 500,
    offset: 0,
    supplierClientId: supplierFilterId ?? undefined,
  });
  const utils = trpc.useUtils();

  const suppliersQuery = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });

  const detailQuery = trpc.purchaseOrders.getById.useQuery(
    { id: selectedPoId ?? 0 },
    { enabled: selectedPoId !== null }
  );

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const rawPos = useMemo(
    () => extractPaginatedData<POQueueRecord>(posQuery.data),
    [posQuery.data]
  );

  const supplierNamesById = useMemo(() => {
    const items = extractPaginatedData<{ id: number; name: string }>(
      suppliersQuery.data
    );
    return new Map(items.map(s => [s.id, s.name ?? "Unknown"]));
  }, [suppliersQuery.data]);

  const supplierFilterName = useMemo(() => {
    if (!supplierFilterId) return null;
    return (
      supplierNamesById.get(supplierFilterId) ?? `Supplier #${supplierFilterId}`
    );
  }, [supplierFilterId, supplierNamesById]);

  const searchLower = searchTerm.trim().toLowerCase();

  const queueRows = useMemo(() => {
    const rows = mapPOsToQueueRows(rawPos, supplierNamesById);
    return rows.filter(row => {
      // Apply defaultStatusFilter if status is "all"
      if (statusFilter === "all") {
        if (
          defaultStatusFilter &&
          defaultStatusFilter.length > 0 &&
          !defaultStatusFilter.includes(row.status)
        ) {
          return false;
        }
      } else if (row.status !== statusFilter) {
        return false;
      }
      if (
        searchLower &&
        !(
          row.poNumber.toLowerCase().includes(searchLower) ||
          row.supplierName.toLowerCase().includes(searchLower)
        )
      ) {
        return false;
      }

      if (
        showExpectedTodayOnly &&
        !isExpectedToday(row.expectedDeliveryDate, row.status)
      ) {
        return false;
      }

      return true;
    });
  }, [
    rawPos,
    supplierNamesById,
    statusFilter,
    searchLower,
    defaultStatusFilter,
    showExpectedTodayOnly,
  ]);

  const expectedTodayCount = useMemo(() => {
    const rows = mapPOsToQueueRows(rawPos, supplierNamesById);
    return rows.filter(row => {
      if (statusFilter === "all") {
        if (
          defaultStatusFilter &&
          defaultStatusFilter.length > 0 &&
          !defaultStatusFilter.includes(row.status)
        ) {
          return false;
        }
      } else if (row.status !== statusFilter) {
        return false;
      }

      if (searchLower) {
        const matchesSearch =
          row.poNumber.toLowerCase().includes(searchLower) ||
          row.supplierName.toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          return false;
        }
      }

      return isExpectedToday(row.expectedDeliveryDate, row.status);
    }).length;
  }, [
    rawPos,
    supplierNamesById,
    statusFilter,
    defaultStatusFilter,
    searchLower,
  ]);

  const showExpectedDeliveryColumn = useMemo(
    () =>
      queueRows.some(row => hasExpectedDeliveryDate(row.expectedDeliveryDate)),
    [queueRows]
  );

  const selectedRow = queueRows.find(row => row.poId === selectedPoId) ?? null;

  const lineItemRows = useMemo(() => {
    const items = detailQuery.data?.items ?? [];
    return mapLineItemsToRows(items as POLineItem[]);
  }, [detailQuery.data]);

  // Counts by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of queueRows) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [queueRows]);

  const draftCount = statusCounts["DRAFT"] ?? 0;
  const confirmedCount = statusCounts["CONFIRMED"] ?? 0;
  const receivingCount = statusCounts["RECEIVING"] ?? 0;

  // Workflow guards
  const queueSelectionTouchesMultipleRows =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;
  const rowScopedActionsBlocked = queueSelectionTouchesMultipleRows;
  const canLaunchReceiving = Boolean(
    selectedRow?.isReceivable && !rowScopedActionsBlocked
  );
  const canDeleteDraft = Boolean(
    selectedRow?.isDraft && !rowScopedActionsBlocked
  );

  // Available transitions for selected PO
  const availableTransitions = useMemo<POStatus[]>(() => {
    if (!selectedRow) return [];
    return PO_ALLOWED_TRANSITIONS[selectedRow.status] ?? [];
  }, [selectedRow]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const deletePO = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order deleted");
      setShowDeleteDialog(false);
      setSelectedPoId(null);
      void posQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to delete purchase order");
    },
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      const label = PO_STATUS_LABELS[variables.status] ?? variables.status;
      notifyToast("success", `Status updated to ${label}`);
      setShowStatusDialog(false);
      setPendingStatusChange(null);
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to update status");
    },
  });

  const submitPO = trpc.purchaseOrders.submit.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order submitted");
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to submit purchase order");
    },
  });

  const confirmPO = trpc.purchaseOrders.confirm.useMutation({
    onSuccess: () => {
      notifyToast("success", "Purchase order confirmed");
      void posQuery.refetch();
      void detailQuery.refetch();
    },
    onError: error => {
      notifyToast("error", error.message || "Failed to confirm purchase order");
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleNewPO = () => {
    const params = new URLSearchParams(routeSearch);
    params.set("poView", "create");
    setLocation(`?${params.toString()}`);
  };

  const PO_EXPORT_COLUMNS: ExportColumn<POQueueRow>[] = [
    { key: "poNumber", label: "PO Number" },
    { key: "supplierName", label: "Supplier" },
    { key: "statusLabel", label: "Status" },
    {
      key: "orderDate",
      label: "Order Date",
      formatter: v => formatDate(v as Date | string | null),
    },
    {
      key: "expectedDeliveryDate",
      label: "Est. Delivery",
      formatter: v => formatDate(v as Date | string | null),
    },
    {
      key: "total",
      label: "Total",
      formatter: v => String(Number(v ?? 0).toFixed(2)),
    },
    { key: "paymentTerms", label: "Payment Terms" },
  ];

  const handleExport = () => {
    if (queueRows.length === 0) {
      notifyToast("warning", "No rows to export");
      return;
    }
    void exportCSV(queueRows as unknown as Record<string, unknown>[], {
      columns: PO_EXPORT_COLUMNS as unknown as ExportColumn<
        Record<string, unknown>
      >[],
      filename: "purchase-orders",
      addTimestamp: true,
    });
  };

  const handleStatusTransition = (status: POStatus) => {
    if (!selectedRow) return;
    const currentStatus = selectedRow.status;
    const allowed = PO_ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(status)) {
      notifyToast(
        "error",
        `Cannot transition from ${PO_STATUS_LABELS[currentStatus] ?? currentStatus} to ${PO_STATUS_LABELS[status] ?? status}`
      );
      return;
    }
    setPendingStatusChange({ poId: selectedRow.poId, status });
    setShowStatusDialog(true);
  };

  const handleStatusConfirm = () => {
    if (!pendingStatusChange) return;
    // Use specific mutations for DRAFT->SENT and SENT->CONFIRMED
    if (pendingStatusChange.status === "SENT") {
      submitPO.mutate({ id: pendingStatusChange.poId });
      setShowStatusDialog(false);
      setPendingStatusChange(null);
    } else if (pendingStatusChange.status === "CONFIRMED") {
      confirmPO.mutate({ id: pendingStatusChange.poId });
      setShowStatusDialog(false);
      setPendingStatusChange(null);
    } else {
      updateStatus.mutate({
        id: pendingStatusChange.poId,
        status: pendingStatusChange.status,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedRow?.isDraft) return;
    deletePO.mutate({ id: selectedRow.poId });
  };

  const handleStartReceiving = useCallback(
    async (rowOverride?: POQueueRow | null) => {
      const targetRow = rowOverride ?? selectedRow;
      if (!targetRow) return;

      try {
        const detail =
          targetRow.poId === selectedPoId && detailQuery.data
            ? detailQuery.data
            : await utils.purchaseOrders.getById.fetch({
                id: targetRow.poId,
              });

        if (detail?.items) {
          const lines: ProductIntakeDraftLine[] = (
            detail.items as POLineItem[]
          ).map(item => ({
            id: `line-${item.id}`,
            poItemId: item.id,
            productId: item.productId,
            productName: item.productName ?? `Product #${item.productId}`,
            category: item.category,
            subcategory: item.subcategory,
            quantityOrdered: toNumber(item.quantityOrdered),
            quantityReceived: toNumber(item.quantityReceived),
            intakeQty: Math.max(
              0,
              toNumber(item.quantityOrdered) - toNumber(item.quantityReceived)
            ),
            cogsMode: item.cogsMode ?? "FIXED",
            unitCost: toNumber(item.unitCost),
            unitCostMin: toNumber(item.unitCostMin),
            unitCostMax: toNumber(item.unitCostMax),
          }));

          const supplierData = detail.supplier as
            | { id?: number; name?: string }
            | undefined;
          const draft = createProductIntakeDraftFromPO({
            poId: targetRow.poId,
            poNumber: targetRow.poNumber,
            vendorId: supplierData?.id ?? null,
            vendorName: targetRow.supplierName,
            warehouseId: null,
            warehouseName: "Default",
            lines,
          });
          const persistedDraft = upsertProductIntakeDraft(draft, userId);
          notifyToast(
            "success",
            `Product Intake draft saved for ${targetRow.poNumber}`
          );
          setLocation(
            buildOperationsWorkspacePath("receiving", {
              draftId: persistedDraft.id,
              poId: targetRow.poId,
              poNumber: targetRow.poNumber,
            })
          );
          return;
        }

        setLocation(
          buildOperationsWorkspacePath("receiving", {
            poId: targetRow.poId,
            poNumber: targetRow.poNumber,
          })
        );
      } catch (error) {
        notifyToast(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to open Product Intake draft"
        );
      }
    },
    [
      detailQuery.data,
      notifyToast,
      selectedPoId,
      selectedRow,
      setLocation,
      userId,
      utils.purchaseOrders.getById,
    ]
  );

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const queueColumnDefs = useMemo<ColDef<POQueueRow>[]>(() => {
    const cols: ColDef<POQueueRow>[] = [
      {
        field: "poNumber",
        headerName: "PO Number",
        minWidth: 130,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "supplierName",
        headerName: "Supplier",
        flex: 1.5,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "statusLabel",
        headerName: "Status",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "orderDate",
        headerName: "Order Date",
        minWidth: 120,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          formatDate(params.value as Date | string | null | undefined),
      },
      {
        field: "total",
        headerName: "Total ($)",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "paymentTerms",
        headerName: "Payment Terms",
        minWidth: 150,
        maxWidth: 190,
        cellClass: "powersheet-cell--locked",
      },
    ];

    if (showExpectedDeliveryColumn) {
      const orderDateColumnIndex = cols.findIndex(
        column => column.field === "orderDate"
      );
      const insertIndex =
        orderDateColumnIndex >= 0 ? orderDateColumnIndex + 1 : cols.length;

      cols.splice(insertIndex, 0, {
        field: "expectedDeliveryDate",
        headerName: "Est. Delivery",
        minWidth: 120,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => {
          const value = params.value as Date | string | null | undefined;
          return hasExpectedDeliveryDate(value) ? formatDate(value) : "Not set";
        },
      });
    }

    return cols;
  }, [showExpectedDeliveryColumn]);

  const lineItemColumnDefs = useMemo<ColDef<POLineRow>[]>(
    () => [
      {
        field: "productName",
        headerName: "Product",
        flex: 1.5,
        minWidth: 180,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantityOrdered",
        headerName: "Ordered",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "quantityReceived",
        headerName: "Received",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "cogsMode",
        headerName: "COGS Mode",
        minWidth: 100,
        maxWidth: 120,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "unitCostDisplay",
        headerName: "Unit Cost",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "lineTotal",
        headerName: "Line Total",
        minWidth: 120,
        maxWidth: 150,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
    ],
    []
  );

  // ---------------------------------------------------------------------------
  // Status bar content
  // ---------------------------------------------------------------------------

  const statusBarLeft = (
    <span>
      {queueRows.length} visible POs · {draftCount} draft · {confirmedCount}{" "}
      confirmed · {receivingCount} receiving
      {showExpectedTodayOnly ? ` · ${expectedTodayCount} due today` : ""}
      {queueSelectionSummary
        ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows`
        : ""}
      {supportSelectionSummary
        ? ` · lines ${supportSelectionSummary.selectedCellCount} cells`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? `Selected ${selectedRow.poNumber} · ${selectedRow.statusLabel} · ${selectedRow.supplierName}`
        : "Select a purchase order to load line items and action context"}
      {queueSelectionSummary?.hasDiscontiguousSelection
        ? " · discontiguous selection"
        : ""}
    </span>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Toolbar */}
      <div
        className={`${surfacePanelClass} flex flex-wrap items-start gap-3 px-3 py-2`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Purchase Orders</h2>
            {draftCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {draftCount} draft purchase orders
              </Badge>
            )}
            {confirmedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {confirmedCount} confirmed purchase orders
              </Badge>
            )}
            {receivingCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {receivingCount} receiving purchase orders
              </Badge>
            )}
            {supplierFilterName ? (
              <Badge variant="secondary" className="text-xs">
                Supplier: {supplierFilterName}
              </Badge>
            ) : null}
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Queue first, then receiving handoff
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleNewPO}>
            <Plus className="mr-1 h-4 w-4" />
            New Purchase Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Export visible purchase orders to CSV"
            onClick={handleExport}
            disabled={exportState.isExporting}
          >
            <Download className="mr-1 h-4 w-4" />
            {exportState.isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div
        className={`${surfacePanelClass} flex flex-wrap items-center gap-2 px-3 py-2`}
      >
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search PO number or supplier"
          className="max-w-xs"
          aria-label="Search purchase orders"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RECEIVING">Receiving</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={showExpectedTodayOnly ? "default" : "outline"}
          onClick={() => setShowExpectedTodayOnly(current => !current)}
        >
          Expected Today ({expectedTodayCount})
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {selectedRow
            ? `${selectedRow.poNumber} selected`
            : supplierFilterName
              ? `Showing purchase orders for ${supplierFilterName}`
              : "Select a row to see details and actions"}
        </span>
      </div>

      {/* 3. PO Queue Grid */}
      <PowersheetGrid
        surfaceId="po-queue"
        requirementIds={["PROC-PO-001", "PROC-PO-005"]}
        affordances={queueAffordances}
        title="Purchase Orders Queue"
        description="Unified purchase order queue with status, supplier, dates, total, and payment terms at a glance."
        rows={queueRows}
        columnDefs={queueColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedPoId(row?.poId ?? null)}
        onRowClicked={event => {
          const row = event.data;
          if (!row) return;
          setSelectedPoId(row.poId);
          if (autoLaunchReceivingOnRowClick && row.isReceivable) {
            void handleStartReceiving(row);
          }
        }}
        selectionMode="single-row"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setQueueSelectionSummary}
        isLoading={posQuery.isLoading}
        errorMessage={posQuery.error?.message ?? null}
        emptyTitle="No purchase orders match"
        emptyDescription="Adjust the search or status filter, or create a new PO."
        summary={
          <span>
            {queueRows.length} visible purchase orders · {draftCount} draft
            purchase orders · {confirmedCount} confirmed purchase orders ·{" "}
            {receivingCount} receiving purchase orders
          </span>
        }
        minHeight={360}
      />

      {/* 4. Selected PO KPI Cards */}
      {selectedRow ? (
        <div className="grid gap-3 md:grid-cols-4">
          {/* Status + age card */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Package className="h-3 w-3" />
              Queue status
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.statusLabel} · created{" "}
              {formatAgeLabel(selectedRow.orderDate)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getExpectedDeliveryLabel(
                selectedRow.expectedDeliveryDate,
                selectedRow.status
              )}
            </div>
          </div>

          {/* Supplier card */}
          <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
            <div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Building className="h-3 w-3" />
              Supplier
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedRow.supplierName}
            </div>
            {detailQuery.data?.supplier?.email ? (
              <div className="text-xs text-muted-foreground">
                {(detailQuery.data.supplier as { email?: string }).email}
              </div>
            ) : null}
            {detailQuery.data?.supplier?.phone ? (
              <div className="text-xs text-muted-foreground">
                {(detailQuery.data.supplier as { phone?: string }).phone}
              </div>
            ) : null}
          </div>

          {/* Total + line count card */}
          <div className="rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-sm font-medium">
              {formatCurrency(selectedRow.total)} · {lineItemRows.length} line
              {lineItemRows.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Actions card */}
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Next step
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {/* Draft actions */}
              {selectedRow.isDraft && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      const params = new URLSearchParams(routeSearch);
                      params.set("poView", "edit");
                      params.set("poId", String(selectedRow.poId));
                      setLocation(`?${params.toString()}`);
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  {availableTransitions
                    .filter(s => s !== "CANCELLED")
                    .map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={rowScopedActionsBlocked}
                        onClick={() => handleStatusTransition(status)}
                      >
                        {PO_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!canDeleteDraft}
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </>
              )}

              {/* Receivable actions */}
              {selectedRow.isReceivable && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!canLaunchReceiving}
                  onClick={() => void handleStartReceiving()}
                >
                  <Truck className="mr-1 h-3 w-3" />
                  Open Product Intake
                </Button>
              )}

              {/* Other transitions (non-draft, non-terminal) */}
              {!selectedRow.isDraft &&
                availableTransitions.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={rowScopedActionsBlocked}
                    onClick={() => handleStatusTransition(status)}
                  >
                    {PO_STATUS_LABELS[status]}
                  </Button>
                ))}

              {/* Terminal states */}
              {availableTransitions.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No actions available
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Line Items Support Grid */}
      <PowersheetGrid
        surfaceId="po-line-items"
        requirementIds={["PROC-PO-003", "PROC-PO-004"]}
        affordances={supportAffordances}
        title="Line Items"
        description="Line items for the selected purchase order."
        rows={lineItemRows}
        columnDefs={lineItemColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSupportSelectionSummary}
        isLoading={detailQuery.isLoading}
        errorMessage={detailQuery.error?.message ?? null}
        emptyTitle={
          selectedRow
            ? `No line items for ${selectedRow.poNumber}`
            : "No PO selected"
        }
        emptyDescription={
          selectedRow
            ? "This purchase order has no line items yet."
            : "Select a purchase order above to see its line items."
        }
        summary={
          selectedRow ? (
            <span>
              {selectedRow.poNumber} · {lineItemRows.length} line{" "}
              {lineItemRows.length === 1 ? "item" : "items"} ·{" "}
              {formatCurrency(
                lineItemRows.reduce((sum, row) => sum + row.lineTotal, 0)
              )}{" "}
              total
            </span>
          ) : undefined
        }
        minHeight={220}
      />

      {/* 6. Status Bar */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* 7. Inspector Panel */}
      <InspectorPanel
        isOpen={selectedRow !== null}
        onClose={() => setSelectedPoId(null)}
        title={selectedRow?.poNumber ?? "PO Inspector"}
        subtitle={selectedRow?.supplierName ?? "Select a purchase order"}
        trapFocus={false}
        headerActions={
          selectedRow ? (
            <Badge variant="outline">{selectedRow.statusLabel}</Badge>
          ) : null
        }
      >
        {selectedRow ? (
          <div className="space-y-4">
            <InspectorSection title="PO Details" defaultOpen>
              <InspectorField label="PO Number">
                <p className="font-semibold">{selectedRow.poNumber}</p>
              </InspectorField>
              <InspectorField label="Supplier">
                <p>{selectedRow.supplierName}</p>
                {detailQuery.data?.supplier?.email ? (
                  <p className="text-xs text-muted-foreground">
                    {(detailQuery.data.supplier as { email?: string }).email}
                  </p>
                ) : null}
                {detailQuery.data?.supplier?.phone ? (
                  <p className="text-xs text-muted-foreground">
                    {(detailQuery.data.supplier as { phone?: string }).phone}
                  </p>
                ) : null}
              </InspectorField>
              <InspectorField label="Status">
                <p>{selectedRow.statusLabel}</p>
              </InspectorField>
              <InspectorField label="Order Date">
                <p>
                  {formatDate(selectedRow.orderDate)} (
                  {formatAgeLabel(selectedRow.orderDate)} ago)
                </p>
              </InspectorField>
              <InspectorField label="Expected Delivery">
                <p>
                  {getExpectedDeliveryLabel(
                    selectedRow.expectedDeliveryDate,
                    selectedRow.status
                  )}
                </p>
              </InspectorField>
              <InspectorField label="Payment Terms">
                <p>{selectedRow.paymentTerms}</p>
              </InspectorField>
              <InspectorField label="Total">
                <p className="text-lg font-semibold">
                  {formatCurrency(selectedRow.total)}
                </p>
              </InspectorField>
              {detailQuery.data?.notes ? (
                <InspectorField label="Notes">
                  <p className="text-sm">
                    {(detailQuery.data as { notes?: string }).notes}
                  </p>
                </InspectorField>
              ) : null}
            </InspectorSection>

            <InspectorSection title="Product Intake Handoff">
              {selectedRow.isReceivable ? (
                <>
                  <p className="mb-2 text-sm text-muted-foreground">
                    This purchase order is ready for product intake. Use the
                    button below to open the product intake workflow.
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => void handleStartReceiving()}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Open Product Intake
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not eligible — status must be Confirmed or Receiving (current:{" "}
                  {selectedRow.statusLabel}).
                </p>
              )}
            </InspectorSection>

            <InspectorSection title="Next Steps">
              <div className="grid grid-cols-2 gap-2">
                {availableTransitions.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusTransition(status)}
                    disabled={
                      updateStatus.isPending ||
                      submitPO.isPending ||
                      confirmPO.isPending
                    }
                  >
                    {PO_STATUS_LABELS[status]}
                  </Button>
                ))}
                {availableTransitions.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    No further status changes available for{" "}
                    {selectedRow.statusLabel} POs.
                  </p>
                )}
              </div>
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>

      {/* 8. Confirm Dialogs */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Draft Purchase Order?"
        description={
          selectedRow?.isDraft
            ? `Delete ${selectedRow.poNumber}? This cannot be undone.`
            : "Delete the selected draft PO? This cannot be undone."
        }
        confirmLabel={deletePO.isPending ? "Deleting..." : "Delete Draft"}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={open => {
          setShowStatusDialog(open);
          if (!open) setPendingStatusChange(null);
        }}
        title="Confirm Status Change"
        description={
          pendingStatusChange
            ? `Change ${selectedRow?.poNumber ?? "this PO"} to ${PO_STATUS_LABELS[pendingStatusChange.status] ?? pendingStatusChange.status}?`
            : "Confirm status change?"
        }
        confirmLabel={
          updateStatus.isPending || submitPO.isPending || confirmPO.isPending
            ? "Updating..."
            : `Set to ${pendingStatusChange ? (PO_STATUS_LABELS[pendingStatusChange.status] ?? pendingStatusChange.status) : ""}`
        }
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
}

export default PurchaseOrderSurface;
