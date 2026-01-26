# Team F: Spreadsheet Feature Agent Prompt

**Role:** Feature Development Lead
**Branch:** `claude/team-f-spreadsheet`
**Priority:** MEDIUM - User experience enhancement

---

## Mission

Implement FEATURE-021: Unified Spreadsheet View using AG-Grid. This is a large feature (~40-56h) that should be split across sub-agents.

**No dependencies - start immediately.**

**CRITICAL CONSTRAINT:** This is a **presentation layer only**. All mutations MUST use existing tRPC procedures.

---

## Sub-Agent Structure

```
Team F Lead
├── Sub-Agent F1: Phase 1 - Inventory Grid + Client View (16-20h)
├── Sub-Agent F2: Phase 2 - Intake Grid (12-16h)
└── Sub-Agent F3: Phase 3 - Pick & Pack Grid (12-20h)
```

---

## Architecture Constraints

### DO NOT Create New Business Logic

```typescript
// ❌ FORBIDDEN - New business logic
await db.update(batches).set({ quantity: newQty })

// ✅ CORRECT - Use existing tRPC
await trpc.inventory.adjustQuantity.mutate({ batchId, quantity })
```

### All Data Through Existing Procedures

```typescript
// ❌ FORBIDDEN - Direct database access
const batches = await db.query.batches.findMany()

// ✅ CORRECT - Use existing tRPC
const batches = await trpc.inventory.getAll.useQuery()
```

### All Validation Through Existing Controls

```typescript
// ❌ FORBIDDEN - Client-side validation only
if (quantity > 0) { save() }

// ✅ CORRECT - Server validates via existing procedure
// Server throws TRPCError if validation fails
```

---

## Phase 1: Inventory Grid + Client View

**Sub-Agent:** F1
**Estimate:** 16-20h

### Task 1.1: Setup AG-Grid Infrastructure

```bash
pnpm add ag-grid-react ag-grid-community
```

```typescript
// client/src/components/spreadsheet/SpreadsheetViewPage.tsx
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

export function SpreadsheetViewPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'clients' | 'intake' | 'pickpack'>('inventory')

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="pickpack">Pick & Pack</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1">
        {activeTab === 'inventory' && <InventoryGrid />}
        {activeTab === 'clients' && <ClientGrid />}
        {activeTab === 'intake' && <IntakeGrid />}
        {activeTab === 'pickpack' && <PickPackGrid />}
      </div>
    </div>
  )
}
```

### Task 1.2: Inventory Grid

```typescript
// client/src/components/spreadsheet/InventoryGrid.tsx
import { AgGridReact } from 'ag-grid-react'
import { ColDef, CellValueChangedEvent } from 'ag-grid-community'

export function InventoryGrid() {
  const { data: batches, refetch } = trpc.inventory.getAll.useQuery()
  const adjustQuantity = trpc.inventory.adjustQuantity.useMutation()
  const updateBatch = trpc.inventory.update.useMutation()

  const columnDefs: ColDef[] = [
    { field: 'batchNumber', headerName: 'Batch #', editable: false },
    { field: 'productName', headerName: 'Product', editable: false },
    { field: 'strain', headerName: 'Strain', editable: true },
    { field: 'grade', headerName: 'Grade', editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['A', 'B', 'C', 'D'] }
    },
    { field: 'onHandQuantity', headerName: 'On Hand', editable: false,
      cellRenderer: QuantityCellRenderer
    },
    { field: 'unitCogs', headerName: 'Unit COGS', editable: false,
      valueFormatter: currencyFormatter
    },
    { field: 'status', headerName: 'Status', editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['available', 'reserved', 'quarantine'] }
    },
    { field: 'expirationDate', headerName: 'Expires', editable: true,
      cellEditor: 'agDateCellEditor'
    }
  ]

  const onCellValueChanged = async (event: CellValueChangedEvent) => {
    const { field } = event.colDef
    const { id } = event.data

    try {
      // Use existing tRPC procedure
      await updateBatch.mutateAsync({
        id,
        [field]: event.newValue
      })
      toast.success('Updated successfully')
    } catch (error) {
      // Revert on failure
      event.api.undoCellEditing()
      toast.error(error.message)
    }
  }

  return (
    <div className="ag-theme-alpine h-full">
      <AgGridReact
        rowData={batches}
        columnDefs={columnDefs}
        onCellValueChanged={onCellValueChanged}
        undoRedoCellEditing={true}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true
        }}
      />
    </div>
  )
}
```

### Task 1.3: Client Grid with Master-Detail

