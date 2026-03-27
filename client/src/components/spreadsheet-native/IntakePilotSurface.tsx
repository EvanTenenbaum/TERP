/**
 * IntakePilotSurface — Sheet-native surface for Direct Intake
 *
 * TER-815 | Family: Queue + Detail (document-sheet variant)
 *
 * Capability ledger: docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv
 *   OPS-INT-001  Draft and edit pending rows (document-sheet)
 *   OPS-INT-002  Keyboard, selection, row ops (document-sheet)
 *   OPS-INT-003  Media attachment lifecycle (document-sheet) — delegated to InspectorPanel
 *   OPS-INT-004  Single-row submit (document-sheet)
 *   OPS-INT-005  Bulk submit + CSV export (document-sheet)
 *   OPS-INT-006  PO-linked receiving — kept distinct; this surface is DIRECT INTAKE only
 *
 * CRITICAL: This surface is direct intake only. PO-linked receiving stays in the
 * "receiving" tab. Collapsing these workflows violates OPS-INT-006.
 *
 * Layout (Family: Queue + Detail — document-sheet variant):
 *   1. Session KPI badges + save state indicator
 *   2. Pre-submit review region — selected row quick-edit bar
 *   3. Workflow action bar — Add, Submit, Fill Down, Duplicate, Remove, Export
 *   4. PowersheetGrid — dominant intake document grid (editable pending rows)
 *   5. Batch validation results card — visible failure rows
 *   6. WorkSurfaceStatusBar + KeyboardHintBar
 *   7. InspectorPanel — deep row editor (media, notes, full field set)
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
  ICellRendererParams,
} from "ag-grid-community";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { INTAKE_DEFAULTS } from "@/lib/constants/intakeDefaults";
import { getBrandLabel } from "@/lib/nomenclature";
import {
  createDirectIntakeRemovalPlan,
  submitRowsWithGuaranteedCleanup,
} from "@/components/work-surface/directIntakeSelection";
import {
  deleteSelectedRows,
  duplicateSelectedRows,
  fillDownSelectedRows,
} from "@/lib/powersheet/contracts";
import type {
  PowersheetFieldPolicyMap,
  PowersheetSelectionSummary,
} from "@/lib/powersheet/contracts";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import { useValidationTiming } from "@/hooks/work-surface/useValidationTiming";
import { useUndo } from "@/hooks/work-surface/useUndo";
import { useExport, usePowersheetSelection } from "@/hooks/work-surface";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";

// UI components
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

import {
  Plus,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Upload,
  X,
  Package,
} from "lucide-react";

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
  { value: "cogsMode", label: "COGS Mode" },
  { value: "cogs", label: "COGS" },
  { value: "cogsMin", label: "COGS Min" },
  { value: "cogsMax", label: "COGS Max" },
  { value: "paymentTerms", label: "Payment Terms" },
  { value: "notes", label: "Notes" },
] as const;

type FillDownField = (typeof FILL_DOWN_FIELD_OPTIONS)[number]["value"];

// Platform-aware keyboard modifier
const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const documentKeyboardHints: KeyboardHint[] = [
  { key: "Tab", label: "next cell" },
  { key: "Enter", label: "confirm" },
  { key: "Escape", label: "close panel" },
  { key: `${mod}+C`, label: "copy" },
  { key: `${mod}+V`, label: "paste" },
  { key: `${mod}+Z`, label: "undo" },
];

const intakeAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: true },
  { label: "Fill", available: true },
  { label: "Edit", available: true },
  { label: "Undo/Redo", available: true },
  { label: "Row ops", available: true },
  { label: "Submit", available: true },
  { label: "Export CSV", available: true },
];

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const intakeRowSchema = z
  .object({
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
    subcategory: z.string().optional(),
    qty: z.number().min(0.01, "Quantity must be greater than 0"),
    cogsMode: z.enum(["FIXED", "RANGE"]),
    cogs: z.number().min(0, "COGS must be 0 or greater"),
    cogsMin: z.number().min(0, "Min COGS must be 0 or greater").optional(),
    cogsMax: z.number().min(0, "Max COGS must be 0 or greater").optional(),
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
  })
  .superRefine((value, ctx) => {
    if (value.cogsMode === "FIXED") {
      if (!value.cogs || value.cogs <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cogs"],
          message: "COGS must be greater than 0",
        });
      }
      return;
    }
    if (!value.cogsMin || value.cogsMin <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cogsMin"],
        message: "Min COGS must be greater than 0",
      });
    }
    if (!value.cogsMax || value.cogsMax <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cogsMax"],
        message: "Max COGS must be greater than 0",
      });
    }
    if (
      value.cogsMin !== undefined &&
      value.cogsMax !== undefined &&
      value.cogsMax < value.cogsMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cogsMax"],
        message: "Max COGS must be greater than or equal to min COGS",
      });
    }
  });

type IntakeRowData = z.infer<typeof intakeRowSchema>;
type IntakeCogsMode = IntakeRowData["cogsMode"];

interface IntakeDraftRow extends IntakeRowData {
  id: string;
  rowKey: string;
  vendorId: number | null;
  productId: number | null;
  strainId: number | null;
  locationId: number | null;
  locationName: string;
  matchedStrainName?: string;
  status: "pending" | "submitted" | "error";
  errorMessage?: string;
}

type IntakeExportRow = IntakeDraftRow & Record<string, unknown>;

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
// FIELD POLICIES (document-sheet: editable columns for pending rows)
// ============================================================================

const intakeFieldPolicies: PowersheetFieldPolicyMap<IntakeDraftRow> = {
  vendorName: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: false,
    singleEditAllowed: true,
    multiEditAllowed: false,
    surfaceLabel: "Intake document grid",
  },
  item: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: false,
    singleEditAllowed: true,
    multiEditAllowed: false,
    surfaceLabel: "Intake document grid",
  },
  qty: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  cogsMode: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  cogs: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  cogsMin: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  cogsMax: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  paymentTerms: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  site: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: true,
    singleEditAllowed: true,
    multiEditAllowed: true,
    surfaceLabel: "Intake document grid",
  },
  notes: {
    copyAllowed: true,
    pasteAllowed: true,
    fillAllowed: false,
    singleEditAllowed: true,
    multiEditAllowed: false,
    surfaceLabel: "Intake document grid",
  },
};

function getFieldPolicy(
  field: keyof IntakeDraftRow
): (typeof intakeFieldPolicies)[keyof typeof intakeFieldPolicies] | undefined {
  return intakeFieldPolicies[field as keyof typeof intakeFieldPolicies];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createEmptyRow = (defaults?: {
  locationId?: number | null;
  locationName?: string;
  site?: string;
}): IntakeDraftRow => {
  const id = `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    rowKey: id,
    vendorId: null,
    vendorName: "",
    brandName: "",
    category: INTAKE_DEFAULTS.category,
    subcategory: "",
    item: "",
    productId: null,
    strainId: null,
    qty: 0,
    cogsMode: "FIXED",
    cogs: 0,
    cogsMin: 0,
    cogsMax: 0,
    paymentTerms: INTAKE_DEFAULTS.paymentTerms,
    locationId: defaults?.locationId ?? null,
    locationName: defaults?.locationName ?? "",
    site: defaults?.site ?? "",
    notes: "",
    status: "pending",
  };
};

const getEffectiveCogs = (
  row: Pick<IntakeDraftRow, "cogsMode" | "cogs" | "cogsMin" | "cogsMax">
) => {
  if (row.cogsMode === "RANGE") {
    return (Number(row.cogsMin || 0) + Number(row.cogsMax || 0)) / 2;
  }
  return Number(row.cogs || 0);
};

const formatCogsLabel = (
  row: Pick<IntakeDraftRow, "cogsMode" | "cogs" | "cogsMin" | "cogsMax">
) => {
  if (row.cogsMode === "RANGE") {
    return `$${Number(row.cogsMin || 0).toFixed(2)}-$${Number(row.cogsMax || 0).toFixed(2)}`;
  }
  return `$${Number(row.cogs || 0).toFixed(2)}`;
};

const normalizeIntakeCogs = (row: IntakeDraftRow): IntakeDraftRow => {
  if (row.cogsMode !== "RANGE") {
    return { ...row, cogsMin: 0, cogsMax: 0 };
  }
  return { ...row, cogs: getEffectiveCogs(row) };
};

const normalizeRowForValidation = (row: IntakeDraftRow): IntakeDraftRow => {
  const vendorName = row.vendorName.trim();
  const brandName = row.brandName.trim() || vendorName;
  const item = row.item.trim();
  const site = row.site.trim();
  return normalizeIntakeCogs({ ...row, vendorName, brandName, item, site });
};

// ============================================================================
// STATUS CELL RENDERER
// ============================================================================

function StatusCellRenderer({ data }: { data?: IntakeDraftRow }) {
  if (data?.status === "submitted") {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Submitted</span>
      </div>
    );
  }
  if (data?.status === "error") {
    return (
      <div
        className="flex items-center gap-1 text-red-600"
        title={data.errorMessage}
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
// INSPECTOR CONTENT
// ============================================================================

interface RowInspectorProps {
  row: IntakeDraftRow | null;
  onUpdate: (updates: Partial<IntakeDraftRow>) => void;
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
  const validation = useValidationTiming({
    schema: intakeRowSchema,
    initialValues: row ?? {},
  });

  if (!row) {
    // BUG-039: Show a clear "no row" state — this should not normally appear
    // when the drawer is opened via "Edit Details" since a row must be selected first
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>No row selected — click a row in the grid first</p>
      </div>
    );
  }

  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
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

  return (
    <div className="space-y-6">
      <InspectorSection title="Supplier Information" defaultOpen>
        <InspectorField label="Supplier" required>
          <Input
            value={row.vendorName}
            list={`intake-pilot-vendors-${row.id}`}
            onChange={e => {
              const value = e.target.value;
              const trimmed = value.trim();
              const vendor = vendors.find(v => v.name === trimmed);
              const backfillBrand = trimmed.length > 0 && !row.brandName.trim();
              onUpdate({
                vendorName: value,
                vendorId: vendor?.id ?? null,
                ...(backfillBrand ? { brandName: trimmed } : {}),
              });
              validation.handleChange("vendorName", value);
            }}
            onBlur={e => {
              const trimmed = e.target.value.trim();
              if (trimmed !== row.vendorName) {
                const vendor = vendors.find(v => v.name === trimmed);
                const backfillBrand =
                  trimmed.length > 0 && !row.brandName.trim();
                onUpdate({
                  vendorName: trimmed,
                  vendorId: vendor?.id ?? null,
                  ...(backfillBrand ? { brandName: trimmed } : {}),
                });
                validation.handleChange("vendorName", trimmed);
              }
              validation.handleBlur("vendorName");
            }}
            className={cn(
              validation.getFieldState("vendorName").showError &&
                "border-red-500"
            )}
            placeholder="Type supplier or choose suggestion"
          />
          <datalist id={`intake-pilot-vendors-${row.id}`}>
            {vendors.map(v => (
              <option key={v.id} value={v.name} />
            ))}
          </datalist>
          {validation.getFieldState("vendorName").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("vendorName").error}
            </p>
          )}
        </InspectorField>

        <InspectorField label={getBrandLabel(row.category)} required>
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
            onValueChange={(value: IntakeDraftRow["category"]) => {
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

        <InspectorField label="Product / Strain" required>
          <Input
            value={row.item}
            list={`intake-pilot-products-${row.id}`}
            onChange={e => {
              const value = e.target.value;
              const product = products.find(p => p.name === value);
              onUpdate({
                item: value,
                productId: product?.id ?? null,
                strainId: product?.strainId ?? null,
                category:
                  (product?.category as IntakeRowData["category"]) ??
                  row.category,
              });
              validation.handleChange("item", value);
            }}
            onBlur={e => {
              const trimmed = e.target.value.trim();
              if (trimmed !== row.item) {
                const product = products.find(p => p.name === trimmed);
                onUpdate({
                  item: trimmed,
                  productId: product?.id ?? null,
                  strainId: product?.strainId ?? null,
                  category:
                    (product?.category as IntakeRowData["category"]) ??
                    row.category,
                });
                validation.handleChange("item", trimmed);
              }
              validation.handleBlur("item");
            }}
            className={cn(
              validation.getFieldState("item").showError && "border-red-500"
            )}
            placeholder="Type product or choose suggestion"
          />
          <datalist id={`intake-pilot-products-${row.id}`}>
            {products.map(p => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          {validation.getFieldState("item").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("item").error}
            </p>
          )}
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

        <InspectorField label="Subcategory">
          <Input
            value={row.subcategory ?? ""}
            onChange={e => onUpdate({ subcategory: e.target.value })}
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

          <InspectorField label="COGS Mode" required>
            <Select
              value={row.cogsMode}
              onValueChange={value => {
                onUpdate({ cogsMode: value as IntakeCogsMode });
                validation.handleChange("cogsMode", value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Fixed COGS</SelectItem>
                <SelectItem value="RANGE">Range COGS</SelectItem>
              </SelectContent>
            </Select>
          </InspectorField>
        </div>

        {row.cogsMode === "FIXED" ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InspectorField label="Min COGS ($)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.cogsMin || ""}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdate({ cogsMin: val });
                  validation.handleChange("cogsMin", val);
                }}
                onBlur={() => validation.handleBlur("cogsMin")}
                className={cn(
                  validation.getFieldState("cogsMin").showError &&
                    "border-red-500"
                )}
              />
              {validation.getFieldState("cogsMin").showError && (
                <p className="text-xs text-red-500 mt-1">
                  {validation.getFieldState("cogsMin").error}
                </p>
              )}
            </InspectorField>
            <InspectorField label="Max COGS ($)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={row.cogsMax || ""}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdate({ cogsMax: val });
                  validation.handleChange("cogsMax", val);
                }}
                onBlur={() => validation.handleBlur("cogsMax")}
                className={cn(
                  validation.getFieldState("cogsMax").showError &&
                    "border-red-500"
                )}
              />
              {validation.getFieldState("cogsMax").showError && (
                <p className="text-xs text-red-500 mt-1">
                  {validation.getFieldState("cogsMax").error}
                </p>
              )}
            </InspectorField>
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Transaction Details" defaultOpen>
        <InspectorField label="Payment Terms" required>
          <Select
            value={row.paymentTerms}
            onValueChange={(value: IntakeDraftRow["paymentTerms"]) => {
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
                locationId: location?.id ?? null,
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
            value={row.notes ?? ""}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="Add any notes about this intake..."
            rows={3}
          />
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
                id={`intake-pilot-media-${row.id}`}
              />
              <label
                htmlFor={`intake-pilot-media-${row.id}`}
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
                  onClick={() => onMediaFilesChange([])}
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
            {/* BUG-044: Clarify that photo upload happens at submit time and may fail independently */}
            <p className="text-xs text-muted-foreground">
              Photos are uploaded when you submit this row. If photo upload
              fails, the row data is still submitted but photos may need to be
              re-attached.
            </p>
          </div>
        </InspectorField>
      </InspectorSection>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Line Total</span>
          <span className="font-semibold text-lg">
            ${((row.qty || 0) * getEffectiveCogs(row)).toFixed(2)}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {row.cogsMode === "RANGE"
            ? `Range midpoint: ${formatCogsLabel(row)}`
            : `Fixed COGS: ${formatCogsLabel(row)}`}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// VALIDATION FAILURE REGION (pre-submit review)
