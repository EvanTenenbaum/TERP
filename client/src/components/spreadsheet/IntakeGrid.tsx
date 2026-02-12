import React, { useCallback, useMemo, useState } from "react";
import { INTAKE_DEFAULTS } from "@/lib/constants/intakeDefaults";
import type {
  CellValueChangedEvent,
  ColDef,
  ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { IntakeGridRow, IntakeGridSummary } from "@/types/spreadsheet";
import {
  Plus,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

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

// Payment terms must match server validation schema
const paymentTermsOptions = [
  "COD",
  "NET_7",
  "NET_15",
  "NET_30",
  "CONSIGNMENT",
  "PARTIAL",
] as const;

const categoryOptions = [
  "Flower",
  "Deps",
  "Concentrate",
  "Edible",
  "PreRoll",
  "Vape",
  "Other",
] as const;

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
  // TER-228: Default from centralized intake defaults
  paymentTerms: INTAKE_DEFAULTS.paymentTerms,
  locationId: null,
  locationName: "",
  site: "",
  notes: "",
  status: "pending",
});

const StatusCellRenderer = (params: ICellRendererParams<IntakeGridRow>) => {
  const status = params.data?.status;
  const errorMessage = params.data?.errorMessage;

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
};

// Type for vendor data from API
interface VendorItem {
  id: number;
  name: string;
}

// Type for location data from API
interface LocationItem {
  id: number;
  site: string;
}

// Type for strain data from API
interface StrainItem {
  id: number;
  name: string;
  standardizedName: string;
}

