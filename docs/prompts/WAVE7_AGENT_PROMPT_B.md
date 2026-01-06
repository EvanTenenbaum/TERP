# Agent Prompt: Wave 7B - Spreadsheet Intake Grid & Grouping

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing the Intake Grid for the Spreadsheet View feature.

### Your Mission
Implement Phase 2 of the Spreadsheet View (Intake Grid) and add grouping functionality to the Inventory Grid.

### Key Documents to Read First
1. **Feature Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
2. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
3. **Wave 7A Work:** Check Agent 7A's PR for `SpreadsheetViewPage.tsx` structure

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-7/spreadsheet-intake
```

### File Ownership
**You ONLY have permission to modify these files:**
- `client/src/components/spreadsheet/IntakeGrid.tsx` (new)
- `client/src/components/spreadsheet/InventoryGrid.tsx` (grouping additions only)
- `server/routers/spreadsheet.ts` (intake procedures only)

**Note:** Agent 7A owns `SpreadsheetViewPage.tsx` - coordinate via PR comments for tab integration.

---

## 2. Your Tasks (28-32h total)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| FEATURE-021 Phase 2 | Intake Grid | 12-16h |
| TERP-SS-008 | Inventory Grid Grouping | 16h |

### Task 1: FEATURE-021 Phase 2 - Intake Grid

**Purpose:** Allow users to enter new inventory batches in a spreadsheet-like interface.

**Requirements:**

#### 1.1 IntakeGrid.tsx
```typescript
// Bulk entry grid for new inventory batches
// Users can paste from Excel or enter row by row

import { AgGridReact } from 'ag-grid-react';
import { useState, useCallback } from 'react';

interface IntakeRow {
  id: string;  // Temporary ID for new rows
  productName: string;
  vendorName: string;
  quantity: number;
  unitCost: number;
  batchCode?: string;  // Auto-generated or manual
  notes?: string;
  status: 'draft' | 'validated' | 'error';
}

export function IntakeGrid() {
  const [rowData, setRowData] = useState<IntakeRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<string, string[]>>();
  
  // Column definitions for intake
  const columnDefs = [
    { 
      field: 'productName', 
      headerName: 'Product', 
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: products.map(p => p.name),  // From product list
      },
    },
    { 
      field: 'vendorName', 
      headerName: 'Vendor', 
      editable: true,
      cellEditor: 'agSelectCellEditor',
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity', 
      editable: true,
      type: 'numericColumn',
      valueParser: (params) => Number(params.newValue),
    },
    { 
      field: 'unitCost', 
      headerName: 'Unit Cost', 
      editable: true,
      type: 'numericColumn',
      valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
    },
    { 
      field: 'batchCode', 
      headerName: 'Batch Code', 
      editable: true,
    },
    { 
      field: 'notes', 
      headerName: 'Notes', 
      editable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: StatusBadge,
    },
  ];
  
  return (
    <div className="h-full flex flex-col">
      <IntakeToolbar 
        onAddRow={handleAddRow}
        onValidate={handleValidate}
        onSubmit={handleSubmit}
        rowCount={rowData.length}
      />
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ flex: 1, resizable: true }}
          onCellValueChanged={handleCellChange}
          // Enable paste from clipboard
          enableRangeSelection={true}
          clipboardDelimiter="\t"
        />
      </div>
    </div>
  );
}
```

#### 1.2 Bulk Entry Support
```typescript
// Handle paste from Excel/clipboard
const handlePaste = useCallback((event: ClipboardEvent) => {
  const pastedData = event.clipboardData?.getData('text');
  if (!pastedData) return;
  
  const rows = pastedData.split('\n').map(row => {
    const [product, vendor, qty, cost, batch, notes] = row.split('\t');
    return {
      id: generateTempId(),
      productName: product?.trim(),
      vendorName: vendor?.trim(),
      quantity: parseFloat(qty) || 0,
      unitCost: parseFloat(cost) || 0,
      batchCode: batch?.trim(),
      notes: notes?.trim(),
      status: 'draft' as const,
    };
  });
  
  setRowData(prev => [...prev, ...rows]);
}, []);
```

#### 1.3 Validation & Submission
```typescript
// Validate all rows before submission
const handleValidate = async () => {
  const errors = new Map<string, string[]>();
  
  for (const row of rowData) {
    const rowErrors: string[] = [];
    
    if (!row.productName) rowErrors.push('Product is required');
    if (!row.vendorName) rowErrors.push('Vendor is required');
    if (row.quantity <= 0) rowErrors.push('Quantity must be positive');
    if (row.unitCost < 0) rowErrors.push('Cost cannot be negative');
    
    if (rowErrors.length > 0) {
      errors.set(row.id, rowErrors);
    }
  }
  
  setValidationErrors(errors);
  
  // Update row statuses
  setRowData(prev => prev.map(row => ({
    ...row,
    status: errors.has(row.id) ? 'error' : 'validated',
  })));
  
  return errors.size === 0;
};

