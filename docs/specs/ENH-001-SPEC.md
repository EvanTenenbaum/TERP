# Specification: ENH-001 - Update Inventory Browser Table

**Status:** Draft
**Priority:** CRITICAL
**Estimate:** 16h
**Module:** Frontend / Sales
**Dependencies:** FEAT-001 (Enhanced Inventory API)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The current inventory browser table in the Sales Sheet and Order Creation pages lacks essential data columns that sales representatives need to make informed decisions. The table needs to display Brand/Farmer, COGS, Customer Retail pricing, Units Available, and Days Old alongside the existing product information.

**User Quote:**
> "have my inventory view in front of me that has the product name, the brand has the cogs pricing and the customer. Retail pricing as the number of units available days old category"

## 2. User Stories

1. **As a sales representative**, I want to see all relevant inventory data in one table, so that I can quickly assess what to offer customers.

2. **As a sales representative**, I want to sort by "Days Old" to prioritize older inventory, so that I can move aging stock first.

3. **As a warehouse manager**, I want to see available units at a glance, so that I can assess stock levels quickly.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Table must display Brand/Farmer column | Must Have |
| FR-02 | Table must display COGS column | Must Have |
| FR-03 | Table must display Customer Retail Price column | Must Have |
| FR-04 | Table must display Units Available column | Must Have |
| FR-05 | Table must display Days Old column | Must Have |
| FR-06 | All columns must be sortable | Must Have |
| FR-07 | Table must support column visibility toggle | Should Have |
| FR-08 | "Farmer" label for flower, "Brand" for others | Must Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Flower category uses "Farmer" label | Farmer: Green Thumb Farms |
| BR-02 | Non-flower uses "Brand" label | Brand: Extract Co. |
| BR-03 | Days Old highlighted if > 30 days | Orange background for aging |
| BR-04 | Low availability highlighted if < 5 units | Red text for low stock |

## 4. Technical Specification

### 4.1 Component Changes

**File:** `/home/user/TERP/client/src/components/inventory/InventoryBrowserTable.tsx`

