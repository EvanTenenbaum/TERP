# Agent Prompt: Wave 5C - Spreadsheet Pick & Pack Grid & Editing

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing the Pick & Pack Grid for the Spreadsheet View feature.

### Your Mission
Implement Phase 3 of the Spreadsheet View (Pick & Pack Grid) and add editing capabilities to the Inventory Grid.

### Key Documents to Read First
1. **Feature Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
2. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
3. **Wave 5A Work:** Check Agent 5A's PR for `SpreadsheetViewPage.tsx` structure

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-5/spreadsheet-pick
```

### File Ownership
**You ONLY have permission to modify these files:**
- `client/src/components/spreadsheet/PickPackGrid.tsx` (new)
- `client/src/components/spreadsheet/InventoryGrid.tsx` (editing additions only)
- `server/routers/spreadsheet.ts` (pick & pack procedures only)

**Note:** Agent 5A owns `SpreadsheetViewPage.tsx` - coordinate via PR comments for tab integration.

---

## 2. Your Tasks (28-36h total)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| FEATURE-021 Phase 3 | Pick & Pack Grid | 12-20h |
| TERP-SS-009 | Editing Capabilities | 16h |

### Task 1: FEATURE-021 Phase 3 - Pick & Pack Grid

**Purpose:** Allow warehouse staff to fulfill orders in a spreadsheet-like interface.

**Requirements:**

#### 1.1 PickPackGrid.tsx
```typescript
// Order fulfillment grid
// Shows orders ready for picking with line items

import { AgGridReact } from 'ag-grid-react';
import { useState, useCallback } from 'react';

interface PickPackRow {
  orderId: string;
  orderNumber: string;
  clientName: string;
  lineItemId: string;
  productName: string;
  batchCode: string;
  orderedQty: number;
  pickedQty: number;
  status: 'pending' | 'picking' | 'picked' | 'packed' | 'shipped';
  location: string;
}

export function PickPackGrid() {
  const { data: orders, isLoading } = trpc.spreadsheet.getPickPackData.useQuery();
  const updateMutation = trpc.spreadsheet.updatePickStatus.useMutation();
  
  const columnDefs = [
    { 
      field: 'orderNumber', 
      headerName: 'Order #',
      pinned: 'left',
      cellRenderer: OrderLinkRenderer,
    },
    { 
      field: 'clientName', 
      headerName: 'Client',
      filter: true,
    },
    { 
      field: 'productName', 
      headerName: 'Product',
      filter: true,
    },
    { 
      field: 'batchCode', 
      headerName: 'Batch',
      filter: true,
    },
    { 
      field: 'location', 
      headerName: 'Location',
      filter: true,
    },
    { 
      field: 'orderedQty', 
      headerName: 'Ordered',
      type: 'numericColumn',
    },
    { 
      field: 'pickedQty', 
      headerName: 'Picked',
      type: 'numericColumn',
      editable: true,  // Allow editing picked quantity
      cellStyle: (params) => ({
        backgroundColor: params.value === params.data.orderedQty 
          ? '#dcfce7'  // Green when complete
          : params.value > 0 
            ? '#fef3c7'  // Yellow when partial
            : undefined,
      }),
    },
    { 
      field: 'status', 
      headerName: 'Status',
      cellRenderer: StatusDropdown,
      cellRendererParams: {
        options: ['pending', 'picking', 'picked', 'packed', 'shipped'],
        onChange: handleStatusChange,
      },
    },
    {
      headerName: 'Actions',
      cellRenderer: ActionButtons,
      cellRendererParams: {
        onMarkPicked: handleMarkPicked,
        onMarkPacked: handleMarkPacked,
      },
    },
  ];
  
  return (
    <div className="h-full flex flex-col">
      <PickPackToolbar 
        onFilterPending={() => setFilter('pending')}
        onFilterInProgress={() => setFilter('picking')}
        onBulkPick={handleBulkPick}
        selectedCount={selectedRows.length}
      />
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact
          rowData={orders}
          columnDefs={columnDefs}
          defaultColDef={{ flex: 1, resizable: true }}
          rowSelection="multiple"
          onSelectionChanged={handleSelectionChange}
          onCellValueChanged={handleCellChange}
          getRowId={(params) => params.data.lineItemId}
        />
      </div>
    </div>
  );
}
```

#### 1.2 Status Workflow
```typescript
// Status transitions for pick & pack
const STATUS_TRANSITIONS = {
  pending: ['picking'],
  picking: ['picked', 'pending'],  // Can go back
  picked: ['packed', 'picking'],
  packed: ['shipped', 'picked'],
  shipped: [],  // Terminal state
};