// ============================================================================

function ValidationFailureCard({ errorRows }: { errorRows: IntakeDraftRow[] }) {
  if (errorRows.length === 0) return null;

  return (
    <div
      className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 p-3"
      data-testid="intake-validation-failures"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-700">
          {errorRows.length} row{errorRows.length === 1 ? "" : "s"} failed
          validation
        </span>
      </div>
      <div className="space-y-1">
        {errorRows.map(row => (
          <div key={row.id} className="text-xs text-red-600">
            <span className="font-medium">
              {row.item || row.vendorName || "(empty row)"}
            </span>
            {row.errorMessage && (
              <span className="ml-1 text-muted-foreground">
                — {row.errorMessage}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface IntakePilotSurfaceProps {
  onOpenClassic?: () => void;
}

export function IntakePilotSurface({ onOpenClassic }: IntakePilotSurfaceProps) {
  // ---- Row state ----
  // BUG-034: Start with no rows — user adds rows explicitly to avoid blank error-prone defaults
  const [rows, setRows] = useState<IntakeDraftRow[]>([]);
  const rowsRef = useRef<IntakeDraftRow[]>(rows);

  const updateRows = useCallback(
    (updater: SetStateAction<IntakeDraftRow[]>) => {
      setRows(prev => {
        const next =
          typeof updater === "function"
            ? (updater as (v: IntakeDraftRow[]) => IntakeDraftRow[])(prev)
            : updater;
        rowsRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // ---- Selection state ----
  const visibleRowIds = useMemo(() => rows.map(r => r.id), [rows]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const rowSelection = usePowersheetSelection<string>({
    visibleIds: visibleRowIds,
  });
  const selectedRowIds = useMemo(
    () => Array.from(rowSelection.selectedIds),
    [rowSelection.selectedIds]
  );

  const replaceSelection = useCallback(
    (ids: string[]) => {
      rowSelection.clear();
      for (const id of Array.from(new Set(ids))) {
        rowSelection.toggle(id, true);
      }
    },
    [rowSelection]
  );

  const selectedRow = useMemo(
    () => rows.find(r => r.id === selectedRowId) ?? null,
    [rows, selectedRowId]
  );

  // ---- Media state ----
  const [rowMediaFilesById, setRowMediaFilesById] = useState<
    Record<string, File[]>
  >({});
  const rowMediaFilesByIdRef =
    useRef<Record<string, File[]>>(rowMediaFilesById);

  const updateRowMediaFilesById = useCallback(
    (updater: SetStateAction<Record<string, File[]>>) => {
      setRowMediaFilesById(prev => {
        const next =
          typeof updater === "function"
            ? (
                updater as (v: Record<string, File[]>) => Record<string, File[]>
              )(prev)
            : updater;
        rowMediaFilesByIdRef.current = next;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    rowMediaFilesByIdRef.current = rowMediaFilesById;
  }, [rowMediaFilesById]);

  // ---- Derived counts ----
  // BUG-041: Count rows that are "pending" (ready to submit) vs "error" (need fixing) separately
  // pendingCount = rows still cleanly pending (not yet attempted or cleared after error fix)
  const pendingCount = useMemo(
    () => rows.filter(r => r.status === "pending").length,
    [rows]
  );
  const submittedCount = useMemo(
    () => rows.filter(r => r.status === "submitted").length,
    [rows]
  );
  const errorRows = useMemo(
    () => rows.filter(r => r.status === "error"),
    [rows]
  );
  const errorCount = errorRows.length;

  const selectedRows = useMemo(
    () => rows.filter(r => rowSelection.selectedIds.has(r.id)),
    [rowSelection.selectedIds, rows]
  );
  const selectedPendingRows = useMemo(
    () => selectedRows.filter(r => r.status === "pending"),
    [selectedRows]
  );
  const selectedCount = rowSelection.selectedCount;

  // ---- Session KPI totals ----
  const sessionTotals = useMemo(() => {
    const pending = rows.filter(r => r.status === "pending");
    return {
      qty: pending.reduce((sum, r) => sum + r.qty, 0),
      value: pending.reduce((sum, r) => sum + r.qty * getEffectiveCogs(r), 0),
    };
  }, [rows]);

  // ---- Misc UI state ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fillDownField, setFillDownField] = useState<FillDownField>("cogs");
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ---- Work Surface hooks ----
  // BUG-035: Start in 'queued' state so "All changes saved" is not shown with a fresh/empty surface
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState({
    initialState: "queued",
    onStateChange: state => {
      if (state.status === "error") {
        toast.error(state.message ?? "Save failed");
      }
    },
  });
  const undo = useUndo({ enableKeyboard: false });
  const { exportCSV, state: exportState } = useExport<IntakeExportRow>();
  const inspector = useInspectorPanel();

  // BUG-042: Escape key closes the inspector panel (the hint bar advertises this behavior)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspector.isOpen) {
        inspector.close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inspector]);

  // ---- Data queries ----
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
  // BUG-036 / BUG-106: Deduplicate locations by site name to prevent repeated entries
  const locations = useMemo(() => {
    const raw = Array.isArray(locationsData) ? locationsData : [];
    const seen = new Set<string>();
    return raw.filter(l => {
      const key = (l.site ?? "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [locationsData]);

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

  // Apply main warehouse default to rows that have no location yet
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
  } = trpc.productCatalogue.list.useQuery({ limit: 500 });

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

  const isLoadingData = vendorsLoading || locationsLoading || productsLoading;
  const dataError = vendorsError || locationsError || productsError;

  // ---- Mutations ----
  const intakeMutation = trpc.inventory.intake.useMutation();
  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation();

  // ---- Selection sync: keep focused row valid, but do NOT auto-select on load ----
  // BUG-037: Do not auto-select rows on initial load — selection starts empty
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedRowId(null);
      return;
    }
    // Only clear selection if the selected row no longer exists
    if (selectedRowId && !rows.some(r => r.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [rows, selectedRowId]);

  // Sync powersheet selection when no rows are selected but a focused row exists
  useEffect(() => {
    if (!selectedRowId) return;
    if (rowSelection.selectedCount > 0) return;
    replaceSelection([selectedRowId]);
  }, [replaceSelection, rowSelection.selectedCount, selectedRowId]);

  // Cull stale selection IDs when rows change
  useEffect(() => {
    if (rowSelection.selectedCount === 0) return;
    const valid = selectedRowIds.filter(id => rows.some(r => r.id === id));
    if (valid.length !== rowSelection.selectedCount) {
      replaceSelection(valid);
    }
  }, [replaceSelection, rowSelection.selectedCount, rows, selectedRowIds]);

  // ---- Column definitions ----
  const columnDefs = useMemo<ColDef<IntakeDraftRow>[]>(
    () => [
      {
        headerName: "Supplier",
        field: "vendorName",
        minWidth: 130,
        flex: 1,
        editable: params => params.data?.status === "pending",
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("vendorName")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: supplier name for pending rows",
        cellEditor: "agTextCellEditor",
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
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("item")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: product/strain name for pending rows",
        cellEditor: "agTextCellEditor",
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
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("qty")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: quantity for pending rows",
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS Mode",
        field: "cogsMode",
        width: 120,
        editable: params => params.data?.status === "pending",
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("cogsMode")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: FIXED or RANGE for pending rows",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["FIXED", "RANGE"] },
      },
      {
        headerName: "COGS",
        field: "cogs",
        width: 100,
        editable: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode !== "RANGE",
        cellClass: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode !== "RANGE" &&
          getFieldPolicy("cogs")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: fixed COGS value for pending rows",
        valueFormatter: params =>
          params.data
            ? formatCogsLabel(params.data)
            : `$${((params.value as number) ?? 0).toFixed(2)}`,
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS Min",
        field: "cogsMin",
        width: 100,
        editable: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode === "RANGE",
        cellClass: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode === "RANGE" &&
          getFieldPolicy("cogsMin")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: minimum COGS for range mode",
        valueFormatter: params =>
          params.data?.cogsMode === "RANGE"
            ? `$${((params.value as number) ?? 0).toFixed(2)}`
            : "Fixed",
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS Max",
        field: "cogsMax",
        width: 100,
        editable: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode === "RANGE",
        cellClass: params =>
          params.data?.status === "pending" &&
          params.data?.cogsMode === "RANGE" &&
          getFieldPolicy("cogsMax")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: maximum COGS for range mode",
        valueFormatter: params =>
          params.data?.cogsMode === "RANGE"
            ? `$${((params.value as number) ?? 0).toFixed(2)}`
            : "Fixed",
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
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("site")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: location for pending rows",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: locations.map(l => l.site) },
      },
      {
        headerName: "Terms",
        field: "paymentTerms",
        width: 110,
        editable: params => params.data?.status === "pending",
        cellClass: params =>
          params.data?.status === "pending" && getFieldPolicy("paymentTerms")
            ? "powersheet-cell--editable"
            : "powersheet-cell--locked",
        headerTooltip: "Editable: payment terms for pending rows",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: PAYMENT_TERMS_OPTIONS.map(o => o.value),
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        editable: false,
        cellClass: "powersheet-cell--locked",
        headerTooltip: "Read-only: row submission status",
        cellRenderer: (params: ICellRendererParams<IntakeDraftRow>) => (
          <StatusCellRenderer data={params.data} />
        ),
        sortable: true,
        filter: true,
      },
    ],
    [vendors, locations, products]
  );

  // ---- Cell value changed handler ----
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IntakeDraftRow>) => {
      if (!event.data) return;
      setSaving();

      const nextRow: IntakeDraftRow = { ...event.data };

      if (event.colDef.field === "vendorName") {
        const name =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.vendorName = name;
        if (!nextRow.brandName?.trim() && name) {
          nextRow.brandName = name;
        }
        const vendor = vendors.find(v => v.name === name);
        nextRow.vendorId = vendor?.id ?? null;
      }

      if (event.colDef.field === "site") {
        const site =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.site = site;
        const location = locations.find(l => l.site === site);
        nextRow.locationId = location?.id ?? null;
        nextRow.locationName = location?.site ?? "";
      }

      if (event.colDef.field === "item") {
        const item =
          typeof event.newValue === "string" ? event.newValue.trim() : "";
        nextRow.item = item;
        const product = products.find(p => p.name === item);
        nextRow.productId = product?.id ?? null;
        nextRow.strainId = product?.strainId ?? null;
        if (product) {
          nextRow.category = product.category as IntakeRowData["category"];
        }
      }

      if (
        ["cogsMode", "cogs", "cogsMin", "cogsMax"].includes(
          event.colDef.field ?? ""
        )
      ) {
        Object.assign(nextRow, normalizeIntakeCogs(nextRow));
      }

      if (nextRow.status === "error") {
        nextRow.status = "pending";
        nextRow.errorMessage = undefined;
      }

      updateRows(prev =>
        prev.map(r => (r.id === nextRow.id ? { ...r, ...nextRow } : r))
      );
      setTimeout(() => setSaved(), 500);
    },
    [vendors, locations, products, setSaving, setSaved, updateRows]
  );

  // ---- Row add ----
  const handleAddRow = useCallback(() => {
    const newRow = createEmptyRow(defaultLocationOverrides);
    updateRows(prev => [...prev, newRow]);
    setSelectedRowId(newRow.id);
    replaceSelection([newRow.id]);
  }, [defaultLocationOverrides, replaceSelection, updateRows]);

  // ---- Row update from inspector ----
  const handleUpdateSelectedRow = useCallback(
    (updates: Partial<IntakeDraftRow>) => {
      if (!selectedRowId) return;
      setSaving();
      updateRows(prev =>
        prev.map(r =>
          r.id === selectedRowId
            ? (() => {
                const nextRow = normalizeIntakeCogs({
                  ...r,
                  ...updates,
                } as IntakeDraftRow);
                const nextVendorName =
                  typeof updates.vendorName === "string"
                    ? updates.vendorName.trim()
                    : undefined;
                const backfillBrand =
                  typeof updates.brandName === "undefined" &&
                  !!nextVendorName &&
                  !r.brandName.trim();
                return {
                  ...nextRow,
                  ...(nextVendorName !== undefined
                    ? { vendorName: nextVendorName }
                    : {}),
                  ...(backfillBrand ? { brandName: nextVendorName } : {}),
                  status:
                    r.status === "error" ? ("pending" as const) : r.status,
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

  // ---- Row removal with undo ----
  const removeRowsWithUndo = useCallback(
    (rowIds: string[]) => {
      const current = rowsRef.current;
      const selectedIdSet = new Set(rowIds);
      const afterContract = deleteSelectedRows({
        rows: current,
        selectedRowIds: selectedIdSet,
        getRowId: r => r.id,
        minimumRows: 1,
      });
      const remainingIds = new Set(afterContract.map(r => r.id));
      const contractRemovedIds = current
        .filter(r => !remainingIds.has(r.id))
        .map(r => r.id);

      const plan = createDirectIntakeRemovalPlan(
        current,
        contractRemovedIds.length > 0 ? contractRemovedIds : rowIds
      );
      if (plan.blocked) {
        toast.error("Cannot remove all pending rows. Keep at least one row.");
        return;
      }
      if (plan.removedIds.length === 0) return;

      const previousRows = current;
      const previousRowIds = new Set(previousRows.map(r => r.id));
      const removedRows = previousRows.filter(r =>
        plan.removedIds.includes(r.id)
      );
      const removedMedia = plan.removedIds.reduce<Record<string, File[]>>(
        (acc, id) => {
          const files = rowMediaFilesByIdRef.current[id];
          if (files) acc[id] = files;
          return acc;
        },
        {}
      );

      undo.registerAction({
        description: `Removed ${removedRows.length} row(s)`,
        undo: () => {
          updateRows(curr => {
            const currById = new Map(curr.map(r => [r.id, r]));
            const removedById = new Map(removedRows.map(r => [r.id, r]));
            const restored: IntakeDraftRow[] = [];
            for (const prev of previousRows) {
              const c = currById.get(prev.id);
              if (c) {
                restored.push(c);
                continue;
              }
              const rm = removedById.get(prev.id);
              if (rm) restored.push(rm);
            }
            for (const c of curr) {
              if (!previousRowIds.has(c.id)) restored.push(c);
            }
            return restored;
          });
          updateRowMediaFilesById(prev => {
            const next = { ...prev };
            for (const [id, files] of Object.entries(removedMedia)) {
              if (!next[id]) next[id] = files;
            }
            return next;
          });
          replaceSelection(removedRows.map(r => r.id));
          setSelectedRowId(removedRows[0]?.id ?? null);
        },
      });

      updateRows(plan.nextRows);
      updateRowMediaFilesById(prev => {
        const next = { ...prev };
        for (const id of plan.removedIds) delete next[id];
        return next;
      });
      rowSelection.clear();
      setSelectedRowId(null);
    },
    [replaceSelection, rowSelection, undo, updateRows, updateRowMediaFilesById]
  );

  const handleRemoveSelected = useCallback(() => {
    if (selectedPendingRows.length === 0) return;
    removeRowsWithUndo(selectedPendingRows.map(r => r.id));
  }, [removeRowsWithUndo, selectedPendingRows]);

  // ---- Media upload ----
  const uploadMediaFiles = useCallback(
    async (files: File[]) => {
      const uploaded: UploadedMediaUrl[] = [];
      for (const file of files) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result =
                typeof reader.result === "string" ? reader.result : "";
              resolve(result.split(",")[1] ?? "");
            };
            reader.onerror = () =>
              reject(reader.error ?? new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });
          const result = await uploadMediaMutation.mutateAsync({
            fileData: base64,
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

  // ---- Submit single row ----
  const handleSubmitRow = useCallback(
    async (row: IntakeDraftRow) => {
      const live = rowsRef.current.find(r => r.id === row.id) ?? row;
      const normalized = normalizeRowForValidation(live);
      updateRows(prev =>
        prev.map(r => (r.id === row.id ? { ...r, ...normalized } : r))
      );

      const result = intakeRowSchema.safeParse(normalized);
      if (!result.success) {
        const first = result.error.issues[0];
        updateRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage: first?.message ?? "Validation failed",
                }
              : r
          )
        );
        toast.error(first?.message ?? "Validation failed");
        return;
      }

      const mediaFiles = rowMediaFilesByIdRef.current[row.id] ?? [];
      let uploadedUrls: UploadedMediaUrl[] = [];

      try {
        if (mediaFiles.length > 0) {
          setSaving("Uploading photos...");
          try {
            uploadedUrls = await uploadMediaFiles(mediaFiles);
          } catch (err) {
            if (err instanceof UploadMediaError) uploadedUrls = err.uploaded;
            throw err;
          }
        }

        setSaving("Submitting intake...");
        await intakeMutation.mutateAsync({
          vendorName: normalized.vendorName,
          brandName: normalized.brandName,
          productName: normalized.item,
          category: normalized.category,
          subcategory: normalized.subcategory || undefined,
          strainId: normalized.strainId,
          quantity: normalized.qty,
          cogsMode: normalized.cogsMode,
          unitCogs:
            normalized.cogsMode === "FIXED"
              ? normalized.cogs.toFixed(2)
              : undefined,
          unitCogsMin:
            normalized.cogsMode === "RANGE"
              ? Number(normalized.cogsMin || 0).toFixed(2)
              : undefined,
          unitCogsMax:
            normalized.cogsMode === "RANGE"
              ? Number(normalized.cogsMax || 0).toFixed(2)
              : undefined,
          paymentTerms: normalized.paymentTerms,
          location: { site: normalized.site },
          metadata: normalized.notes ? { notes: normalized.notes } : undefined,
          mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
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
        setSaved();
        toast.success("Intake submitted successfully");
      } catch (error) {
        if (uploadedUrls.length > 0) {
          try {
            setSaving("Cleaning up uploaded photos...");
            await Promise.all(
              uploadedUrls.map(m =>
                deleteMediaMutation.mutateAsync({ url: m.url })
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

  // ---- Submit selected rows ----
  const handleSubmitSelected = useCallback(async () => {
    if (selectedPendingRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await submitRowsWithGuaranteedCleanup(
        selectedPendingRows,
        handleSubmitRow,
        () => setIsSubmitting(false)
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit selected intake rows";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  }, [handleSubmitRow, selectedPendingRows, setError]);

  // ---- Submit all pending ----
  const handleSubmitAll = useCallback(async () => {
    const current = rowsRef.current;
    const normalizedPending = current
      .filter(r => r.status === "pending")
      .map(normalizeRowForValidation);

    updateRows(prev =>
      prev.map(r => {
        if (r.status !== "pending") return r;
        const norm = normalizedPending.find(n => n.id === r.id);
        return norm ? { ...r, ...norm } : r;
      })
    );

    const validationResults = normalizedPending.map(row => ({
      row,
      result: intakeRowSchema.safeParse(row),
    }));

    const invalidRows = validationResults.filter(
      ({ result }) => !result.success
    );
    const validRows = validationResults
      .filter(({ result }) => result.success)
      .map(({ row }) => row);

    if (invalidRows.length > 0) {
      updateRows(prev =>
        prev.map(r => {
          const inv = invalidRows.find(i => i.row.id === r.id);
          if (!inv) return r;
          const first = inv.result.success ? null : inv.result.error.issues[0];
          return {
            ...r,
            status: "error" as const,
            errorMessage: first?.message ?? "Validation failed",
          };
        })
      );
    }

    if (validRows.length === 0) {
      toast.error(
        "No valid rows to submit. Ensure all required fields are filled."
      );
      return;
    }

    setIsSubmitting(true);
    setSaving(`Submitting ${validRows.length} records...`);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      const mediaFiles = rowMediaFilesByIdRef.current[row.id] ?? [];
      let uploadedUrls: UploadedMediaUrl[] = [];
      try {
        if (mediaFiles.length > 0) {
          setSaving(`Uploading photos for ${row.item || "row"}...`);
          try {
            uploadedUrls = await uploadMediaFiles(mediaFiles);
          } catch (err) {
            if (err instanceof UploadMediaError) uploadedUrls = err.uploaded;
            throw err;
          }
        }
        setSaving(`Submitting ${validRows.length} records...`);
        await intakeMutation.mutateAsync({
          vendorName: row.vendorName,
          brandName: row.brandName,
          productName: row.item,
          category: row.category,
          subcategory: row.subcategory || undefined,
          strainId: row.strainId,
          quantity: row.qty,
          cogsMode: row.cogsMode,
          unitCogs: row.cogsMode === "FIXED" ? row.cogs.toFixed(2) : undefined,
          unitCogsMin:
            row.cogsMode === "RANGE"
              ? Number(row.cogsMin || 0).toFixed(2)
              : undefined,
          unitCogsMax:
            row.cogsMode === "RANGE"
              ? Number(row.cogsMax || 0).toFixed(2)
              : undefined,
          paymentTerms: row.paymentTerms,
          location: { site: row.site },
          metadata: row.notes ? { notes: row.notes } : undefined,
          mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
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
        if (uploadedUrls.length > 0) {
          try {
            setSaving("Cleaning up uploaded photos...");
            await Promise.all(
              uploadedUrls.map(m =>
                deleteMediaMutation.mutateAsync({ url: m.url })
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

  // ---- Duplicate selected ----
  const handleDuplicateSelected = useCallback(() => {
    const ids = new Set(selectedPendingRows.map(r => r.id));
    if (ids.size === 0) return;
    const timestamp = Date.now();
    let dupIndex = 0;
    const nextRows = duplicateSelectedRows({
      rows: rowsRef.current,
      selectedRowIds: ids,
      getRowId: r => r.id,
      duplicateRow: r => {
        const newId = `new-${timestamp}-${dupIndex++}-${Math.random().toString(36).slice(2, 9)}`;
        return {
          ...r,
          id: newId,
          rowKey: newId,
          status: "pending" as const,
          errorMessage: undefined,
        };
      },
    });
    const dupes = nextRows.slice(rowsRef.current.length);
    updateRows(nextRows);
    replaceSelection(dupes.map(r => r.id));
    setSelectedRowId(dupes[0]?.id ?? null);
  }, [replaceSelection, selectedPendingRows, updateRows]);

  // ---- Fill down selected ----
  const handleFillDownSelected = useCallback(() => {
    const ids = new Set(selectedPendingRows.map(r => r.id));
    if (ids.size < 2) return;
    const nextRows = fillDownSelectedRows({
      rows: rowsRef.current,
      selectedRowIds: ids,
      getRowId: r => r.id,
      field: fillDownField as keyof IntakeDraftRow,
    });
    updateRows(nextRows);
    setSaving();
    setTimeout(() => setSaved(), 300);
  }, [fillDownField, selectedPendingRows, setSaved, setSaving, updateRows]);

  // ---- Export CSV ----
  const handleExportCsv = useCallback(async () => {
    try {
      await exportCSV(rowsRef.current as IntakeExportRow[], {
        columns: [
          { key: "vendorName", label: "Supplier" },
          { key: "brandName", label: "Brand/Farmer" },
          { key: "item", label: "Product" },
          { key: "category", label: "Category" },
          { key: "subcategory", label: "Subcategory" },
          { key: "qty", label: "Qty" },
          { key: "cogsMode", label: "COGS Mode" },
          { key: "cogs", label: "COGS" },
          { key: "cogsMin", label: "COGS Min" },
          { key: "cogsMax", label: "COGS Max" },
          {
            key: "effectiveCogs",
            label: "Effective COGS",
            formatter: (_v, row) => getEffectiveCogs(row).toFixed(2),
          },
          {
            key: "lineTotal",
            label: "Line Total",
            formatter: (_v, row) =>
              ((row.qty || 0) * getEffectiveCogs(row)).toFixed(2),
          },
          { key: "paymentTerms", label: "Payment Terms" },
          { key: "site", label: "Location" },
          { key: "status", label: "Status" },
          { key: "notes", label: "Notes" },
        ],
        filename: "direct-intake-session",
        addTimestamp: true,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export intake CSV"
      );
    }
  }, [exportCSV]);

  // ---- Render ----
  return (
    <section className="h-full min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden bg-background">
      {/* Zone 1: Session KPI badges + save state */}
      <div className="flex flex-col gap-3 border-b border-border/70 bg-background px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1">
            Direct Intake
          </Badge>
          {/* BUG-041: Show "Ready" for pending, "Fix needed" to surface error rows clearly */}
          <Badge variant="outline">Ready {pendingCount}</Badge>
          <Badge
            variant="outline"
            className={cn(errorCount > 0 && "border-red-200 text-red-600")}
          >
            {errorCount > 0
              ? `Fix needed ${errorCount}`
              : `Errors ${errorCount}`}
          </Badge>
          <Badge variant="outline">Submitted {submittedCount}</Badge>
          <Badge variant="outline">Qty {sessionTotals.qty}</Badge>
          <Badge variant="outline">${sessionTotals.value.toFixed(2)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {SaveStateIndicator}
          <Button
            variant="outline"
            size="sm"
            onClick={() => inspector.open()}
            disabled={!selectedRow}
          >
            Edit Details
          </Button>
          {onOpenClassic && (
            <Button variant="ghost" size="sm" onClick={onOpenClassic}>
              Classic
            </Button>
          )}
        </div>
      </div>

      {/* Zone 2: Pre-submit review region — selected row quick-edit bar */}
      <div className="border-b border-border/70 bg-background px-3 py-3 md:px-4">
        {/* BUG-043: Error message anchored to top of zone, above inputs, for clear visibility */}
        {selectedRow?.status === "error" && selectedRow.errorMessage && (
          <div className="mb-2 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{selectedRow.errorMessage}</span>
          </div>
        )}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 overflow-hidden">
          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Supplier</Label>
            <Input
              list="intake-pilot-top-vendors"
              value={selectedRow?.vendorName ?? ""}
              onChange={e => {
                if (!selectedRow || selectedRow.status !== "pending") return;
                const value = e.target.value;
                const trimmed = value.trim();
                const vendor = vendors.find(v => v.name === trimmed);
                const backfill =
                  trimmed.length > 0 && !selectedRow.brandName.trim();
                handleUpdateSelectedRow({
                  vendorName: value,
                  vendorId: vendor?.id ?? null,
                  ...(backfill ? { brandName: trimmed } : {}),
                });
              }}
              onBlur={e => {
                if (!selectedRow || selectedRow.status !== "pending") return;
                const trimmed = e.target.value.trim();
                if (trimmed === selectedRow.vendorName) return;
                const vendor = vendors.find(v => v.name === trimmed);
                const backfill =
                  trimmed.length > 0 && !selectedRow.brandName.trim();
                handleUpdateSelectedRow({
                  vendorName: trimmed,
                  vendorId: vendor?.id ?? null,
                  ...(backfill ? { brandName: trimmed } : {}),
                });
              }}
              disabled={!selectedRow || selectedRow.status !== "pending"}
              className="h-9"
              placeholder="Supplier"
            />
            <datalist id="intake-pilot-top-vendors">
              {vendors.map(v => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">
              Product / Strain
            </Label>
            <Input
              list="intake-pilot-top-products"
              value={selectedRow?.item ?? ""}
              onChange={e => {
                if (!selectedRow || selectedRow.status !== "pending") return;
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
                if (!selectedRow || selectedRow.status !== "pending") return;
                const trimmed = e.target.value.trim();
                if (trimmed === selectedRow.item) return;
                const product = products.find(p => p.name === trimmed);
                handleUpdateSelectedRow({
                  item: trimmed,
                  productId: product?.id ?? null,
                  strainId: product?.strainId ?? null,
                  category:
                    (product?.category as IntakeRowData["category"]) ??
                    selectedRow.category,
                });
              }}
              disabled={!selectedRow || selectedRow.status !== "pending"}
              className="h-9"
              placeholder="Product"
            />
            <datalist id="intake-pilot-top-products">
              {products.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Qty</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              // BUG-038: Show empty for zero default to avoid confusing "0" placeholder
              value={selectedRow?.qty || ""}
              onChange={e => {
                if (!selectedRow || selectedRow.status !== "pending") return;
                const val = Number(e.target.value);
                handleUpdateSelectedRow({
                  qty: Number.isFinite(val) ? val : 0,
                });
              }}
              disabled={!selectedRow || selectedRow.status !== "pending"}
              className="h-9"
              placeholder="0"
            />
          </div>

          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">COGS Mode</Label>
            <Select
              value={selectedRow?.cogsMode ?? "FIXED"}
              onValueChange={value => {
                if (!selectedRow || selectedRow.status !== "pending") return;
                handleUpdateSelectedRow({ cogsMode: value as IntakeCogsMode });
              }}
              disabled={!selectedRow || selectedRow.status !== "pending"}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Fixed</SelectItem>
                <SelectItem value="RANGE">Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRow?.cogsMode === "RANGE" ? (
            <>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">
                  COGS Min
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  // BUG-038: Show empty for zero default
                  value={selectedRow?.cogsMin || ""}
                  onChange={e => {
                    if (!selectedRow || selectedRow.status !== "pending")
                      return;
                    const val = Number(e.target.value);
                    handleUpdateSelectedRow({
                      cogsMin: Number.isFinite(val) ? val : 0,
                    });
                  }}
                  disabled={!selectedRow || selectedRow.status !== "pending"}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">
                  COGS Max
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  // BUG-038: Show empty for zero default
                  value={selectedRow?.cogsMax || ""}
                  onChange={e => {
                    if (!selectedRow || selectedRow.status !== "pending")
                      return;
                    const val = Number(e.target.value);
                    handleUpdateSelectedRow({
                      cogsMax: Number.isFinite(val) ? val : 0,
                    });
                  }}
                  disabled={!selectedRow || selectedRow.status !== "pending"}
                  className="h-9"
                  placeholder="0.00"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">COGS</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                // BUG-038: Show empty for zero default
                value={selectedRow?.cogs || ""}
                onChange={e => {
                  if (!selectedRow || selectedRow.status !== "pending") return;
                  const val = Number(e.target.value);
                  handleUpdateSelectedRow({
                    cogs: Number.isFinite(val) ? val : 0,
                  });
                }}
                disabled={!selectedRow || selectedRow.status !== "pending"}
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Select
              value={selectedRow?.site ?? ""}
              onValueChange={value => {
                if (!selectedRow || selectedRow.status !== "pending") return;
                const location = locations.find(l => l.site === value);
                handleUpdateSelectedRow({
                  site: value,
                  locationId: location?.id ?? null,
                  locationName: value,
                });
              }}
              disabled={!selectedRow || selectedRow.status !== "pending"}
            >
              <SelectTrigger className="h-9 truncate">
                <SelectValue
                  placeholder="Select location"
                  className="truncate"
                />
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
      </div>

      {/* Zone 3: Workflow action bar */}
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
              onClick={() => void handleSubmitSelected()}
              disabled={isSubmitting}
            >
              <Send className="mr-1 h-4 w-4" />
              Submit Selected ({selectedPendingRows.length})
            </Button>
          )}

          {selectedPendingRows.length > 1 && (
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
                  {FILL_DOWN_FIELD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
          )}

          {selectedPendingRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateSelected}
              >
                Duplicate ({selectedPendingRows.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSelected}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
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
            onClick={() => void handleExportCsv()}
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
            onClick={() => void handleSubmitAll()}
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

      {/* Zone 4 + 5: Grid + validation failures */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ValidationFailureCard errorRows={errorRows} />

        {/* Data loading / error state */}
        {dataError && (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-semibold text-lg">
                Unable to load reference data
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {(dataError as unknown as Error).message ?? "Please try again."}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  void refetchVendors();
                  void refetchLocations();
                  void refetchProducts();
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {!dataError && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Dominant intake document grid */}
            <div className="flex-1 min-h-0">
              <PowersheetGrid<IntakeDraftRow>
                surfaceId="intake-pilot-document"
                requirementIds={[
                  "OPS-INT-001",
                  "OPS-INT-002",
                  "OPS-INT-004",
                  "OPS-INT-005",
                ]}
                releaseGateIds={["INT-PILOT-001"]}
                affordances={intakeAffordances}
                title="Direct Intake Session"
                description="Draft and submit inventory intake rows. Pending rows are editable."
                rows={rows}
                columnDefs={columnDefs}
                getRowId={row => row.id}
                selectedRowId={selectedRow?.id ?? null}
                onSelectedRowChange={row => setSelectedRowId(row?.id ?? null)}
                selectionMode="cell-range"
                enableFillHandle={true}
                enableUndoRedo={true}
                onSelectionSummaryChange={setQueueSelectionSummary}
                onCellValueChanged={handleCellValueChanged}
                isLoading={isLoadingData}
                errorMessage={null}
                emptyTitle="No intake rows"
                emptyDescription="Add rows to start a new intake session."
                summary={
                  <span>
                    {pendingCount} pending · {submittedCount} submitted
                    {errorCount > 0 && (
                      <span className="text-red-600 ml-1">
                        · {errorCount} error{errorCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                }
                antiDriftSummary="OPS-INT-001: Pending rows editable · OPS-INT-004: Single-row submit · OPS-INT-005: Bulk submit + CSV export"
                minHeight={360}
              />
            </div>

            {/* Inspector Panel */}
            {/* BUG-039: Title and subtitle reflect actual row state */}
            <InspectorPanel
              isOpen={inspector.isOpen}
              onClose={inspector.close}
              title={selectedRow ? "Edit Row" : "Row Details"}
              subtitle={
                selectedRow?.item ||
                (selectedRow ? "New row" : "No row selected")
              }
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
              {selectedRow?.status === "pending" && (
                <InspectorActions>
                  <Button
                    variant="outline"
                    onClick={() => removeRowsWithUndo([selectedRow.id])}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Row
                  </Button>
                  <Button
                    onClick={() => void handleSubmitRow(selectedRow)}
                    disabled={isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit This Row
                  </Button>
                </InspectorActions>
              )}
            </InspectorPanel>
          </div>
        )}
      </div>

      {/* Zone 6: Status bar */}
      <WorkSurfaceStatusBar
        left={`${pendingCount} pending · ${submittedCount} submitted`}
        center={
          queueSelectionSummary
            ? `${queueSelectionSummary.selectedCellCount} cells · ${queueSelectionSummary.selectedRowCount} rows`
            : selectedCount > 0
              ? `${selectedCount} selected`
              : undefined
        }
        right={
          <KeyboardHintBar hints={documentKeyboardHints} className="text-xs" />
        }
      />
    </section>
  );
}

export default IntakePilotSurface;
