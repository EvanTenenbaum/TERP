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

import { useState, useCallback, useMemo, useRef } from "react";
import type { ColDef, CellValueChangedEvent, GridApi, GridReadyEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { InspectorPanel, InspectorSection, InspectorField, InspectorActions, useInspectorPanel } from "./InspectorPanel";

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
  ChevronRight,
  X,
} from "lucide-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const intakeRowSchema = z.object({
  vendorName: z.string().min(1, "Vendor is required"),
  brandName: z.string().min(1, "Brand/Farmer is required"),
  category: z.enum(["Flower", "Deps", "Concentrate", "Edible", "PreRoll", "Vape", "Other"]),
  item: z.string().min(1, "Product is required"),
  qty: z.number().min(0.01, "Quantity must be greater than 0"),
  cogs: z.number().min(0.01, "COGS must be greater than 0"),
  paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT", "PARTIAL"]),
  site: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

type IntakeRowData = z.infer<typeof intakeRowSchema>;

interface IntakeGridRow extends IntakeRowData {
  id: string;
  vendorId: number | null;
  strainId: number | null;
  locationId: number | null;
  locationName: string;
  status: "pending" | "submitted" | "error";
  errorMessage?: string;
}

interface IntakeSummary {
  totalItems: number;
  totalQty: number;
  totalValue: number;
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createEmptyRow = (): IntakeGridRow => ({
  id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  vendorId: null,
  vendorName: "",
  brandName: "",
  category: "Flower",
  item: "",
  strainId: null,
  qty: 0,
  cogs: 0,
  paymentTerms: "NET_30",
  locationId: null,
  locationName: "",
  site: "",
  notes: "",
  status: "pending",
});

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
      <div className="flex items-center gap-1 text-red-600" title={errorMessage}>
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
  vendors: { id: number; name: string }[];
  locations: { id: number; site: string }[];
  strains: { id: number; name: string; standardizedName: string }[];
}

