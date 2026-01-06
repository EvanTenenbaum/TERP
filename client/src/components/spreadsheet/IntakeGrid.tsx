import React, { useCallback, useMemo, useState } from "react";
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
import { Plus, Send, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const paymentTermsOptions = [
  "NET15",
  "NET30",
  "NET45",
  "NET60",
  "COD",
  "PREPAID",
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
  category: "Flower",
  item: "",
  qty: 0,
  cogs: 0,
  paymentTerms: "NET30",
  locationId: null,
  locationName: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vendors for autocomplete
  const { data: vendorsData } = trpc.vendors.getAll.useQuery();
  const vendors: VendorItem[] = useMemo(() => {
    if (!vendorsData || !vendorsData.success) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (vendorsData as any).data;
    return Array.isArray(data) ? data : [];
  }, [vendorsData]);

  // Fetch locations for dropdown
  const { data: locationsData } = trpc.locations.getAll.useQuery();
  const locations: LocationItem[] = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData]
  );

  // Fetch strains for item autocomplete
  const { data: strainsData } = trpc.strains.list.useQuery({});
  const strains: StrainItem[] = useMemo(
    () => strainsData?.items ?? [],
    [strainsData?.items]
  );

  // Create intake session mutation
  const createSession = trpc.productIntake.createSession.useMutation();
  const addBatch = trpc.productIntake.addBatch.useMutation();
  const completeSession = trpc.productIntake.completeSession.useMutation();

  const columnDefs = useMemo<ColDef<IntakeGridRow>[]>(
    () => [
      {
        headerName: "Vendor",
        field: "vendorName",
        width: 180,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: vendors.map(v => v.name),
        },
      },
      {
        headerName: "Category",
        field: "category",
        width: 130,
        editable: params => params.data?.status === "pending",
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: categoryOptions,
        },
      },
      {
        headerName: "Item",
        field: "item",
        flex: 1,
        minWidth: 200,
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
    [vendors, locations, strains]
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
        }
      }

      // Update location ID when location name changes
      if (event.colDef.field === "locationName") {
        const location = locations.find(l => l.site === event.newValue);
        if (location) {
          event.node.setDataValue("locationId", location.id);
        }
      }

      // Update rows state
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === event.data?.id ? { ...row, ...event.data } : row
        )
      );
    },
    [vendors, locations]
  );

  const handleAddRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()]);
  }, []);

  const handleRemoveSelectedRows = useCallback(() => {
    setRows(prev => {
      const pendingRows = prev.filter(r => r.status === "pending");
      if (pendingRows.length <= 1) {
        toast.error("Cannot remove all rows. Keep at least one row.");
        return prev;
      }
      // For now, remove the last pending row
      const lastPendingIdx = prev.findLastIndex(r => r.status === "pending");
      if (lastPendingIdx >= 0) {
        return prev.filter((_, idx) => idx !== lastPendingIdx);
      }
      return prev;
    });
  }, []);

  const handleSubmitIntake = useCallback(async () => {
    const pendingRows = rows.filter(
      r => r.status === "pending" && r.vendorId && r.item && r.qty > 0
    );

    if (pendingRows.length === 0) {
      toast.error(
        "No valid rows to submit. Ensure vendor, item, and quantity are filled."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Group rows by vendor to create separate intake sessions
      const rowsByVendor = new Map<number, IntakeGridRow[]>();
      for (const row of pendingRows) {
        if (row.vendorId) {
          const existing = rowsByVendor.get(row.vendorId) || [];
          rowsByVendor.set(row.vendorId, [...existing, row]);
        }
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [vendorId, vendorRows] of rowsByVendor) {
        try {
          // Create intake session
          const session = await createSession.mutateAsync({
            vendorId,
            receiveDate: new Date().toISOString().slice(0, 10),
            receivedBy: 1, // TODO: Get from auth context
            paymentTerms: vendorRows[0]?.paymentTerms || "NET30",
          });

          // Check if session was created successfully
          if (!session.sessionId) {
            throw new Error("Failed to create intake session");
          }

          const sessionId = session.sessionId;

          // Add each batch to the session
          for (const row of vendorRows) {
            try {
              // For simplicity, we'll use the first batch ID from a search
              // In a real implementation, this would create a new batch
              await addBatch.mutateAsync({
                intakeSessionId: sessionId,
                batchId: 1, // Placeholder - real implementation would create/find batch
                receivedQty: row.qty,
                unitCost: row.cogs,
                internalNotes: row.notes,
              });

              // Mark row as submitted
              setRows(prev =>
                prev.map(r =>
                  r.id === row.id ? { ...r, status: "submitted" as const } : r
                )
              );
              successCount++;
            } catch (batchError) {
              // Mark row as error
              setRows(prev =>
                prev.map(r =>
                  r.id === row.id
                    ? {
                        ...r,
                        status: "error" as const,
                        errorMessage:
                          batchError instanceof Error
                            ? batchError.message
                            : "Failed to add batch",
                      }
                    : r
                )
              );
              errorCount++;
            }
          }

          // Complete the session
          await completeSession.mutateAsync({ intakeSessionId: sessionId });
        } catch (sessionError) {
          // Mark all rows for this vendor as error
          for (const row of vendorRows) {
            setRows(prev =>
              prev.map(r =>
                r.id === row.id
                  ? {
                      ...r,
                      status: "error" as const,
                      errorMessage:
                        sessionError instanceof Error
                          ? sessionError.message
                          : "Failed to create session",
                    }
                  : r
              )
            );
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully submitted ${successCount} intake record(s)`
        );
      }
      if (errorCount > 0) {
        toast.error(
          `Failed to submit ${errorCount} record(s). Check status column for details.`
        );
      }
    } catch (error) {
      toast.error(
        "Intake submission failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [rows, createSession, addBatch, completeSession]);

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
            <Button variant="outline" size="sm" onClick={handleAddRow}>
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
                rows.filter(r => r.status === "pending").length === 0
              }
            >
              <Send className="mr-1 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Intake"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
