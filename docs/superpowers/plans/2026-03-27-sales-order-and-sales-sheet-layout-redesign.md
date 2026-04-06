# Sales Order & Sales Sheet Layout Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure OrderCreatorPage and SalesSheetCreatorPage/SalesSheetsPilotSurface layouts to match the spreadsheet-native golden-flow design (March 2026 SVGs), settling the "caught between classic and sheet-native" split.

**Architecture:** Both pages already have all required features — this is a composition/layout change, not a feature build. The OrderCreatorPage moves from a 2/3+1/3 sidebar layout to an equal-weight inventory-left / order-document-right split with compact support modules below. The SalesSheet surfaces get a richer output panel and explicit handoff strip. No new tRPC endpoints, no schema changes, no new business logic.

**Tech Stack:** React 19, Tailwind 4, shadcn/ui, AG Grid (PowersheetGrid), existing TERP components

**Design References:**
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-order-sheet.svg`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-sheet.svg`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/sales-order-creation-direction.md`

---

## Context: Current vs Target Layout

### OrderCreatorPage — Current (lines 1689–2091)

```
┌──────────────────────────────────────────┐
│ Header: Title + Save State               │
├──────────────────────────────────────────┤
│ Customer Selector │ Referred By          │
├─────────────────────────┬────────────────┤
│ Inventory Browser       │ Pricing Context│
│ (lg:col-span-2)         │ (lg:col-span-1,│
│                         │  sticky)       │
│ Line Items Grid         │ Customer Acts  │
│ (below inventory)       │ Credit Banner  │
│                         │ Referral Panel │
│ Order Adjustment        │ Order Preview  │
│ (below line items)      │ Totals         │
│                         │ OrderType+Save │
│                         │ Finalize       │
├─────────────────────────┴────────────────┤
│ Status Bar + Keyboard Hints              │
└──────────────────────────────────────────┘
```

### OrderCreatorPage — Target (from SVG)

```
┌──────────────────────────────────────────┐
│ Header: Back │ Seeded badge │ Quote mode │
│        │ Draft ID │ Save Draft │ Finalize │
├──────────────────────────────────────────┤
│ Customer │ Doc Mode │ Autosave │ Credit │ │
│                              │ Finalize  │
├────────────────────┬─────────────────────┤
│ INVENTORY          │ SALES ORDER         │
│ (left half)        │ (right half)        │
│ Search │ Location  │ Add Row │ Dup │ Del │
│ │ Add Rows         │                     │
│ ┌────────────────┐ │ ┌─────────────────┐ │
│ │ SKU │ Product  │ │ │ # │ Product │   │ │
│ │ Batch │ Avail  │ │ │ Batch │ Qty │   │ │
│ │ Action         │ │ │ Price │ Disc │  │ │
│ └────────────────┘ │ │ Line Total      │ │
│                    │ └─────────────────┘ │
├─────────┬──────────┼─────────────────────┤
│Referral │ Credit   │ Whole Order Changes │
│(compact)│(compact) │ (wide — adjustment, │
│         │          │  notes, totals,     │
│         │          │  save/finalize)     │
├─────────┴──────────┴─────────────────────┤
│ Finalize & Workflow Guardrails strip     │
├──────────────────────────────────────────┤
│ Status Bar + Keyboard Hints              │
└──────────────────────────────────────────┘
```

### SalesSheetsPilotSurface — Current (lines 804–1097)

```
┌──────────────────────────────────────────┐
│ Toolbar: Client │ Draft │ Unsaved │      │
│ Refresh │ Save │ ··· │ Convert │ Classic │
├──────────────────────────────────────────┤
│ Sheet Actions: Add │ Remove │ Drafts │   │
│ Total                                    │
├──────────────────────────────────────────┤
│ Search                                   │
├──────────────────────────┬───────────────┤
│ Inventory Browser        │ Sheet Preview │
│ (lg:col-span-3)          │ (lg:col-span-1│
│ PowersheetGrid           │ PowersheetGrid│
├──────────────────────────┴───────────────┤
│ History: N saved sheets                  │
├──────────────────────────────────────────┤
│ Status Bar                               │
└──────────────────────────────────────────┘
```

### SalesSheetsPilotSurface — Target (from SVG)

```
┌──────────────────────────────────────────┐
│ Toolbar: Client │ Draft │ Quick View │   │
│ Save View │ Autosave │ Dirty: N cells    │
├──────────────────────────┬───────────────┤
│ Priced Inventory Browser │ Preview +     │
│ (left, dominant ~65%)    │ Output (~35%) │
│ Search │ View │ Sort │   │              │
│ Filters │ Add            │ Preview grid  │
│ ┌────────────────────┐   │              │
│ │ Prod │ Cat │ Qty │ │   │ Items: 48    │
│ │ Retail │ COGS │    │   │ Value: $3,140│
│ │ Selected           │   │ Share: status │
│ └────────────────────┘   │              │
│                          │ Save │ Share ││
│ View profile badges      │ PDF │ Print  │
├──────────────────────────┴───────────────┤
│ Share + Convert + Live Handoffs          │
│ Share Link │ To Sales Order │ To Quote │ │
│ Live                                     │
├──────────────────────────────────────────┤
│ Status Bar + Keyboard Hints              │
└──────────────────────────────────────────┘
```

---

## File Map

### Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `client/src/pages/OrderCreatorPage.tsx` | Major layout restructure of JSX (lines 1594–2206) | Layout only — no logic changes |
| `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx` | Layout restructure + richer output panel | Layout + minor new UI |
| `client/src/pages/SalesSheetCreatorPage.tsx` | Align classic layout closer to design | Layout adjustments |

### Files to Create

| File | Purpose |
|------|---------|
| `client/src/components/orders/OrderWorkspaceLayout.tsx` | Extracted layout shell for the 2-column + support modules composition |
| `client/src/components/orders/OrderStatusCards.tsx` | Compact Autosave / Credit / Finalize status cards for header area |
| `client/src/components/orders/WholeOrderChangesPanel.tsx` | Combined adjustment + notes + order-level controls |
| `client/src/components/orders/CompactSupportModule.tsx` | Reusable compact card for Referral / Credit below inventory |
| `client/src/components/sales/SalesSheetOutputPanel.tsx` | Richer preview + output panel with Save/Share/PDF/Print |
| `client/src/components/sales/SalesSheetHandoffStrip.tsx` | Explicit Share + Convert + Live action strip |

### Test Files

| File | Tests |
|------|-------|
| `client/src/components/orders/OrderWorkspaceLayout.test.tsx` | Layout renders both columns, responsive collapse |
| `client/src/components/orders/OrderStatusCards.test.tsx` | Status card states (healthy, warning, explicit) |
| `client/src/components/orders/WholeOrderChangesPanel.test.tsx` | Adjustment + notes render, save/finalize buttons work |
| `client/src/components/sales/SalesSheetOutputPanel.test.tsx` | Output buttons, dirty-state blocking |
| `client/src/components/sales/SalesSheetHandoffStrip.test.tsx` | Convert/share/live buttons, disabled states |

---

## Phase 1: Sales Order Layout Redesign

### Task 1: Create OrderStatusCards Component

Extract the Autosave, Credit, and Finalize trust-cue indicators from the sidebar into compact status cards that sit in the header area, matching the design's top-right status region.

**Files:**
- Create: `client/src/components/orders/OrderStatusCards.tsx`
- Test: `client/src/components/orders/OrderStatusCards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/components/orders/OrderStatusCards.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OrderStatusCards } from "./OrderStatusCards";