```typescript
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";

interface InventoryBrowserTableProps {
  clientId?: number; // For client-specific pricing
  onSelectItem?: (batchId: number) => void;
  selectedItems?: number[];
  filters?: {
    category?: string;
    status?: string[];
    minAvailability?: number;
    search?: string;
  };
}

interface ColumnDef {
  id: string;
  header: string;
  accessor: (item: EnhancedInventoryItem) => React.ReactNode;
  sortable: boolean;
  defaultVisible: boolean;
  width?: string;
}

export function InventoryBrowserTable({
  clientId,
  onSelectItem,
  selectedItems = [],
  filters,
}: InventoryBrowserTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "daysOld", direction: "desc" });

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "productName",
    "brandName",
    "category",
    "unitCogs",
    "customerRetailPrice",
    "unitsAvailable",
    "daysOld",
  ]);

  // Fetch enhanced inventory data
  const { data, isLoading, error } = trpc.inventory.listEnhanced.useQuery({
    clientId,
    page: 1,
    pageSize: 50,
    filters: filters,
    sortBy: sortConfig.key as any,
    sortOrder: sortConfig.direction,
  });

  // Column definitions
  const columns: ColumnDef[] = useMemo(() => [
    {
      id: "productName",
      header: "Product",
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.productName}</span>
          <span className="text-xs text-muted-foreground">{item.sku}</span>
        </div>
      ),
      sortable: true,
      defaultVisible: true,
      width: "200px",
    },
    {
      id: "brandName",
      header: "", // Dynamic: "Farmer" or "Brand"
      accessor: (item) => (
        <span>{item.brandName}</span>
      ),
      sortable: true,
      defaultVisible: true,
      width: "150px",
    },
    {
      id: "category",
      header: "Category",
      accessor: (item) => (
        <Badge variant="outline">{item.category}</Badge>
      ),
      sortable: true,
      defaultVisible: true,
      width: "100px",
    },
    {
      id: "unitCogs",
      header: "COGS",
      accessor: (item) => (
        <span className="font-mono text-sm">
          {item.cogsMode === "RANGE"
            ? `${formatCurrency(item.unitCogsMin)} - ${formatCurrency(item.unitCogsMax)}`
            : formatCurrency(item.unitCogs)}
        </span>
      ),
      sortable: true,
      defaultVisible: true,
      width: "120px",
    },
    {
      id: "customerRetailPrice",
      header: "Retail",
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium">
            {formatCurrency(item.customerRetailPrice)}
          </span>
          {item.priceRulesApplied.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {item.priceRulesApplied.length} rule(s)
            </span>
          )}
        </div>
      ),
      sortable: true,
      defaultVisible: true,
      width: "100px",
    },
    {
      id: "unitsAvailable",
      header: "Available",
      accessor: (item) => (
        <span
          className={cn(
            "font-mono",
            item.unitsAvailable < 5 && "text-red-600 font-bold"
          )}
        >
          {formatNumber(item.unitsAvailable)}
        </span>
      ),
      sortable: true,
      defaultVisible: true,
      width: "90px",
    },
    {
      id: "daysOld",
      header: "Days Old",
      accessor: (item) => (
        <span
          className={cn(
            "font-mono",
            item.daysOld > 30 && "bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
          )}
        >
          {item.daysOld}
        </span>
      ),
      sortable: true,
      defaultVisible: true,
      width: "80px",
    },
    {
      id: "grade",
      header: "Grade",
      accessor: (item) => item.grade || "—",
      sortable: true,
      defaultVisible: false,
      width: "70px",
    },
  ], []);

  // Get dynamic header for Brand/Farmer column
  const getBrandColumnHeader = (items: EnhancedInventoryItem[]) => {
    // If all items are flower, show "Farmer"; otherwise "Brand/Farmer"
    const hasNonFlower = items.some(i => i.category !== "Flower");
    return hasNonFlower ? "Brand/Farmer" : "Farmer";
  };

  const handleSort = (columnId: string) => {
    setSortConfig(prev => ({
      key: columnId,
      direction: prev.key === columnId && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRowClick = (batchId: number) => {
    if (onSelectItem) {
      onSelectItem(batchId);
    }
  };

  if (isLoading) {
    return <TableSkeleton columns={visibleColumns.length} rows={10} />;
  }

  if (error) {
    return <div className="text-red-500">Error loading inventory: {error.message}</div>;
  }

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Column visibility toggle */}
      <ColumnVisibilityToggle
        columns={columns}
        visibleColumns={visibleColumns}
        onToggle={setVisibleColumns}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns
                .filter(col => visibleColumns.includes(col.id))
                .map(col => (
                  <TableHead
                    key={col.id}
                    style={{ width: col.width }}
                    className={cn(col.sortable && "cursor-pointer hover:bg-muted")}
                    onClick={() => col.sortable && handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      {col.id === "brandName"
                        ? getBrandColumnHeader(items)
                        : col.header}
                      {col.sortable && (
                        <SortIcon
                          active={sortConfig.key === col.id}
                          direction={sortConfig.direction}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow
                key={item.batchId}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selectedItems.includes(item.batchId) && "bg-primary/10"
                )}
                onClick={() => handleRowClick(item.batchId)}
              >
                {columns
                  .filter(col => visibleColumns.includes(col.id))
                  .map(col => (
                    <TableCell key={col.id}>
                      {col.accessor(item)}
                    </TableCell>
                  ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
          totalItems={data.pagination.totalItems}
          totalPages={data.pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

// Sort icon component
function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  return direction === "asc"
    ? <ArrowUp className="h-4 w-4" />
    : <ArrowDown className="h-4 w-4" />;
}
```

### 4.2 Integration with Sales Sheet

**File:** `/home/user/TERP/client/src/pages/SalesSheet.tsx`

```typescript
// Update to use enhanced inventory browser
import { InventoryBrowserTable } from "@/components/inventory/InventoryBrowserTable";

// In SalesSheet component:
<InventoryBrowserTable
  clientId={selectedClient?.id}
  onSelectItem={handleAddToOrder}
  selectedItems={orderItems.map(i => i.batchId)}
  filters={{
    status: ["LIVE", "PHOTOGRAPHY_COMPLETE"],
    minAvailability: 1,
    category: selectedCategory,
    search: searchQuery,
  }}
/>
```