export const IntakeGrid = React.memo(function IntakeGrid() {
  const [rows, setRows] = useState<IntakeGridRow[]>([createEmptyRow()]);
  const [rowMediaFilesById, setRowMediaFilesById] = useState<
    Record<string, File[]>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vendors for autocomplete
  // QA-FIX: Added isLoading and error states for proper state handling
  const {
    data: vendorsData,
    isLoading: vendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = trpc.vendors.getAll.useQuery();
  const vendors: VendorItem[] = useMemo(() => {
    if (!vendorsData || !vendorsData.success) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (vendorsData as any).data;
    return Array.isArray(data) ? data : [];
  }, [vendorsData]);

  // Fetch locations for dropdown
  // QA-FIX: Added isLoading and error states for proper state handling
  const {
    data: locationsData,
    isLoading: locationsLoading,
    error: locationsError,
    refetch: refetchLocations,
  } = trpc.locations.getAll.useQuery();
  const locations: LocationItem[] = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData]
  );

  // Fetch strains for item autocomplete
  // QA-FIX: Added isLoading and error states for proper state handling
  const {
    data: strainsData,
    isLoading: strainsLoading,
    error: strainsError,
    refetch: refetchStrains,
  } = trpc.strains.list.useQuery({});
  const strains: StrainItem[] = useMemo(
    () => strainsData?.items ?? [],
    [strainsData?.items]
  );

  // Use inventory.intake mutation which calls inventoryIntakeService.processIntake
  // This creates new batches with proper validation and audit logging
  const intakeMutation = trpc.inventory.intake.useMutation();
  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation();

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
          // Return partial successes so caller can clean them up if intake fails.
          throw new UploadMediaError(uploaded);
        }
      }

      return uploaded;
    },
    [uploadMediaMutation]
  );

  const MediaCellRenderer = useCallback(
    (params: ICellRendererParams<IntakeGridRow>) => {
      const rowId = params.data?.id;
      if (!rowId) return null;
      const disabled = params.data?.status !== "pending";
      const count = rowMediaFilesById[rowId]?.length ?? 0;

      return (
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={disabled}
            className="hidden"
            id={`intake-grid-media-${rowId}`}
            onChange={e => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length === 0) return;
              e.target.value = "";

              const accepted = files.filter(
                f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
              );

              if (accepted.length !== files.length) {
                toast.error("Only images under 10MB are allowed");
              }

              setRowMediaFilesById(prev => ({
                ...prev,
                [rowId]: [...(prev[rowId] ?? []), ...accepted],
              }));
            }}
          />

          <label
            htmlFor={`intake-grid-media-${rowId}`}
            className={
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }
            title={count > 0 ? `${count} photo(s) attached` : "Attach photos"}
          >
            <div className="inline-flex items-center gap-1 text-sm">
              <Upload className="h-4 w-4" />
              {count > 0 ? count : "Add"}
            </div>
          </label>

          {count > 0 && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setRowMediaFilesById(prev => {
                  const next = { ...prev };
                  delete next[rowId];
                  return next;
                })
              }
              title="Clear attached photos"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
    [rowMediaFilesById]
  );

  const columnDefs = useMemo<ColDef<IntakeGridRow>[]>(
    () => [
      {
        headerName: "Vendor",
        field: "vendorName",
        width: 160,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: vendors.map(v => v.name),
        },
      },
      {
        // ENH-007: Dynamic header based on row category
        // Shows "Brand/Farmer" for mixed grid since rows can have different categories
        headerName: "Brand/Farmer",
        field: "brandName",
        width: 140,
        editable: params => params.data?.status === "pending",
        // Brand/Farmer can be free-text or copied from vendor
        // For Flower category, this represents the Farmer
      },
      {
        headerName: "Category",
        field: "category",
        width: 120,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: categoryOptions,
        },
      },
      {
        headerName: "Product",
        field: "item",
        flex: 1,
        minWidth: 180,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: strains.map(s => s.standardizedName || s.name),
        },
      },
      {
        headerName: "Qty",
        field: "qty",
        width: 100,
        editable: params => params.data?.status === "pending",
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "COGS",
        field: "cogs",
        width: 120,
        editable: params => params.data?.status === "pending",
        valueFormatter: params => `$${(params.value ?? 0).toFixed(2)}`,
        valueParser: params => {
          const val = Number(params.newValue);
          return Number.isFinite(val) && val >= 0 ? val : params.oldValue;
        },
      },
      {
        headerName: "Payment Terms",
        field: "paymentTerms",
        width: 140,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: paymentTermsOptions,
        },
      },
      {
        headerName: "Location",
        field: "locationName",
        width: 150,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: locations.map(l => l.site),
        },
      },
      {
        headerName: "Photos",
        field: "id",
        width: 110,
        editable: false,
        cellRenderer: MediaCellRenderer,
      },
      {
        headerName: "Notes",
        field: "notes",
        flex: 1,
        minWidth: 180,
        editable: params => params.data?.status === "pending",
      },
      {
        headerName: "Status",
        field: "status",
        width: 120,
        cellRenderer: StatusCellRenderer,
        editable: false,
      },
    ],
    [vendors, locations, strains, MediaCellRenderer]
  );

  const defaultColDef = useMemo<ColDef<IntakeGridRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IntakeGridRow>) => {
      if (!event.data) return;

      // Update vendor ID when vendor name changes
      if (event.colDef.field === "vendorName") {
        const vendor = vendors.find(v => v.name === event.newValue);
        if (vendor) {
          event.node.setDataValue("vendorId", vendor.id);
          // Auto-populate brand with vendor name if empty
          if (!event.data.brandName) {
            event.node.setDataValue("brandName", vendor.name);
          }
        }
      }

      // Update location ID and site when location name changes
      if (event.colDef.field === "locationName") {
        const location = locations.find(l => l.site === event.newValue);
        if (location) {
          event.node.setDataValue("locationId", location.id);
          event.node.setDataValue("site", location.site);
        }
      }

      // Update strainId when item/product changes
      if (event.colDef.field === "item") {
        const strain = strains.find(
          s =>
            s.standardizedName === event.newValue || s.name === event.newValue
        );
        if (strain) {
          event.node.setDataValue("strainId", strain.id);
        }
      }

      // Update rows state
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === event.data?.id ? { ...row, ...event.data } : row
        )
      );
    },
    [vendors, locations, strains]
  );

  const handleAddRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()]);
  }, []);

  const handleRemoveSelectedRows = useCallback(() => {
    const pendingRows = rows.filter(r => r.status === "pending");
    if (pendingRows.length <= 1) {
      toast.error("Cannot remove all rows. Keep at least one row.");
      return;
    }

    // For now, remove the last pending row
    const lastPendingIdx = rows.findLastIndex(r => r.status === "pending");
    const rowId = lastPendingIdx >= 0 ? rows[lastPendingIdx]?.id : undefined;
    if (!rowId) return;

    setRows(prev => prev.filter(r => r.id !== rowId));
    setRowMediaFilesById(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, [rows]);

  const handleSubmitIntake = useCallback(async () => {
    // Validate rows: must have vendor, brand, item, qty > 0, cogs > 0, and location
    const pendingRows = rows.filter(
      r =>
        r.status === "pending" &&
        r.vendorName.trim() !== "" &&
        r.brandName.trim() !== "" &&
        r.item.trim() !== "" &&
        r.qty > 0 &&
        r.cogs > 0 &&
        r.site.trim() !== ""
    );

    if (pendingRows.length === 0) {
      toast.error(
        "No valid rows to submit. Ensure vendor, brand, product, quantity, COGS, and location are filled."
      );
      return;
    }

    setIsSubmitting(true);

    let successCount = 0;
    let errorCount = 0;

    // Process each row individually using inventory.intake mutation
    // This uses inventoryIntakeService.processIntake which creates new batches
    for (const row of pendingRows) {
      const mediaFiles = rowMediaFilesById[row.id] ?? [];
      let uploadedMediaUrls: UploadedMediaUrl[] = [];

      try {
        if (mediaFiles.length > 0) {
          try {
            uploadedMediaUrls = await uploadMediaFiles(mediaFiles);
          } catch (err) {
            if (err instanceof UploadMediaError) {
              uploadedMediaUrls = err.uploaded;
            }
            throw err;
          }
        }

        await intakeMutation.mutateAsync({
          vendorName: row.vendorName,
          brandName: row.brandName,
          productName: row.item,
          category: row.category,
          strainId: row.strainId,
          quantity: row.qty,
          cogsMode: "FIXED" as const,
          unitCogs: row.cogs.toFixed(2),
          paymentTerms: row.paymentTerms as
            | "COD"
            | "NET_7"
            | "NET_15"
            | "NET_30"
            | "CONSIGNMENT"
            | "PARTIAL",
          location: {
            site: row.site,
          },
          metadata: row.notes ? { notes: row.notes } : undefined,
          mediaUrls:
            uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined,
        });

        // Mark row as submitted
        setRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, status: "submitted" as const } : r
          )
        );
        setRowMediaFilesById(prev => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        successCount++;
      } catch (error) {
        if (uploadedMediaUrls.length > 0) {
          try {
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

        // Mark row as error
        setRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage:
                    error instanceof Error
                      ? error.message
                      : "Failed to create batch",
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
      toast.error(
        `Failed to submit ${errorCount} record(s). Check status column for details.`
      );
    }

    setIsSubmitting(false);
  }, [
    rows,
    intakeMutation,
    rowMediaFilesById,
    uploadMediaFiles,
    deleteMediaMutation,
  ]);

  // Calculate summary
  const summary = useMemo<IntakeGridSummary>(() => {
    const pendingRows = rows.filter(r => r.status === "pending");
    return {
      totalItems: pendingRows.length,
      totalQty: pendingRows.reduce((sum, r) => sum + r.qty, 0),
      totalValue: pendingRows.reduce((sum, r) => sum + r.qty * r.cogs, 0),
    };
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Intake Grid</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter new inventory batches. Uses existing intake procedures with
            full validation.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Items:{" "}
              <span className="font-semibold text-foreground">
                {summary.totalItems}
              </span>
            </span>
            <span>
              Qty:{" "}
              <span className="font-semibold text-foreground">
                {summary.totalQty}
              </span>
            </span>
            <span>
              Value:{" "}
              <span className="font-semibold text-foreground">
                ${summary.totalValue.toFixed(2)}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              disabled={vendorsLoading || locationsLoading || strainsLoading}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveSelectedRows}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitIntake}
              disabled={
                isSubmitting ||
                vendorsLoading ||
                locationsLoading ||
                strainsLoading ||
                rows.filter(r => r.status === "pending").length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-1 h-4 w-4" />
                  Submit Intake
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* BUG-112 FIX: Always render grid, show loading/error as inline message */}
        {(vendorsError || locationsError || strainsError) && (
          <div className="mb-3 p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            <p className="font-medium">Unable to load reference data</p>
            <p className="text-muted-foreground mt-1">
              {vendorsError?.message ||
                locationsError?.message ||
                strainsError?.message ||
                "Please try again."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchVendors();
                void refetchLocations();
                void refetchStrains();
              }}
              className="mt-2"
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
        {(vendorsLoading || locationsLoading || strainsLoading) && (
          <div className="mb-3 p-3 text-sm bg-muted/50 rounded-md flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading reference data (vendors, locations, strains)...</span>
          </div>
        )}
        <div className="ag-theme-alpine h-[600px] w-full">
          <AgGridReact<IntakeGridRow>
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows
            onCellValueChanged={handleCellValueChanged}
            getRowId={params => params.data.id}
            rowClassRules={{
              "bg-green-50": params => params.data?.status === "submitted",
              "bg-red-50": params => params.data?.status === "error",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
});