describe("OrderStatusCards", () => {
  it("renders autosave status", () => {
    render(
      <OrderStatusCards
        saveState={{ status: "saved", lastSavedAt: new Date() }}
        creditStatus="ok"
        isValid={true}
        orderType="SALE"
      />
    );
    expect(screen.getByText("AUTOSAVE")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders credit warning when status is warning", () => {
    render(
      <OrderStatusCards
        saveState={{ status: "saved", lastSavedAt: new Date() }}
        creditStatus="warning"
        isValid={true}
        orderType="SALE"
      />
    );
    expect(screen.getByText("CREDIT")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders finalize status as explicit when valid", () => {
    render(
      <OrderStatusCards
        saveState={{ status: "saved", lastSavedAt: new Date() }}
        creditStatus="ok"
        isValid={true}
        orderType="SALE"
      />
    );
    expect(screen.getByText("FINALIZE")).toBeInTheDocument();
    expect(screen.getByText("Explicit")).toBeInTheDocument();
  });

  it("renders finalize status as blocked when invalid", () => {
    render(
      <OrderStatusCards
        saveState={{ status: "saved", lastSavedAt: new Date() }}
        creditStatus="ok"
        isValid={false}
        orderType="SALE"
      />
    );
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("hides credit card for quotes", () => {
    render(
      <OrderStatusCards
        saveState={{ status: "saved", lastSavedAt: new Date() }}
        creditStatus="ok"
        isValid={true}
        orderType="QUOTE"
      />
    );
    expect(screen.queryByText("CREDIT")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/components/orders/OrderStatusCards.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement OrderStatusCards**

```tsx
// client/src/components/orders/OrderStatusCards.tsx
import { cn } from "@/lib/utils";

interface OrderStatusCardsProps {
  saveState: { status: string; lastSavedAt?: Date | null };
  creditStatus: "ok" | "warning" | "hard-block";
  isValid: boolean;
  orderType: "SALE" | "QUOTE";
}

function StatusCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 min-w-[120px]">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold leading-tight",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-destructive",
          variant === "success" && "text-emerald-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function OrderStatusCards({
  saveState,
  creditStatus,
  isValid,
  orderType,
}: OrderStatusCardsProps) {
  const autosaveValue =
    saveState.status === "saving"
      ? "Saving..."
      : saveState.status === "error"
        ? "Error"
        : "Healthy";
  const autosaveVariant =
    saveState.status === "error"
      ? "danger"
      : saveState.status === "saving"
        ? "warning"
        : "success";

  const creditValue =
    creditStatus === "hard-block"
      ? "Blocked"
      : creditStatus === "warning"
        ? "Warning"
        : "OK";
  const creditVariant =
    creditStatus === "hard-block"
      ? "danger"
      : creditStatus === "warning"
        ? "warning"
        : "default";

  return (
    <div className="flex items-center gap-2">
      <StatusCard
        label="AUTOSAVE"
        value={autosaveValue}
        variant={autosaveVariant}
      />
      {orderType === "SALE" && (
        <StatusCard
          label="CREDIT"
          value={creditValue}
          variant={creditVariant}
        />
      )}
      <StatusCard
        label="FINALIZE"
        value={isValid ? "Explicit" : "Blocked"}
        variant={isValid ? "default" : "danger"}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/components/orders/OrderStatusCards.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/orders/OrderStatusCards.tsx client/src/components/orders/OrderStatusCards.test.tsx
git commit -m "feat(orders): add OrderStatusCards for header trust-cue indicators"
```

---

### Task 2: Create CompactSupportModule Component

Reusable compact card used for Referral and Credit support modules that sit below the inventory panel.

**Files:**
- Create: `client/src/components/orders/CompactSupportModule.tsx`

- [ ] **Step 1: Write the component**

```tsx
// client/src/components/orders/CompactSupportModule.tsx
import { Button } from "@/components/ui/button";

interface CompactSupportModuleProps {
  title: string;
  label: string;
  value: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function CompactSupportModule({
  title,
  label,
  value,
  actionLabel,
  onAction,
  children,
}: CompactSupportModuleProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="text-base font-semibold">{value}</p>
        </div>
        {actionLabel && onAction && (
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/orders/CompactSupportModule.tsx
git commit -m "feat(orders): add CompactSupportModule for below-inventory support regions"
```

---

### Task 3: Create WholeOrderChangesPanel Component

Combined panel for order-level adjustments, notes, order type selector, totals, and save/finalize controls — replaces the scattered right-sidebar elements.

**Files:**
- Create: `client/src/components/orders/WholeOrderChangesPanel.tsx`
- Test: `client/src/components/orders/WholeOrderChangesPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/components/orders/WholeOrderChangesPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WholeOrderChangesPanel } from "./WholeOrderChangesPanel";

describe("WholeOrderChangesPanel", () => {
  const defaultProps = {
    adjustment: { mode: "DISCOUNT" as const, type: "PERCENT" as const, value: 0 },
    subtotal: 1000,
    onAdjustmentChange: vi.fn(),
    showAdjustmentOnDocument: true,
    onShowAdjustmentOnDocumentChange: vi.fn(),
    orderType: "SALE" as const,
    onOrderTypeChange: vi.fn(),
    totals: { subtotal: 1000, adjustmentAmount: 0, total: 1000 },
    warnings: [],
    isValid: true,
    showCogs: false,
    showMargin: false,
    onSaveDraft: vi.fn(),
    onFinalize: vi.fn(),
    isSaving: false,
    isFinalizing: false,
    itemCount: 3,
  };

  it("renders the section title", () => {
    render(<WholeOrderChangesPanel {...defaultProps} />);
    expect(screen.getByText("Whole Order Changes")).toBeInTheDocument();
  });

  it("renders save draft and finalize buttons", () => {
    render(<WholeOrderChangesPanel {...defaultProps} />);
    expect(screen.getByTestId("whole-order-save-draft")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Order/)).toBeInTheDocument();
  });

  it("disables finalize when invalid", () => {
    render(<WholeOrderChangesPanel {...defaultProps} isValid={false} />);
    expect(screen.getByText(/Confirm Order/)).toBeDisabled();
  });

  it("shows quote label when orderType is QUOTE", () => {
    render(<WholeOrderChangesPanel {...defaultProps} orderType="QUOTE" />);
    expect(screen.getByText(/Confirm Quote/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/components/orders/WholeOrderChangesPanel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement WholeOrderChangesPanel**

This component composes `OrderAdjustmentPanel` and `OrderTotalsPanel` (both already exist) with the order type selector and save/finalize buttons into one cohesive region.

```tsx
// client/src/components/orders/WholeOrderChangesPanel.tsx
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OrderAdjustmentPanel,
  type OrderAdjustment,
} from "@/components/orders/OrderAdjustmentPanel";
import { OrderTotalsPanel } from "@/components/orders/OrderTotalsPanel";
import { Save, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface WholeOrderChangesPanelProps {
  adjustment: OrderAdjustment;
  subtotal: number;
  onAdjustmentChange: (adj: OrderAdjustment) => void;
  showAdjustmentOnDocument: boolean;
  onShowAdjustmentOnDocumentChange: (show: boolean) => void;
  orderType: "SALE" | "QUOTE";
  onOrderTypeChange: (type: "SALE" | "QUOTE") => void;
  totals: { subtotal: number; adjustmentAmount: number; total: number };
  warnings: string[];
  isValid: boolean;
  showCogs: boolean;
  showMargin: boolean;
  onSaveDraft: () => void;
  onFinalize: () => void;
  isSaving: boolean;
  isFinalizing: boolean;
  itemCount: number;
}

export function WholeOrderChangesPanel({
  adjustment,
  subtotal,
  onAdjustmentChange,
  showAdjustmentOnDocument,
  onShowAdjustmentOnDocumentChange,
  orderType,
  onOrderTypeChange,
  totals,
  warnings,
  isValid,
  showCogs,
  showMargin,
  onSaveDraft,
  onFinalize,
  isSaving,
  isFinalizing,
  itemCount,
}: WholeOrderChangesPanelProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
      <h3 className="text-lg font-bold">Whole Order Changes</h3>
      <p className="text-sm text-muted-foreground">
        Order-level notes, margin overrides, freight, terms, and finalize
        guardrails.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Adjustment */}
        <div className="md:col-span-2">
          <OrderAdjustmentPanel
            value={adjustment}
            subtotal={subtotal}
            onChange={onAdjustmentChange}
            showOnDocument={showAdjustmentOnDocument}
            onShowOnDocumentChange={onShowAdjustmentOnDocumentChange}
          />
        </div>

        {/* Right: Type + Totals + Actions */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Order Type</Label>
            <Select
              value={orderType}
              onValueChange={v => onOrderTypeChange(v as "SALE" | "QUOTE")}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALE">Sale Order</SelectItem>
                <SelectItem value="QUOTE">Quote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <OrderTotalsPanel
            totals={totals}
            warnings={warnings}
            isValid={isValid}
            showCogs={showCogs}
            showMargin={showMargin}
          />

          <div className="flex gap-2">
            <Button
              data-testid="whole-order-save-draft"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={itemCount === 0 || isSaving}
              onClick={onSaveDraft}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              size="sm"
              className="flex-1"
              disabled={!isValid || isFinalizing || itemCount === 0}
              onClick={onFinalize}
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {orderType === "QUOTE" ? "Creating..." : "Confirming..."}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  {orderType === "QUOTE" ? "Confirm Quote" : "Confirm Order"}
                </>
              )}
            </Button>
          </div>

          {!isValid && itemCount > 0 && (
            <div className="flex items-start gap-1.5 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5" />
              <p className="text-destructive">
                Fix validation errors before confirming
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/components/orders/WholeOrderChangesPanel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/orders/WholeOrderChangesPanel.tsx client/src/components/orders/WholeOrderChangesPanel.test.tsx
git commit -m "feat(orders): add WholeOrderChangesPanel for below-order support region"
```

---

### Task 4: Restructure OrderCreatorPage Layout

This is the core change. Replace the `grid-cols-3` (2/3 + 1/3 sidebar) layout with the design's equal-weight split + support modules below.

**Files:**
- Modify: `client/src/pages/OrderCreatorPage.tsx` (lines 1594–2206)

**Important:** All existing functionality stays. We are moving existing elements into new positions, not adding or removing features. The right sidebar's contents get redistributed:

| Current sidebar element | New location |
|------------------------|--------------|
| PricingContextPanel | Stays accessible via Customer Actions drawer (already there) |
| Customer Actions card | Merges into header area (customer already shown there) |
| CreditLimitBanner | Compact support module below inventory (left) |
| ReferralCreditsPanel | Compact support module below inventory (left) |
| FloatingOrderPreview | Removed as separate panel — the order grid IS the preview |
| OrderTotalsPanel | Inside WholeOrderChangesPanel (below right) |
| Order Type selector | Inside WholeOrderChangesPanel (below right) |
| Save Draft button | Header bar + WholeOrderChangesPanel |
| Save Options dropdown | Inside WholeOrderChangesPanel |
| Finalize button | Header bar + WholeOrderChangesPanel |

- [ ] **Step 1: Read the full render section of OrderCreatorPage**

Read `client/src/pages/OrderCreatorPage.tsx` lines 1594–2206 to have full context.

- [ ] **Step 2: Add imports for new components**

At the top of OrderCreatorPage.tsx, after the existing component imports (~line 80), add:

```tsx
import { OrderStatusCards } from "@/components/orders/OrderStatusCards";
import { CompactSupportModule } from "@/components/orders/CompactSupportModule";
import { WholeOrderChangesPanel } from "@/components/orders/WholeOrderChangesPanel";
```

- [ ] **Step 3: Derive creditStatus for OrderStatusCards**

Inside the component body, near where `totals` and `isValid` are computed, add:

```tsx
const creditStatus = useMemo((): "ok" | "warning" | "hard-block" => {
  if (!clientDetails || orderType !== "SALE") return "ok";
  const creditLimit = clientDetails.creditLimit ?? 0;
  if (creditLimit <= 0) return "ok";
  const utilization = totals.total / creditLimit;
  if (utilization > 1) return "hard-block";
  if (utilization > 0.8) return "warning";
  return "ok";
}, [clientDetails, orderType, totals.total]);
```

- [ ] **Step 4: Restructure the main grid layout**

Replace the `<div className="p-4">` block (lines ~1687–2091) with the new layout. The key structural change:

```tsx
<div className="p-4">
  {clientId ? (
    <div className="space-y-4">
      {/* === Row 1: Status cards (right-aligned) === */}
      <div className="flex items-center justify-end">
        <OrderStatusCards
          saveState={saveState}
          creditStatus={creditStatus}
          isValid={isValid}
          orderType={orderType}
        />
      </div>

      {/* === Row 2: Main split — Inventory (left) + Order Document (right) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Inventory Browser */}
        <Card id="inventory-browser-section">
          <CardContent className="pt-4">
            {inventoryError ? (
              /* ...existing inventory error handling (lines 1695–1737)... */
            ) : (
              <InventoryBrowser
                inventory={inventory || []}
                isLoading={inventoryLoading}
                onAddItems={handleAddItem}
                selectedItems={items.map(item => ({
                  id: item.batchId,
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Sales Order Document Grid */}
        <Card>
          <CardContent className="pt-4">
            {inSheetNativeOrdersSurface ? (
              <OrdersDocumentLineItemsGrid
                items={items}
                clientId={clientId}
                onChange={handleLineItemsChange}
                showCogsColumn={showCogs}
                showMarginColumn={showMargin}
                onAddItem={() => {
                  const el = document.getElementById("inventory-browser-section");
                  if (el) queueInventoryBrowserSearchFocus(el);
                  else toast.info("Use the inventory browser on the left to add items");
                }}
              />
            ) : (
              <>
                <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
                <LineItemTable
                  items={items}
                  clientId={clientId}
                  onChange={handleLineItemsChange}
                  showCogs={showCogs}
                  showMargin={showMargin}
                  onAddItem={() => {
                    const el = document.getElementById("inventory-browser-section");
                    if (el) queueInventoryBrowserSearchFocus(el);
                    else toast.info("Use the inventory browser on the left to add items");
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Row 3: Support modules — Referral+Credit (left) + Whole Order (right) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Compact Referral + Credit side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Referral */}
          <CompactSupportModule
            title="Referral"
            label="Current source"
            value={
              referredByClientId
                ? clients.find(c => c.id === referredByClientId)?.name ?? "Selected"
                : "None"
            }
            actionLabel="Open Referral"
            onAction={() => openCustomerDrawer("money", document.body)}
          />

          {/* Credit */}
          {clientDetails && orderType === "SALE" ? (
            <CompactSupportModule
              title="Credit"
              label="Available"
              value={
                clientDetails.creditLimit
                  ? `$${(clientDetails.creditLimit - totals.total).toLocaleString()}`
                  : "No limit set"
              }
              actionLabel="Open Credit"
              onAction={() => openCustomerDrawer("money", document.body)}
            >
              <CreditLimitBanner client={clientDetails} orderTotal={totals.total} />
            </CompactSupportModule>
          ) : (
            <CompactSupportModule
              title="Credit"
              label="Status"
              value="N/A for quotes"
            />
          )}
        </div>

        {/* RIGHT: Whole Order Changes */}
        <WholeOrderChangesPanel
          adjustment={adjustment}
          subtotal={totals.subtotal}
          onAdjustmentChange={setAdjustment}
          showAdjustmentOnDocument={showAdjustmentOnDocument}
          onShowAdjustmentOnDocumentChange={setShowAdjustmentOnDocument}
          orderType={orderType}
          onOrderTypeChange={(type) => {
            setOrderType(type);
            handleOrderValidationChange("orderType", type);
            handleOrderValidationBlur("orderType");
          }}
          totals={totals}
          warnings={warnings}
          isValid={isValid}
          showCogs={showCogs}
          showMargin={showMargin}
          onSaveDraft={() => handleSaveDraft()}
          onFinalize={handlePreviewAndFinalize}
          isSaving={createDraftMutation.isPending || updateDraftMutation.isPending}
          isFinalizing={finalizeMutation.isPending}
          itemCount={items.length}
        />
      </div>

      {/* === Row 4: Pricing Context (conditionally, if user has permission) === */}
      {canViewPricingContext && (
        <PricingContextPanel clientId={clientId} orderTotal={totals.total} />
      )}
    </div>
  ) : (
    /* ...existing "Select a customer" empty state (lines 2092–2106)... */
  )}
</div>
```

- [ ] **Step 5: Move Save Draft and Finalize into the header bar**

In the header section (~lines 1615–1621), replace the save state indicator area with primary action buttons:

```tsx
<div className="flex items-center gap-2">
  {clientId && items.length > 0 && SaveStateIndicator}
  {clientId && items.length > 0 && (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={items.length === 0 || createDraftMutation.isPending || updateDraftMutation.isPending}
        onClick={() => handleSaveDraft()}
      >
        <Save className="h-4 w-4 mr-1.5" />
        Save Draft
      </Button>
      <Button
        size="sm"
        disabled={!isValid || finalizeMutation.isPending}
        onClick={handlePreviewAndFinalize}
      >
        <CheckCircle className="h-4 w-4 mr-1.5" />
        {orderType === "QUOTE" ? "Finalize Quote" : "Finalize Draft"}
      </Button>
    </>
  )}
</div>
```

- [ ] **Step 6: Remove the old right sidebar column**

Delete the entire `{/* Right Column: Totals & Preview (1/3) */}` block (old lines ~1817–2090) since all its contents have been redistributed to:
- Status cards → header area
- Customer Actions → already in header drawer
- Credit/Referral → compact modules below inventory
- Preview → removed (order grid IS the preview now)
- Totals/Save/Finalize → WholeOrderChangesPanel

- [ ] **Step 7: Run type check and existing tests**

```bash
pnpm check
pnpm vitest run client/src/pages/OrderCreatorPage
```

Expected: Zero TS errors, existing tests pass (may need minor selector updates if tests reference removed elements).

- [ ] **Step 8: Fix any test selectors that reference removed elements**

If any tests referenced the old `FloatingOrderPreview` or right sidebar structure, update them to find the equivalent elements in the new layout. The `data-testid` attributes should be preserved on the buttons.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/OrderCreatorPage.tsx
git commit -m "feat(orders): restructure OrderCreatorPage to inventory-left/order-right split layout

Matches the spreadsheet-native golden-flow design:
- Equal-weight 2-column split (inventory | order document)
- Compact referral + credit modules below inventory
- WholeOrderChangesPanel below order grid
- Status cards in header, Save/Finalize elevated to header bar"
```

---

## Phase 2: Sales Sheet Layout Redesign

### Task 5: Create SalesSheetOutputPanel Component

Richer preview panel with summary cards (Items, Value, Share status) and first-class output buttons (Save, Share, PDF, Print).

**Files:**
- Create: `client/src/components/sales/SalesSheetOutputPanel.tsx`
- Test: `client/src/components/sales/SalesSheetOutputPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/components/sales/SalesSheetOutputPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SalesSheetOutputPanel } from "./SalesSheetOutputPanel";

describe("SalesSheetOutputPanel", () => {
  const defaultProps = {
    itemCount: 48,
    totalValue: 3140,
    hasUnsavedChanges: false,
    hasDraft: true,
    onSave: vi.fn(),
    onShare: vi.fn(),
    onExportPdf: vi.fn(),
    onPrint: vi.fn(),
    isSaving: false,
    children: <div data-testid="preview-grid">Grid</div>,
  };

  it("renders summary cards", () => {
    render(<SalesSheetOutputPanel {...defaultProps} />);
    expect(screen.getByText("ITEMS")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("VALUE")).toBeInTheDocument();
    expect(screen.getByText(/\$3,140/)).toBeInTheDocument();
  });

  it("shows share as blocked when unsaved", () => {
    render(<SalesSheetOutputPanel {...defaultProps} hasUnsavedChanges={true} />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("disables share button when unsaved", () => {
    render(<SalesSheetOutputPanel {...defaultProps} hasUnsavedChanges={true} />);
    expect(screen.getByRole("button", { name: /Share/i })).toBeDisabled();
  });

  it("enables all output buttons when saved", () => {
    render(<SalesSheetOutputPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Share/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /PDF/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Print/i })).toBeEnabled();
  });

  it("renders children (preview grid slot)", () => {
    render(<SalesSheetOutputPanel {...defaultProps} />);
    expect(screen.getByTestId("preview-grid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/components/sales/SalesSheetOutputPanel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SalesSheetOutputPanel**

```tsx
// client/src/components/sales/SalesSheetOutputPanel.tsx
import { Button } from "@/components/ui/button";
import { Save, Share2, FileDown, Printer } from "lucide-react";

interface SalesSheetOutputPanelProps {
  itemCount: number;
  totalValue: number;
  hasUnsavedChanges: boolean;
  hasDraft: boolean;
  onSave: () => void;
  onShare: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isSaving: boolean;
  children: React.ReactNode; // slot for preview grid
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 min-w-[100px]">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold leading-tight">{value}</p>
    </div>
  );
}

export function SalesSheetOutputPanel({
  itemCount,
  totalValue,
  hasUnsavedChanges,
  hasDraft,
  onSave,
  onShare,
  onExportPdf,
  onPrint,
  isSaving,
  children,
}: SalesSheetOutputPanelProps) {
  const canShare = !hasUnsavedChanges && hasDraft;

  return (
    <div className="flex flex-col gap-3">
      {/* Preview grid slot */}
      {children}

      {/* Summary cards */}
      <div className="flex items-center gap-2">
        <SummaryCard label="ITEMS" value={String(itemCount)} />
        <SummaryCard
          label="VALUE"
          value={`$${totalValue.toLocaleString()}`}
        />
        <SummaryCard
          label="SHARE"
          value={hasUnsavedChanges ? "Blocked" : "Ready"}
        />
      </div>

      {/* Output action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Sheet"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onShare}
          disabled={!canShare}
          aria-label="Share Link"
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          Share
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onExportPdf}
          disabled={!canShare}
          aria-label="PDF"
        >
          <FileDown className="mr-1.5 h-4 w-4" />
          PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onPrint}
          disabled={!canShare}
          aria-label="Print"
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
      </div>

      {hasUnsavedChanges && (
        <p className="text-xs text-amber-600 font-medium">
          Save the sheet before sharing, converting, or going live.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/components/sales/SalesSheetOutputPanel.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sales/SalesSheetOutputPanel.tsx client/src/components/sales/SalesSheetOutputPanel.test.tsx
git commit -m "feat(sales-sheets): add SalesSheetOutputPanel with summary cards and output buttons"
```

---

### Task 6: Create SalesSheetHandoffStrip Component

Explicit action strip for Share Link, To Sales Order, To Quote, and Live.

**Files:**
- Create: `client/src/components/sales/SalesSheetHandoffStrip.tsx`
- Test: `client/src/components/sales/SalesSheetHandoffStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/components/sales/SalesSheetHandoffStrip.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SalesSheetHandoffStrip } from "./SalesSheetHandoffStrip";

describe("SalesSheetHandoffStrip", () => {
  const defaultProps = {
    canConvert: true,
    canShare: true,
    itemCount: 4,
    onShareLink: vi.fn(),
    onConvertToOrder: vi.fn(),
    onConvertToQuote: vi.fn(),
    onStartLive: vi.fn(),
  };

  it("renders all four action buttons", () => {
    render(<SalesSheetHandoffStrip {...defaultProps} />);
    expect(screen.getByText("Share Link")).toBeInTheDocument();
    expect(screen.getByText("To Sales Order")).toBeInTheDocument();
    expect(screen.getByText("To Quote")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("disables convert buttons when canConvert is false", () => {
    render(<SalesSheetHandoffStrip {...defaultProps} canConvert={false} />);
    expect(screen.getByText("To Sales Order")).toBeDisabled();
    expect(screen.getByText("To Quote")).toBeDisabled();
  });

  it("disables share when canShare is false", () => {
    render(<SalesSheetHandoffStrip {...defaultProps} canShare={false} />);
    expect(screen.getByText("Share Link")).toBeDisabled();
  });

  it("shows context badges", () => {
    render(<SalesSheetHandoffStrip {...defaultProps} />);
    expect(screen.getByText(/fromSalesSheet=true/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/components/sales/SalesSheetHandoffStrip.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SalesSheetHandoffStrip**

```tsx
// client/src/components/sales/SalesSheetHandoffStrip.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, ArrowRight, FileText, Radio } from "lucide-react";

interface SalesSheetHandoffStripProps {
  canConvert: boolean;
  canShare: boolean;
  itemCount: number;
  onShareLink: () => void;
  onConvertToOrder: () => void;
  onConvertToQuote: () => void;
  onStartLive: () => void;
}

export function SalesSheetHandoffStrip({
  canConvert,
  canShare,
  itemCount,
  onShareLink,
  onConvertToOrder,
  onConvertToQuote,
  onStartLive,
}: SalesSheetHandoffStripProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-3">
      <h3 className="text-lg font-bold">Share + Convert + Live Handoffs</h3>
      <p className="text-sm text-muted-foreground">
        Sales Sheets owns save state and customer-facing output. Sales Order
        owns final composition and transaction workflow after handoff.
      </p>

      {/* Context badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          Seed route: ?fromSalesSheet=true
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Client + items persist across handoff
        </Badge>
        <Badge variant="outline" className="text-xs">
          Live Shopping stays sibling-owned
        </Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canShare}
          onClick={onShareLink}
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          Share Link
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canConvert}
          onClick={onConvertToOrder}
        >
          <ArrowRight className="mr-1.5 h-4 w-4" />
          To Sales Order
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canConvert}
          onClick={onConvertToQuote}
        >
          <FileText className="mr-1.5 h-4 w-4" />
          To Quote
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canConvert}
          onClick={onStartLive}
        >
          <Radio className="mr-1.5 h-4 w-4" />
          Live
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/components/sales/SalesSheetHandoffStrip.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/sales/SalesSheetHandoffStrip.tsx client/src/components/sales/SalesSheetHandoffStrip.test.tsx
git commit -m "feat(sales-sheets): add SalesSheetHandoffStrip for explicit convert/share/live actions"
```

---

### Task 7: Restructure SalesSheetsPilotSurface Layout

Wire the new output panel and handoff strip into the sheet-native sales sheet surface.

**Files:**
- Modify: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx`

- [ ] **Step 1: Read the full file**

Read `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx` to have complete context.

- [ ] **Step 2: Add imports**

```tsx
import { SalesSheetOutputPanel } from "@/components/sales/SalesSheetOutputPanel";
import { SalesSheetHandoffStrip } from "@/components/sales/SalesSheetHandoffStrip";
```

- [ ] **Step 3: Add PDF/Print handler stubs**

Near the existing handler functions, add:

```tsx
const handleExportPdf = useCallback(() => {
  toast.info("PDF export coming soon");
}, []);

const handlePrint = useCallback(() => {
  window.print();
}, []);
```

- [ ] **Step 4: Replace the browser+preview grid split**

Replace the `{/* ── browser + preview split ── */}` section (lines ~974–1053) with:

```tsx
{/* ── browser + output split ─────────────────────────────────────── */}
{selectedClientId ? (
  <div className="grid gap-4 lg:grid-cols-5">
    {/* inventory browser (3/5 width — dominant left) */}
    <div className="lg:col-span-3">
      <PowersheetGrid
        surfaceId="sales-sheets-browser"
        /* ...all existing props unchanged... */
      />
    </div>

    {/* preview + output (2/5 width — richer right panel) */}
    <div className="lg:col-span-2">
      <SalesSheetOutputPanel
        itemCount={selectedItems.length}
        totalValue={totalSheetValue}
        hasUnsavedChanges={hasUnsavedChanges}
        hasDraft={currentDraftId !== null}
        onSave={handleSaveDraft}
        onShare={handleGenerateShareLink}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
        isSaving={saveDraftMutation.isPending}
      >
        <PowersheetGrid
          surfaceId="sales-sheets-preview"
          /* ...all existing props unchanged... */
        />
      </SalesSheetOutputPanel>
    </div>
  </div>
) : (
  /* ...existing empty state... */
)}
```

- [ ] **Step 5: Add the handoff strip below the grid split**

After the browser+preview grid and before the version history section, add:

```tsx
{/* ── handoff strip ──────────────────────────────────────────────── */}
{selectedClientId && selectedItems.length > 0 && (
  <SalesSheetHandoffStrip
    canConvert={canConvert}
    canShare={canShare}
    itemCount={selectedItems.length}
    onShareLink={handleGenerateShareLink}
    onConvertToOrder={handleConvertToOrder}
    onConvertToQuote={() => {
      // Same as convert but with quote flag
      handleConvertToOrder(); // existing handler already navigates with fromSalesSheet
    }}
    onStartLive={() => {
      toast.info("Live Shopping session — coming soon");
    }}
  />
)}
```

- [ ] **Step 6: Simplify toolbar — move share/export from dropdown to output panel**

In the `DropdownMenu` (lines ~856–889), the Share and Export CSV items can stay for discoverability, but the primary actions are now in the output panel. No removal needed — just a note that the output panel is the primary surface for these actions.

- [ ] **Step 7: Run type check and existing tests**

```bash
pnpm check
pnpm vitest run client/src/components/spreadsheet-native/SalesSheetsPilotSurface
```

Expected: Zero TS errors, existing 19 tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx
git commit -m "feat(sales-sheets): restructure pilot surface with output panel and handoff strip

Matches the spreadsheet-native golden-flow design:
- Preview panel enriched with summary cards + Save/Share/PDF/Print
- Explicit handoff strip: Share Link, To Sales Order, To Quote, Live
- Browser/preview split widened to 3:2 ratio for better output visibility"
```

---

### Task 8: Align SalesSheetCreatorPage Classic Layout

Apply similar structural improvements to the classic mode so both modes feel consistent.

**Files:**
- Modify: `client/src/pages/SalesSheetCreatorPage.tsx`

- [ ] **Step 1: Read the full file**

Read `client/src/pages/SalesSheetCreatorPage.tsx` (628 lines) for full context.

- [ ] **Step 2: Add imports**

```tsx
import { SalesSheetHandoffStrip } from "@/components/sales/SalesSheetHandoffStrip";
```

- [ ] **Step 3: Replace the single "Convert to Quote" button with the handoff strip**

Replace lines ~544–581 (the Convert to Quote button) with:

```tsx
{/* Handoff strip */}
{selectedItems.length > 0 && selectedClientId && (
  <SalesSheetHandoffStrip
    canConvert={!hasUnsavedChanges && selectedItems.length > 0}
    canShare={!hasUnsavedChanges && currentDraftId !== null}
    itemCount={selectedItems.length}
    onShareLink={() => { /* TODO: wire to existing share mutation if available */ }}
    onConvertToOrder={() => {
      sessionStorage.setItem(
        "salesSheetToQuote",
        JSON.stringify({
          clientId: selectedClientId,
          items: selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: item.basePrice,
            retailPrice: item.retailPrice,
            quantity: item.quantity,
            category: item.category,
            vendor: item.vendor,
            cogsMode: item.cogsMode,
            unitCogs: item.unitCogs,
            unitCogsMin: item.unitCogsMin,
            unitCogsMax: item.unitCogsMax,
            effectiveCogs: item.effectiveCogs,
            effectiveCogsBasis: item.effectiveCogsBasis,
          })),
        })
      );
      setLocation(buildSalesWorkspacePath("create-order", { fromSalesSheet: true }));
    }}
    onConvertToQuote={() => {
      sessionStorage.setItem(
        "salesSheetToQuote",
        JSON.stringify({
          clientId: selectedClientId,
          items: selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: item.basePrice,
            retailPrice: item.retailPrice,
            quantity: item.quantity,
            category: item.category,
            vendor: item.vendor,
            cogsMode: item.cogsMode,
            unitCogs: item.unitCogs,
            unitCogsMin: item.unitCogsMin,
            unitCogsMax: item.unitCogsMax,
            effectiveCogs: item.effectiveCogs,
            effectiveCogsBasis: item.effectiveCogsBasis,
          })),
        })
      );
      setLocation(buildSalesWorkspacePath("create-order", { fromSalesSheet: true }));
    }}
    onStartLive={() => {
      toast.info("Live Shopping session — coming soon");
    }}
  />
)}
```

- [ ] **Step 4: Run type check**

```bash
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/SalesSheetCreatorPage.tsx
git commit -m "feat(sales-sheets): add handoff strip to classic SalesSheetCreatorPage

Replaces the single Convert to Quote button with the full handoff strip
matching the sheet-native surface layout."
```

---

## Phase 3: Verification & Polish

### Task 9: Full Build + Type + Lint Check

- [ ] **Step 1: Run all verification commands**

```bash
pnpm check          # TypeScript (zero errors policy)
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Production build
```

All four must pass with zero errors.

- [ ] **Step 2: Fix any issues found**

Address each error/warning. Common expected issues:
- Unused imports from removed right-sidebar code in OrderCreatorPage
- Possible test selector updates if tests reference removed DOM structure

- [ ] **Step 3: Commit fixes**

```bash
git add -u
git commit -m "fix: address lint and type errors from layout restructure"
```

### Task 10: Visual Smoke Test on Staging

After deploying to staging (merge to main triggers auto-deploy):

- [ ] **Step 1: Verify Sales Order creation flow**

Navigate to `/sales?tab=orders&surface=sheet-native`, open a document. Verify:
- Inventory browser occupies left half
- Order document grid occupies right half
- Referral + Credit modules appear below inventory
- Whole Order Changes panel appears below order grid
- Save Draft and Finalize buttons work from both header and bottom panel
- Status cards show correct autosave/credit/finalize state

- [ ] **Step 2: Verify Sales Sheet flow**

Navigate to `/sales?tab=sales-sheets&surface=sheet-native`. Verify:
- Inventory browser on left, preview + output panel on right
- Summary cards show items, value, share status
- Save/Share/PDF/Print buttons in output panel
- Handoff strip below with all four action buttons
- Dirty state blocks share/convert correctly

- [ ] **Step 3: Verify classic fallback**

Click "Classic Composer" / "Classic" to confirm classic views still render and function. The classic SalesSheetCreatorPage should now show the handoff strip instead of the single Convert button.

- [ ] **Step 4: Responsive check**

Resize browser to tablet/mobile widths. Both layouts should collapse to single-column gracefully.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| OrderCreatorPage is 2206 lines; large layout change | All features preserved — this is a composition change, not a rewrite. Existing tests validate behavior. |
| Existing E2E tests may break on selector changes | `data-testid` attributes preserved. Run `pnpm test:e2e:deep` after merge. |
| Responsive breakpoints may not work perfectly | Tailwind grid responsive classes (`lg:grid-cols-2`) match existing pattern. Mobile falls back to stacked. |
| PricingContextPanel loses prominence | Kept as expandable section below main grid; still accessible via Customer Actions drawer. |
| FloatingOrderPreview removed | The order document grid itself is the live preview. Totals stay visible in WholeOrderChangesPanel. |

## Non-Goals

- No new tRPC endpoints
- No schema changes
- No business logic changes
- No changes to save/finalize/draft mutation logic
- No changes to autosave behavior
- No changes to the Orders queue or sheet-native pilot infrastructure
- PDF export and Live Shopping are stub actions (toast notifications) — real implementation is separate work