```typescript
// client/src/components/spreadsheet/ClientGrid.tsx
export function ClientGrid() {
  const { data: clients } = trpc.clients.getAll.useQuery()
  const updateClient = trpc.clients.update.useMutation()

  const columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Client Name', editable: true },
    { field: 'teriCode', headerName: 'TERI Code', editable: false },
    { field: 'isBuyer', headerName: 'Buyer', editable: false,
      cellRenderer: BooleanCellRenderer
    },
    { field: 'isSeller', headerName: 'Supplier', editable: false,
      cellRenderer: BooleanCellRenderer
    },
    { field: 'totalOwed', headerName: 'Balance', editable: false,
      valueFormatter: currencyFormatter
    },
    { field: 'creditLimit', headerName: 'Credit Limit', editable: true,
      valueFormatter: currencyFormatter
    },
    { field: 'paymentTerms', headerName: 'Terms', editable: true }
  ]

  // Master-detail for client's orders/invoices
  const detailCellRendererParams = {
    detailGridOptions: {
      columnDefs: [
        { field: 'orderNumber', headerName: 'Order #' },
        { field: 'status', headerName: 'Status' },
        { field: 'total', headerName: 'Total', valueFormatter: currencyFormatter },
        { field: 'createdAt', headerName: 'Date', valueFormatter: dateFormatter }
      ]
    },
    getDetailRowData: async (params) => {
      const orders = await trpc.orders.getByClient.query({ clientId: params.data.id })
      params.successCallback(orders)
    }
  }

  return (
    <div className="ag-theme-alpine h-full">
      <AgGridReact
        rowData={clients}
        columnDefs={columnDefs}
        masterDetail={true}
        detailCellRendererParams={detailCellRendererParams}
        onCellValueChanged={handleCellChange}
      />
    </div>
  )
}
```

### Task 1.4: Data Transformation Router

```typescript
// server/routers/spreadsheet.ts
// NOTE: This router ONLY transforms data for grid display
// All mutations go through existing routers

export const spreadsheetRouter = router({
  // Read-only data transformations
  getInventoryGridData: protectedProcedure.query(async ({ ctx }) => {
    const batches = await ctx.db.query.batches.findMany({
      where: isNull(batches.deletedAt),
      with: {
        product: true,
        supplier: true
      }
    })

    // Transform for grid display
    return batches.map(batch => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.product.name,
      strain: batch.product.strain,
      grade: batch.grade,
      onHandQuantity: batch.onHandQuantity,
      unitCogs: batch.unitCogs,
      status: batch.status,
      expirationDate: batch.expirationDate,
      supplierName: batch.supplier?.name
    }))
  }),

  getClientGridData: protectedProcedure.query(async ({ ctx }) => {
    // Similar transformation for clients
  })
})
```

**Phase 1 Deliverables:**
- [ ] AG-Grid installed and configured
- [ ] SpreadsheetViewPage with tabs
- [ ] InventoryGrid with inline editing
- [ ] ClientGrid with master-detail
- [ ] spreadsheetRouter for data transformation
- [ ] All edits use existing tRPC procedures
- [ ] Unit tests for cell renderers
- [ ] Integration tests for data transformations

---

## Phase 2: Intake Grid

**Sub-Agent:** F2
**Estimate:** 12-16h

### Task 2.1: Intake Grid Component

```typescript
// client/src/components/spreadsheet/IntakeGrid.tsx
export function IntakeGrid() {
  const createBatch = trpc.inventory.createBatch.useMutation()
  const [newRows, setNewRows] = useState<NewBatchRow[]>([])

  const columnDefs: ColDef[] = [
    { field: 'productId', headerName: 'Product', editable: true,
      cellEditor: ProductSelectEditor  // Custom editor with search
    },
    { field: 'quantity', headerName: 'Quantity', editable: true,
      cellEditor: 'agNumberCellEditor'
    },
    { field: 'unitCogs', headerName: 'Unit Cost', editable: true,
      cellEditor: 'agNumberCellEditor'
    },
    { field: 'grade', headerName: 'Grade', editable: true },
    { field: 'supplierId', headerName: 'Supplier', editable: true,
      cellEditor: SupplierSelectEditor
    },
    { field: 'expirationDate', headerName: 'Expires', editable: true },
    { field: 'notes', headerName: 'Notes', editable: true }
  ]

  const handleSubmitIntake = async () => {
    try {
      // Use existing inventoryIntakeService
      for (const row of newRows) {
        await createBatch.mutateAsync(row)
      }
      toast.success(`${newRows.length} batches created`)
      setNewRows([])
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2">
        <Button onClick={addEmptyRow}>Add Row</Button>
        <Button onClick={handleSubmitIntake} disabled={newRows.length === 0}>
          Submit Intake ({newRows.length} batches)
        </Button>
      </div>
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact
          rowData={newRows}
          columnDefs={columnDefs}
          onCellValueChanged={updateNewRow}
        />
      </div>
    </div>
  )
}
```

**Phase 2 Deliverables:**
- [ ] IntakeGrid component
- [ ] Product/Supplier select editors
- [ ] Batch submission via existing tRPC
- [ ] Validation feedback in cells
- [ ] Tests for intake workflow

