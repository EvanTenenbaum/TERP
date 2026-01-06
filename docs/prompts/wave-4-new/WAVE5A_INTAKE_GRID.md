# Agent Prompt: Wave 5A - Spreadsheet View Phase 2 (Intake Grid)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing Phase 2 of the Unified Spreadsheet View feature - the Intake Grid.

### Your Mission

Build the Intake Grid component that allows users to enter new inventory batches in a spreadsheet-like interface, while maintaining full integration with the existing TERP backend.

### Key Documents to Read First

1. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
2. **QA Review:** `docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`
3. **Existing Implementation:** `client/src/components/spreadsheet/InventoryGrid.tsx`
4. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md` (search for FEATURE-021)

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feat/spreadsheet-intake-grid
```

### File Ownership

**You have permission to modify/create these files:**

- `client/src/components/spreadsheet/IntakeGrid.tsx` (new)
- `client/src/pages/SpreadsheetViewPage.tsx` (add Intake tab)
- `server/routers/spreadsheet.ts` (add intake procedures if needed)
- `server/services/spreadsheetViewService.ts` (add intake data transformation)

**DO NOT modify:**

- `server/services/inventoryIntakeService.ts` (use existing service)
- `server/routers/inventory.ts` (use existing mutations)

---

## 2. Your Task (12-16h)

### FEATURE-021 Phase 2: Intake Grid

**Critical Constraint:** This is a **presentation layer only**. All mutations MUST flow through existing tRPC procedures. NO new business logic.

**Objectives:**

1. Create IntakeGrid component using AG-Grid
2. Allow users to enter new batch data in a spreadsheet format
3. Validate and submit batches using existing `inventoryIntakeService`
4. Provide visual feedback for validation errors and successful submissions

---

## 3. Implementation Guide

### Step 1: Create IntakeGrid Component

Create `client/src/components/spreadsheet/IntakeGrid.tsx`:

```typescript
import React, { useCallback, useMemo, useState } from "react";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface IntakeRow {
  id: string; // Temporary ID for grid
  vendorCode: string;
  source: string;
  category: string;
  item: string;
  quantity: number;
  unitCost: number;
  notes: string;
  isValid: boolean;
  errors: string[];
}

const createEmptyRow = (): IntakeRow => ({
  id: crypto.randomUUID(),
  vendorCode: "",
  source: "",
  category: "",
  item: "",
  quantity: 0,
  unitCost: 0,
  notes: "",
  isValid: false,
  errors: [],
});

export const IntakeGrid = React.memo(function IntakeGrid() {
  const [rows, setRows] = useState<IntakeRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use existing intake mutation
  const createBatch = trpc.inventory.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Batch created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create batch: ${error.message}`);
    },
  });

  const columnDefs = useMemo<ColDef<IntakeRow>[]>(
    () => [
      {
        headerName: "Vendor Code",
        field: "vendorCode",
        editable: true,
        width: 140,
        cellStyle: (params) =>
          params.data?.errors.includes("vendorCode")
            ? { backgroundColor: "#fee2e2" }
            : undefined,
      },
      {
        headerName: "Source",
        field: "source",
        editable: true,
        width: 140,
      },
      {
        headerName: "Category",
        field: "category",
        editable: true,
        width: 140,
      },
      {
        headerName: "Item",
        field: "item",
        editable: true,
        flex: 1,
        minWidth: 200,
      },
      {
        headerName: "Quantity",
        field: "quantity",
        editable: true,
        width: 120,
        type: "numericColumn",
        valueParser: (params) => Number(params.newValue) || 0,
      },
      {
        headerName: "Unit Cost",
        field: "unitCost",
        editable: true,
        width: 120,
        type: "numericColumn",
        valueFormatter: (params) =>
          params.value ? `$${params.value.toFixed(2)}` : "",
        valueParser: (params) => Number(params.newValue) || 0,
      },
      {
        headerName: "Notes",
        field: "notes",
        editable: true,
        flex: 1,
        minWidth: 200,
      },
      {
        headerName: "Status",
        field: "isValid",
        width: 100,
        editable: false,
        cellRenderer: (params: { data: IntakeRow }) => {
          if (!params.data) return null;
          if (params.data.isValid) {
            return <span className="text-green-600">✓ Valid</span>;
          }
          if (params.data.errors.length > 0) {
            return <span className="text-red-600">✗ Invalid</span>;
          }
          return <span className="text-gray-400">—</span>;
        },
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef<IntakeRow>>(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
    }),
    []
  );

  const validateRow = useCallback((row: IntakeRow): IntakeRow => {
    const errors: string[] = [];

    if (!row.vendorCode.trim()) errors.push("vendorCode");
    if (!row.item.trim()) errors.push("item");
    if (row.quantity <= 0) errors.push("quantity");

    return {
      ...row,
      isValid: errors.length === 0 && row.item.trim() !== "",
      errors,
    };
  }, []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IntakeRow>) => {
      if (!event.data) return;

      setRows((prev) =>
        prev.map((row) =>
          row.id === event.data!.id ? validateRow(event.data!) : row
        )
      );
    },
    [validateRow]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const submitValidRows = useCallback(async () => {
    const validRows = rows.filter((row) => row.isValid);

    if (validRows.length === 0) {
      toast.error("No valid rows to submit");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const row of validRows) {
        await createBatch.mutateAsync({
          vendorCode: row.vendorCode,
          source: row.source,
          category: row.category,
          item: row.item,
          intakeQty: row.quantity,
          unitCost: row.unitCost,
          notes: row.notes,
        });
      }

      // Remove submitted rows, keep invalid ones
      setRows((prev) => {
        const remaining = prev.filter((row) => !row.isValid);
        return remaining.length > 0 ? remaining : [createEmptyRow()];
      });

      toast.success(`${validRows.length} batch(es) created successfully`);
    } catch (error) {
      toast.error("Failed to submit batches");
    } finally {
      setIsSubmitting(false);
    }
  }, [rows, createBatch]);

  const validCount = rows.filter((r) => r.isValid).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Intake Grid</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter new inventory batches. Valid rows will be highlighted.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {validCount} of {rows.length} rows valid
          </div>
          <Button variant="outline" size="sm" onClick={addRow}>
            Add Row
          </Button>
          <Button
            size="sm"
            onClick={submitValidRows}
            disabled={validCount === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : `Submit ${validCount} Row(s)`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="ag-theme-alpine h-[500px] w-full">
          <AgGridReact<IntakeRow>
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            onCellValueChanged={handleCellValueChanged}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={true}
          />
        </div>
      </CardContent>
    </Card>
  );
});
```

### Step 2: Add Intake Tab to SpreadsheetViewPage

Update `client/src/pages/SpreadsheetViewPage.tsx`:

```typescript
import { IntakeGrid } from "@/components/spreadsheet/IntakeGrid";