// Submit validated rows to backend
const handleSubmit = async () => {
  const isValid = await handleValidate();
  if (!isValid) {
    toast.error('Please fix validation errors before submitting');
    return;
  }
  
  // Use existing inventory intake service
  await intakeMutation.mutateAsync({
    batches: rowData.map(row => ({
      productId: getProductId(row.productName),
      vendorId: getVendorId(row.vendorName),
      quantity: row.quantity,
      unitCost: row.unitCost,
      batchCode: row.batchCode,
      notes: row.notes,
    })),
  });
  
  toast.success(`${rowData.length} batches submitted successfully`);
  setRowData([]);
};
```

### Task 2: TERP-SS-008 - Inventory Grid Grouping

**Problem:** Users need to see inventory grouped by date and vendor for easier analysis.

**Requirements:**

#### 2.1 Row Grouping Configuration
```typescript
// Add to InventoryGrid.tsx (coordinate with Agent 7A)

const columnDefs = [
  { 
    field: 'intakeDate', 
    headerName: 'Intake Date',
    rowGroup: true,  // Enable grouping
    hide: true,      // Hide column when grouped
    valueFormatter: (params) => formatDate(params.value),
  },
  { 
    field: 'vendorName', 
    headerName: 'Vendor',
    rowGroup: true,
    hide: true,
  },
  // ... other columns
];

// Grid options for grouping
const gridOptions = {
  groupDefaultExpanded: 1,  // Expand first level by default
  autoGroupColumnDef: {
    headerName: 'Group',
    minWidth: 250,
    cellRendererParams: {
      suppressCount: false,  // Show count in group header
    },
  },
  // Enable row grouping
  rowGroupPanelShow: 'always',  // Show grouping panel
  groupDisplayType: 'groupRows',
};
```

#### 2.2 Summary Rows
```typescript
// Add aggregation for grouped rows
const columnDefs = [
  // ... existing columns
  { 
    field: 'quantity', 
    headerName: 'Qty',
    aggFunc: 'sum',  // Sum quantities in group
  },
  { 
    field: 'value', 
    headerName: 'Value',
    aggFunc: 'sum',  // Sum values in group
    valueFormatter: (params) => `$${params.value?.toLocaleString()}`,
  },
];
```

#### 2.3 Collapsible Groups
```typescript
// Custom group cell renderer
const GroupCellRenderer = (params) => {
  const { node, value } = params;
  
  if (!node.group) return value;
  
  const childCount = node.allChildrenCount;
  const totalValue = node.aggData?.value || 0;
  
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{value}</span>
      <span className="text-gray-500">({childCount} items)</span>
      <span className="text-green-600 ml-auto">${totalValue.toLocaleString()}</span>
    </div>
  );
};
```

---

## 3. Backend Integration

### Intake Procedures
```typescript
// Add to server/routers/spreadsheet.ts

export const spreadsheetRouter = createTRPCRouter({
  // ... existing procedures from Agent 7A
  
  submitIntake: protectedProcedure
    .input(z.object({
      batches: z.array(z.object({
        productId: z.string(),
        vendorId: z.string(),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        batchCode: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Use existing inventory intake service
      // DO NOT implement new business logic
      return await inventoryIntakeService.createBatches(ctx, input.batches);
    }),
    
  getProductsForIntake: protectedProcedure
    .query(async ({ ctx }) => {
      // Get product list for dropdown
      return await productService.getAll(ctx);
    }),
    
  getVendorsForIntake: protectedProcedure
    .query(async ({ ctx }) => {
      // Get vendor list for dropdown
      return await vendorService.getAll(ctx);
    }),
});
```

---

## 4. Testing Requirements

Before submitting your PR:

1. **Intake Grid Testing:**
   - Add rows manually - works
   - Paste from Excel - parses correctly
   - Validation catches errors
   - Submit creates inventory batches
   - Clear grid after successful submit

2. **Grouping Testing:**
   - Group by date - works
   - Group by vendor - works
   - Nested grouping - works
   - Summary totals are correct
   - Expand/collapse works

3. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

---

## 5. Completion Protocol

1. **Implement all tasks** on your `wave-7/spreadsheet-intake` branch.

2. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

3. **Create a Pull Request** to `main` with:
   - Clear title: `feat(spreadsheet): implement intake grid and grouping [Wave 7B]`
   - Screenshots/video showing:
     - Intake grid with bulk entry
     - Validation errors display
     - Grouping functionality
   - Description of integration with Agent 7A's work

4. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 7B - Spreadsheet Intake Grid

**Branch:** `wave-7/spreadsheet-intake`

**Tasks to Verify:**
- [ ] **FEATURE-021:** Intake tab displays editable grid
- [ ] **FEATURE-021:** Can add rows manually
- [ ] **FEATURE-021:** Can paste from Excel/clipboard
- [ ] **FEATURE-021:** Validation shows errors
- [ ] **FEATURE-021:** Submit creates inventory batches
- [ ] **TERP-SS-008:** Inventory grid groups by date
- [ ] **TERP-SS-008:** Inventory grid groups by vendor
- [ ] **TERP-SS-008:** Summary rows show totals

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Test intake workflow end-to-end
4. Test grouping functionality
5. If approved, merge to main
```

---

## 6. Coordination Notes

**Parallel Agents:**
- Agent 7A owns `SpreadsheetViewPage.tsx` - coordinate tab integration
- Agent 7C is implementing Pick & Pack Grid
- Your grouping changes to `InventoryGrid.tsx` need to merge cleanly with 5A's work

**Integration Strategy:**
1. Wait for Agent 7A's PR to be merged (or coordinate on branch)
2. Rebase your branch on latest main
3. Add intake tab to `SpreadsheetViewPage.tsx`
4. Merge grouping changes to `InventoryGrid.tsx`

---

Good luck! Your work enables efficient bulk inventory entry.