const handleStatusChange = async (lineItemId: string, newStatus: string) => {
  const currentStatus = getRowStatus(lineItemId);
  
  if (!STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    toast.error(`Cannot change from ${currentStatus} to ${newStatus}`);
    return;
  }
  
  await updateMutation.mutateAsync({
    lineItemId,
    status: newStatus,
  });
  
  toast.success('Status updated');
};
```

#### 1.3 Bulk Operations
```typescript
// Bulk pick selected items
const handleBulkPick = async () => {
  const selectedRows = gridRef.current?.api.getSelectedRows() || [];
  
  if (selectedRows.length === 0) {
    toast.error('No items selected');
    return;
  }
  
  const pendingItems = selectedRows.filter(r => r.status === 'pending');
  
  await bulkUpdateMutation.mutateAsync({
    lineItemIds: pendingItems.map(r => r.lineItemId),
    updates: {
      status: 'picked',
      pickedQty: 'ordered',  // Set picked = ordered
    },
  });
  
  toast.success(`${pendingItems.length} items marked as picked`);
};
```

### Task 2: TERP-SS-009 - Editing Capabilities

**Problem:** Users need to make quick edits to inventory data directly in the grid.

**Requirements:**

#### 2.1 Editable Columns in InventoryGrid
```typescript
// Add to InventoryGrid.tsx (coordinate with Agent 5A)

const columnDefs = [
  // ... existing columns
  { 
    field: 'available', 
    headerName: 'Available',
    editable: true,  // Make editable
    type: 'numericColumn',
    valueParser: (params) => {
      const value = Number(params.newValue);
      if (isNaN(value) || value < 0) {
        return params.oldValue;  // Reject invalid input
      }
      return value;
    },
  },
  { 
    field: 'ticket', 
    headerName: 'Ticket',
    editable: true,
    cellEditor: 'agTextCellEditor',
  },
  { 
    field: 'notes', 
    headerName: 'Notes',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
  },
];
```

#### 2.2 Cell Edit Handler
```typescript
// Handle cell value changes
const handleCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
  const { data, colDef, newValue, oldValue } = event;
  
  if (newValue === oldValue) return;  // No change
  
  const field = colDef.field;
  const batchId = data.id;
  
  try {
    // Show saving indicator
    event.api.showLoadingOverlay();
    
    // Call appropriate mutation based on field
    if (field === 'available') {
      await updateBatchMutation.mutateAsync({
        batchId,
        available: newValue,
      });
    } else if (field === 'ticket') {
      await updateBatchMutation.mutateAsync({
        batchId,
        ticket: newValue,
      });
    } else if (field === 'notes') {
      await updateBatchMutation.mutateAsync({
        batchId,
        notes: newValue,
      });
    }
    
    // Show success feedback
    toast.success('Saved');
    
  } catch (error) {
    // Revert on error
    event.node.setDataValue(field, oldValue);
    toast.error('Failed to save. Please try again.');
  } finally {
    event.api.hideOverlay();
  }
}, [updateBatchMutation]);
```

#### 2.3 Visual Feedback
```typescript
// Show cell is being saved
const cellStyle = (params) => {
  if (params.data._saving?.[params.colDef.field]) {
    return { backgroundColor: '#fef3c7' };  // Yellow while saving
  }
  if (params.data._saved?.[params.colDef.field]) {
    return { backgroundColor: '#dcfce7' };  // Green flash on save
  }
  return undefined;
};

// Flash green on successful save
const flashSavedCell = (api: GridApi, rowId: string, field: string) => {
  const rowNode = api.getRowNode(rowId);
  if (!rowNode) return;
  
  // Set saved flag
  rowNode.setData({ ...rowNode.data, _saved: { [field]: true } });
  
  // Clear after animation
  setTimeout(() => {
    rowNode.setData({ ...rowNode.data, _saved: {} });
  }, 1000);
};
```

---

## 3. Backend Integration

### Pick & Pack Procedures
```typescript
// Add to server/routers/spreadsheet.ts

