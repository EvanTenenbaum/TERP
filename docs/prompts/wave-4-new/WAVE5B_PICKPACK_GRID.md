# Agent Prompt: Wave 5B - Spreadsheet View Phase 3 (Pick & Pack Grid)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing Phase 3 of the Unified Spreadsheet View feature - the Pick & Pack Grid.

### Your Mission

Build the Pick & Pack Grid component that allows users to fulfill orders in a spreadsheet-like interface, while maintaining full integration with the existing TERP backend.

### Key Documents to Read First

1. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
2. **QA Review:** `docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`
3. **Existing Implementation:** `client/src/components/spreadsheet/InventoryGrid.tsx`
4. **Pick & Pack Router:** `server/routers/pickPack.ts`
5. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md` (search for FEATURE-021)

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feat/spreadsheet-pickpack-grid
```

### File Ownership

**You have permission to modify/create these files:**

- `client/src/components/spreadsheet/PickPackGrid.tsx` (new)
- `client/src/pages/SpreadsheetViewPage.tsx` (add Pick & Pack tab)
- `server/routers/spreadsheet.ts` (add pick/pack data transformation)
- `server/services/spreadsheetViewService.ts` (add pick/pack queries)

**DO NOT modify:**

- `server/routers/pickPack.ts` (use existing mutations)
- `server/services/pickPackService.ts` (use existing service)

---

## 2. Your Task (12-20h)

### FEATURE-021 Phase 3: Pick & Pack Grid

**Critical Constraint:** This is a **presentation layer only**. All mutations MUST flow through existing tRPC procedures. NO new business logic.

**Objectives:**

1. Create PickPackGrid component using AG-Grid
2. Display pending orders with line items in a spreadsheet format
3. Allow users to mark items as picked/packed
4. Update order status using existing `pickPack` router
5. Provide visual feedback for fulfillment progress

---

## 3. Implementation Guide

### Step 1: Define Pick & Pack Row Type

```typescript
// Types for Pick & Pack Grid
interface PickPackRow {
  id: string;
  orderId: number;
  orderNumber: string;
  clientName: string;
  lineItemId: number;
  productName: string;
  sku: string;
  orderedQty: number;
  pickedQty: number;
  packedQty: number;
  status: "pending" | "picked" | "packed" | "shipped";
  location: string;
  notes: string;
}
```

### Step 2: Create PickPackGrid Component

Create `client/src/components/spreadsheet/PickPackGrid.tsx`:

```typescript
import React, { useCallback, useMemo } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-enterprise";

export const PickPackGrid = React.memo(function PickPackGrid() {
  // Fetch pending orders for pick/pack
  const { data, isLoading, error, refetch } =
    trpc.spreadsheet.getPickPackGridData.useQuery({ status: "pending" });

  // Mutations for updating pick/pack status
  const updateLineItem = trpc.pickPack.updateLineItemStatus.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      void refetch();
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const markAsPicked = trpc.pickPack.markAsPicked.useMutation({
    onSuccess: () => {
      toast.success("Marked as picked");
      void refetch();
    },
  });

  const markAsPacked = trpc.pickPack.markAsPacked.useMutation({
    onSuccess: () => {
      toast.success("Marked as packed");
      void refetch();
    },
  });

  const columnDefs = useMemo<ColDef<PickPackRow>[]>(
    () => [
      {
        headerName: "Order #",
        field: "orderNumber",
        width: 120,
        rowGroup: true, // Group by order
        hide: true,
      },
      {
        headerName: "Client",
        field: "clientName",
        width: 150,
      },
      {
        headerName: "Product",
        field: "productName",
        flex: 1,
        minWidth: 200,
      },
      {
        headerName: "SKU",
        field: "sku",
        width: 120,
      },
      {
        headerName: "Ordered",
        field: "orderedQty",
        width: 100,
        type: "numericColumn",
      },
      {
        headerName: "Picked",
        field: "pickedQty",
        width: 100,
        type: "numericColumn",
        editable: true,
        cellStyle: (params) => {
          if (!params.data) return undefined;
          const picked = params.value || 0;
          const ordered = params.data.orderedQty;
          if (picked >= ordered) {
            return { backgroundColor: "#dcfce7" }; // Green - complete
          }
          if (picked > 0) {
            return { backgroundColor: "#fef9c3" }; // Yellow - partial
          }
          return undefined;
        },
        valueParser: (params) => {
          const val = Number(params.newValue);
          return Math.min(Math.max(0, val), params.data?.orderedQty || 0);
        },
      },
      {
        headerName: "Packed",
        field: "packedQty",
        width: 100,
        type: "numericColumn",
        editable: true,
        cellStyle: (params) => {
          if (!params.data) return undefined;
          const packed = params.value || 0;
          const picked = params.data.pickedQty;
          if (packed >= picked && picked > 0) {
            return { backgroundColor: "#dbeafe" }; // Blue - packed
          }
          return undefined;
        },
        valueParser: (params) => {
          const val = Number(params.newValue);
          return Math.min(Math.max(0, val), params.data?.pickedQty || 0);
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 100,
        cellRenderer: (params: { value: string }) => {
          const statusColors: Record<string, string> = {
            pending: "bg-gray-100 text-gray-800",
            picked: "bg-yellow-100 text-yellow-800",
            packed: "bg-blue-100 text-blue-800",
            shipped: "bg-green-100 text-green-800",
          };
          return (
            <span
              className={`px-2 py-1 rounded text-xs ${statusColors[params.value] || ""}`}
            >
              {params.value}
            </span>
          );
        },
      },
      {
        headerName: "Location",
        field: "location",
        width: 120,
      },
      {
        headerName: "Notes",
        field: "notes",
        flex: 1,
        minWidth: 150,
        editable: true,
      },
      {
        headerName: "Actions",
        width: 200,
        cellRenderer: (params: { data: PickPackRow }) => {
          if (!params.data) return null;
          const row = params.data;
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={row.pickedQty >= row.orderedQty}
                onClick={() =>
                  markAsPicked.mutate({
                    lineItemId: row.lineItemId,
                    quantity: row.orderedQty,
                  })
                }
              >
                Pick All
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={row.packedQty >= row.pickedQty || row.pickedQty === 0}
                onClick={() =>
                  markAsPacked.mutate({
                    lineItemId: row.lineItemId,
                    quantity: row.pickedQty,
                  })
                }
              >
                Pack All
              </Button>
            </div>
          );
        },
      },
    ],
    [markAsPicked, markAsPacked]
  );

  const defaultColDef = useMemo<ColDef<PickPackRow>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const autoGroupColumnDef = useMemo<ColDef<PickPackRow>>(
    () => ({
      headerName: "Order",
      minWidth: 200,
      cellRendererParams: {
        suppressCount: false,
      },
    }),
    []
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<PickPackRow>) => {
      if (!event.data) return;

      if (event.colDef.field === "pickedQty") {
        updateLineItem.mutate({
          lineItemId: event.data.lineItemId,
          pickedQty: event.newValue,
        });
      }

      if (event.colDef.field === "packedQty") {
        updateLineItem.mutate({
          lineItemId: event.data.lineItemId,
          packedQty: event.newValue,
        });
      }

      if (event.colDef.field === "notes") {
        updateLineItem.mutate({
          lineItemId: event.data.lineItemId,
          notes: event.newValue,
        });
      }
    },
    [updateLineItem]
  );

  const pendingCount = data?.rows.filter((r) => r.status === "pending").length || 0;
  const pickedCount = data?.rows.filter((r) => r.status === "picked").length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pick & Pack Grid</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fulfill orders by picking and packing items.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {pendingCount} pending | {pickedCount} picked
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 text-sm text-destructive">{error.message}</div>
        )}
        <div className="ag-theme-alpine h-[600px] w-full">
          <AgGridReact<PickPackRow>
            rowData={data?.rows ?? []}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            groupDefaultExpanded={1}
            getRowId={(params) => String(params.data.lineItemId)}
            onCellValueChanged={handleCellValueChanged}
            suppressLoadingOverlay={!isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
});
```

