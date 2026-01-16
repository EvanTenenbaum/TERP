# Specification: ENH-006 - Relocate Order Preview

**Status:** Draft
**Priority:** LOW
**Estimate:** 4h
**Module:** Frontend / Sales
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The current order preview panel is positioned on the right side of the inventory browser. Users have requested moving it above the inventory table so they can see the order building as they browse products without horizontal scrolling or divided attention.

**User Quote:**
> "maybe even above it. So when you're adding stuff, you're actually, yeah. Seeing the, like, order that's getting built there. To maybe happen above the product table."

## 2. User Stories

1. **As a sales rep**, I want to see my building order above the inventory, so that I can track what I'm adding while scrolling.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Order preview moves from right sidebar to above inventory table | Must Have |
| FR-02 | Order preview remains sticky when scrolling | Should Have |
| FR-03 | Order preview collapsible to save space | Should Have |
| FR-04 | Order preview shows item count, running total | Must Have |

## 4. Technical Specification

### 4.1 Layout Changes

**File:** `/home/user/TERP/client/src/pages/SalesSheet.tsx`

```typescript
// BEFORE: Side-by-side layout
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-3">
    <ClientInfoPod />
  </div>
  <div className="col-span-6">
    <InventoryBrowserTable />
  </div>
  <div className="col-span-3">
    <OrderPreview /> {/* Was on right */}
  </div>
</div>

// AFTER: Stacked layout
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-3">
    <ClientInfoPod />
  </div>
  <div className="col-span-9 space-y-4">
    {/* Order preview now above */}
    <div className="sticky top-0 z-10 bg-background">
      <OrderPreviewCompact />
    </div>
    <InventoryBrowserTable />
  </div>
</div>
```

### 4.2 Component: Compact Order Preview

**File:** `/home/user/TERP/client/src/components/orders/OrderPreviewCompact.tsx`

```typescript
import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ShoppingCart, Trash } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface OrderItem {
  batchId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderPreviewCompactProps {
  items: OrderItem[];
  onRemoveItem: (batchId: number) => void;
  onClearAll: () => void;
  total: number;
}

export function OrderPreviewCompact({
  items,
  onRemoveItem,
  onClearAll,
  total,
}: OrderPreviewCompactProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">Order Preview</span>
                <Badge variant="secondary">{items.length} items</Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">{formatCurrency(total)}</span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No items added yet</p>
            ) : (
              <>
                <div className="divide-y max-h-40 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.batchId} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          x{item.quantity} @ {formatCurrency(item.unitPrice)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(item.lineTotal)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.batchId)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <Button variant="outline" size="sm" onClick={onClearAll}>
                    Clear All
                  </Button>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg ml-2">{formatCurrency(total)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
```

## 5. UI/UX Specification

### 5.1 Wireframe - New Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Client Info   │  Order Preview                    $5,200 [▲]│
│ ┌───────────┐ │  ┌──────────────────────────────────────────┐│
│ │ Acme Corp │ │  │ Blue Dream x10 @ $100     $1,000    [x] ││
│ │ Premium   │ │  │ OG Kush x5 @ $120          $600     [x] ││
│ │ $15K avl  │ │  │ ...                                      ││
│ └───────────┘ │  │ [Clear All]                Total: $5,200││
│               │  └──────────────────────────────────────────┘│
│               │─────────────────────────────────────────────│
│               │  Inventory Browser                          │
│               │  ┌──────────────────────────────────────────┐│
│               │  │ Product  │ Farmer │ COGS │ Retail│ Avail ││
│               │  │ Blue Dr. │ Green  │ $100 │ $130  │   25  ││
│               │  │ OG Kush  │ Valley │ $95  │ $123  │    8  ││
│               │  │ ...                                      ││
│               │  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Order preview appears above inventory table
- [ ] Preview is sticky when scrolling
- [ ] Preview is collapsible
- [ ] Collapsed state shows item count and total
- [ ] Items can be removed from preview
- [ ] Clear all button works

## 6. Testing Requirements

### 6.1 E2E Tests
- [ ] Layout renders correctly
- [ ] Scroll behavior with sticky header
- [ ] Collapse/expand functionality

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