export const spreadsheetRouter = createTRPCRouter({
  // ... existing procedures
  
  getPickPackData: protectedProcedure
    .query(async ({ ctx }) => {
      // Get orders ready for picking
      // Join with line items, products, inventory locations
      // Use existing order/fulfillment services
    }),
    
  updatePickStatus: protectedProcedure
    .input(z.object({
      lineItemId: z.string(),
      status: z.enum(['pending', 'picking', 'picked', 'packed', 'shipped']),
      pickedQty: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Use existing pick & pack service
      return await pickPackService.updateLineItem(ctx, input);
    }),
    
  bulkUpdatePickStatus: protectedProcedure
    .input(z.object({
      lineItemIds: z.array(z.string()),
      updates: z.object({
        status: z.enum(['pending', 'picking', 'picked', 'packed', 'shipped']).optional(),
        pickedQty: z.union([z.number(), z.literal('ordered')]).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Bulk update using existing service
      return await pickPackService.bulkUpdate(ctx, input);
    }),
});
```

### Inventory Edit Procedures
```typescript
// Add to server/routers/spreadsheet.ts

updateBatch: protectedProcedure
  .input(z.object({
    batchId: z.string(),
    available: z.number().optional(),
    ticket: z.string().optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Use existing inventory service
    // DO NOT bypass validation or permissions
    return await inventoryService.updateBatch(ctx, input);
  }),
```

---

## 4. Testing Requirements

Before submitting your PR:

1. **Pick & Pack Grid Testing:**
   - Grid loads with order data
   - Can filter by status
   - Can change status via dropdown
   - Can edit picked quantity
   - Bulk pick works
   - Status transitions are enforced

2. **Editing Testing:**
   - Can edit Available column
   - Can edit Ticket column
   - Can edit Notes column
   - Changes persist to database
   - Invalid input is rejected
   - Visual feedback works

3. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

---

## 5. Completion Protocol

1. **Implement all tasks** on your `wave-5/spreadsheet-pick` branch.

2. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

3. **Create a Pull Request** to `main` with:
   - Clear title: `feat(spreadsheet): implement pick & pack grid and editing [Wave 5C]`
   - Screenshots/video showing:
     - Pick & Pack workflow
     - Status transitions
     - Inline editing with save feedback
   - Description of integration with Agent 5A's work

4. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 5C - Spreadsheet Pick & Pack Grid

**Branch:** `wave-5/spreadsheet-pick`

**Tasks to Verify:**
- [ ] **FEATURE-021:** Pick & Pack tab displays order fulfillment grid
- [ ] **FEATURE-021:** Can filter orders by status
- [ ] **FEATURE-021:** Can change line item status
- [ ] **FEATURE-021:** Can edit picked quantity
- [ ] **FEATURE-021:** Bulk pick works for selected items
- [ ] **TERP-SS-009:** Can edit Available column in inventory
- [ ] **TERP-SS-009:** Can edit Ticket column in inventory
- [ ] **TERP-SS-009:** Can edit Notes column in inventory
- [ ] **TERP-SS-009:** Changes persist to database
- [ ] **TERP-SS-009:** Visual feedback on save

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Test pick & pack workflow
4. Test inline editing
5. Verify data persists after refresh
6. If approved, merge to main
```

---

## 6. Coordination Notes

**Parallel Agents:**
- Agent 5A owns `SpreadsheetViewPage.tsx` - coordinate tab integration
- Agent 5B is implementing Intake Grid and grouping
- Your editing changes to `InventoryGrid.tsx` need to merge cleanly with 5A and 5B's work

**Integration Strategy:**
1. Wait for Agent 5A's PR to be merged (or coordinate on branch)
2. Rebase your branch on latest main
3. Add pick & pack tab to `SpreadsheetViewPage.tsx`
4. Merge editing changes to `InventoryGrid.tsx` carefully

**Conflict Resolution:**
If multiple agents modify `InventoryGrid.tsx`:
- Agent 5A: Base grid + color coding
- Agent 5B: Grouping
- Agent 5C (you): Editing

Merge order should be: 5A → 5B → 5C

---

Good luck! Your work completes the Spreadsheet View feature.
