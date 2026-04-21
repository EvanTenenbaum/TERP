# TERP Table Selection Guide

**Last Updated**: 2026-04-21  
**Related**: TER-1216, docs/decisions/table-system.md

---

## Quick Reference

| Use Case | System | Component |
|----------|--------|-----------|
| Excel-like data grid with editing | AG Grid | `SpreadsheetPilotGrid` |
| Read-only grid with sort/filter/pagination | AG Grid | `SpreadsheetPilotGrid` |
| Large dataset (100+ rows) | AG Grid | `SpreadsheetPilotGrid` |
| Simple static list (<20 rows, no interaction) | shadcn Table | Table primitives |
| Display-only report/summary | shadcn Table | Table primitives |

---

## When to Use AG Grid (via SpreadsheetPilotGrid)

### Use Cases

✅ Use AG Grid when you need:
- **Sorting** (single or multi-column)
- **Filtering** (built-in column filters)
- **Pagination** (client-side, large datasets)
- **Cell editing** (inline editing with validation)
- **Excel-like interaction** (fill handle, keyboard navigation)
- **Row or cell selection** (single, multiple, or range selection)
- **Clipboard operations** (copy/paste, cut)
- **Undo/redo** (for editing operations)
- **Virtualization** (performance for 100+ rows)
- **Column resizing/reordering**
- **Custom cell renderers** (badges, buttons, links, etc.)

### Component

```tsx
import { SpreadsheetPilotGrid } from "@/components/spreadsheet-native/SpreadsheetPilotGrid";

<SpreadsheetPilotGrid
  title="Orders"
  description="Manage customer orders"
  rows={orders}
  columnDefs={columnDefs}
  getRowId={(row) => String(row.id)}
  selectedRowId={selectedOrderId}
  onSelectedRowChange={(row) => setSelectedOrder(row)}
  selectionMode="single-row" // or "cell-range" for Excel-like selection
  enableFillHandle={true}
  emptyTitle="No orders yet"
  emptyDescription="Orders will appear here once created"
/>
```

### Column Definitions

```tsx
import type { ColDef } from "ag-grid-community";

const columnDefs: ColDef<Order>[] = [
  {
    headerName: "Order #",
    field: "orderNumber",
    width: 120,
    sortable: true,
    filter: true,
    pinned: "left", // Pin to left side
  },
  {
    headerName: "Customer",
    field: "customerName",
    flex: 1, // Takes remaining space
    editable: true, // Inline editing
    cellEditor: "agTextCellEditor",
  },
  {
    headerName: "Total",
    field: "total",
    width: 120,
    valueFormatter: (params) => 
      `$${params.value.toFixed(2)}`,
    type: "numericColumn", // Right-aligned
  },
  {
    headerName: "Status",
    field: "status",
    width: 120,
    cellRenderer: (params) => (
      <Badge variant={getStatusVariant(params.value)}>
        {params.value}
      </Badge>
    ),
  },
];
```

### Examples in TERP

- `OrdersSheetPilotSurface.tsx` - Order management
- `InventorySheetPilotSurface.tsx` - Inventory tracking
- `InvoicesSurface.tsx` - Invoice management
- `PaymentsSurface.tsx` - Payment tracking
- `GeneralLedgerSurface.tsx` - Accounting ledger

---

## When to Use shadcn Table Primitives

### Use Cases

✅ Use shadcn Table when you have:
- **Simple static lists** (<20 rows, minimal interaction)
- **Display-only data** (reports, summaries, read-only views)
- **Server-side controls** (filtering/pagination handled by API, not client)
- **Lightweight requirements** (no sorting, editing, or complex features needed)

### Components

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Features

- ✅ **Responsive**: Horizontal scroll on mobile with scroll hints
- ✅ **Accessible**: Semantic HTML table structure
- ✅ **Styled**: Consistent Tailwind styling across TERP
- ⚠️ **Manual features**: You must implement sorting, filtering, pagination yourself

### When to Add Manual Features

If you need sorting/filtering with shadcn Table:

```tsx
// Sort state
const [sortField, setSortField] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

// Sorted data
const sortedData = useMemo(() => {
  if (!sortField) return data;
  return [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDirection === "asc" 
      ? aVal > bVal ? 1 : -1 
      : aVal < bVal ? 1 : -1;
  });
}, [data, sortField, sortDirection]);

// Render with sort buttons
<TableHead>
  <Button variant="ghost" onClick={() => {
    setSortField("name");
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  }}>
    Name {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
  </Button>
</TableHead>
```

