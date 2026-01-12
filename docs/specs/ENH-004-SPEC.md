# Specification: ENH-004 - On-the-Fly Pricing UI

**Status:** Draft
**Priority:** HIGH
**Estimate:** 20h
**Module:** Frontend / Sales
**Dependencies:** FEAT-004 (Pricing & Credit Logic Backend)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

Sales representatives need the ability to adjust pricing during order creation - either per item, per category, or for the entire order. The UI must show the client's default pricing profile, allow adjustments, and display real-time credit limit checks.

**User Quote:**
> "The clients margin, like default pricing role is set. And tells me what it is right there, and I can adjust it on the fly, percentage, or per category, markup"

## 2. User Stories

1. **As a sales representative**, I want to see the client's pricing profile applied automatically, so that I start with correct prices.

2. **As a sales representative**, I want to adjust prices per-item or per-category, so that I can negotiate with customers.

3. **As a sales representative**, I want to see real-time credit checks, so that I don't create orders exceeding the client's limit.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Display client pricing profile summary | Must Have |
| FR-02 | Allow per-item price override | Must Have |
| FR-03 | Allow category-wide percentage adjustment | Must Have |
| FR-04 | Display real-time order total vs. available credit | Must Have |
| FR-05 | Show warning when approaching/exceeding credit limit | Must Have |
| FR-06 | Support credit override request workflow | Should Have |
| FR-07 | Log all price adjustments | Must Have |

## 4. Technical Specification

### 4.1 Component Structure

**File:** `/home/user/TERP/client/src/components/sales/PricingAdjustmentPanel.tsx`

```typescript
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

interface LineItem {
  batchId: number;
  productName: string;
  category: string;
  quantity: number;
  basePrice: number;
  currentPrice: number;
  priceOverride?: number;
}

interface PricingAdjustmentPanelProps {
  clientId: number;
  lineItems: LineItem[];
  onPriceChange: (batchId: number, newPrice: number) => void;
  onCategoryAdjustment: (category: string, adjustment: number) => void;
  onOrderAdjustment: (adjustment: number) => void;
}

export function PricingAdjustmentPanel({
  clientId,
  lineItems,
  onPriceChange,
  onCategoryAdjustment,
  onOrderAdjustment,
}: PricingAdjustmentPanelProps) {
  const [categoryAdjustments, setCategoryAdjustments] = useState<Record<string, number>>({});
  const [orderAdjustment, setOrderAdjustment] = useState<number>(0);
  const [showCreditOverrideRequest, setShowCreditOverrideRequest] = useState(false);

  // Fetch client pricing context
  const { data: pricingContext } = trpc.pricing.getClientContext.useQuery({ clientId });

  // Calculate order pricing with current adjustments
  const { data: orderPricing, refetch: recalculatePricing } = trpc.pricing.calculateOrderPricing.useQuery({
    clientId,
    lineItems: lineItems.map(li => ({
      batchId: li.batchId,
      quantity: li.quantity,
      priceOverride: li.priceOverride,
    })),
    categoryAdjustments: Object.entries(categoryAdjustments).map(([category, value]) => ({
      category,
      adjustmentMode: "PERCENT" as const,
      adjustmentValue: value,
    })),
    orderAdjustment: orderAdjustment !== 0 ? {
      adjustmentMode: "PERCENT" as const,
      adjustmentValue: orderAdjustment,
    } : undefined,
  }, {
    enabled: lineItems.length > 0,
  });

  // Get unique categories from line items
  const categories = useMemo(() => {
    return [...new Set(lineItems.map(li => li.category))];
  }, [lineItems]);

  // Credit status
  const creditStatus = useMemo(() => {
    if (!orderPricing?.creditCheck) return "unknown";
    if (orderPricing.creditCheck.exceedsCredit) return "exceeded";
    const percent = (orderPricing.orderTotal / (pricingContext?.client.availableCredit || 1)) * 100;
    if (percent > 80) return "warning";
    return "ok";
  }, [orderPricing, pricingContext]);

  const handleCategorySliderChange = (category: string, value: number) => {
    setCategoryAdjustments(prev => ({ ...prev, [category]: value }));
    onCategoryAdjustment(category, value);
  };

  const handleItemPriceEdit = (batchId: number, newPrice: number) => {
    onPriceChange(batchId, newPrice);
    recalculatePricing();
  };

  return (
    <div className="space-y-4">
      {/* Pricing Profile Summary */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Pricing Profile</h3>
            <Badge variant="outline">
              {pricingContext?.client.pricingProfileName || "Default"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            {pricingContext?.client.pricingRules?.slice(0, 3).map((rule, i) => (
              <div key={i} className="flex justify-between py-1">
                <span>{rule.ruleName}</span>
                <span className="font-mono">
                  {rule.adjustmentType.includes("MARKUP") ? "+" : "-"}
                  {rule.adjustmentValue}
                  {rule.adjustmentType.includes("PERCENT") ? "%" : "$"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Adjustments */}
      <Card>
        <CardHeader className="py-3">
          <h3 className="font-medium">Category Adjustments</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map(category => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{category}</Label>
                <span className="font-mono text-sm">
                  {categoryAdjustments[category] > 0 ? "+" : ""}
                  {categoryAdjustments[category] || 0}%
                </span>
              </div>
              <Slider
                value={[categoryAdjustments[category] || 0]}
                onValueChange={([value]) => handleCategorySliderChange(category, value)}
                min={-pricingContext?.userMaxDiscount || -15}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Order-Level Adjustment */}
      <Card>
        <CardHeader className="py-3">
          <h3 className="font-medium">Order Discount</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={orderAdjustment}
              onChange={(e) => {
                const value = Number(e.target.value);
                setOrderAdjustment(value);
                onOrderAdjustment(value);
              }}
              min={-pricingContext?.userMaxDiscount || -15}
              max={0}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              % (max {pricingContext?.userMaxDiscount || 15}% discount)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary & Credit Check */}
      <Card className={creditStatus === "exceeded" ? "border-red-500" : creditStatus === "warning" ? "border-orange-500" : ""}>
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Order Summary</h3>
            <CreditStatusIcon status={creditStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(orderPricing?.subtotal || 0)}</span>
          </div>
          {orderPricing?.categoryAdjustmentsTotal !== 0 && (
            <div className="flex justify-between text-sm">
              <span>Category Adjustments</span>
              <span className="font-mono text-orange-600">
                {formatCurrency(orderPricing?.categoryAdjustmentsTotal || 0)}
              </span>
            </div>
          )}
          {orderPricing?.orderAdjustmentTotal !== 0 && (
            <div className="flex justify-between text-sm">
              <span>Order Discount</span>
              <span className="font-mono text-orange-600">
                {formatCurrency(orderPricing?.orderAdjustmentTotal || 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(orderPricing?.orderTotal || 0)}</span>
          </div>

          {/* Credit Info */}
          <div className="pt-2 border-t mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Available Credit</span>
              <span className="font-mono">{formatCurrency(orderPricing?.creditCheck.availableCredit || 0)}</span>
            </div>
            {creditStatus === "exceeded" && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Order exceeds available credit by {formatCurrency((orderPricing?.orderTotal || 0) - (orderPricing?.creditCheck.availableCredit || 0))}
                {pricingContext?.canOverrideCredit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => setShowCreditOverrideRequest(true)}
                  >
                    Request Override
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Item Price Overrides */}
      <Card>
        <CardHeader className="py-3">
          <h3 className="font-medium">Item Prices</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {orderPricing?.lineItems.map(item => (
              <div key={item.batchId} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    x{item.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(item.basePrice)}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.finalPrice}
                    onChange={(e) => handleItemPriceEdit(item.batchId, Number(e.target.value))}
                    className="w-24 text-right font-mono"
                  />
                  <span className="text-sm text-muted-foreground">
                    = {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Override Modal */}
      {showCreditOverrideRequest && (
        <CreditOverrideRequestModal
          orderId={0} // Will be set on save
          onClose={() => setShowCreditOverrideRequest(false)}
        />
      )}
    </div>
  );
}

function CreditStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ok":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case "exceeded":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
}
```