// Add to tabs array
const tabs = [
  { id: "inventory", label: "Inventory", component: InventoryGrid },
  { id: "intake", label: "Intake", component: IntakeGrid },
  { id: "clients", label: "Clients", component: ClientGrid },
  // ... other tabs
];
```

### Step 3: Ensure Backend Support

Verify that `inventory.createBatch` mutation exists and accepts the required fields. If not, work with existing `inventoryIntakeService` to create batches.

---

## 4. Deliverables Checklist

- [ ] `IntakeGrid.tsx` component created with AG-Grid
- [ ] All columns editable with appropriate types
- [ ] Row validation with visual feedback (red highlight for errors)
- [ ] "Add Row" button to add empty rows
- [ ] "Submit" button to create valid batches
- [ ] Integration with existing `inventory.createBatch` mutation
- [ ] Toast notifications for success/error
- [ ] Intake tab added to SpreadsheetViewPage
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## 5. Testing

### Manual Testing

1. Navigate to Spreadsheet View → Intake tab
2. Enter batch data in the grid
3. Verify validation highlights invalid rows
4. Submit valid rows and verify they appear in Inventory Grid
5. Verify error handling for failed submissions

### Automated Testing

```bash
pnpm check
pnpm test
```

---

## 6. Completion Protocol

1. **Implement all tasks** on your `feat/spreadsheet-intake-grid` branch
2. **Run `pnpm check`** to ensure no TypeScript errors
3. **Create a Pull Request** to `main`:

```
feat: FEATURE-021 Phase 2 - Intake Grid

- Created IntakeGrid component with AG-Grid
- Added row validation with visual feedback
- Integrated with existing inventory.createBatch mutation
- Added Intake tab to SpreadsheetViewPage
```

---

## 7. Critical Constraints

1. **NO new business logic** - Use existing `inventoryIntakeService`
2. **ALL mutations** must use existing tRPC procedures
3. **ALL validation** must match existing intake form validation
4. **ALL actions** must be logged via existing audit system

---

Good luck! The Intake Grid will significantly improve the batch entry workflow.
