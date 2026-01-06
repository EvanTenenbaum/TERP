# Agent Prompt: Wave 7A - Spreadsheet Inventory & Client Grid

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing the core Spreadsheet View feature.

### Your Mission
Implement Phase 1 of the Spreadsheet View feature (Inventory Grid + Client View) and add visual cues for enhanced usability.

### Key Documents to Read First
1. **Feature Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
2. **QA Review:** `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`
3. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-7/spreadsheet-inventory
```

### File Ownership
**You ONLY have permission to modify these files:**
- `client/src/pages/SpreadsheetViewPage.tsx` (new)
- `client/src/components/spreadsheet/InventoryGrid.tsx` (new)
- `client/src/components/spreadsheet/ClientGrid.tsx` (new)
- `client/src/components/spreadsheet/index.ts` (new)
- `server/routers/spreadsheet.ts` (new)
- `client/src/App.tsx` (routing only)

---

## 2. Your Tasks (40-44h total)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| FEATURE-021 Phase 1 | Inventory Grid + Client View | 16-20h |
| TERP-SS-006 | Implement Visual Cues (Color Coding) | 24h |

### Task 1: FEATURE-021 Phase 1 - Inventory Grid + Client View

**Architecture Principle:** "Views, Not Modules"
- This is a **pure presentation layer** over existing services
- **NO new business logic** - all mutations use existing tRPC procedures
- **ALL validation/permissions** enforced via existing controls

**Requirements:**

#### 1.1 SpreadsheetViewPage.tsx
```typescript
// Container component with tab navigation
// Tabs: Inventory | Intake | Pick & Pack | Clients

export default function SpreadsheetViewPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'intake' | 'pickpack' | 'clients'>('inventory');
  
  return (
    <div className="h-full flex flex-col">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1">
        {activeTab === 'inventory' && <InventoryGrid />}
        {activeTab === 'clients' && <ClientGrid />}
        {/* intake and pickpack handled by other agents */}
      </div>
    </div>
  );
}
```

#### 1.2 InventoryGrid.tsx
```typescript
// AG-Grid based inventory display
// Columns: Batch Code, Product, Vendor, Quantity, Status, Location, Value

import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Column definitions
const columnDefs = [
  { field: 'batchCode', headerName: 'Batch Code', sortable: true, filter: true },
  { field: 'productName', headerName: 'Product', sortable: true, filter: true },
  { field: 'vendorName', headerName: 'Vendor', sortable: true, filter: true },
  { field: 'quantity', headerName: 'Qty', sortable: true, type: 'numericColumn' },
  { field: 'status', headerName: 'Status', sortable: true, filter: true },
  { field: 'location', headerName: 'Location', sortable: true, filter: true },
  { field: 'value', headerName: 'Value', sortable: true, type: 'numericColumn',
    valueFormatter: (params) => `$${params.value?.toLocaleString()}` },
];
```

#### 1.3 ClientGrid.tsx
```typescript
// Master-detail layout for clients
// Master: Client list with key metrics
// Detail: Orders, payments, and history for selected client

// Use AG-Grid's master-detail feature
const detailCellRendererParams = {
  detailGridOptions: {
    columnDefs: [
      { field: 'orderNumber', headerName: 'Order #' },
      { field: 'date', headerName: 'Date' },
      { field: 'amount', headerName: 'Amount' },
      { field: 'status', headerName: 'Status' },
    ],
  },
  getDetailRowData: (params) => {
    // Fetch orders for this client
    params.successCallback(params.data.orders);
  },
};
```

#### 1.4 spreadsheetRouter.ts
```typescript
// Data transformation layer ONLY
// NO business logic - just reshaping data for grid display

import { createTRPCRouter, protectedProcedure } from '../_core/trpc';