## 5. UI/UX Specification

### 5.1 Wireframe

```
┌─────────────────────────────────────┐
│ Pricing Profile         [Premium]   │
│ ┌─────────────────────────────────┐ │
│ │ Volume Discount         -10%   │ │
│ │ Category Markup         +5%    │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Category Adjustments                │
│                                     │
│ Flower          [========|==] +5%   │
│ Concentrate     [====|======] -3%   │
│ Edible          [=====|=====] 0%    │
├─────────────────────────────────────┤
│ Order Discount                      │
│ [-5    ] % (max 15% discount)       │
├─────────────────────────────────────┤
│ Order Summary               [✓]     │
│ ┌─────────────────────────────────┐ │
│ │ Subtotal           $12,500.00  │ │
│ │ Category Adj.        -$375.00  │ │
│ │ Order Discount       -$606.25  │ │
│ │ ─────────────────────────────  │ │
│ │ Total             $11,518.75   │ │
│ │                                │ │
│ │ Available Credit   $15,000.00  │ │
│ │                      ✓ OK      │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Item Prices                         │
│ Blue Dream x10   $100 → [$95 ] $950 │
│ OG Kush x5       $120 → [$115] $575 │
└─────────────────────────────────────┘
```

### 5.2 Acceptance Criteria (UI)

- [ ] Pricing profile summary displayed
- [ ] Category sliders adjust prices in real-time
- [ ] Order discount respects user's max authority
- [ ] Credit status indicator shows correctly
- [ ] Exceeded credit shows warning with override option
- [ ] Per-item price editing works
- [ ] All changes reflected in order total

## 6. Testing Requirements

### 6.1 Unit Tests
- [ ] Price calculation logic
- [ ] Slider behavior

### 6.2 E2E Tests
- [ ] Full pricing adjustment flow

## 7. Migration & Rollout

### 7.1 Feature Flag
`FEATURE_PRICING_UI` - Enable for testing.

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
