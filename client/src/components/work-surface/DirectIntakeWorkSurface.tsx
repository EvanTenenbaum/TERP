/**
 * DirectIntakeWorkSurface - Work Surface implementation for Direct Intake
 * UXS-201: First Work Surface implementation following the atomic UX strategy
 *
 * Features:
 * - AG Grid integration with keyboard contract
 * - Save state indicator (Saved/Saving/Error/Queued)
 * - "Reward Early, Punish Late" validation
 * - Inspector panel for batch detail editing
 * - Responsive layout with Work Surface principles
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ChangeEvent,
  type SetStateAction,
} from "react";
import type {
  ColDef,
  CellValueChangedEvent,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { INTAKE_DEFAULTS } from "@/lib/constants/intakeDefaults";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useValidationTiming } from "@/hooks/work-surface/useValidationTiming";
import { useUndo } from "@/hooks/work-surface/useUndo";
import { useExport, usePowersheetSelection } from "@/hooks/work-surface";
import {
  createDirectIntakeRemovalPlan,
  submitRowsWithGuaranteedCleanup,
} from "./directIntakeSelection";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
} from "./InspectorPanel";
import { WorkSurfaceStatusBar } from "./WorkSurfaceStatusBar";

// Icons
import {
  Plus,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Package,
  Download,
  Upload,
  ChevronRight,
  X,
} from "lucide-react";

import { themeAlpine } from "ag-grid-community";
import {
  deleteSelectedRows,
  duplicateSelectedRows,
  fillDownSelectedRows,
} from "@/lib/powersheet/contracts";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const intakeRowSchema = z.object({
  vendorName: z.string().min(1, "Supplier is required"),
  brandName: z.string().min(1, "Brand/Farmer is required"),
  category: z.enum([
    "Flower",
    "Deps",
    "Concentrate",
    "Edible",
    "PreRoll",
    "Vape",
    "Other",
  ]),
  item: z.string().min(1, "Product is required"),
  // TER-223: Subcategory is first-class, category defaults to Flower
  subcategory: z.string().optional(),
  qty: z.number().min(0.01, "Quantity must be greater than 0"),
  cogs: z.number().min(0.01, "COGS must be greater than 0"),
  paymentTerms: z.enum([
    "COD",
    "NET_7",
    "NET_15",
    "NET_30",
    "CONSIGNMENT",
    "PARTIAL",
  ]),
  site: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

type IntakeRowData = z.infer<typeof intakeRowSchema>;

interface IntakeGridRow extends IntakeRowData {
  id: string;
  vendorId: number | null;
  productId: number | null;
  strainId: number | null;
  locationId: number | null;
  locationName: string;
  // TER-222: Matched strain name for validation assistant
  matchedStrainName?: string;
  status: "pending" | "submitted" | "error";
  errorMessage?: string;
}

type IntakeExportRow = IntakeGridRow & Record<string, unknown>;

interface IntakeSummary {
  totalItems: number;
  totalQty: number;
  totalValue: number;
}

type UploadedMediaUrl = {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

class UploadMediaError extends Error {
  uploaded: UploadedMediaUrl[];

  constructor(uploaded: UploadedMediaUrl[]) {
    super("Failed to upload one or more photos");
    this.name = "UploadMediaError";
    this.uploaded = uploaded;
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_TERMS_OPTIONS = [
  { value: "COD", label: "COD" },
  { value: "NET_7", label: "Net 7" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "PARTIAL", label: "Partial" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "Flower", label: "Flower" },
  { value: "Deps", label: "Deps" },
  { value: "Concentrate", label: "Concentrate" },
  { value: "Edible", label: "Edible" },
  { value: "PreRoll", label: "Pre-Roll" },
  { value: "Vape", label: "Vape" },
  { value: "Other", label: "Other" },
] as const;

const FILL_DOWN_FIELD_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "subcategory", label: "Subcategory" },
  { value: "qty", label: "Qty" },
  { value: "cogs", label: "COGS" },
  { value: "paymentTerms", label: "Payment Terms" },
  { value: "notes", label: "Notes" },
] as const;

type FillDownField = (typeof FILL_DOWN_FIELD_OPTIONS)[number]["value"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createEmptyRow = (defaults?: {
  locationId?: number | null;
  locationName?: string;
  site?: string;
}): IntakeGridRow => ({
  id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  vendorId: null,
  vendorName: "",
  brandName: "",
  // TER-223/TER-228: Default category from centralized intake defaults
  category: INTAKE_DEFAULTS.category,
  subcategory: "",
  item: "",
  productId: null,
  strainId: null,
  qty: 0,
  cogs: 0,
  paymentTerms: INTAKE_DEFAULTS.paymentTerms,
  locationId: defaults?.locationId ?? null,
  locationName: defaults?.locationName ?? "",
  site: defaults?.site ?? "",
  notes: "",
  status: "pending",
});

const normalizeRowForValidation = (row: IntakeGridRow): IntakeGridRow => {
  const vendorName = row.vendorName.trim();
  const brandName = row.brandName.trim() || vendorName;
  const item = row.item.trim();
  const site = row.site.trim();

  return {
    ...row,
    vendorName,
    brandName,
    item,
    site,
  };
};

// ============================================================================
// STATUS CELL RENDERER
// ============================================================================

function StatusCellRenderer({ data }: { data?: IntakeGridRow }) {
  const status = data?.status;
  const errorMessage = data?.errorMessage;

  if (status === "submitted") {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Submitted</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center gap-1 text-red-600"
        title={errorMessage}
      >
        <AlertCircle className="h-4 w-4" />
        <span>Error</span>
      </div>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
}

// ============================================================================
// INSPECTOR CONTENT COMPONENT
// ============================================================================

interface RowInspectorProps {
  row: IntakeGridRow | null;
  onUpdate: (updates: Partial<IntakeGridRow>) => void;
  mediaFiles: File[];
  onMediaFilesChange: (files: File[]) => void;
  vendors: { id: number; name: string }[];
  locations: { id: number; site: string }[];
  products: {
    id: number;
    name: string;
    category: string;
    subcategory?: string | null;
    strainId?: number | null;
  }[];
}

function RowInspectorContent({
  row,
  onUpdate,
  mediaFiles,
  onMediaFilesChange,
  vendors,
  locations,
  products,
}: RowInspectorProps) {
  // Validation timing for inspector fields
  const validation = useValidationTiming({
    schema: intakeRowSchema,
    initialValues: row || {},
  });

  if (!row) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a row to edit details</p>
      </div>
    );
  }

  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    // Reset input so selecting the same file twice still triggers onChange.
    e.target.value = "";

    const accepted = files.filter(
      f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );

    if (accepted.length !== files.length) {
      toast.error("Only images under 10MB are allowed");
    }

    onMediaFilesChange([...mediaFiles, ...accepted]);
  };

  const removeMedia = (index: number) => {
    onMediaFilesChange(mediaFiles.filter((_, i) => i !== index));
  };

  const clearMedia = () => onMediaFilesChange([]);

  return (
    <div className="space-y-6">
      <InspectorSection title="Supplier Information" defaultOpen>
        <InspectorField label="Supplier" required>
          <Input
            value={row.vendorName}
            list={`direct-intake-vendors-${row.id}`}
            onChange={e => {
              const value = e.target.value;
              const trimmedValue = value.trim();
              const vendor = vendors.find(v => v.name === trimmedValue);
              const shouldBackfillBrand =
                trimmedValue.length > 0 && !row.brandName.trim();
              onUpdate({
                vendorName: value,
                vendorId: vendor?.id ?? null,
                ...(shouldBackfillBrand ? { brandName: trimmedValue } : {}),
              });
              validation.handleChange("vendorName", value);
            }}
            onBlur={e => {
              const trimmedValue = e.target.value.trim();
              if (trimmedValue !== row.vendorName) {
                const vendor = vendors.find(v => v.name === trimmedValue);
                const shouldBackfillBrand =
                  trimmedValue.length > 0 && !row.brandName.trim();
                onUpdate({
                  vendorName: trimmedValue,
                  vendorId: vendor?.id ?? null,
                  ...(shouldBackfillBrand ? { brandName: trimmedValue } : {}),
                });
                validation.handleChange("vendorName", trimmedValue);
              }
              validation.handleBlur("vendorName");
            }}
            className={cn(
              validation.getFieldState("vendorName").showError &&
                "border-red-500"
            )}
            placeholder="Type vendor or choose suggestion"
          />
          <datalist id={`direct-intake-vendors-${row.id}`}>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.name} />
            ))}
          </datalist>
          {validation.getFieldState("vendorName").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("vendorName").error}
            </p>
          )}
        </InspectorField>

        <InspectorField label="Brand / Farmer" required>
          <Input
            value={row.brandName}
            onChange={e => {
              onUpdate({ brandName: e.target.value });
              validation.handleChange("brandName", e.target.value);
            }}
            onBlur={() => validation.handleBlur("brandName")}
            className={cn(
              validation.getFieldState("brandName").showError &&
                "border-red-500"
            )}
            placeholder="Enter brand or farmer name"
          />
          {validation.getFieldState("brandName").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("brandName").error}
            </p>
          )}
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="Product Details" defaultOpen>
        <InspectorField label="Category" required>
          <Select
            value={row.category}
            onValueChange={(value: IntakeGridRow["category"]) => {
              onUpdate({ category: value });
              validation.handleChange("category", value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorField>

        {/* TER-221 + TER-222: Combined product/strain field with match suggestions */}
        <InspectorField label="Product / Strain" required>
          <Input
            value={row.item}
            list={`direct-intake-products-${row.id}`}
            onChange={e => {
              const value = e.target.value;
              const product = products.find(p => p.name === value);
              const categoryValue = product?.category as
                | IntakeRowData["category"]
                | undefined;
              onUpdate({
                item: value,
                productId: product?.id ?? null,
                strainId: product?.strainId ?? null,
                category: categoryValue ?? row.category,
              });
              validation.handleChange("item", value);
            }}
            onBlur={e => {
              const trimmedValue = e.target.value.trim();
              if (trimmedValue !== row.item) {
                const product = products.find(p => p.name === trimmedValue);
                const categoryValue = product?.category as
                  | IntakeRowData["category"]
                  | undefined;
                onUpdate({
                  item: trimmedValue,
                  productId: product?.id ?? null,
                  strainId: product?.strainId ?? null,
                  category: categoryValue ?? row.category,
                });
                validation.handleChange("item", trimmedValue);
              }
              validation.handleBlur("item");
            }}
            className={cn(
              validation.getFieldState("item").showError && "border-red-500"
            )}
            placeholder="Type product or choose suggestion"
          />
          <datalist id={`direct-intake-products-${row.id}`}>
            {products.map(product => (
              <option key={product.id} value={product.name} />
            ))}
          </datalist>
          {validation.getFieldState("item").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("item").error}
            </p>
          )}
          {/* TER-222: Strain validation assistant — show matched strain info */}
          {row.strainId && row.productId && (
            <div className="flex items-center gap-2 mt-1 p-1.5 bg-green-50 rounded text-xs text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              <span>Matched to existing product (strain #{row.strainId})</span>
            </div>
          )}
          {row.item && !row.productId && (
            <div className="flex items-center gap-2 mt-1 p-1.5 bg-yellow-50 rounded text-xs text-yellow-700">
              <AlertCircle className="h-3 w-3" />
              <span>New product — will be created on submit</span>
            </div>
          )}
        </InspectorField>

        {/* TER-223: Subcategory field — prioritized per user feedback */}
        <InspectorField label="Subcategory">
          <Input
            value={row.subcategory || ""}
            onChange={e => {
              onUpdate({ subcategory: e.target.value });
            }}
            placeholder="e.g., Indoor, Outdoor, Greenhouse..."
          />
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={row.qty || ""}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                onUpdate({ qty: val });
                validation.handleChange("qty", val);
              }}
              onBlur={() => validation.handleBlur("qty")}
              className={cn(
                validation.getFieldState("qty").showError && "border-red-500"
              )}
            />
            {validation.getFieldState("qty").showError && (
              <p className="text-xs text-red-500 mt-1">
                {validation.getFieldState("qty").error}
              </p>
            )}
          </InspectorField>

          <InspectorField label="COGS ($)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={row.cogs || ""}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                onUpdate({ cogs: val });
                validation.handleChange("cogs", val);
              }}
              onBlur={() => validation.handleBlur("cogs")}
              className={cn(
                validation.getFieldState("cogs").showError && "border-red-500"
              )}
            />
            {validation.getFieldState("cogs").showError && (
              <p className="text-xs text-red-500 mt-1">
                {validation.getFieldState("cogs").error}
              </p>
            )}
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="Transaction Details" defaultOpen>
        <InspectorField label="Payment Terms" required>
          <Select
            value={row.paymentTerms}
            onValueChange={(value: IntakeGridRow["paymentTerms"]) => {
              onUpdate({ paymentTerms: value });
              validation.handleChange("paymentTerms", value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorField>

        <InspectorField label="Location" required>
          <Select
            value={row.site}
            onValueChange={value => {
              const location = locations.find(l => l.site === value);
              onUpdate({
                site: value,
                locationId: location?.id || null,
                locationName: value,
              });
              validation.handleChange("site", value);
            }}
          >
            <SelectTrigger
              className={cn(
                validation.getFieldState("site").showError && "border-red-500"
              )}
            >
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.length === 0 ? (
                <SelectItem value="no-locations" disabled>
                  No locations available
                </SelectItem>
              ) : (
                locations.map(l => (
                  <SelectItem key={l.id} value={l.site}>
                    {l.site}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {validation.getFieldState("site").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("site").error}
            </p>
          )}
        </InspectorField>

        <InspectorField label="Notes">
          <Textarea
            value={row.notes || ""}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="Add any notes about this intake..."
            rows={3}
          />
          {/* TER-224: Notes traceability — show where notes are stored */}
          <p className="text-xs text-muted-foreground mt-1">
            Notes are saved with the batch record and visible in Inventory
            details.
          </p>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="Photos" defaultOpen>
        <InspectorField label={`Attached (${mediaFiles.length})`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMediaUpload}
                className="hidden"
                id={`direct-intake-media-${row.id}`}
              />
              <label
                htmlFor={`direct-intake-media-${row.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm"
              >
                <Upload className="h-4 w-4" />
                Add photos
              </label>

              {mediaFiles.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearMedia}
                >
                  Clear
                </Button>
              )}
            </div>

            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                {mediaFiles.map((file, index) => (
                  <div
                    key={`intake-media-${file.name}-${file.size}`}
                    className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-md"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Photos upload when you submit this row.
            </p>
          </div>
        </InspectorField>
      </InspectorSection>

      {/* Row Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Line Total</span>
          <span className="font-semibold text-lg">
            ${((row.qty || 0) * (row.cogs || 0)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WORK SURFACE COMPONENT
// ============================================================================

export function DirectIntakeWorkSurface() {
  // TER-218: Start with multiple rows for faster multi-item intake
  const INITIAL_ROW_COUNT = 5;
  const [rows, setRows] = useState<IntakeGridRow[]>(() =>
    Array.from({ length: INITIAL_ROW_COUNT }, () => createEmptyRow())
  );
  const visibleRowIds = useMemo(() => rows.map(row => row.id), [rows]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [fillDownField, setFillDownField] = useState<FillDownField>("cogs");
  const rowSelection = usePowersheetSelection<string>({
    visibleIds: visibleRowIds,
  });
  const [rowMediaFilesById, setRowMediaFilesById] = useState<
    Record<string, File[]>
  >({});
  const rowsRef = useRef<IntakeGridRow[]>(rows);
  const rowMediaFilesByIdRef =
    useRef<Record<string, File[]>>(rowMediaFilesById);
  const updateRows = useCallback((updater: SetStateAction<IntakeGridRow[]>) => {
    setRows(prevRows => {
      const nextRows =
        typeof updater === "function"
          ? (updater as (value: IntakeGridRow[]) => IntakeGridRow[])(prevRows)
          : updater;
      rowsRef.current = nextRows;
      return nextRows;
    });
  }, []);
  const updateRowMediaFilesById = useCallback(
    (updater: SetStateAction<Record<string, File[]>>) => {
      setRowMediaFilesById(prev => {
        const nextFiles =
          typeof updater === "function"
            ? (
                updater as (
                  value: Record<string, File[]>
                ) => Record<string, File[]>
              )(prev)
            : updater;
        rowMediaFilesByIdRef.current = nextFiles;
        return nextFiles;
      });
    },
    []
  );
  const selectedRowIds = useMemo(
    () => Array.from(rowSelection.selectedIds),
    [rowSelection.selectedIds]
  );
  const replaceSelection = useCallback(
    (rowIds: string[]) => {
      rowSelection.clear();
      for (const rowId of Array.from(new Set(rowIds))) {
        rowSelection.toggle(rowId, true);
      }
    },
    [rowSelection]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gridApiRef = useRef<GridApi | null>(null);
  const undo = useUndo({ enableKeyboard: false });
  const { exportCSV, state: exportState } = useExport<IntakeExportRow>();

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState({
    onStateChange: state => {
      if (state.status === "error") {
        toast.error(state.message || "Save failed");
      }
    },
  });

  const inspector = useInspectorPanel();

  // Selected row
  const selectedRow = useMemo(
    () => rows.find(r => r.id === selectedRowId) || null,
    [rows, selectedRowId]
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    rowMediaFilesByIdRef.current = rowMediaFilesById;
  }, [rowMediaFilesById]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedRowId(null);
      return;
    }
    if (selectedRowId && rows.some(row => row.id === selectedRowId)) {
      return;
    }
    const firstPending = rows.find(row => row.status === "pending");
    setSelectedRowId(firstPending?.id ?? rows[0].id);
  }, [rows, selectedRowId]);

  // Keep powersheet selection in sync with the currently focused row so
  // top controls (Submit/Duplicate/Remove Selected) are always actionable.
  useEffect(() => {
    if (!selectedRowId) return;
    if (rowSelection.selectedCount > 0) return;
    replaceSelection([selectedRowId]);
  }, [replaceSelection, rowSelection.selectedCount, selectedRowId]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: true, // Let AG Grid handle Tab navigation
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    onUndo: () => {
      void undo.undoLast();
    },
    onRowCommit: () => {
      // Commit current row on Enter
      if (selectedRow && selectedRow.status === "pending") {
        void handleSubmitRow(selectedRow);
      }
    },
    onRowCreate: () => {
      // Create new row after successful commit
      handleAddRow();
    },
    onCancel: () => {
      // Clear selection on Escape
      setSelectedRowId(null);
      rowSelection.clear();
      if (inspector.isOpen) {
        inspector.close();
      }
    },
    validateRow: () => {
      if (!selectedRow) return true;
      const result = intakeRowSchema.safeParse(selectedRow);
      return result.success;
    },
  });

  // Data queries
  const {
    data: vendorsData,
    isLoading: vendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = trpc.clients.list.useQuery({ clientTypes: ["seller"] });

  const vendors = useMemo<Array<{ id: number; name: string }>>(() => {
    const items =
      vendorsData &&
      typeof vendorsData === "object" &&
      "data" in vendorsData &&
      Array.isArray(vendorsData.data)
        ? (vendorsData.data as Array<{ id?: unknown; name?: unknown }>)
        : vendorsData &&
            typeof vendorsData === "object" &&
            "items" in vendorsData &&
            Array.isArray(vendorsData.items)
          ? (vendorsData.items as Array<{ id?: unknown; name?: unknown }>)
          : [];
    return items
      .filter(
        (item): item is { id: number; name: string } =>
          typeof item?.id === "number" && typeof item?.name === "string"
      )
      .map(item => ({ id: item.id, name: item.name }));
  }, [vendorsData]);

  const {
    data: locationsData,
    isLoading: locationsLoading,
    error: locationsError,
    refetch: refetchLocations,
  } = trpc.locations.getAll.useQuery();
  const locations = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData]
  );
  const mainWarehouse = useMemo(
    () =>
      locations.find(l =>
        l.site?.toLowerCase().includes(INTAKE_DEFAULTS.defaultWarehouseMatch)
      ) ?? locations[0],
    [locations]
  );
  const defaultLocationOverrides = useMemo(
    () =>
      mainWarehouse
        ? {
            locationId: mainWarehouse.id,
            locationName: mainWarehouse.site ?? "",
            site: mainWarehouse.site ?? "",
          }
        : undefined,
    [mainWarehouse]
  );

  // Apply main warehouse default to initial rows when locations data loads
  useEffect(() => {
    if (!defaultLocationOverrides) return;
    updateRows(prev =>
      prev.map(row =>
        row.locationId === null && row.status === "pending"
          ? { ...row, ...defaultLocationOverrides }
          : row
      )
    );
  }, [defaultLocationOverrides, updateRows]);

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = trpc.productCatalogue.list.useQuery({
    limit: 500,
  });
  const products = useMemo(() => {
    const items = productsData?.items ?? [];
    return items
      .filter(
        item =>
          typeof item?.id === "number" &&
          typeof item?.nameCanonical === "string"
      )
      .map(item => ({
        id: item.id,
        name: item.nameCanonical,
        category: item.category,
        subcategory: item.subcategory,
        strainId: item.strainId ?? null,
      }));
  }, [productsData?.items]);

  // Mutation
  const intakeMutation = trpc.inventory.intake.useMutation();
  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation();

  // Loading state
  const isLoadingData = vendorsLoading || locationsLoading || productsLoading;
  const dataError = vendorsError || locationsError || productsError;

  // Column definitions
  const columnDefs = useMemo<ColDef<IntakeGridRow>[]>(
    () => [
      {
        headerName: "Supplier",
        field: "vendorName",
        minWidth: 130,
        flex: 1,
        editable: params => params.data?.status === "pending",
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          useFormatter: false,
        },
        tooltipValueGetter: () =>
          vendors.length > 0
            ? `Type to search ${vendors.length} suppliers or enter new`
            : "Type supplier name",
      },
      {
        headerName: "Product / Strain",
        field: "item",
        minWidth: 180,
        flex: 2,
        editable: params => params.data?.status === "pending",
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          useFormatter: false,
        },
        tooltipValueGetter: () =>
          products.length > 0
            ? `Type to search ${products.length} products or enter new`
            : "Type product/strain name",
      },
      {
        headerName: "Qty",
        field: "qty",
        width: 90,
        editable: params => params.data?.status === "pending",
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS",
        field: "cogs",
        width: 100,
        editable: params => params.data?.status === "pending",
        valueFormatter: params => `$${(params.value ?? 0).toFixed(2)}`,
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "Location",
        field: "site",
        minWidth: 120,
        flex: 1,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: locations.map(l => l.site) },
      },
      {
        headerName: "Notes",
        field: "notes",
        width: 70,
        editable: false,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<IntakeGridRow>) => {
          const hasNotes =
            params.data?.notes && params.data.notes.trim().length > 0;
          return hasNotes ? (
            <span
              title={`Notes: ${params.data?.notes}`}
              className="text-blue-600 cursor-help"
            >
              📝
            </span>
          ) : null;
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        cellRenderer: (params: ICellRendererParams<IntakeGridRow>) => (
          <StatusCellRenderer data={params.data} />
        ),
        editable: false,
      },
      {
        headerName: "Edit",
        colId: "actions",
        width: 64,
        cellRenderer: (params: ICellRendererParams<IntakeGridRow>) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={e => {
              e.stopPropagation();
              setSelectedRowId(params.data?.id ?? null);
              inspector.open();
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ),
        editable: false,
        sortable: false,
        filter: false,
      },
    ],
    [vendors, locations, products, inspector]
  );

  const defaultColDef = useMemo<ColDef<IntakeGridRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // Event handlers
  const handleGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api;
    window.requestAnimationFrame(() => {
      event.api.sizeColumnsToFit();
    });
  }, []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IntakeGridRow>) => {
      if (!event.data) return;

      setSaving(); // Mark as saving when changes occur

      const nextRow: IntakeGridRow = {
        ...event.data,
      };

      // Normalize vendor linkage (and auto-fill brand) when vendor name changes.
      if (event.colDef.field === "vendorName") {
        const nextVendorName =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.vendorName = nextVendorName;
        if (!nextRow.brandName?.trim() && nextVendorName) {
          nextRow.brandName = nextVendorName;
        }

        const vendor = vendors.find(v => v.name === nextVendorName);
        if (vendor) {
          nextRow.vendorId = vendor.id;
          if (!nextRow.brandName?.trim()) {
            nextRow.brandName = vendor.name;
          }
        } else {
          nextRow.vendorId = null;
        }
      }

      // Normalize location linkage when site changes.
      if (event.colDef.field === "site") {
        const nextSite =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.site = nextSite;
        const location = locations.find(l => l.site === nextSite);
        if (location) {
          nextRow.locationId = location.id;
          nextRow.locationName = location.site;
        } else {
          nextRow.locationId = null;
          nextRow.locationName = "";
        }
      }

      // Normalize product linkage when item text changes.
      if (event.colDef.field === "item") {
        const nextItem =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.item = nextItem;
        const product = products.find(p => p.name === nextItem);
        if (product) {
          nextRow.productId = product.id;
          nextRow.strainId = product.strainId ?? null;
          nextRow.category = product.category as IntakeRowData["category"];
        } else {
          nextRow.productId = null;
          nextRow.strainId = null;
        }
      }

      // Reset error status when editing after a validation failure
      if (nextRow.status === "error") {
        nextRow.status = "pending";
        nextRow.errorMessage = undefined;
      }

      // Update rows state
      updateRows(prevRows =>
        prevRows.map(row =>
          row.id === nextRow.id
            ? {
                ...row,
                ...nextRow,
              }
            : row
        )
      );

      // Mark as saved after a short debounce (simulating auto-save)
      setTimeout(() => setSaved(), 500);
    },
    [vendors, locations, products, setSaving, setSaved, updateRows]
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<IntakeGridRow>) => {
      const selectedRows = event.api.getSelectedRows();
      const selectedIds = selectedRows.map(row => row.id);
      replaceSelection(selectedIds);
      setSelectedRowId(selectedIds[0] ?? null);
    },
    [replaceSelection]
  );

  const handleAddRow = useCallback(() => {
    const newRow = createEmptyRow(defaultLocationOverrides);
    updateRows(prev => [...prev, newRow]);
    setSelectedRowId(newRow.id);
    replaceSelection([newRow.id]);

    // Focus the new row
    setTimeout(() => {
      if (gridApiRef.current) {
        const rowIndex = rows.length;
        gridApiRef.current.ensureIndexVisible(rowIndex);
        const rowNode = gridApiRef.current.getDisplayedRowAtIndex(rowIndex);
        rowNode?.setSelected(true);
        gridApiRef.current.setFocusedCell(rowIndex, "vendorName");
      }
    }, 50);
  }, [defaultLocationOverrides, replaceSelection, rows.length, updateRows]);

  const removeRowsWithUndo = useCallback(
    (rowIds: string[]) => {
      const currentRows = rowsRef.current;
      const selectedRowIds = new Set(rowIds);
      const nextRowsAfterDeleteContract = deleteSelectedRows({
        rows: currentRows,
        selectedRowIds,
        getRowId: row => row.id,
        minimumRows: 1,
      });
      const remainingIds = new Set(
        nextRowsAfterDeleteContract.map(row => row.id)
      );
      const contractRemovedIds = currentRows
        .filter(row => !remainingIds.has(row.id))
        .map(row => row.id);

      const removalPlan = createDirectIntakeRemovalPlan(
        currentRows,
        contractRemovedIds.length > 0 ? contractRemovedIds : rowIds
      );
      if (removalPlan.blocked) {
        toast.error("Cannot remove all pending rows. Keep at least one row.");
        return;
      }
      if (removalPlan.removedIds.length === 0) {
        return;
      }

      const previousRows = currentRows;
      const previousRowIds = new Set(previousRows.map(row => row.id));
      const removedRows = previousRows.filter(row =>
        removalPlan.removedIds.includes(row.id)
      );
      const removedMediaById = removalPlan.removedIds.reduce<
        Record<string, File[]>
      >((acc, rowId) => {
        const files = rowMediaFilesByIdRef.current[rowId];
        if (files) {
          acc[rowId] = files;
        }
        return acc;
      }, {});

      undo.registerAction({
        description: `Removed ${removedRows.length} row(s)`,
        undo: () => {
          updateRows(current => {
            const currentById = new Map(current.map(row => [row.id, row]));
            const removedById = new Map(removedRows.map(row => [row.id, row]));
            const restored: IntakeGridRow[] = [];

            // Preserve original ordering, restoring removed rows where missing.
            for (const previousRow of previousRows) {
              const currentRow = currentById.get(previousRow.id);
              if (currentRow) {
                restored.push(currentRow);
                continue;
              }
              const removedRow = removedById.get(previousRow.id);
              if (removedRow) {
                restored.push(removedRow);
              }
            }

            // Keep rows created after deletion.
            for (const currentRow of current) {
              if (!previousRowIds.has(currentRow.id)) {
                restored.push(currentRow);
              }
            }

            return restored;
          });

          updateRowMediaFilesById(prev => {
            const next = { ...prev };
            for (const [rowId, files] of Object.entries(removedMediaById)) {
              if (!next[rowId]) {
                next[rowId] = files;
              }
            }
            return next;
          });

          replaceSelection(removedRows.map(row => row.id));
          setSelectedRowId(removedRows[0]?.id ?? null);
        },
      });

      updateRows(removalPlan.nextRows);
      updateRowMediaFilesById(prev => {
        const next = { ...prev };
        for (const rowId of removalPlan.removedIds) {
          delete next[rowId];
        }
        return next;
      });
      rowSelection.clear();
      setSelectedRowId(null);
    },
    [replaceSelection, rowSelection, undo, updateRows, updateRowMediaFilesById]
  );

  const handleRemoveRow = useCallback(
    (rowId: string) => {
      removeRowsWithUndo([rowId]);
    },
    [removeRowsWithUndo]
  );

  const uploadMediaFiles = useCallback(
    async (files: File[]) => {
      const uploaded: UploadedMediaUrl[] = [];

      for (const file of files) {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result =
                typeof reader.result === "string" ? reader.result : "";
              const base64 = result.split(",")[1] || "";
              resolve(base64);
            };
            reader.onerror = () =>
              reject(reader.error ?? new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });

          const result = await uploadMediaMutation.mutateAsync({
            fileData: base64Data,
            fileName: file.name,
            fileType: file.type,
          });

          uploaded.push({
            url: result.url,
            fileName: result.fileName,
            fileType: result.fileType,
            fileSize: result.fileSize,
          });
        } catch {
          throw new UploadMediaError(uploaded);
        }
      }

      return uploaded;
    },
    [uploadMediaMutation]
  );

  const handleSubmitRow = useCallback(
    async (row: IntakeGridRow) => {
      const liveRow = rowsRef.current.find(r => r.id === row.id) ?? row;
      const normalizedRow = normalizeRowForValidation(liveRow);
      updateRows(prev =>
        prev.map(r => (r.id === row.id ? { ...r, ...normalizedRow } : r))
      );

      // Validate
      const result = intakeRowSchema.safeParse(normalizedRow);
      if (!result.success) {
        const firstError = result.error.issues[0];
        updateRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage: firstError?.message || "Validation failed",
                }
              : r
          )
        );
        toast.error(firstError?.message || "Validation failed");
        return;
      }

      const mediaFiles = rowMediaFilesByIdRef.current[row.id] ?? [];
      let uploadedMediaUrls: UploadedMediaUrl[] = [];

      try {
        if (mediaFiles.length > 0) {
          setSaving("Uploading photos...");
          try {
            uploadedMediaUrls = await uploadMediaFiles(mediaFiles);
          } catch (err) {
            if (err instanceof UploadMediaError) {
              uploadedMediaUrls = err.uploaded;
            }
            throw err;
          }
        }

        setSaving("Submitting intake...");
        await intakeMutation.mutateAsync({
          vendorName: normalizedRow.vendorName,
          brandName: normalizedRow.brandName,
          productName: normalizedRow.item,
          category: normalizedRow.category,
          subcategory: normalizedRow.subcategory || undefined,
          strainId: normalizedRow.strainId,
          quantity: normalizedRow.qty,
          cogsMode: "FIXED" as const,
          unitCogs: normalizedRow.cogs.toFixed(2),
          paymentTerms: normalizedRow.paymentTerms,
          location: { site: normalizedRow.site },
          metadata: normalizedRow.notes
            ? { notes: normalizedRow.notes }
            : undefined,
          mediaUrls:
            uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined,
        });

        // Mark as submitted
        updateRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, status: "submitted" as const } : r
          )
        );
        updateRowMediaFilesById(prev => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        setSaved();
        toast.success("Intake submitted successfully");
      } catch (error) {
        // Rollback uploaded files if intake failed
        if (uploadedMediaUrls.length > 0) {
          try {
            setSaving("Cleaning up uploaded photos...");
            await Promise.all(
              uploadedMediaUrls.map(media =>
                deleteMediaMutation.mutateAsync({ url: media.url })
              )
            );
          } catch (cleanupError) {
            console.error("Failed to cleanup media files:", cleanupError);
            toast.warning("Some uploaded photos could not be cleaned up");
          }
        }

        const message =
          error instanceof Error ? error.message : "Failed to submit intake";
        updateRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? { ...r, status: "error" as const, errorMessage: message }
              : r
          )
        );
        setError(message);
      }
    },
    [
      deleteMediaMutation,
      intakeMutation,
      setSaving,
      setSaved,
      setError,
      updateRows,
      updateRowMediaFilesById,
      uploadMediaFiles,
    ]
  );

  const handleSubmitAll = useCallback(async () => {
    const currentRows = rowsRef.current;
    const normalizedPendingRows = currentRows
      .filter(row => row.status === "pending")
      .map(normalizeRowForValidation);

    updateRows(prev =>
      prev.map(row => {
        if (row.status !== "pending") return row;
        const normalized = normalizedPendingRows.find(r => r.id === row.id);
        return normalized ? { ...row, ...normalized } : row;
      })
    );

    const validationResults = normalizedPendingRows.map(row => ({
      row,
      result: intakeRowSchema.safeParse(row),
    }));

    const invalidRows = validationResults.filter(
      ({ result }) => !result.success
    );
    const pendingRows = validationResults
      .filter(({ result }) => result.success)
      .map(({ row }) => row);

    if (invalidRows.length > 0) {
      updateRows(prev =>
        prev.map(row => {
          const invalid = invalidRows.find(item => item.row.id === row.id);
          if (!invalid) return row;
          const firstIssue = invalid.result.success
            ? null
            : invalid.result.error.issues[0];
          return {
            ...row,
            status: "error" as const,
            errorMessage: firstIssue?.message ?? "Validation failed",
          };
        })
      );
    }

    if (pendingRows.length === 0) {
      toast.error(
        "No valid rows to submit. Ensure all required fields are filled."
      );
      return;
    }

    setIsSubmitting(true);
    setSaving(`Submitting ${pendingRows.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    for (const row of pendingRows) {
      const mediaFiles = rowMediaFilesByIdRef.current[row.id] ?? [];
      let uploadedMediaUrls: UploadedMediaUrl[] = [];

      try {
        if (mediaFiles.length > 0) {
          setSaving(`Uploading photos for ${row.item || "row"}...`);
          try {
            uploadedMediaUrls = await uploadMediaFiles(mediaFiles);
          } catch (err) {
            if (err instanceof UploadMediaError) {
              uploadedMediaUrls = err.uploaded;
            }
            throw err;
          }
        }

        setSaving(`Submitting ${pendingRows.length} records...`);
        await intakeMutation.mutateAsync({
          vendorName: row.vendorName,
          brandName: row.brandName,
          productName: row.item,
          category: row.category,
          subcategory: row.subcategory || undefined,
          strainId: row.strainId,
          quantity: row.qty,
          cogsMode: "FIXED" as const,
          unitCogs: row.cogs.toFixed(2),
          paymentTerms: row.paymentTerms,
          location: { site: row.site },
          metadata: row.notes ? { notes: row.notes } : undefined,
          mediaUrls:
            uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined,
        });

        updateRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, status: "submitted" as const } : r
          )
        );
        updateRowMediaFilesById(prev => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        successCount++;
      } catch (error) {
        if (uploadedMediaUrls.length > 0) {
          try {
            setSaving("Cleaning up uploaded photos...");
            await Promise.all(
              uploadedMediaUrls.map(media =>
                deleteMediaMutation.mutateAsync({ url: media.url })
              )
            );
          } catch (cleanupError) {
            console.error("Failed to cleanup media files:", cleanupError);
            toast.warning("Some uploaded photos could not be cleaned up");
          }
        }

        updateRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage:
                    error instanceof Error ? error.message : "Failed",
                }
              : r
          )
        );
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully submitted ${successCount} intake record(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to submit ${errorCount} record(s)`);
      setError(`${errorCount} records failed`);
    } else {
      setSaved();
    }

    setIsSubmitting(false);
  }, [
    deleteMediaMutation,
    intakeMutation,
    setSaving,
    setSaved,
    setError,
    updateRows,
    updateRowMediaFilesById,
    uploadMediaFiles,
  ]);

  const handleExportCsv = useCallback(async () => {
    try {
      await exportCSV(rowsRef.current as IntakeExportRow[], {
        columns: [
          { key: "vendorName", label: "Vendor" },
          { key: "brandName", label: "Brand" },
          { key: "item", label: "Product" },
          { key: "category", label: "Category" },
          { key: "subcategory", label: "Subcategory" },
          { key: "qty", label: "Qty" },
          { key: "cogs", label: "COGS" },
          {
            key: "lineTotal",
            label: "Line Total",
            formatter: (_value, row) =>
              ((row.qty || 0) * (row.cogs || 0)).toFixed(2),
          },
          { key: "paymentTerms", label: "Payment Terms" },
          { key: "site", label: "Location" },
          { key: "status", label: "Status" },
          { key: "notes", label: "Notes" },
        ],
        filename: "direct-intake-sessions",
        addTimestamp: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export intake CSV";
      toast.error(message);
    }
  }, [exportCSV]);

  const handleUpdateSelectedRow = useCallback(
    (updates: Partial<IntakeGridRow>) => {
      if (!selectedRowId) return;
      setSaving();
      updateRows(prev =>
        prev.map(r =>
          r.id === selectedRowId
            ? (() => {
                const nextVendorName =
                  typeof updates.vendorName === "string"
                    ? updates.vendorName.trim()
                    : undefined;
                const shouldBackfillBrand =
                  typeof updates.brandName === "undefined" &&
                  !!nextVendorName &&
                  !r.brandName.trim();

                return {
                  ...r,
                  ...updates,
                  ...(typeof nextVendorName === "string"
                    ? { vendorName: nextVendorName }
                    : {}),
                  ...(shouldBackfillBrand ? { brandName: nextVendorName } : {}),
                  status: r.status === "error" ? "pending" : r.status,
                  errorMessage:
                    r.status === "error" ? undefined : r.errorMessage,
                };
              })()
            : r
        )
      );
      setTimeout(() => setSaved(), 500);
    },
    [selectedRowId, setSaving, setSaved, updateRows]
  );

  useEffect(() => {
    const fitGrid = () => {
      if (!gridApiRef.current) return;
      gridApiRef.current.sizeColumnsToFit();
    };
    const timer = window.setTimeout(fitGrid, 0);
    window.addEventListener("resize", fitGrid);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", fitGrid);
    };
  }, [rows.length, inspector.isOpen]);

  // Summary calculation
  const summary = useMemo<IntakeSummary>(() => {
    const pendingRows = rows.filter(r => r.status === "pending");
    return {
      totalItems: pendingRows.length,
      totalQty: pendingRows.reduce((sum, r) => sum + r.qty, 0),
      totalValue: pendingRows.reduce((sum, r) => sum + r.qty * r.cogs, 0),
    };
  }, [rows]);

  useEffect(() => {
    if (rowSelection.selectedCount === 0) {
      return;
    }
    const validSelection = selectedRowIds.filter(selectedId =>
      rows.some(row => row.id === selectedId)
    );
    if (validSelection.length !== rowSelection.selectedCount) {
      replaceSelection(validSelection);
    }
  }, [replaceSelection, rowSelection.selectedCount, rows, selectedRowIds]);

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const submittedCount = rows.filter(r => r.status === "submitted").length;
  const errorCount = rows.filter(r => r.status === "error").length;
  const selectedRows = useMemo(
    () => rows.filter(row => rowSelection.selectedIds.has(row.id)),
    [rowSelection.selectedIds, rows]
  );
  const selectedPendingRows = useMemo(
    () => selectedRows.filter(row => row.status === "pending"),
    [selectedRows]
  );
  const selectedCount = rowSelection.selectedCount;
  const selectedRowEditable =
    !!selectedRow && selectedRow.status !== "submitted";

  const handleSubmitSelected = useCallback(async () => {
    if (selectedPendingRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await submitRowsWithGuaranteedCleanup(
        selectedPendingRows,
        handleSubmitRow,
        () => {
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit selected intake rows";
      setError(message);
      toast.error(message);
    }
  }, [handleSubmitRow, selectedPendingRows, setError]);

  const handleDuplicateSelected = useCallback(() => {
    const selectedPendingIds = new Set(selectedPendingRows.map(row => row.id));
    if (selectedPendingIds.size === 0) return;
    const currentRows = rowsRef.current;
    const timestamp = Date.now();
    let duplicateIndex = 0;

    const nextRows = duplicateSelectedRows({
      rows: currentRows,
      selectedRowIds: selectedPendingIds,
      getRowId: row => row.id,
      duplicateRow: row => ({
        ...row,
        id: `new-${timestamp}-${duplicateIndex++}-${Math.random().toString(36).slice(2, 9)}`,
        status: "pending" as const,
        errorMessage: undefined,
      }),
    });

    const duplicates = nextRows.slice(currentRows.length);
    updateRows(nextRows);
    replaceSelection(duplicates.map(row => row.id));
    setSelectedRowId(duplicates[0]?.id ?? null);
  }, [replaceSelection, selectedPendingRows, updateRows]);

  const handleFillDownSelected = useCallback(() => {
    const selectedPendingIds = new Set(selectedPendingRows.map(row => row.id));
    if (selectedPendingIds.size < 2) return;

    const nextRows = fillDownSelectedRows({
      rows: rowsRef.current,
      selectedRowIds: selectedPendingIds,
      getRowId: row => row.id,
      field: fillDownField,
    });

    updateRows(nextRows);
    setSaving();
    setTimeout(() => setSaved(), 300);
  }, [fillDownField, selectedPendingRows, setSaved, setSaving, updateRows]);

  const handleRemoveSelected = useCallback(() => {
    if (selectedPendingRows.length === 0) return;
    removeRowsWithUndo(selectedPendingRows.map(row => row.id));
  }, [removeRowsWithUndo, selectedPendingRows]);

  // Render
  return (
    <section
      {...keyboardProps}
      className="linear-workspace-shell h-full min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
    >
      <header className="linear-workspace-header">
        <div className="linear-workspace-title-wrap">
          <p className="linear-workspace-eyebrow">Inventory Intake</p>
          <div>
            <h2 className="linear-workspace-title flex items-center gap-2">
              <Package className="h-5 w-5" />
              Receiving
            </h2>
            <p className="linear-workspace-description">
              Keep key fields front and center, then use row details for
              everything else.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {SaveStateIndicator}
          <Button
            variant="outline"
            size="sm"
            onClick={() => inspector.open()}
            disabled={!selectedRow}
          >
            Edit Selected Details
          </Button>
        </div>
      </header>

      <div className="linear-workspace-meta">
        <div className="linear-workspace-meta-item">
          <span className="linear-workspace-meta-label">Pending</span>
          <span className="linear-workspace-meta-value">{pendingCount}</span>
        </div>
        <div className="linear-workspace-meta-item">
          <span className="linear-workspace-meta-label">Submitted</span>
          <span className="linear-workspace-meta-value">{submittedCount}</span>
        </div>
        <div className="linear-workspace-meta-item">
          <span className="linear-workspace-meta-label">Errors</span>
          <span
            className={cn(
              "linear-workspace-meta-value",
              errorCount > 0 && "text-red-600"
            )}
          >
            {errorCount}
          </span>
        </div>
        <div className="linear-workspace-meta-item">
          <span className="linear-workspace-meta-label">Qty</span>
          <span className="linear-workspace-meta-value">
            {summary.totalQty}
          </span>
        </div>
        <div className="linear-workspace-meta-item">
          <span className="linear-workspace-meta-label">Value</span>
          <span className="linear-workspace-meta-value">
            ${summary.totalValue.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border-b border-border/70 bg-background px-3 py-3 md:px-4">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Supplier</Label>
            <Input
              list="direct-intake-top-vendors"
              value={selectedRow?.vendorName ?? ""}
              onChange={e => {
                if (!selectedRow) return;
                const value = e.target.value;
                const trimmedValue = value.trim();
                const vendor = vendors.find(v => v.name === trimmedValue);
                const shouldBackfillBrand =
                  trimmedValue.length > 0 && !selectedRow.brandName.trim();
                handleUpdateSelectedRow({
                  vendorName: value,
                  vendorId: vendor?.id ?? null,
                  ...(shouldBackfillBrand ? { brandName: trimmedValue } : {}),
                });
              }}
              onBlur={e => {
                if (!selectedRow) return;
                const trimmedValue = e.target.value.trim();
                if (trimmedValue === selectedRow.vendorName) return;
                const vendor = vendors.find(v => v.name === trimmedValue);
                const shouldBackfillBrand =
                  trimmedValue.length > 0 && !selectedRow.brandName.trim();
                handleUpdateSelectedRow({
                  vendorName: trimmedValue,
                  vendorId: vendor?.id ?? null,
                  ...(shouldBackfillBrand ? { brandName: trimmedValue } : {}),
                });
              }}
              disabled={!selectedRowEditable}
              className="h-9"
              placeholder="Type or select vendor"
            />
            <datalist id="direct-intake-top-vendors">
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Product / Strain
            </Label>
            <Input
              list="direct-intake-top-products"
              value={selectedRow?.item ?? ""}
              onChange={e => {
                if (!selectedRow) return;
                const value = e.target.value;
                const product = products.find(p => p.name === value);
                handleUpdateSelectedRow({
                  item: value,
                  productId: product?.id ?? null,
                  strainId: product?.strainId ?? null,
                  category:
                    (product?.category as IntakeRowData["category"]) ??
                    selectedRow.category,
                });
              }}
              onBlur={e => {
                if (!selectedRow) return;
                const trimmedValue = e.target.value.trim();
                if (trimmedValue === selectedRow.item) return;
                const product = products.find(p => p.name === trimmedValue);
                handleUpdateSelectedRow({
                  item: trimmedValue,
                  productId: product?.id ?? null,
                  strainId: product?.strainId ?? null,
                  category:
                    (product?.category as IntakeRowData["category"]) ??
                    selectedRow.category,
                });
              }}
              disabled={!selectedRowEditable}
              className="h-9"
              placeholder="Type or select product"
            />
            <datalist id="direct-intake-top-products">
              {products.map(product => (
                <option key={product.id} value={product.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Qty</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={selectedRow?.qty ?? ""}
              onChange={e => {
                const val = Number(e.target.value);
                handleUpdateSelectedRow({
                  qty: Number.isFinite(val) ? val : 0,
                });
              }}
              disabled={!selectedRowEditable}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">COGS</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={selectedRow?.cogs ?? ""}
              onChange={e => {
                const val = Number(e.target.value);
                handleUpdateSelectedRow({
                  cogs: Number.isFinite(val) ? val : 0,
                });
              }}
              disabled={!selectedRowEditable}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Select
              value={selectedRow?.site ?? ""}
              onValueChange={value => {
                if (!selectedRow) return;
                const location = locations.find(l => l.site === value);
                handleUpdateSelectedRow({
                  site: value,
                  locationId: location?.id ?? null,
                  locationName: value,
                });
              }}
              disabled={!selectedRowEditable}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.site}>
                    {l.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedRow?.status === "error" && selectedRow.errorMessage && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {selectedRow.errorMessage}
          </p>
        )}
      </div>

      <div className="linear-workspace-tab-row !min-h-0">
        <div className="linear-workspace-command-strip !ml-0">
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="mr-1 h-4 w-4" />
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRows = Array.from({ length: 5 }, () =>
                createEmptyRow(defaultLocationOverrides)
              );
              updateRows(prev => [...prev, ...newRows]);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            +5 Rows
          </Button>
          {selectedPendingRows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              aria-label="Submit Selected"
              onClick={() => {
                void handleSubmitSelected();
              }}
              disabled={isSubmitting}
            >
              <Send className="mr-1 h-4 w-4" />
              Submit Selected ({selectedPendingRows.length})
            </Button>
          )}
          {selectedPendingRows.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Select
                  value={fillDownField}
                  onValueChange={value =>
                    setFillDownField(value as FillDownField)
                  }
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Fill down field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILL_DOWN_FIELD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillDownSelected}
                  disabled={selectedPendingRows.length < 2}
                >
                  Fill Down
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateSelected}
              >
                Duplicate Selected ({selectedPendingRows.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSelected}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remove Selected
              </Button>
            </>
          )}
          {selectedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedCount} row{selectedCount === 1 ? "" : "s"} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleExportCsv();
            }}
            disabled={rows.length === 0 || exportState.isExporting}
          >
            {exportState.isExporting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Exporting {Math.round(exportState.progress)}%
              </>
            ) : (
              <>
                <Download className="mr-1 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              void handleSubmitAll();
            }}
            disabled={isSubmitting || pendingCount === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-1 h-4 w-4" />
                Submit All Pending
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Grid Area */}
        <div className="flex-1 min-h-0 overflow-x-hidden">
          {isLoadingData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading reference data...
                </p>
              </div>
            </div>
          ) : dataError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="font-semibold text-lg">
                  Unable to load reference data
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {dataError?.message || "Please try again."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void refetchVendors();
                    void refetchLocations();
                    void refetchProducts();
                  }}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[420px] w-full">
              <AgGridReact<IntakeGridRow>
                theme={themeAlpine}
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows
                rowSelection={{
                  mode: "multiRow",
                  checkboxes: false,
                  headerCheckbox: false,
                  enableClickSelection: true,
                }}
                onGridReady={handleGridReady}
                onCellValueChanged={handleCellValueChanged}
                onSelectionChanged={handleSelectionChanged}
                getRowId={params => params.data.id}
                rowClassRules={{
                  "bg-green-50": params => params.data?.status === "submitted",
                  "bg-red-50": params => params.data?.status === "error",
                }}
              />
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedRow ? `Edit Row` : "Row Details"}
          subtitle={selectedRow?.item || "Select a row to edit"}
        >
          <RowInspectorContent
            row={selectedRow}
            onUpdate={handleUpdateSelectedRow}
            mediaFiles={
              selectedRow ? (rowMediaFilesById[selectedRow.id] ?? []) : []
            }
            onMediaFilesChange={files => {
              if (!selectedRow) return;
              updateRowMediaFilesById(prev => ({
                ...prev,
                [selectedRow.id]: files,
              }));
            }}
            vendors={vendors}
            locations={locations}
            products={products}
          />
          {selectedRow && selectedRow.status === "pending" && (
            <InspectorActions>
              <Button
                variant="outline"
                onClick={() => handleRemoveRow(selectedRow.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Row
              </Button>
              <Button
                onClick={() => {
                  void handleSubmitRow(selectedRow);
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit This Row
              </Button>
            </InspectorActions>
          )}
        </InspectorPanel>
      </div>

      <WorkSurfaceStatusBar
        left={`${pendingCount} pending · ${submittedCount} submitted`}
        center={selectedCount > 0 ? `${selectedCount} selected` : undefined}
        right="Tab • Enter • Esc • ⌘Z"
      />
    </section>
  );
}

export default DirectIntakeWorkSurface;