function RowInspectorContent({ row, onUpdate, vendors, locations, strains }: RowInspectorProps) {
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

  return (
    <div className="space-y-6">
      <InspectorSection title="Supplier Information" defaultOpen>
        <InspectorField label="Vendor" required>
          <Select
            value={row.vendorName}
            onValueChange={(value) => {
              const vendor = vendors.find((v) => v.name === value);
              onUpdate({
                vendorName: value,
                vendorId: vendor?.id || null,
                brandName: row.brandName || value, // Auto-populate if empty
              });
              validation.handleChange("vendorName", value);
            }}
          >
            <SelectTrigger className={cn(
              validation.getFieldState("vendorName").showError && "border-red-500"
            )}>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.name}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validation.getFieldState("vendorName").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("vendorName").error}
            </p>
          )}
        </InspectorField>

        <InspectorField label="Brand / Farmer" required>
          <Input
            value={row.brandName}
            onChange={(e) => {
              onUpdate({ brandName: e.target.value });
              validation.handleChange("brandName", e.target.value);
            }}
            onBlur={() => validation.handleBlur("brandName")}
            className={cn(
              validation.getFieldState("brandName").showError && "border-red-500"
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
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorField>

        <InspectorField label="Product" required>
          <Select
            value={row.item}
            onValueChange={(value) => {
              const strain = strains.find(
                (s) => s.standardizedName === value || s.name === value
              );
              onUpdate({
                item: value,
                strainId: strain?.id || null,
              });
              validation.handleChange("item", value);
            }}
          >
            <SelectTrigger className={cn(
              validation.getFieldState("item").showError && "border-red-500"
            )}>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {strains.map((s) => (
                <SelectItem key={s.id} value={s.standardizedName || s.name}>
                  {s.standardizedName || s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validation.getFieldState("item").showError && (
            <p className="text-xs text-red-500 mt-1">
              {validation.getFieldState("item").error}
            </p>
          )}
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={row.qty || ""}
              onChange={(e) => {
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
              onChange={(e) => {
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
              {PAYMENT_TERMS_OPTIONS.map((opt) => (
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
            onValueChange={(value) => {
              const location = locations.find((l) => l.site === value);
              onUpdate({
                site: value,
                locationId: location?.id || null,
                locationName: value,
              });
              validation.handleChange("site", value);
            }}
          >
            <SelectTrigger className={cn(
              validation.getFieldState("site").showError && "border-red-500"
            )}>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.site}>
                  {l.site}
                </SelectItem>
              ))}
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
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Add any notes about this intake..."
            rows={3}
          />
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
  // State
  const [rows, setRows] = useState<IntakeGridRow[]>([createEmptyRow()]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gridApiRef = useRef<GridApi | null>(null);

  // Work Surface hooks
  const {
    saveState,
    setSaving,
    setSaved,
    setError,
    SaveStateIndicator,
    isDirty,
  } = useSaveState({
    onStateChange: (state) => {
      if (state.status === "error") {
        toast.error(state.message || "Save failed");
      }
    },
  });

  const inspector = useInspectorPanel();

  // Selected row
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedRowId) || null,
    [rows, selectedRowId]
  );

  // Keyboard contract
  const { keyboardProps, focusState, startEditing, stopEditing } = useWorkSurfaceKeyboard({
    gridMode: true, // Let AG Grid handle Tab navigation
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    onRowCommit: async () => {
      // Commit current row on Enter
      if (selectedRow && selectedRow.status === "pending") {
        await handleSubmitRow(selectedRow);
      }
    },
    onRowCreate: () => {
      // Create new row after successful commit
      handleAddRow();
    },
    onCancel: () => {
      // Clear selection on Escape
      setSelectedRowId(null);
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
  const { data: vendorsData, isLoading: vendorsLoading, error: vendorsError, refetch: refetchVendors } =
    trpc.vendors.getAll.useQuery();
  const vendors = useMemo(() => {
    if (!vendorsData || !(vendorsData as any).success) return [];
    const data = (vendorsData as any).data;
    return Array.isArray(data) ? data : [];
  }, [vendorsData]);

  const { data: locationsData, isLoading: locationsLoading, error: locationsError, refetch: refetchLocations } =
    trpc.locations.getAll.useQuery();
  const locations = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData]
  );

  const { data: strainsData, isLoading: strainsLoading, error: strainsError, refetch: refetchStrains } =
    trpc.strains.list.useQuery({});
  const strains = useMemo(() => strainsData?.items ?? [], [strainsData?.items]);

  // Mutation
  const intakeMutation = trpc.inventory.intake.useMutation();

  // Loading state
  const isLoadingData = vendorsLoading || locationsLoading || strainsLoading;
  const dataError = vendorsError || locationsError || strainsError;

  // Column definitions
  const columnDefs = useMemo<ColDef<IntakeGridRow>[]>(
    () => [
      {
        headerName: "Vendor",
        field: "vendorName",
        width: 160,
        editable: (params) => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: vendors.map((v) => v.name) },
      },
      {
        headerName: "Brand/Farmer",
        field: "brandName",
        width: 140,
        editable: (params) => params.data?.status === "pending",
      },
      {
        headerName: "Category",
        field: "category",
        width: 120,
        editable: (params) => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: CATEGORY_OPTIONS.map((c) => c.value) },
      },
      {
        headerName: "Product",
        field: "item",
        flex: 1,
        minWidth: 180,
        editable: (params) => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: strains.map((s) => s.standardizedName || s.name) },
      },
      {
        headerName: "Qty",
        field: "qty",
        width: 100,
        editable: (params) => params.data?.status === "pending",
        valueParser: (params) => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS",
        field: "cogs",
        width: 120,
        editable: (params) => params.data?.status === "pending",
        valueFormatter: (params) => `$${(params.value ?? 0).toFixed(2)}`,
        valueParser: (params) => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "Payment",
        field: "paymentTerms",
        width: 120,
        editable: (params) => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: PAYMENT_TERMS_OPTIONS.map((p) => p.value) },
      },
      {
        headerName: "Location",
        field: "site",
        width: 130,
        editable: (params) => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: locations.map((l) => l.site) },
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        cellRenderer: (params: any) => <StatusCellRenderer data={params.data} />,
        editable: false,
      },
      {
        headerName: "",
        colId: "actions",
        width: 50,
        cellRenderer: (params: any) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRowId(params.data?.id);
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
    [vendors, locations, strains, inspector]
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
  }, []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IntakeGridRow>) => {
      if (!event.data) return;

      setSaving(); // Mark as saving when changes occur

      // Update vendor ID when vendor name changes
      if (event.colDef.field === "vendorName") {
        const vendor = vendors.find((v) => v.name === event.newValue);
        if (vendor) {
          event.node.setDataValue("vendorId", vendor.id);
          if (!event.data.brandName) {
            event.node.setDataValue("brandName", vendor.name);
          }
        }
      }

      // Update location ID and site when location name changes
      if (event.colDef.field === "site") {
        const location = locations.find((l) => l.site === event.newValue);
        if (location) {
          event.node.setDataValue("locationId", location.id);
        }
      }

      // Update strainId when item/product changes
      if (event.colDef.field === "item") {
        const strain = strains.find(
          (s) => s.standardizedName === event.newValue || s.name === event.newValue
        );
        if (strain) {
          event.node.setDataValue("strainId", strain.id);
        }
      }

      // Update rows state
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === event.data?.id ? { ...row, ...event.data } : row
        )
      );

      // Mark as saved after a short debounce (simulating auto-save)
      setTimeout(() => setSaved(), 500);
    },
    [vendors, locations, strains, setSaving, setSaved]
  );

  const handleRowSelected = useCallback((event: any) => {
    if (event.node.isSelected()) {
      setSelectedRowId(event.data?.id);
    }
  }, []);

  const handleAddRow = useCallback(() => {
    const newRow = createEmptyRow();
    setRows((prev) => [...prev, newRow]);
    setSelectedRowId(newRow.id);

    // Focus the new row
    setTimeout(() => {
      if (gridApiRef.current) {
        const rowIndex = rows.length;
        gridApiRef.current.ensureIndexVisible(rowIndex);
        gridApiRef.current.setFocusedCell(rowIndex, "vendorName");
      }
    }, 50);
  }, [rows.length]);

  const handleRemoveRow = useCallback((rowId: string) => {
    setRows((prev) => {
      const pendingRows = prev.filter((r) => r.status === "pending");
      if (pendingRows.length <= 1 && prev.find((r) => r.id === rowId)?.status === "pending") {
        toast.error("Cannot remove all rows. Keep at least one row.");
        return prev;
      }
      return prev.filter((r) => r.id !== rowId);
    });
    if (selectedRowId === rowId) {
      setSelectedRowId(null);
    }
  }, [selectedRowId]);

  const handleSubmitRow = useCallback(async (row: IntakeGridRow) => {
    // Validate
    const result = intakeRowSchema.safeParse(row);
    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError?.message || "Validation failed");
      return;
    }

    setSaving("Submitting intake...");

    try {
      await intakeMutation.mutateAsync({
        vendorName: row.vendorName,
        brandName: row.brandName,
        productName: row.item,
        category: row.category,
        strainId: row.strainId,
        quantity: row.qty,
        cogsMode: "FIXED" as const,
        unitCogs: row.cogs.toFixed(2),
        paymentTerms: row.paymentTerms,
        location: { site: row.site },
        metadata: row.notes ? { notes: row.notes } : undefined,
      });

      // Mark as submitted
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: "submitted" as const } : r
        )
      );
      setSaved();
      toast.success("Intake submitted successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit intake";
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, status: "error" as const, errorMessage: message }
            : r
        )
      );
      setError(message);
    }
  }, [intakeMutation, setSaving, setSaved, setError]);

  const handleSubmitAll = useCallback(async () => {
    const pendingRows = rows.filter(
      (r) =>
        r.status === "pending" &&
        r.vendorName.trim() !== "" &&
        r.brandName.trim() !== "" &&
        r.item.trim() !== "" &&
        r.qty > 0 &&
        r.cogs > 0 &&
        r.site.trim() !== ""
    );

    if (pendingRows.length === 0) {
      toast.error("No valid rows to submit. Ensure all required fields are filled.");
      return;
    }

    setIsSubmitting(true);
    setSaving(`Submitting ${pendingRows.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    for (const row of pendingRows) {
      try {
        await intakeMutation.mutateAsync({
          vendorName: row.vendorName,
          brandName: row.brandName,
          productName: row.item,
          category: row.category,
          strainId: row.strainId,
          quantity: row.qty,
          cogsMode: "FIXED" as const,
          unitCogs: row.cogs.toFixed(2),
          paymentTerms: row.paymentTerms,
          location: { site: row.site },
          metadata: row.notes ? { notes: row.notes } : undefined,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: "submitted" as const } : r
          )
        );
        successCount++;
      } catch (error) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage: error instanceof Error ? error.message : "Failed",
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
  }, [rows, intakeMutation, setSaving, setSaved, setError]);

  const handleUpdateSelectedRow = useCallback((updates: Partial<IntakeGridRow>) => {
    if (!selectedRowId) return;
    setSaving();
    setRows((prev) =>
      prev.map((r) => (r.id === selectedRowId ? { ...r, ...updates } : r))
    );
    setTimeout(() => setSaved(), 500);
  }, [selectedRowId, setSaving, setSaved]);

  // Summary calculation
  const summary = useMemo<IntakeSummary>(() => {
    const pendingRows = rows.filter((r) => r.status === "pending");
    return {
      totalItems: pendingRows.length,
      totalQty: pendingRows.reduce((sum, r) => sum + r.qty, 0),
      totalValue: pendingRows.reduce((sum, r) => sum + r.qty * r.cogs, 0),
    };
  }, [rows]);

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6" />
            Direct Intake
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add new inventory batches with full validation
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Save State Indicator */}
          {SaveStateIndicator}

          {/* Summary Stats */}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Items: <span className="font-semibold text-foreground">{summary.totalItems}</span>
            </span>
            <span>
              Qty: <span className="font-semibold text-foreground">{summary.totalQty}</span>
            </span>
            <span>
              Value: <span className="font-semibold text-foreground">${summary.totalValue.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="mr-1 h-4 w-4" />
            Add Row
          </Button>
          {selectedRowId && selectedRow?.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemoveRow(selectedRowId)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSubmitAll}
          disabled={isSubmitting || rows.filter((r) => r.status === "pending").length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-1 h-4 w-4" />
              Submit All
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Grid Area */}
        <div className={cn("flex-1 transition-all duration-200 min-h-0", inspector.isOpen && "mr-96")}>
          {isLoadingData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">Loading reference data...</p>
              </div>
            </div>
          ) : dataError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="font-semibold text-lg">Unable to load reference data</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {dataError?.message || "Please try again."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchVendors();
                    refetchLocations();
                    refetchStrains();
                  }}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="ag-theme-alpine h-full w-full">
              <AgGridReact<IntakeGridRow>
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows
                rowSelection="single"
                onGridReady={handleGridReady}
                onCellValueChanged={handleCellValueChanged}
                onRowSelected={handleRowSelected}
                getRowId={(params) => params.data.id}
                rowClassRules={{
                  "bg-green-50": (params) => params.data?.status === "submitted",
                  "bg-red-50": (params) => params.data?.status === "error",
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
            vendors={vendors}
            locations={locations}
            strains={strains}
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
              <Button onClick={() => handleSubmitRow(selectedRow)}>
                <Send className="mr-2 h-4 w-4" />
                Submit This Row
              </Button>
            </InspectorActions>
          )}
        </InspectorPanel>
      </div>
    </div>
  );
}

export default DirectIntakeWorkSurface;