### Step 3: Add Backend Query

Add to `server/routers/spreadsheet.ts`:

```typescript
getPickPackGridData: publicProcedure
  .input(z.object({ status: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const rows = await spreadsheetViewService.getPickPackGridData(input.status);
    return { rows };
  }),
```

Add to `server/services/spreadsheetViewService.ts`:

```typescript
async getPickPackGridData(status?: string): Promise<PickPackRow[]> {
  // Query orders with line items, transform to grid format
  // Use existing pickPack service for data access
}
```

### Step 4: Add Pick & Pack Tab

Update `client/src/pages/SpreadsheetViewPage.tsx`:

```typescript
import { PickPackGrid } from "@/components/spreadsheet/PickPackGrid";

const tabs = [
  { id: "inventory", label: "Inventory", component: InventoryGrid },
  { id: "intake", label: "Intake", component: IntakeGrid },
  { id: "pickpack", label: "Pick & Pack", component: PickPackGrid },
  { id: "clients", label: "Clients", component: ClientGrid },
];
```

---

## 4. Deliverables Checklist

- [ ] `PickPackGrid.tsx` component created with AG-Grid
- [ ] Row grouping by order number
- [ ] Editable picked/packed quantity columns
- [ ] Color coding for fulfillment status
- [ ] "Pick All" and "Pack All" action buttons
- [ ] Integration with existing `pickPack` router mutations
- [ ] Backend query for pick/pack grid data
- [ ] Pick & Pack tab added to SpreadsheetViewPage
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## 5. Testing

### Manual Testing

1. Navigate to Spreadsheet View → Pick & Pack tab
2. Verify orders are grouped correctly
3. Edit picked quantity and verify it updates
4. Click "Pick All" and verify all items are picked
5. Click "Pack All" and verify all items are packed
6. Verify color coding reflects status

### Automated Testing

```bash
pnpm check
pnpm test
```

---

## 6. Completion Protocol

1. **Implement all tasks** on your `feat/spreadsheet-pickpack-grid` branch
2. **Run `pnpm check`** to ensure no TypeScript errors
3. **Create a Pull Request** to `main`:

```
feat: FEATURE-021 Phase 3 - Pick & Pack Grid

- Created PickPackGrid component with AG-Grid
- Added row grouping by order number
- Integrated with existing pickPack router mutations
- Added color coding for fulfillment status
- Added Pick & Pack tab to SpreadsheetViewPage
```

---

## 7. Critical Constraints

1. **NO new business logic** - Use existing `pickPack` router
2. **ALL mutations** must use existing tRPC procedures
3. **Packed quantity cannot exceed picked quantity**
4. **Picked quantity cannot exceed ordered quantity**
5. **ALL actions** must be logged via existing audit system

---

Good luck! The Pick & Pack Grid will streamline order fulfillment.
