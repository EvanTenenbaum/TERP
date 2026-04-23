/**
 * PurchaseOrdersWorkSurface - Work Surface implementation for Purchase Orders
 * UXS-202: Aligns Purchase Orders page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract (Esc to close dialogs, Cmd+Z undo)
 * - Save state indicator (Saved/Saving/Error)
 * - Inspector panel for PO detail editing
 * - "Reward Early, Punish Late" validation
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { buildOperationsWorkspacePath } from "@/lib/workspaceRoutes";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SupplierCombobox } from "@/components/ui/supplier-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useConcurrentEditDetection } from "@/hooks/work-surface/useConcurrentEditDetection";
import { useUndo } from "@/hooks/work-surface/useUndo";
import { useValidationTiming } from "@/hooks/work-surface/useValidationTiming";
import { useExport } from "@/hooks/work-surface/useExport";
import { usePowersheetSelection } from "@/hooks/powersheet/usePowersheetSelection";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { resolveBulkCogsUpdates } from "@/components/work-surface/purchaseOrderBulkCogs";
import {
  buildPurchaseOrderCategoryOptions,
  getPurchaseOrderSubcategoryOptions,
  normalizePurchaseOrderSubcategory,
} from "@/components/work-surface/purchaseOrderCategoryOptions";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Plus,
  Search,
  Trash2,
  ShoppingCart,
  ChevronRight,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Package,
  Calendar,
  Building,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const _purchaseOrderSchema = z.object({
  supplierClientId: z.number().min(1, "Supplier is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  supplierNotes: z.string().optional(),
});

const toValidationNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : 0;
  }
  return 0;
};

const toOptionalValidationNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const next = Number(trimmed);
    return Number.isFinite(next) ? next : undefined;
  }
  return undefined;
};

const poLineSchema = z
  .object({
    supplierId: z.preprocess(
      toValidationNumber,
      z.number().positive("Select a supplier")
    ),
    productName: z.string().trim().min(1, "Type a product"),
    quantity: z.preprocess(
      toValidationNumber,
      z.number().positive("Quantity must be > 0")
    ),
    cogsMode: z.enum(["FIXED", "RANGE"]),
    unitCost: z.preprocess(
      toOptionalValidationNumber,
      z.number().nonnegative("Cost must be >= 0").optional()
    ),
    unitCostMin: z.preprocess(
      toOptionalValidationNumber,
      z.number().nonnegative("Min cost must be >= 0").optional()
    ),
    unitCostMax: z.preprocess(
      toOptionalValidationNumber,
      z.number().nonnegative("Max cost must be >= 0").optional()
    ),
  })
  .superRefine((value, ctx) => {
    if (value.cogsMode === "FIXED") {
      if (value.unitCost === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unitCost"],
          message: "Unit cost is required",
        });
      }
      return;
    }

    if (value.unitCostMin === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMin"],
        message: "Min cost is required",
      });
    }
    if (value.unitCostMax === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMax"],
        message: "Max cost is required",
      });
    }
    if (
      value.unitCostMin !== undefined &&
      value.unitCostMax !== undefined &&
      value.unitCostMax < value.unitCostMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMax"],
        message: "Max cost must be >= min cost",
      });
    }
  });

type PoCogsMode = "FIXED" | "RANGE";

interface LineItem {
  tempId: string; // Unique identifier for React keys
  productId: string;
  productName: string;
  category: string;
  subcategory: string;
  cogsMode: PoCogsMode;
  quantityOrdered: string;
  unitCost: string;
  unitCostMin: string;
  unitCostMax: string;
}

interface POFormData {
  supplierClientId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  notes: string;
  supplierNotes: string;
  items: LineItem[];
}

type PoLineValues = z.infer<typeof poLineSchema>;
type PoDraftField =
  | "productName"
  | "category"
  | "subcategory"
  | "quantityOrdered"
  | "unitCost"
  | "unitCostMin"
  | "unitCostMax";
type PoDraftFieldErrors = Partial<Record<PoDraftField, string>>;

const poDraftFieldToSchemaField: Record<PoDraftField, keyof PoLineValues> = {
  productName: "productName",
  category: "productName",
  subcategory: "productName",
  quantityOrdered: "quantity",
  unitCost: "unitCost",
  unitCostMin: "unitCostMin",
  unitCostMax: "unitCostMax",
};

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierClientId?: number;
  vendorId?: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  purchaseOrderStatus: string;
  total: string;
  paymentTerms?: string;
  notes?: string;
  vendorNotes?: string;
  version?: number;
  items?: Array<{
    id: number;
    productId: number;
    productName?: string;
    category?: string;
    subcategory?: string;
    quantityOrdered: number;
    quantityReceived?: number;
    cogsMode?: PoCogsMode;
    unitCost: number;
    unitCostMin?: number;
    unitCostMax?: number;
  }>;
}

interface POLineExportRow extends Record<string, unknown> {
  poNumber: string;
  supplier: string;
  product: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_TERMS_OPTIONS = [
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "COD", label: "COD" },
  { value: "NET_7", label: "Net 7" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "PARTIAL", label: "Partial" },
];

// TER-670: Updated to WCAG 2.2 AA-compliant color combinations (-900 text on -100 bg).
const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-[var(--info-bg)] text-[var(--info)]",
  CONFIRMED: "bg-[var(--success-bg)] text-[var(--success)]",
  RECEIVING: "bg-[var(--warning-bg)] text-[var(--warning)]",
  RECEIVED: "bg-muted text-primary",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const PO_STATUSES = [
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "RECEIVING",
  "RECEIVED",
  "CANCELLED",
] as const;
type POStatus = (typeof PO_STATUSES)[number];

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  CONFIRMED: "Confirmed",
  RECEIVING: "Receiving",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleDateString();
  } catch {
    return "Error";
  }
};

const formatCurrency = (amount: string | number | null | undefined): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${(num || 0).toFixed(2)}`;
};

const getDraftUnitCostValue = (
  item: Pick<LineItem, "cogsMode" | "unitCost" | "unitCostMin" | "unitCostMax">
): number => {
  if (item.cogsMode === "RANGE") {
    const min = Number(item.unitCostMin || 0);
    const max = Number(item.unitCostMax || 0);
    return (min + max) / 2;
  }
  return Number(item.unitCost || 0);
};

const formatItemCostLabel = (item: {
  cogsMode?: PoCogsMode;
  unitCost: number;
  unitCostMin?: number;
  unitCostMax?: number;
}) => {
  if (
    item.cogsMode === "RANGE" &&
    item.unitCostMin !== undefined &&
    item.unitCostMax !== undefined
  ) {
    return `${formatCurrency(item.unitCostMin)}-${formatCurrency(item.unitCostMax)}`;
  }
  return formatCurrency(item.unitCost);
};

const generateTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createEmptyForm = (): POFormData => ({
  supplierClientId: "",
  orderDate: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "",
  paymentTerms: "CONSIGNMENT",
  notes: "",
  supplierNotes: "",
  items: [
    {
      tempId: generateTempId(),
      productId: "",
      productName: "",
      category: "Flower",
      subcategory: "",
      cogsMode: "FIXED",
      quantityOrdered: "",
      unitCost: "",
      unitCostMin: "",
      unitCostMax: "",
    },
  ],
});

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        PO_STATUS_COLORS[status] || PO_STATUS_COLORS.DRAFT
      )}
    >
      {PO_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ============================================================================
// PO INSPECTOR CONTENT
// ============================================================================

interface POInspectorProps {
  po: PurchaseOrder | null;
  suppliers: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string }>;
  onUpdateStatus: (poId: number, status: string) => void;
  onDelete: (poId: number) => void;
}

function POInspectorContent({
  po,
  suppliers,
  products,
  onUpdateStatus,
  onDelete: _onDelete,
}: POInspectorProps) {
  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a purchase order to view details</p>
      </div>
    );
  }

  const supplierName =
    suppliers.find(s => s.id === (po.supplierClientId || po.vendorId))?.name ||
    "Unknown Supplier";

  const lineItems = po.items || [];
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  return (
    <div className="space-y-6">
      <InspectorSection title="Order Information" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="PO Number">
            <p className="font-semibold text-lg">{po.poNumber}</p>
          </InspectorField>
          <InspectorField label="Status">
            <StatusBadge status={po.purchaseOrderStatus} />
          </InspectorField>
        </div>

        <InspectorField label="Supplier">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{supplierName}</span>
          </div>
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Order Date">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(po.orderDate)}</span>
            </div>
          </InspectorField>
          {po.expectedDeliveryDate && (
            <InspectorField label="Expected Delivery">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(po.expectedDeliveryDate)}</span>
              </div>
            </InspectorField>
          )}
        </div>

        {po.paymentTerms && (
          <InspectorField label="Payment Terms">
            <span>{po.paymentTerms}</span>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title={`Line Items (${lineItems.length})`} defaultOpen>
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items</p>
        ) : (
          <div className="space-y-2">
            {lineItems.map((item, index) => {
              const productName =
                products.find(p => p.id === item.productId)?.name ||
                `Product #${item.productId}`;
              return (
                <div
                  key={item.id || index}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantityOrdered} @{" "}
                        {formatItemCostLabel({
                          cogsMode: item.cogsMode,
                          unitCost: item.unitCost,
                          unitCostMin: item.unitCostMin,
                          unitCostMax: item.unitCostMax,
                        })}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.quantityOrdered * item.unitCost)}
                    </p>
                  </div>
                  {item.quantityReceived !== undefined &&
                    item.quantityReceived > 0 && (
                      <p className="text-xs text-[var(--success)] mt-1">
                        Received: {item.quantityReceived}
                      </p>
                    )}
                </div>
              );
            })}
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(po.total || lineItemsTotal)}
              </span>
            </div>
          </div>
        )}
      </InspectorSection>

      {(po.notes || po.vendorNotes) && (
        <InspectorSection title="Notes">
          {po.notes && (
            <InspectorField label="Internal Notes">
              <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
            </InspectorField>
          )}
          {po.vendorNotes && (
            <InspectorField label="Supplier Notes">
              <p className="text-sm whitespace-pre-wrap">{po.vendorNotes}</p>
            </InspectorField>
          )}
        </InspectorSection>
      )}

      <InspectorSection title="Update Status">
        <div className="grid grid-cols-2 gap-2">
          {PO_STATUSES.filter(s => s !== po.purchaseOrderStatus).map(status => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus(po.id, status)}
              className="justify-start"
            >
              <StatusBadge status={status} />
            </Button>
          ))}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN WORK SURFACE COMPONENT
// ============================================================================

export function PurchaseOrdersWorkSurface() {
  const [, setLocation] = useLocation();
  // Auth
  useAuth(); // Required for authentication check

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [formData, setFormData] = useState<POFormData>(createEmptyForm());
  const [bulkQuantityOrdered, setBulkQuantityOrdered] = useState("");
  const [bulkCogsMode, setBulkCogsMode] = useState<PoCogsMode>("FIXED");
  const [bulkUnitCost, setBulkUnitCost] = useState("");
  const [bulkUnitCostMin, setBulkUnitCostMin] = useState("");
  const [bulkUnitCostMax, setBulkUnitCostMax] = useState("");
  const [supplierValidationError, setSupplierValidationError] = useState<
    string | null
  >(null);
  const [poDraftFieldErrors, setPoDraftFieldErrors] = useState<
    Record<string, PoDraftFieldErrors>
  >({});
  const searchInputRef = useRef<HTMLInputElement>(null); // WS-KB-001: Ref for Cmd+K focus
  const poDraftRowsRef = useRef<HTMLDivElement>(null);
  const poDraftSelection = usePowersheetSelection<string>();
  const poDraftRowIds = useMemo(
    () => formData.items.map(item => item.tempId),
    [formData.items]
  );
  const selectedPoDraftRowSet = useMemo(
    () => new Set(poDraftSelection.selectedRowIds),
    [poDraftSelection.selectedRowIds]
  );
  const selectedPoDraftIndexes = useMemo(
    () =>
      poDraftRowIds
        .map((rowId, index) => (selectedPoDraftRowSet.has(rowId) ? index : -1))
        .filter(index => index >= 0),
    [poDraftRowIds, selectedPoDraftRowSet]
  );
  const allPoDraftRowsSelected =
    poDraftRowIds.length > 0 &&
    poDraftSelection.selectedCount === poDraftRowIds.length;

  // Work Surface hooks
  const {
    saveState: _saveState,
    setSaving,
    setSaved,
    setError,
    SaveStateIndicator,
    isDirty: _isDirty,
  } = useSaveState();
  const inspector = useInspectorPanel();
  const { registerAction, undoLast } = useUndo({ enableKeyboard: false });
  const {
    handleChange: handlePoLineValidationChange,
    handleBlur: handlePoLineValidationBlur,
    validateAll: validatePoLineValues,
    setValues: setPoLineValidationValues,
    reset: resetPoLineValidation,
  } = useValidationTiming({
    schema: poLineSchema,
    initialValues: {
      supplierId: 0,
      productName: "",
      quantity: 0,
      cogsMode: "FIXED",
      unitCost: undefined,
      unitCostMin: undefined,
      unitCostMax: undefined,
    },
  });
  const { exportCSV: exportPOCSV, state: poExportState } =
    useExport<POLineExportRow>();

  // Concurrent edit detection for optimistic locking (UXS-705)
  const {
    handleError: handleConflictError,
    ConflictDialog,
    trackVersion,
  } = useConcurrentEditDetection<PurchaseOrder>({
    entityType: "Purchase Order",
    onRefresh: async () => {
      await refetch();
    },
  });

  // Display settings
  const { data: settingsData } =
    trpc.organizationSettings.getDisplaySettings.useQuery();
  const showExpectedDelivery =
    settingsData?.display?.showExpectedDelivery ?? true;
  const { data: categoriesData } = trpc.settings.categories.list.useQuery();
  const { data: subcategoriesData } =
    trpc.settings.subcategories.list.useQuery();

  // Data queries
  const {
    data: posData,
    refetch,
    isLoading: posLoading,
    error: posError,
  } = trpc.purchaseOrders.getAll.useQuery();
  const pos = useMemo(
    () =>
      Array.isArray(posData)
        ? posData
        : ((posData as unknown as { items?: PurchaseOrder[] })?.items ?? []),
    [posData]
  );

  const { data: suppliersRawData } = trpc.clients.list.useQuery({
    clientTypes: ["seller"],
    limit: 1000,
  });
  const suppliers = useMemo(() => {
    const items = Array.isArray(suppliersRawData)
      ? suppliersRawData
      : ((suppliersRawData as { items?: Array<{ id: number; name: string }> })
          ?.items ?? []);
    return items.map((client: { id: number; name: string }) => ({
      id: client.id,
      name: client.name,
    }));
  }, [suppliersRawData]);

  // BUG-114 FIX: Use product catalogue via PO endpoint for role-safe access
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = trpc.purchaseOrders.products.useQuery({
    limit: 500,
  });
  // Only fire fallback AFTER primary query settles (completes or errors)
  const primarySettled = !productsLoading;
  const primaryEmpty =
    primarySettled && (productsData?.items?.length ?? 0) === 0;
  const { data: productsListFallback } = trpc.productCatalogue.list.useQuery(
    { limit: 500, offset: 0 },
    { enabled: primaryEmpty || productsError }
  );
  const products = useMemo(() => {
    const poItems = productsData?.items ?? [];
    const fallbackItems = productsListFallback?.items ?? [];
    const items = poItems.length > 0 ? poItems : fallbackItems;
    return items
      .filter(
        product =>
          typeof product?.id === "number" &&
          typeof product?.nameCanonical === "string"
      )
      .map(product => ({
        id: product.id,
        name: product.nameCanonical,
        category: product.category ?? "",
        subcategory: product.subcategory ?? "",
      }));
  }, [productsData, productsListFallback]);

  const categoryOptions = useMemo(
    () => buildPurchaseOrderCategoryOptions(categoriesData),
    [categoriesData]
  );
  const getSubcategoryOptions = useCallback(
    (categoryName: string) =>
      getPurchaseOrderSubcategoryOptions(
        categoryName,
        categoriesData,
        subcategoriesData
      ),
    [categoriesData, subcategoriesData]
  );

  const recentSupplierProductsQuery =
    trpc.purchaseOrders.getRecentProductsBySupplier.useQuery(
      {
        supplierClientId: Number(formData.supplierClientId || 0),
        limit: 8,
      },
      {
        enabled: Number(formData.supplierClientId || 0) > 0,
      }
    );
  const supplierHistoryQuery = trpc.purchaseOrders.getBySupplier.useQuery(
    {
      supplierClientId: Number(formData.supplierClientId || 0),
    },
    {
      enabled: Number(formData.supplierClientId || 0) > 0,
    }
  );

  const productNameLookup = useMemo(
    () =>
      new Map(
        products.map(product => [product.name.trim().toLowerCase(), product])
      ),
    [products]
  );

  // Selected PO
  const selectedPO = useMemo(
    () => (pos as PurchaseOrder[]).find(po => po.id === selectedPOId) || null,
    [pos, selectedPOId]
  );

  const resolveTypedProduct = useCallback(
    (item: LineItem): LineItem => {
      const normalizedName = item.productName.trim().toLowerCase();
      if (!normalizedName) {
        return {
          ...item,
          productId: "",
        };
      }

      const match = productNameLookup.get(normalizedName);
      if (!match) {
        return {
          ...item,
          productId: "",
        };
      }

      return {
        ...item,
        productId: String(match.id),
        productName: match.name,
        category: item.category || match.category || "Flower",
        subcategory: item.subcategory || match.subcategory || "",
      };
    },
    [productNameLookup]
  );

  // Mutations
  const createPO = trpc.purchaseOrders.create.useMutation({
    onMutate: () => setSaving("Creating purchase order..."),
    onSuccess: () => {
      toast.success("Purchase order created successfully");
      setSaved();
      refetch();
      setIsCreateDialogOpen(false);
      setFormData(createEmptyForm());
      setSupplierValidationError(null);
      setPoDraftFieldErrors({});
      resetPoLineValidation();
      poDraftSelection.clearSelection();
    },
    onError: error => {
      toast.error(error.message || "Failed to create purchase order");
      setError(error.message);
    },
  });

  const restorePO = trpc.purchaseOrders.restore.useMutation({
    onError: error => {
      toast.error(error.message || "Failed to restore purchase order");
      setError(error.message);
    },
  });

  const deletePO = trpc.purchaseOrders.delete.useMutation({
    onMutate: () => setSaving("Deleting purchase order..."),
    onSuccess: (_data, variables) => {
      const deletedPO = (pos as PurchaseOrder[]).find(
        po => po.id === variables.id
      );
      const deletedLabel = deletedPO?.poNumber
        ? `PO ${deletedPO.poNumber}`
        : `PO #${variables.id}`;

      registerAction({
        description: `Deleted ${deletedLabel}`,
        undo: async () => {
          await restorePO.mutateAsync({ id: variables.id });
          setSaved();
          await refetch();
        },
        duration: 10000,
      });

      setSaved();
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedPOId(null);
      if (inspector.isOpen) inspector.close();
    },
    onError: error => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        toast.error(error.message || "Failed to delete purchase order");
        setError(error.message);
      }
    },
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onMutate: () => setSaving("Updating status..."),
    onSuccess: () => {
      toast.success("Status updated successfully");
      setSaved();
      refetch();
    },
    onError: error => {
      // Check for concurrent edit conflict first (UXS-705)
      if (!handleConflictError(error)) {
        toast.error(error.message || "Failed to update status");
        setError(error.message);
      }
    },
  });

  // Track version for optimistic locking when PO is selected (UXS-705)
  useEffect(() => {
    if (selectedPO && selectedPO.version !== undefined) {
      trackVersion(selectedPO);
    }
  }, [selectedPO, trackVersion]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    onUndo: () => {
      void undoLast();
    },
    // WS-KB-001: Add Cmd+K to focus search
    customHandlers: {
      "cmd+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": e => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
    },
    onCancel: () => {
      if (isCreateDialogOpen) {
        setIsCreateDialogOpen(false);
      } else if (isDeleteDialogOpen) {
        setIsDeleteDialogOpen(false);
      } else if (inspector.isOpen) {
        inspector.close();
      }
    },
  });

  // Filter POs
  const filteredPOs = useMemo(() => {
    return (pos as PurchaseOrder[]).filter(po => {
      const supplierId = po.supplierClientId ?? po.vendorId;
      const supplierName = suppliers.find(s => s.id === supplierId)?.name || "";
      const matchesSearch =
        (po.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || po.purchaseOrderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pos, searchQuery, statusFilter, suppliers]);

  // Statistics
  const stats = useMemo(() => {
    const all = pos as PurchaseOrder[];
    return {
      total: all.length,
      draft: all.filter(p => p.purchaseOrderStatus === "DRAFT").length,
      pending: all.filter(p =>
        ["SENT", "CONFIRMED"].includes(p.purchaseOrderStatus)
      ).length,
      receiving: all.filter(p => p.purchaseOrderStatus === "RECEIVING").length,
      totalValue: all.reduce((sum, p) => sum + parseFloat(p.total || "0"), 0),
    };
  }, [pos]);

  const statusBarLeft = isCreateDialogOpen
    ? `Draft mode • ${formData.items.length} line item${
        formData.items.length === 1 ? "" : "s"
      }`
    : `POs • ${filteredPOs.length}/${stats.total} shown`;

  const statusBarCenter = selectedPO
    ? `Selected: ${selectedPO.poNumber || `PO #${selectedPO.id}`} • ${
        selectedPO.purchaseOrderStatus || "DRAFT"
      }`
    : `${poDraftSelection.selectedCount} draft row${
        poDraftSelection.selectedCount === 1 ? "" : "s"
      } selected`;

  const statusBarHints = [
    { key: "Cmd/Ctrl+K", label: "Search" },
    { key: "Esc", label: "Close" },
    { key: "Enter/↑↓", label: "Draft Nav" },
  ];

  const createDraftTotal = useMemo(
    () =>
      formData.items.reduce((sum, item) => {
        const quantity = Number(item.quantityOrdered || 0);
        const unitCost = getDraftUnitCostValue(item);
        return sum + quantity * unitCost;
      }, 0),
    [formData.items]
  );

  const clearPoDraftFieldError = useCallback(
    (rowId: string, field: PoDraftField) => {
      setPoDraftFieldErrors(prev => {
        const rowErrors = prev[rowId];
        if (!rowErrors || !rowErrors[field]) {
          return prev;
        }

        const nextRowErrors = { ...rowErrors };
        delete nextRowErrors[field];

        if (Object.keys(nextRowErrors).length === 0) {
          const next = { ...prev };
          delete next[rowId];
          return next;
        }

        return {
          ...prev,
          [rowId]: nextRowErrors,
        };
      });
    },
    []
  );

  const buildPoLineValues = useCallback(
    (item: LineItem): PoLineValues => ({
      supplierId: Number(formData.supplierClientId || 0),
      productName: item.productName,
      quantity: Number(item.quantityOrdered || 0),
      cogsMode: item.cogsMode,
      unitCost: toOptionalValidationNumber(item.unitCost),
      unitCostMin: toOptionalValidationNumber(item.unitCostMin),
      unitCostMax: toOptionalValidationNumber(item.unitCostMax),
    }),
    [formData.supplierClientId]
  );

  const getPoDraftErrors = useCallback(
    (item: LineItem) => {
      const values = buildPoLineValues(item);
      const result = poLineSchema.safeParse(values);
      const rowErrors: PoDraftFieldErrors = {};
      let nextSupplierError: string | null = null;

      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0];
          if (field === "supplierId") {
            nextSupplierError ??= issue.message;
            continue;
          }
          if (field === "productName") {
            rowErrors.productName = issue.message;
          }
          if (field === "quantity") {
            rowErrors.quantityOrdered = issue.message;
          }
          if (field === "unitCost") {
            rowErrors.unitCost = issue.message;
          }
          if (field === "unitCostMin") {
            rowErrors.unitCostMin = issue.message;
          }
          if (field === "unitCostMax") {
            rowErrors.unitCostMax = issue.message;
          }
        }
      }

      return {
        values,
        rowErrors,
        supplierError: nextSupplierError,
      };
    },
    [buildPoLineValues]
  );

  const validatePoDraftRow = useCallback(
    (item: LineItem, field: PoDraftField) => {
      const { values, rowErrors, supplierError } = getPoDraftErrors(item);
      const schemaField = poDraftFieldToSchemaField[field];

      setPoLineValidationValues(values);
      handlePoLineValidationBlur(schemaField);

      setSupplierValidationError(supplierError);
      setPoDraftFieldErrors(prev => {
        if (Object.keys(rowErrors).length === 0) {
          if (!prev[item.tempId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[item.tempId];
          return next;
        }
        return {
          ...prev,
          [item.tempId]: rowErrors,
        };
      });
    },
    [getPoDraftErrors, handlePoLineValidationBlur, setPoLineValidationValues]
  );

  const selectedPOLineItems = useMemo<POLineExportRow[]>(() => {
    if (!selectedPO?.items?.length) {
      return [];
    }

    const supplierId = selectedPO.supplierClientId ?? selectedPO.vendorId;
    const supplierName = supplierId
      ? suppliers.find(supplier => supplier.id === supplierId)?.name ||
        "Unknown"
      : "Unknown";
    return selectedPO.items.map(item => {
      const productName =
        item.productName ||
        products.find(product => product.id === item.productId)?.name ||
        `Product #${item.productId}`;
      const quantityOrdered = Number(item.quantityOrdered || 0);
      const unitCost =
        item.cogsMode === "RANGE" &&
        item.unitCostMin !== undefined &&
        item.unitCostMax !== undefined
          ? (Number(item.unitCostMin) + Number(item.unitCostMax)) / 2
          : Number(item.unitCost || 0);
      return {
        poNumber: selectedPO.poNumber || `PO #${selectedPO.id}`,
        supplier: supplierName,
        product: productName,
        quantityOrdered,
        quantityReceived: Number(item.quantityReceived || 0),
        unitCost,
        lineTotal: quantityOrdered * unitCost,
        status: selectedPO.purchaseOrderStatus || "DRAFT",
        orderDate: formatDate(selectedPO.orderDate),
        expectedDeliveryDate: formatDate(selectedPO.expectedDeliveryDate),
      };
    });
  }, [products, selectedPO, suppliers]);

  // Handlers
  const getSupplierName = (supplierId: number | null | undefined) => {
    if (!supplierId) return "Unknown";
    return suppliers.find(s => s.id === supplierId)?.name || "Unknown";
  };

  const handleCreatePO = () => {
    let nextSupplierError: string | null = null;
    const nextRowErrors: Record<string, PoDraftFieldErrors> = {};

    for (const item of formData.items) {
      const { values, rowErrors, supplierError } = getPoDraftErrors(item);
      setPoLineValidationValues(values);
      validatePoLineValues();

      if (!nextSupplierError && supplierError) {
        nextSupplierError = supplierError;
      }
      if (Object.keys(rowErrors).length > 0) {
        nextRowErrors[item.tempId] = rowErrors;
      }
    }

    setSupplierValidationError(nextSupplierError);
    setPoDraftFieldErrors(nextRowErrors);

    if (nextSupplierError || Object.keys(nextRowErrors).length > 0) {
      toast.error("Please resolve line item validation errors before creating");
      return;
    }

    const items = formData.items.map(rawItem => {
      const item = resolveTypedProduct(rawItem);
      return {
        productId: item.productId ? Number(item.productId) : undefined,
        productName: item.productName,
        category: item.category || undefined,
        subcategory: item.subcategory || undefined,
        quantityOrdered: Number(item.quantityOrdered),
        cogsMode: item.cogsMode,
        unitCost:
          item.cogsMode === "FIXED" ? Number(item.unitCost || 0) : undefined,
        unitCostMin:
          item.cogsMode === "RANGE" ? Number(item.unitCostMin || 0) : undefined,
        unitCostMax:
          item.cogsMode === "RANGE" ? Number(item.unitCostMax || 0) : undefined,
      };
    });

    createPO.mutate({
      supplierClientId: Number(formData.supplierClientId),
      orderDate: formData.orderDate,
      expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
      paymentTerms: formData.paymentTerms || undefined,
      notes: formData.notes || undefined,
      vendorNotes: formData.supplierNotes || undefined,
      items,
    });
  };

  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
    setFormData(createEmptyForm());
    setSupplierValidationError(null);
    setPoDraftFieldErrors({});
    resetPoLineValidation();
    poDraftSelection.clearSelection();
  };

  const focusPoDraftCell = useCallback(
    (
      rowId: string,
      field: "productName" | "quantityOrdered" | "unitCost" = "productName"
    ) => {
      const root = poDraftRowsRef.current;
      if (!root) {
        return;
      }
      const selector = `[data-po-draft-row-id="${rowId}"][data-po-draft-field="${field}"]`;
      const node = root.querySelector(selector);
      if (node instanceof HTMLElement) {
        node.focus();
      }
    },
    []
  );

  const appendQuickAddItem = useCallback(
    (item: {
      productId: number;
      productName: string | null;
      category: string | null;
      subcategory: string | null;
      cogsMode: PoCogsMode;
      unitCost: string | number | null;
      unitCostMin?: string | number | null;
      unitCostMax?: string | number | null;
    }) => {
      const nextRow: LineItem = {
        tempId: generateTempId(),
        productId: String(item.productId),
        productName: item.productName ?? "",
        category: item.category ?? "Flower",
        subcategory: item.subcategory ?? "",
        cogsMode: item.cogsMode ?? "FIXED",
        quantityOrdered: "",
        unitCost:
          item.unitCost !== null && item.unitCost !== undefined
            ? String(item.unitCost)
            : "",
        unitCostMin:
          item.unitCostMin !== null && item.unitCostMin !== undefined
            ? String(item.unitCostMin)
            : "",
        unitCostMax:
          item.unitCostMax !== null && item.unitCostMax !== undefined
            ? String(item.unitCostMax)
            : "",
      };

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, nextRow],
      }));
      poDraftSelection.setSelection([nextRow.tempId]);
      requestAnimationFrame(() => {
        focusPoDraftCell(nextRow.tempId);
      });
    },
    [focusPoDraftCell, poDraftSelection]
  );

  const handleAddItem = () => {
    const newItem: LineItem = {
      tempId: generateTempId(),
      productId: "",
      productName: "",
      category: "Flower",
      subcategory: "",
      cogsMode: "FIXED",
      quantityOrdered: "",
      unitCost: "",
      unitCostMin: "",
      unitCostMax: "",
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    poDraftSelection.setSelection([newItem.tempId]);
    requestAnimationFrame(() => {
      focusPoDraftCell(newItem.tempId);
    });
  };

  const handleRemoveItem = (index: number) => {
    const removedItem = formData.items[index];
    if (!removedItem || formData.items.length <= 1) {
      return;
    }
    setFormData(prev => {
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
    setPoDraftFieldErrors(prev => {
      if (!prev[removedItem.tempId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[removedItem.tempId];
      return next;
    });
    poDraftSelection.clearSelection();

    registerAction({
      description: "Removed draft line item",
      undo: () => {
        setFormData(prev => {
          if (prev.items.some(item => item.tempId === removedItem.tempId)) {
            return prev;
          }
          const nextItems = [...prev.items];
          const insertAt = Math.min(index, nextItems.length);
          nextItems.splice(insertAt, 0, removedItem);
          return {
            ...prev,
            items: nextItems,
          };
        });
        poDraftSelection.setSelection([removedItem.tempId]);
        requestAnimationFrame(() => {
          focusPoDraftCell(removedItem.tempId);
        });
      },
    });
  };

  const duplicateSelectedDraftRows = useCallback(() => {
    if (selectedPoDraftIndexes.length === 0) {
      return;
    }
    const duplicatedRows = selectedPoDraftIndexes.map(index => ({
      ...formData.items[index],
      tempId: generateTempId(),
    }));
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...duplicatedRows],
    }));
    poDraftSelection.setSelection(duplicatedRows.map(row => row.tempId));
    requestAnimationFrame(() => {
      const firstRow = duplicatedRows[0];
      if (firstRow) {
        focusPoDraftCell(firstRow.tempId);
      }
    });
  }, [
    focusPoDraftCell,
    formData.items,
    poDraftSelection,
    selectedPoDraftIndexes,
  ]);

  const deleteSelectedDraftRows = useCallback(() => {
    if (selectedPoDraftRowSet.size === 0) {
      return;
    }

    const removedRows = formData.items
      .map((item, index) => ({ item: { ...item }, index }))
      .filter(row => selectedPoDraftRowSet.has(row.item.tempId));

    if (removedRows.length === 0) {
      return;
    }

    if (removedRows.length === formData.items.length) {
      toast.error("Keep at least one line item in the draft");
      return;
    }

    setFormData(prev => {
      return {
        ...prev,
        items: prev.items.filter(
          item => !selectedPoDraftRowSet.has(item.tempId)
        ),
      };
    });
    setPoDraftFieldErrors(prev => {
      let changed = false;
      const next = { ...prev };
      selectedPoDraftRowSet.forEach(rowId => {
        if (next[rowId]) {
          delete next[rowId];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    poDraftSelection.clearSelection();

    registerAction({
      description: `Removed ${removedRows.length} draft row${
        removedRows.length === 1 ? "" : "s"
      }`,
      undo: () => {
        setFormData(prev => {
          const nextItems = [...prev.items];
          removedRows.forEach(({ item, index }) => {
            if (nextItems.some(existing => existing.tempId === item.tempId)) {
              return;
            }
            const insertAt = Math.min(index, nextItems.length);
            nextItems.splice(insertAt, 0, item);
          });
          return {
            ...prev,
            items: nextItems,
          };
        });
        const restoredIds = removedRows.map(row => row.item.tempId);
        poDraftSelection.setSelection(restoredIds);
        const firstRestoredId = restoredIds[0];
        if (firstRestoredId) {
          requestAnimationFrame(() => {
            focusPoDraftCell(firstRestoredId);
          });
        }
      },
    });
  }, [
    focusPoDraftCell,
    formData.items,
    poDraftSelection,
    registerAction,
    selectedPoDraftRowSet,
  ]);

  const handleLineItemFieldChange = useCallback(
    (index: number, field: PoDraftField, value: string) => {
      const currentItem = formData.items[index];
      if (!currentItem) {
        return;
      }

      const nextItem =
        field === "productName"
          ? (() => {
              const resolvedItem = resolveTypedProduct({
                ...currentItem,
                productName: value,
              });

              return {
                ...resolvedItem,
                subcategory: normalizePurchaseOrderSubcategory(
                  resolvedItem.subcategory,
                  getSubcategoryOptions(resolvedItem.category)
                ),
              };
            })()
          : field === "category"
            ? {
                ...currentItem,
                category: value,
                subcategory: normalizePurchaseOrderSubcategory(
                  currentItem.subcategory,
                  getSubcategoryOptions(value)
                ),
              }
            : {
                ...currentItem,
                [field]: value,
              };

      setFormData(prev => {
        const nextItems = [...prev.items];
        nextItems[index] = nextItem;
        return {
          ...prev,
          items: nextItems,
        };
      });

      if (field === "category" || field === "subcategory") {
        return;
      }

      const values = buildPoLineValues(nextItem);
      const schemaField = poDraftFieldToSchemaField[field];

      setPoLineValidationValues(values);
      handlePoLineValidationChange(schemaField, values[schemaField]);
      clearPoDraftFieldError(currentItem.tempId, field);
    },
    [
      buildPoLineValues,
      clearPoDraftFieldError,
      formData.items,
      getSubcategoryOptions,
      handlePoLineValidationChange,
      resolveTypedProduct,
      setPoLineValidationValues,
    ]
  );

  const handleLineItemFieldBlur = useCallback(
    (item: LineItem, field: PoDraftField) => {
      const nextItem =
        field === "productName" ? resolveTypedProduct(item) : item;
      if (field === "productName" && nextItem !== item) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(existing =>
            existing.tempId === item.tempId ? nextItem : existing
          ),
        }));
      }
      validatePoDraftRow(nextItem, field);
    },
    [resolveTypedProduct, validatePoDraftRow]
  );

  const applyBulkUpdatesToSelectedRows = useCallback(
    (updates: Partial<LineItem>) => {
      if (selectedPoDraftRowSet.size === 0) {
        return;
      }
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          selectedPoDraftRowSet.has(item.tempId)
            ? { ...item, ...updates }
            : item
        ),
      }));
    },
    [selectedPoDraftRowSet]
  );

  const handleApplyBulkQuantity = useCallback(() => {
    const parsed = Number(bulkQuantityOrdered);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Bulk quantity must be greater than 0");
      return;
    }
    applyBulkUpdatesToSelectedRows({ quantityOrdered: String(parsed) });
  }, [applyBulkUpdatesToSelectedRows, bulkQuantityOrdered]);

  const handleApplyBulkCost = useCallback(() => {
    const result = resolveBulkCogsUpdates({
      cogsMode: bulkCogsMode,
      unitCost: bulkUnitCost,
      unitCostMin: bulkUnitCostMin,
      unitCostMax: bulkUnitCostMax,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    applyBulkUpdatesToSelectedRows(result.updates);
  }, [
    applyBulkUpdatesToSelectedRows,
    bulkCogsMode,
    bulkUnitCost,
    bulkUnitCostMax,
    bulkUnitCostMin,
  ]);

  const handleDraftFieldKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLInputElement>,
      rowIndex: number,
      field: "productName" | "quantityOrdered" | "unitCost"
    ) => {
      if (event.key === "Escape") {
        (event.currentTarget as HTMLInputElement).blur();
        return;
      }

      if (
        event.key !== "Enter" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const targetIndex = rowIndex + direction;
      const targetRow = formData.items[targetIndex];
      if (!targetRow) {
        return;
      }
      requestAnimationFrame(() => {
        focusPoDraftCell(targetRow.tempId, field);
      });
    },
    [focusPoDraftCell, formData.items]
  );

  useEffect(() => {
    if (poDraftSelection.selectedCount === 0) {
      return;
    }
    const validSelection = poDraftSelection.selectedRowIds.filter(rowId =>
      poDraftRowIds.includes(rowId)
    );
    if (validSelection.length !== poDraftSelection.selectedCount) {
      poDraftSelection.setSelection(validSelection);
    }
  }, [poDraftRowIds, poDraftSelection]);

  const handleUpdateStatus = (poId: number, status: string) => {
    const targetPO = (pos as PurchaseOrder[]).find(po => po.id === poId);
    const previousStatus = targetPO?.purchaseOrderStatus ?? null;
    const nextStatus = status as POStatus;
    updateStatus.mutate(
      { id: poId, status: nextStatus },
      {
        onSuccess: () => {
          if (!previousStatus || previousStatus === nextStatus) {
            return;
          }
          registerAction({
            description: `Updated ${targetPO?.poNumber ?? "PO"} status to ${nextStatus}`,
            undo: () => {
              updateStatus.mutate({
                id: poId,
                status: previousStatus as POStatus,
              });
            },
          });
        },
      }
    );
  };

  const handleDelete = (poId: number) => {
    setSelectedPOId(poId);
    setIsDeleteDialogOpen(true);
  };

  const handleExportSelectedPO = useCallback(() => {
    if (!selectedPO || selectedPOLineItems.length === 0) {
      toast.error("Select a purchase order with line items to export");
      return;
    }

    const filenameBase = selectedPO.poNumber
      ? `po_${selectedPO.poNumber.replace(/\s+/g, "_")}_line_items`
      : `po_${selectedPO.id}_line_items`;

    void exportPOCSV(selectedPOLineItems, {
      filename: filenameBase,
      addTimestamp: true,
      columns: [
        { key: "poNumber", label: "PO Number" },
        { key: "supplier", label: "Supplier" },
        { key: "product", label: "Product" },
        { key: "quantityOrdered", label: "Qty Ordered" },
        { key: "quantityReceived", label: "Qty Received" },
        {
          key: "unitCost",
          label: "Unit Cost",
          formatter: value => formatCurrency(Number(value || 0)),
        },
        {
          key: "lineTotal",
          label: "Line Total",
          formatter: value => formatCurrency(Number(value || 0)),
        },
        { key: "status", label: "Status" },
        { key: "orderDate", label: "Order Date" },
        { key: "expectedDeliveryDate", label: "Expected Delivery" },
      ],
    });
  }, [exportPOCSV, selectedPO, selectedPOLineItems]);

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Purchase Orders"
        description="Manage supplier purchase orders"
        divider
        className="px-6 py-4"
        actions={
          <>
            {SaveStateIndicator}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation(buildOperationsWorkspacePath("receiving"))}
            >
              Open Receiving Queue
            </Button>
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {stats.total}
                </span>
              </span>
              <span>
                Pending:{" "}
                <span className="font-semibold text-foreground">
                  {stats.pending}
                </span>
              </span>
              <span>
                Value:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(stats.totalValue)}
                </span>
              </span>
            </div>
          </>
        }
      />

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search by PO number or supplier... (Cmd+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PO_STATUSES.map(status => (
                <SelectItem key={status} value={status}>
                  {PO_STATUS_LABELS[status] ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportSelectedPO}
            disabled={
              poExportState.isExporting || selectedPOLineItems.length === 0
            }
            title={
              selectedPOLineItems.length === 0
                ? "Select a purchase order with line items to export"
                : "Export selected PO line items to CSV"
            }
          >
            <Download className="h-4 w-4 mr-2" />
            {poExportState.isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant={isCreateDialogOpen ? "outline" : "default"}
            onClick={() => setIsCreateDialogOpen(prev => !prev)}
          >
            {isCreateDialogOpen ? (
              <ChevronUp className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {isCreateDialogOpen ? "Hide PO Draft" : "Create PO"}
          </Button>
        </div>
      </div>

      {isCreateDialogOpen && (
        <div className="border-b bg-background px-6 py-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">New Purchase Order</h3>
                <p className="text-sm text-muted-foreground">
                  Inline powersheet drafting with keyboard-friendly entry
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Running total:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(createDraftTotal)}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <SupplierCombobox
                  value={
                    formData.supplierClientId
                      ? Number(formData.supplierClientId)
                      : null
                  }
                  onValueChange={supplierId => {
                    const nextSupplierId =
                      supplierId !== null ? String(supplierId) : "";
                    setFormData(prev => ({
                      ...prev,
                      supplierClientId: nextSupplierId,
                    }));
                    handlePoLineValidationChange(
                      "supplierId",
                      Number(nextSupplierId || 0)
                    );
                    if (nextSupplierId) {
                      setSupplierValidationError(null);
                    }
                  }}
                  suppliers={suppliers}
                  placeholder="Select supplier"
                />
                {supplierValidationError && (
                  <p className="text-xs text-destructive mt-1">
                    {supplierValidationError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={value =>
                    setFormData({ ...formData, paymentTerms: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Defaulting to consignment keeps the receiving and payable flow
                  aligned.
                </p>
              </div>
            </div>

            {Number(formData.supplierClientId || 0) > 0 && (
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Supplier history and quick add
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start typing in the spreadsheet below. Existing products
                      snap to the catalog automatically, and new names create a
                      fresh product on submit.
                    </p>
                  </div>
                  {(recentSupplierProductsQuery.isLoading ||
                    supplierHistoryQuery.isLoading) && (
                    <span className="text-xs text-muted-foreground">
                      Loading supplier history...
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-3 py-2">
                      <p className="text-sm font-medium">
                        Reorder products from prior POs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Each quick add creates a new draft row for a new batch
                        and lot.
                      </p>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Last Cost</TableHead>
                            <TableHead>Source PO</TableHead>
                            <TableHead className="w-[96px] text-right">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(recentSupplierProductsQuery.data ?? []).map(
                            item => (
                              <TableRow
                                key={`${item.productId}-${item.poNumber}`}
                                className="align-top"
                              >
                                <TableCell>
                                  <div className="font-medium">
                                    {item.productName ??
                                      `Product #${item.productId}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {[item.category, item.subcategory]
                                      .filter(Boolean)
                                      .join(" / ") || "Uncategorized"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatItemCostLabel({
                                    cogsMode: item.cogsMode,
                                    unitCost: Number(item.unitCost ?? 0),
                                    unitCostMin:
                                      item.unitCostMin !== null &&
                                      item.unitCostMin !== undefined
                                        ? Number(item.unitCostMin)
                                        : undefined,
                                    unitCostMax:
                                      item.unitCostMax !== null &&
                                      item.unitCostMax !== undefined
                                        ? Number(item.unitCostMax)
                                        : undefined,
                                  })}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div>{item.poNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(item.orderDate)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      appendQuickAddItem({
                                        productId: item.productId,
                                        productName: item.productName,
                                        category: item.category,
                                        subcategory: item.subcategory,
                                        cogsMode: item.cogsMode,
                                        unitCost: item.unitCost,
                                        unitCostMin: item.unitCostMin,
                                        unitCostMax: item.unitCostMax,
                                      })
                                    }
                                  >
                                    Add row
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                          {!recentSupplierProductsQuery.isLoading &&
                            (recentSupplierProductsQuery.data ?? []).length ===
                              0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-sm text-muted-foreground"
                                >
                                  No prior supplier items yet. Type the first
                                  product below and it will show up here next
                                  time.
                                </TableCell>
                              </TableRow>
                            )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-3 py-2">
                      <p className="text-sm font-medium">
                        Previous purchase orders
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use this to sanity-check cadence, terms, and prior PO
                        totals while you build the new batch.
                      </p>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>PO</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(supplierHistoryQuery.data ?? [])
                            .slice(0, 8)
                            .map(po => (
                              <TableRow key={po.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {po.poNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {po.paymentTerms || "CONSIGNMENT"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatDate(po.orderDate)}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    status={po.purchaseOrderStatus}
                                  />
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatCurrency(po.total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          {!supplierHistoryQuery.isLoading &&
                            (supplierHistoryQuery.data ?? []).length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-sm text-muted-foreground"
                                >
                                  This supplier does not have prior purchase
                                  orders yet.
                                </TableCell>
                              </TableRow>
                            )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              className={cn(
                "grid gap-4",
                showExpectedDelivery ? "lg:grid-cols-2" : "lg:grid-cols-1"
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={e =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                />
              </div>
              {showExpectedDelivery && (
                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate">
                    Expected Delivery
                  </Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Line Items *</Label>
                  <p className="text-xs text-muted-foreground">
                    Spreadsheet drafting with typed product lookup, bulk fills,
                    and fixed or range COGS.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              {poDraftSelection.selectedCount > 0 && (
                <div className="rounded-lg border bg-muted/40 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {poDraftSelection.selectedCount} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={duplicateSelectedDraftRows}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deleteSelectedDraftRows}
                    >
                      Delete
                    </Button>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <Input
                        value={bulkQuantityOrdered}
                        onChange={event =>
                          setBulkQuantityOrdered(event.target.value)
                        }
                        placeholder="Qty"
                        className="h-8 w-24 text-right"
                        inputMode="decimal"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleApplyBulkQuantity}
                      >
                        Apply Qty
                      </Button>
                      <Select
                        value={bulkCogsMode}
                        onValueChange={value =>
                          setBulkCogsMode(value as PoCogsMode)
                        }
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue placeholder="COGS Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Fixed COGS</SelectItem>
                          <SelectItem value="RANGE">Range COGS</SelectItem>
                        </SelectContent>
                      </Select>
                      {bulkCogsMode === "FIXED" ? (
                        <Input
                          value={bulkUnitCost}
                          onChange={event =>
                            setBulkUnitCost(event.target.value)
                          }
                          placeholder="Unit Cost"
                          className="h-8 w-24 text-right"
                          inputMode="decimal"
                        />
                      ) : (
                        <>
                          <Input
                            value={bulkUnitCostMin}
                            onChange={event =>
                              setBulkUnitCostMin(event.target.value)
                            }
                            placeholder="Min"
                            className="h-8 w-20 text-right"
                            inputMode="decimal"
                          />
                          <Input
                            value={bulkUnitCostMax}
                            onChange={event =>
                              setBulkUnitCostMax(event.target.value)
                            }
                            placeholder="Max"
                            className="h-8 w-20 text-right"
                            inputMode="decimal"
                          />
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleApplyBulkCost}
                      >
                        Apply COGS
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div
                ref={poDraftRowsRef}
                className="overflow-x-auto rounded-lg border bg-background"
              >
                <datalist id="po-product-suggestions">
                  {products.map(product => (
                    <option key={product.id} value={product.name} />
                  ))}
                </datalist>
                <Table className="min-w-[1120px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[48px]">
                        <Checkbox
                          aria-label="Select all draft rows"
                          checked={
                            allPoDraftRowsSelected
                              ? true
                              : poDraftSelection.selectedCount > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() =>
                            poDraftSelection.toggleAll(poDraftRowIds)
                          }
                        />
                      </TableHead>
                      <TableHead className="w-[56px]">Row</TableHead>
                      <TableHead className="min-w-[320px]">Product</TableHead>
                      <TableHead className="min-w-[220px]">Category</TableHead>
                      <TableHead className="w-[96px] text-right">Qty</TableHead>
                      <TableHead className="w-[160px]">COGS Mode</TableHead>
                      <TableHead className="min-w-[220px]">Cost</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Total
                      </TableHead>
                      <TableHead className="w-[72px] text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      const quantity = Number(item.quantityOrdered || 0);
                      const unitCost = getDraftUnitCostValue(item);
                      const rowTotal = quantity * unitCost;
                      const subcategoryOptions = getSubcategoryOptions(
                        item.category
                      );
                      const matchedProduct = item.productId
                        ? products.find(
                            product => product.id === Number(item.productId)
                          )
                        : productNameLookup.get(
                            item.productName.trim().toLowerCase()
                          );

                      return (
                        <TableRow
                          key={item.tempId}
                          className={cn(
                            "align-top",
                            selectedPoDraftRowSet.has(item.tempId) &&
                              "bg-muted/40"
                          )}
                        >
                          <TableCell className="align-top">
                            <Checkbox
                              aria-label={`Select draft row ${index + 1}`}
                              checked={selectedPoDraftRowSet.has(item.tempId)}
                              onCheckedChange={checked => {
                                if (
                                  (checked === true) !==
                                  poDraftSelection.isSelected(item.tempId)
                                ) {
                                  poDraftSelection.toggleRow(item.tempId);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="space-y-2 align-top">
                            <Input
                              list="po-product-suggestions"
                              placeholder="Type product name"
                              value={item.productName}
                              data-po-draft-row-id={item.tempId}
                              data-po-draft-field="productName"
                              onChange={e =>
                                handleLineItemFieldChange(
                                  index,
                                  "productName",
                                  e.target.value
                                )
                              }
                              onBlur={e =>
                                handleLineItemFieldBlur(
                                  {
                                    ...item,
                                    productName: e.target.value,
                                  },
                                  "productName"
                                )
                              }
                              onKeyDown={event =>
                                handleDraftFieldKeyDown(
                                  event,
                                  index,
                                  "productName"
                                )
                              }
                            />
                            <div className="flex items-center gap-2 text-xs">
                              {matchedProduct ? (
                                <Badge variant="secondary">
                                  Matched existing product
                                </Badge>
                              ) : item.productName.trim() ? (
                                <Badge variant="outline">
                                  New product will be created
                                </Badge>
                              ) : null}
                              {productsLoading && (
                                <span className="text-muted-foreground">
                                  Loading products...
                                </span>
                              )}
                            </div>
                            {poDraftFieldErrors[item.tempId]?.productName && (
                              <p className="text-xs text-destructive">
                                {poDraftFieldErrors[item.tempId]?.productName}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="space-y-2 align-top">
                            <Select
                              value={item.category}
                              onValueChange={value =>
                                handleLineItemFieldChange(
                                  index,
                                  "category",
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categoryOptions.map(option => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={item.subcategory || undefined}
                              onValueChange={value =>
                                handleLineItemFieldChange(
                                  index,
                                  "subcategory",
                                  value
                                )
                              }
                              disabled={subcategoryOptions.length === 0}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue
                                  placeholder={
                                    subcategoryOptions.length > 0
                                      ? "Subcategory"
                                      : "No subcategories"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {subcategoryOptions.map(subcategory => (
                                  <SelectItem
                                    key={`${item.category}-${subcategory}`}
                                    value={subcategory}
                                  >
                                    {subcategory}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              className={cn(
                                "text-right",
                                poDraftFieldErrors[item.tempId]
                                  ?.quantityOrdered && "border-red-500"
                              )}
                              placeholder="0"
                              min="0.01"
                              step="0.01"
                              data-po-draft-row-id={item.tempId}
                              data-po-draft-field="quantityOrdered"
                              value={item.quantityOrdered}
                              onChange={e =>
                                handleLineItemFieldChange(
                                  index,
                                  "quantityOrdered",
                                  e.target.value
                                )
                              }
                              onBlur={e =>
                                handleLineItemFieldBlur(
                                  {
                                    ...item,
                                    quantityOrdered: e.target.value,
                                  },
                                  "quantityOrdered"
                                )
                              }
                              onKeyDown={event =>
                                handleDraftFieldKeyDown(
                                  event,
                                  index,
                                  "quantityOrdered"
                                )
                              }
                            />
                            {poDraftFieldErrors[item.tempId]
                              ?.quantityOrdered && (
                              <p className="mt-1 text-xs text-destructive text-right">
                                {
                                  poDraftFieldErrors[item.tempId]
                                    ?.quantityOrdered
                                }
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={item.cogsMode}
                              onValueChange={value => {
                                const nextMode = value as PoCogsMode;
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map(existing =>
                                    existing.tempId === item.tempId
                                      ? {
                                          ...existing,
                                          cogsMode: nextMode,
                                          unitCost:
                                            nextMode === "FIXED"
                                              ? existing.unitCost ||
                                                existing.unitCostMin ||
                                                existing.unitCostMax
                                              : "",
                                          unitCostMin:
                                            nextMode === "RANGE"
                                              ? existing.unitCostMin ||
                                                existing.unitCost
                                              : "",
                                          unitCostMax:
                                            nextMode === "RANGE"
                                              ? existing.unitCostMax ||
                                                existing.unitCost
                                              : "",
                                        }
                                      : existing
                                  ),
                                }));
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FIXED">
                                  Fixed COGS
                                </SelectItem>
                                <SelectItem value="RANGE">
                                  Range COGS
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            {item.cogsMode === "FIXED" ? (
                              <>
                                <Input
                                  type="number"
                                  className={cn(
                                    "text-right",
                                    poDraftFieldErrors[item.tempId]?.unitCost &&
                                      "border-red-500"
                                  )}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  data-po-draft-row-id={item.tempId}
                                  data-po-draft-field="unitCost"
                                  value={item.unitCost}
                                  onChange={e =>
                                    handleLineItemFieldChange(
                                      index,
                                      "unitCost",
                                      e.target.value
                                    )
                                  }
                                  onBlur={e =>
                                    handleLineItemFieldBlur(
                                      {
                                        ...item,
                                        unitCost: e.target.value,
                                      },
                                      "unitCost"
                                    )
                                  }
                                  onKeyDown={event =>
                                    handleDraftFieldKeyDown(
                                      event,
                                      index,
                                      "unitCost"
                                    )
                                  }
                                />
                                {poDraftFieldErrors[item.tempId]?.unitCost && (
                                  <p className="mt-1 text-xs text-destructive text-right">
                                    {poDraftFieldErrors[item.tempId]?.unitCost}
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Input
                                    type="number"
                                    className={cn(
                                      "text-right",
                                      poDraftFieldErrors[item.tempId]
                                        ?.unitCostMin && "border-red-500"
                                    )}
                                    placeholder="Min"
                                    min="0"
                                    step="0.01"
                                    value={item.unitCostMin}
                                    onChange={e =>
                                      handleLineItemFieldChange(
                                        index,
                                        "unitCostMin",
                                        e.target.value
                                      )
                                    }
                                    onBlur={e =>
                                      handleLineItemFieldBlur(
                                        {
                                          ...item,
                                          unitCostMin: e.target.value,
                                        },
                                        "unitCostMin"
                                      )
                                    }
                                  />
                                  {poDraftFieldErrors[item.tempId]
                                    ?.unitCostMin && (
                                    <p className="mt-1 text-xs text-destructive">
                                      {
                                        poDraftFieldErrors[item.tempId]
                                          ?.unitCostMin
                                      }
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Input
                                    type="number"
                                    className={cn(
                                      "text-right",
                                      poDraftFieldErrors[item.tempId]
                                        ?.unitCostMax && "border-red-500"
                                    )}
                                    placeholder="Max"
                                    min="0"
                                    step="0.01"
                                    value={item.unitCostMax}
                                    onChange={e =>
                                      handleLineItemFieldChange(
                                        index,
                                        "unitCostMax",
                                        e.target.value
                                      )
                                    }
                                    onBlur={e =>
                                      handleLineItemFieldBlur(
                                        {
                                          ...item,
                                          unitCostMax: e.target.value,
                                        },
                                        "unitCostMax"
                                      )
                                    }
                                  />
                                  {poDraftFieldErrors[item.tempId]
                                    ?.unitCostMax && (
                                    <p className="mt-1 text-xs text-destructive">
                                      {
                                        poDraftFieldErrors[item.tempId]
                                          ?.unitCostMax
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-right text-sm font-medium">
                            {formatCurrency(rowTotal)}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            {formData.items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {formData.items.length} line item
                  {formData.items.length === 1 ? "" : "s"} in draft
                </span>
                <span className="font-medium text-foreground">
                  Running total: {formatCurrency(createDraftTotal)}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierNotes">Supplier Notes</Label>
                <Textarea
                  id="supplierNotes"
                  value={formData.supplierNotes}
                  onChange={e =>
                    setFormData({ ...formData, supplierNotes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCancelCreate}>
                Cancel
              </Button>
              <Button onClick={handleCreatePO} disabled={createPO.isPending}>
                {createPO.isPending ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {posLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium">Failed to load purchase orders</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {posError.message}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No purchase orders found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first purchase order"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create PO
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  {showExpectedDelivery && (
                    <TableHead>Expected Delivery</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map(po => (
                  <TableRow
                    key={po.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedPOId === po.id && "bg-muted"
                    )}
                    onClick={() => {
                      setSelectedPOId(po.id);
                      inspector.open();
                    }}
                  >
                    <TableCell className="font-medium">
                      {po.poNumber || "-"}
                    </TableCell>
                    <TableCell>
                      {getSupplierName(po.supplierClientId ?? po.vendorId)}
                    </TableCell>
                    <TableCell>{formatDate(po.orderDate)}</TableCell>
                    {showExpectedDelivery && (
                      <TableCell>
                        {formatDate(po.expectedDeliveryDate)}
                      </TableCell>
                    )}
                    <TableCell>
                      <StatusBadge status={po.purchaseOrderStatus || "DRAFT"} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedPOId(po.id);
                            inspector.open();
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(po.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedPO?.poNumber || "Purchase Order"}
          subtitle={
            selectedPO
              ? getSupplierName(
                  selectedPO.supplierClientId ?? selectedPO.vendorId
                )
              : ""
          }
        >
          <POInspectorContent
            po={selectedPO}
            suppliers={suppliers}
            products={products}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
          {selectedPO && (
            <InspectorActions>
              <Button
                variant="outline"
                onClick={() => handleDelete(selectedPO.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete PO
              </Button>
            </InspectorActions>
          )}
        </InspectorPanel>
      </div>

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={<KeyboardHintBar hints={statusBarHints} />}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete PO {selectedPO?.poNumber}? You can
            undo this action for 10 seconds.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedPO && deletePO.mutate({ id: selectedPO.id })
              }
              disabled={deletePO.isPending}
            >
              {deletePO.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concurrent Edit Conflict Dialog (UXS-705) */}
      <ConflictDialog />
    </div>
  );
}

export default PurchaseOrdersWorkSurface;