export const spreadsheetRouter = createTRPCRouter({
  getInventoryGridData: protectedProcedure
    .query(async ({ ctx }) => {
      // Call existing inventory procedures
      // Transform data for grid format
      // Return flattened structure for AG-Grid
    }),
    
  getClientGridData: protectedProcedure
    .query(async ({ ctx }) => {
      // Call existing client procedures
      // Include nested orders for master-detail
    }),
});
```

### Task 2: TERP-SS-006 - Visual Cues (Color Coding)

**Problem:** The spreadsheet grids lack the color coding users rely on.

**Requirements:**

#### 2.1 Batch Status Color Coding (InventoryGrid)
```typescript
// Apply background colors based on batch status
const statusCellClassRules = {
  'bg-orange-100': (params) => params.value === 'C' || params.value === 'Curing',
  'bg-cyan-100': (params) => params.value === 'Ofc' || params.value === 'Office',
  'bg-green-100': (params) => params.value === 'Ready',
  'bg-yellow-100': (params) => params.value === 'Testing',
  'bg-red-100': (params) => params.value === 'Hold',
};

// Apply to status column
{ 
  field: 'status', 
  headerName: 'Status',
  cellClassRules: statusCellClassRules,
}
```

#### 2.2 Payment Highlighting (ClientGrid)
```typescript
// Highlight entire row green if payment made
const getRowClass = (params) => {
  if (params.data.hasPaidOrders) {
    return 'bg-green-50';
  }
  if (params.data.hasOverduePayments) {
    return 'bg-red-50';
  }
  return '';
};

<AgGridReact
  getRowClass={getRowClass}
  // ... other props
/>
```

#### 2.3 Value-Based Highlighting
```typescript
// Highlight high-value inventory
const valueCellClassRules = {
  'bg-purple-100 font-bold': (params) => params.value > 10000,
  'bg-blue-50': (params) => params.value > 5000 && params.value <= 10000,
};
```

---

## 3. AG-Grid Setup

### Installation (if not already installed)
```bash
pnpm add ag-grid-react ag-grid-community
```

### Basic Grid Configuration
```typescript
const defaultColDef = {
  flex: 1,
  minWidth: 100,
  resizable: true,
  sortable: true,
  filter: true,
};

const gridOptions = {
  pagination: true,
  paginationPageSize: 50,
  rowSelection: 'multiple',
  animateRows: true,
  enableCellTextSelection: true,
};
```

---

## 4. Testing Requirements

Before submitting your PR:

1. **Functional Testing:**
   - Navigate to `/spreadsheet` - page loads
   - Inventory tab shows grid with data
   - Clients tab shows master-detail grid
   - Sorting and filtering work
   - Pagination works

2. **Visual Testing:**
   - Status colors display correctly
   - Payment highlighting works
   - Grid is responsive
   - Loading states work

3. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

---

## 5. Completion Protocol

1. **Implement all tasks** on your `wave-7/spreadsheet-inventory` branch.

2. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

3. **Create a Pull Request** to `main` with:
   - Clear title: `feat(spreadsheet): implement inventory and client grids [Wave 7A]`
   - Screenshots showing:
     - Inventory grid with color coding
     - Client grid with master-detail
     - Payment highlighting
   - Description of architecture decisions

4. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 7A - Spreadsheet Inventory Grid

**Branch:** `wave-7/spreadsheet-inventory`

**Tasks to Verify:**
- [ ] **FEATURE-021:** Navigate to `/spreadsheet` - page loads
- [ ] **FEATURE-021:** Inventory tab displays data in grid format
- [ ] **FEATURE-021:** Client tab shows master-detail layout
- [ ] **TERP-SS-006:** Batch status colors display (Orange=Curing, Cyan=Office)
- [ ] **TERP-SS-006:** Payment rows highlighted green
- [ ] Grid sorting and filtering work
- [ ] Pagination works correctly

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Navigate to `/spreadsheet` and test all tabs
4. Verify color coding matches spec
5. If approved, merge to main
```

---

## 6. Coordination Notes

**Parallel Agents:**
- Agent 7B is implementing Intake Grid (will use your `SpreadsheetViewPage.tsx`)
- Agent 7C is implementing Pick & Pack Grid (will use your `SpreadsheetViewPage.tsx`)
- Coordinate tab structure via PR comments

**Integration Points:**
- Your `SpreadsheetViewPage.tsx` will be the container for all grids
- Leave placeholder comments for intake and pickpack tabs
- Export shared types from `spreadsheet/index.ts`

---

Good luck! Your work creates the foundation for the entire Spreadsheet View feature.