### 4.3 Style Updates

**File:** `/home/user/TERP/client/src/components/inventory/InventoryBrowserTable.css`

```css
/* Aging inventory highlight */
.inventory-row-aging {
  background-color: rgba(251, 146, 60, 0.1); /* orange-100 equivalent */
}

/* Low stock highlight */
.inventory-cell-low-stock {
  color: #dc2626; /* red-600 */
  font-weight: 700;
}

/* COGS column styling */
.inventory-cell-cogs {
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
}

/* Price column styling */
.inventory-cell-price {
  font-family: ui-monospace, monospace;
  font-weight: 500;
}
```

## 5. UI/UX Specification

### 5.1 User Flow

```
[User opens Sales Sheet]
    → [Select client]
    → [Table loads with client-specific pricing]
    → [Columns visible: Product, Farmer/Brand, Category, COGS, Retail, Available, Days Old]
    → [User clicks column header to sort]
    → [User clicks row to add to order]
```

### 5.2 Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Search...] [Category ▼] [Status ▼]           [Columns ▼] │
├──────────────────────────────────────────────────────────────────────────────┤
│ Product ↕      │ Farmer ↕   │ Cat  │ COGS ↕    │ Retail ↕  │ Avail ↕│ Days ↕│
├──────────────────────────────────────────────────────────────────────────────┤
│ Blue Dream     │ Green Thumb│ Flower│ $100.00  │ $130.00   │    25  │   45  │
│ BD-FLW-001     │            │       │          │ 2 rules   │        │ ████  │
├──────────────────────────────────────────────────────────────────────────────┤
│ OG Kush        │ Valley Farm│ Flower│ $95.00   │ $123.50   │     3  │   12  │
│ OGK-FLW-002    │            │       │          │ 2 rules   │  RED   │       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Live Resin     │ Extract Co.│ Conc. │$150-$180 │ $210.00   │    50  │    8  │
│ LR-CON-001     │            │       │ (Range)  │ 1 rule    │        │       │
└──────────────────────────────────────────────────────────────────────────────┘
│                        Page 1 of 5  [<] [1] [2] [3] ... [>]                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Acceptance Criteria (UI)

- [ ] "Farmer" column shows for flower products, "Brand" for others
- [ ] Column header dynamically shows "Farmer" or "Brand/Farmer"
- [ ] COGS displays range format for RANGE mode (e.g., "$100 - $120")
- [ ] Customer Retail shows calculated price with rule count indicator
- [ ] Units Available shows in red if < 5
- [ ] Days Old shows orange background if > 30 days
- [ ] All columns sortable with visual indicator
- [ ] Column visibility toggle allows hiding/showing columns
- [ ] Table loads within 500ms
- [ ] Pagination works correctly

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| No inventory available | Show "No inventory found" message |
| Client not selected | Show base prices without client adjustment |
| Very long product name | Truncate with ellipsis, show full on hover |
| Mixed categories in view | Show "Brand/Farmer" header |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Column rendering for all data types
- [ ] Sort function works correctly
- [ ] Filter application
- [ ] Dynamic header logic

### 7.2 Integration Tests

- [ ] API integration with enhanced inventory endpoint
- [ ] Client-specific pricing updates on client change

### 7.3 E2E Tests

- [ ] Full table interaction flow
- [ ] Sorting all columns
- [ ] Pagination navigation

## 8. Migration & Rollout

### 8.1 Component Migration

Replace existing inventory table with new enhanced version.

### 8.2 Feature Flag

`FEATURE_ENHANCED_INVENTORY_TABLE` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Revert to original table component

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Table render time | < 500ms | Performance monitoring |
| User adoption | 100% (forced) | Analytics |
| Support tickets (table issues) | < 5/week | Support tracking |

## 10. Open Questions

- [x] Should COGS be visible to all users? **Yes, required for margin decisions**
- [ ] Should we add inline editing for price overrides? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