**💡 Tip**: If you find yourself implementing complex sorting/filtering/pagination manually, consider using AG Grid instead.

### Examples in TERP

- `ProductsPage.tsx` - Strain list (simple, static)
- `InvoicePaymentHistory.tsx` - Payment history (display-only)
- `GLEntriesViewer.tsx` - GL entry details (read-only)
- `TrialBalanceReport.tsx` - Accounting report (static)
- `RoleManagement.tsx` - Role list (simple CRUD)

---

## What NOT to Do

### ❌ Do NOT Create Custom Table Components

We have standardized on AG Grid and shadcn Table. **Do not**:

- ❌ Build new custom `DataTable`-like components
- ❌ Use third-party table libraries (React Table, Material Table, etc.)
- ❌ Reinvent sorting/filtering/pagination logic
- ❌ Copy-paste table code between components (use SpreadsheetPilotGrid)

**Why?**
- **Maintenance burden**: Custom tables require ongoing maintenance
- **Inconsistency**: Different tables behave differently across TERP
- **Duplication**: Reinventing features already in AG Grid
- **Performance**: Custom implementations rarely match AG Grid's virtualization

### ❌ Do NOT Use AG Grid Directly

Always use `SpreadsheetPilotGrid`, not `AgGridReact` directly.

**Wrong:**
```tsx
import { AgGridReact } from "ag-grid-react";

<AgGridReact rowData={data} columnDefs={columns} />
```

**Right:**
```tsx
import { SpreadsheetPilotGrid } from "@/components/spreadsheet-native/SpreadsheetPilotGrid";

<SpreadsheetPilotGrid 
  rows={data} 
  columnDefs={columns}
  getRowId={(row) => String(row.id)}
  emptyTitle="No data"
  emptyDescription="Data will appear here"
/>
```

**Why?**
- `SpreadsheetPilotGrid` provides TERP-specific defaults (theme, styling, selection behavior)
- Consistent empty states, loading states, error handling
- Selection integration with TERP's powersheet system
- Proper TypeScript types and prop validation

**Exception**: Legacy grids (`ClientGrid`, `InventoryGrid`, `PickPackGrid`) use `AgGridReactCompat` for special UX requirements. Do not copy these patterns for new features.

---

## Migration Guide

### Migrating from Custom Table to AG Grid

If you have a custom table component with manual sorting/filtering:

**Before:**
```tsx
const [sortedData, setSortedData] = useState(data);
const [filters, setFilters] = useState({});

// Manual sort/filter logic (50+ lines)...

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>
        <Button onClick={() => handleSort("name")}>
          Name {getSortIcon("name")}
        </Button>
      </TableHead>
      {/* More manual headers... */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {sortedData.map(row => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        {/* More cells... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**After:**
```tsx
import type { ColDef } from "ag-grid-community";

const columnDefs: ColDef<RowType>[] = [
  { headerName: "Name", field: "name", sortable: true, filter: true },
  // More columns...
];

<SpreadsheetPilotGrid
  rows={data}
  columnDefs={columnDefs}
  getRowId={(row) => String(row.id)}
  selectionMode="single-row"
  emptyTitle="No results"
  emptyDescription="Try adjusting your filters"
/>
```

**Benefits:**
- 50+ lines of manual logic → 10 lines of config
- Built-in virtualization for performance
- Keyboard navigation out of the box
- Consistent UX across TERP

---

## Decision Tree

```
Do you need a table/grid?
│
├─ Is it a simple list with <20 rows, no interaction?
│  └─ Use shadcn Table primitives
│
├─ Is it display-only (report, summary, read-only detail)?
│  └─ Use shadcn Table primitives
│
├─ Do you need sorting OR filtering OR pagination?
│  │
│  ├─ Is it server-side (API handles it)?
│  │  └─ Use shadcn Table + manual controls
│  │
│  └─ Is it client-side (browser handles it)?
│     └─ Use SpreadsheetPilotGrid
│
├─ Do you need editing OR Excel-like features OR 100+ rows?
│  └─ Use SpreadsheetPilotGrid
│
└─ Still unsure?
   └─ Default to SpreadsheetPilotGrid (handles all cases)