---

## Phase 3: Pick & Pack Grid

**Sub-Agent:** F3
**Estimate:** 12-20h

### Task 3.1: Pick & Pack Grid Component

```typescript
// client/src/components/spreadsheet/PickPackGrid.tsx
export function PickPackGrid() {
  const { data: orders } = trpc.orders.getPendingShipment.useQuery()
  const shipOrder = trpc.orders.ship.useMutation()
  const fulfillOrder = trpc.orders.fulfill.useMutation()

  const columnDefs: ColDef[] = [
    { field: 'orderNumber', headerName: 'Order #', editable: false,
      checkboxSelection: true  // For bulk operations
    },
    { field: 'clientName', headerName: 'Client', editable: false },
    { field: 'status', headerName: 'Status', editable: false,
      cellRenderer: StatusBadgeRenderer
    },
    { field: 'itemCount', headerName: 'Items', editable: false },
    { field: 'total', headerName: 'Total', editable: false,
      valueFormatter: currencyFormatter
    },
    { field: 'actions', headerName: 'Actions', editable: false,
      cellRenderer: ActionsCellRenderer,
      cellRendererParams: {
        onShip: (orderId) => shipOrder.mutateAsync({ orderId }),
        onFulfill: (orderId) => fulfillOrder.mutateAsync({ orderId })
      }
    }
  ]

  // Expand to show line items
  const detailCellRendererParams = {
    detailGridOptions: {
      columnDefs: [
        { field: 'batchNumber', headerName: 'Batch' },
        { field: 'productName', headerName: 'Product' },
        { field: 'quantity', headerName: 'Qty' },
        { field: 'picked', headerName: 'Picked',
          cellRenderer: CheckboxRenderer,
          editable: true
        },
        { field: 'location', headerName: 'Location' }
      ]
    },
    getDetailRowData: async (params) => {
      const items = await trpc.orders.getLineItems.query({ orderId: params.data.id })
      params.successCallback(items)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2">
        <Button onClick={handleBulkShip}>Ship Selected</Button>
        <Button onClick={handleBulkFulfill}>Fulfill Selected</Button>
      </div>
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact
          rowData={orders}
          columnDefs={columnDefs}
          masterDetail={true}
          detailCellRendererParams={detailCellRendererParams}
          rowSelection="multiple"
        />
      </div>
    </div>
  )
}
```

**Phase 3 Deliverables:**
- [ ] PickPackGrid component
- [ ] Order line items detail view
- [ ] Pick checkbox per item
- [ ] Ship/Fulfill actions
- [ ] Bulk operations
- [ ] Tests for pick & pack workflow

---

## Testing Requirements

### Unit Tests
```typescript
// Cell renderers
describe('QuantityCellRenderer', () => {
  it('formats quantity with unit', () => { ... })
  it('highlights low stock', () => { ... })
})

// Data transformers
describe('spreadsheetRouter', () => {
  it('transforms batch data for grid', () => { ... })
  it('excludes soft-deleted records', () => { ... })
})
```

### Integration Tests
```typescript
describe('InventoryGrid', () => {
  it('loads batch data via tRPC', () => { ... })
  it('updates batch via existing mutation', () => { ... })
  it('reverts on mutation failure', () => { ... })
})
```

### E2E Tests
```typescript
describe('Spreadsheet View', () => {
  it('edits inventory cell and persists', () => { ... })
  it('creates new batch via intake grid', () => { ... })
  it('ships order via pick & pack grid', () => { ... })
})
```

### Security Tests
```typescript
describe('Permission enforcement', () => {
  it('blocks edit without inventory:write permission', () => { ... })
  it('blocks intake without inventory:create permission', () => { ... })
  it('blocks ship without orders:ship permission', () => { ... })
})
```

---

## PR Template

```markdown
## Team F: Spreadsheet Feature (FEATURE-021)

### Phases Completed
- [x] Phase 1: Inventory Grid + Client View
- [x] Phase 2: Intake Grid
- [x] Phase 3: Pick & Pack Grid

### Key Components
- `SpreadsheetViewPage` - Tab container
- `InventoryGrid` - Batch management
- `ClientGrid` - Client management with master-detail
- `IntakeGrid` - New batch entry
- `PickPackGrid` - Order fulfillment

### Architecture Compliance
- [x] All mutations use existing tRPC procedures
- [x] All validation via existing server controls
- [x] All actions logged via existing audit system
- [x] No new business logic created

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] E2E tests pass
- [ ] Security tests pass

### Feature Flag
- `spreadsheet-view` - Controls access to SpreadsheetViewPage
```

---

## Communication

**Update session file:** `docs/sessions/active/team-f-spreadsheet.md`

**Sub-agent handoff:**
1. F1 completes → notify F2 to start (can share components)
2. F2 completes → notify F3 to start
3. All complete → notify Coordinator