```

---

## Performance Considerations

### When to Use Virtualization (AG Grid)

Use AG Grid when:
- Dataset has **100+ rows**
- Rows are **added/removed frequently** (real-time updates)
- Users need to **scroll through large lists** smoothly

AG Grid's virtualization renders only visible rows, keeping 1000+ row tables performant.

### When Virtualization is Overkill

Use shadcn Table when:
- Dataset has **<20 rows** (virtualization overhead not worth it)
- Data is **static** (loaded once, never changes)
- Table is **not scrollable** (all rows visible at once)

---

## Common Patterns

### Pattern 1: Master-Detail with AG Grid

```tsx
<SpreadsheetPilotGrid
  rows={orders}
  columnDefs={orderColumns}
  selectedRowId={selectedOrderId}
  onSelectedRowChange={(order) => {
    setSelectedOrderId(order?.id ?? null);
    fetchOrderDetails(order?.id);
  }}
  selectionMode="single-row"
/>

{selectedOrderId && (
  <Card>
    <CardHeader>Order Details</CardHeader>
    <CardContent>
      <OrderDetails orderId={selectedOrderId} />
    </CardContent>
  </Card>
)}
```

### Pattern 2: Simple List with shadcn Table

```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.slice(0, 10).map((activity) => (
          <TableRow key={activity.id}>
            <TableCell>{activity.event}</TableCell>
            <TableCell>{formatDate(activity.timestamp)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Pattern 3: Editable Grid with Validation

```tsx
<SpreadsheetPilotGrid
  rows={inventory}
  columnDefs={[
    { 
      headerName: "Quantity", 
      field: "quantity",
      editable: true,
      cellEditor: "agNumberCellEditor",
      cellEditorParams: {
        min: 0,
        max: 10000,
      },
    },
    // More columns...
  ]}
  onCellValueChanged={(event) => {
    updateInventory(event.data.id, {
      [event.colDef.field]: event.newValue,
    });
  }}
  enableUndoRedo={true}
  selectionMode="cell-range"
/>
```

---

## FAQ

### Q: Can I use AG Grid for a simple 5-row table?

**A**: You *can*, but shadcn Table is more appropriate. AG Grid has overhead (license, bundle size, complexity) that's not needed for tiny static tables.

### Q: What if I need custom cell rendering in shadcn Table?

**A**: shadcn Table supports custom rendering easily:

```tsx
<TableCell>
  <Badge variant={getStatusVariant(row.status)}>
    {row.status}
  </Badge>
</TableCell>
```

For complex rendering (buttons, dialogs, nested components), consider if AG Grid's `cellRenderer` would be cleaner.

### Q: Can I mix AG Grid and shadcn Table on the same page?

**A**: Yes! Use AG Grid for the main data grid, shadcn Table for detail panels or summaries:

```tsx
{/* Main grid - AG Grid */}
<SpreadsheetPilotGrid rows={orders} columnDefs={columns} />

{/* Summary panel - shadcn Table */}
<Card>
  <CardHeader>Order Summary</CardHeader>
  <CardContent>
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>Total Orders</TableCell>
          <TableCell>{orders.length}</TableCell>
        </TableRow>
        {/* More summary rows */}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Q: What about mobile responsiveness?

**Both systems are mobile-responsive:**

- **AG Grid**: Horizontal scroll + column pinning for key fields
- **shadcn Table**: Horizontal scroll with visual scroll hints

For mobile-first views with vertical stacking, consider using `<Card>` lists instead of tables.

### Q: How do I export data to CSV/Excel?

**AG Grid** has built-in export:

```tsx
const gridApi = useRef<GridApi | null>(null);

<SpreadsheetPilotGrid
  onGridReady={(params) => {
    gridApi.current = params.api;
  }}
  // ...
/>

<Button onClick={() => {
  gridApi.current?.exportDataAsCsv();
}}>
  Export to CSV
</Button>
```

**shadcn Table** requires manual implementation:

```tsx
import { jsPDF } from "jspdf";

const exportToPDF = () => {
  const doc = new jsPDF();
  // Manual PDF generation
};
```

---

## Additional Resources

- **AG Grid Docs**: https://www.ag-grid.com/react-data-grid/
- **SpreadsheetPilotGrid**: `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`
- **shadcn Table**: `client/src/components/ui/table.tsx`
- **Audit Report**: `docs/decisions/table-system.md`
- **TER-1216**: Table system convergence ticket

---

**Questions?** Ask in #engineering or consult `docs/decisions/table-system.md` for the full audit and rationale.
