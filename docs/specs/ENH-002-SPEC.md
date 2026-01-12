# Specification: ENH-002 - Build Client Info Pod

**Status:** Draft
**Priority:** HIGH
**Estimate:** 12h
**Module:** Frontend / Sales
**Dependencies:** FEAT-002 (Vendor Context API)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

When sales reps select a client during order creation, they need quick access to contextual information about that client, including purchase history, pricing rules, and saved filter views. Currently this information requires navigating to a separate client profile page, breaking the workflow.

**User Quote:**
> "Maybe it was just like a little client box that has like the, their role pricing and then also their. Invoice, or their purchase history, and then he saved, like, filter short views, but that should be something collapsible."

## 2. User Stories

1. **As a sales representative**, I want to see a client's pricing profile when I select them, so that I understand how their prices are calculated.

2. **As a sales representative**, I want to see a client's purchase history at a glance, so that I can reference past orders.

3. **As a sales representative**, I want to collapse the client info when not needed, so that I have more screen space for inventory browsing.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Pod must display client name and basic info | Must Have |
| FR-02 | Pod must display pricing profile name and key rules | Must Have |
| FR-03 | Pod must display recent purchase history (last 5 orders) | Must Have |
| FR-04 | Pod must be collapsible/expandable | Must Have |
| FR-05 | Pod must display credit limit and available credit | Must Have |
| FR-06 | Pod must display saved filter shortcuts | Should Have |
| FR-07 | Pod must update when client selection changes | Must Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Purchase history shows most recent first | Latest order at top |
| BR-02 | Credit warning if < 20% available | Yellow indicator |
| BR-03 | Credit critical if exceeds limit | Red indicator |
| BR-04 | Collapsed state persists per session | User preference |

## 4. Technical Specification

### 4.1 Component Structure

**File:** `/home/user/TERP/client/src/components/clients/ClientInfoPod.tsx`

```typescript
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User, CreditCard, History, Tag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

interface ClientInfoPodProps {
  clientId: number;
  defaultExpanded?: boolean;
  onFilterSelect?: (filterId: string) => void;
}

export function ClientInfoPod({
  clientId,
  defaultExpanded = true,
  onFilterSelect,
}: ClientInfoPodProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Fetch client pricing context
  const { data: pricingContext, isLoading: pricingLoading } =
    trpc.pricing.getClientContext.useQuery({ clientId });

  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } =
    trpc.orders.getByClient.useQuery({
      clientId,
      limit: 5,
      status: ["DELIVERED", "COMPLETED"],
    });

  // Fetch saved filters
  const { data: savedFilters } = trpc.userPreferences.getSavedFilters.useQuery({
    context: "sales_sheet",
    clientId,
  });

  const client = pricingContext?.client;
  const isLoading = pricingLoading || ordersLoading;

  if (!clientId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-muted-foreground">
          Select a client to view their information
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <ClientInfoPodSkeleton />;
  }

  // Credit status calculation
  const creditPercent = client?.creditLimit
    ? (client.availableCredit / client.creditLimit) * 100
    : 100;
  const creditStatus = creditPercent < 0 ? "critical" : creditPercent < 20 ? "warning" : "normal";

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="transition-all">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{client?.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {client?.pricingProfileName && (
                      <Badge variant="outline" className="text-xs">
                        {client.pricingProfileName}
                      </Badge>
                    )}
                    <CreditIndicator status={creditStatus} available={client?.availableCredit} />
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Credit & Pricing Section */}
            <div className="grid grid-cols-2 gap-4">
              <InfoBlock
                icon={<CreditCard className="h-4 w-4" />}
                label="Credit Available"
                value={formatCurrency(client?.availableCredit || 0)}
                subtext={`of ${formatCurrency(client?.creditLimit || 0)} limit`}
                status={creditStatus}
              />
              <InfoBlock
                icon={<Tag className="h-4 w-4" />}
                label="Pricing Profile"
                value={client?.pricingProfileName || "Default"}
                subtext={`${client?.pricingRules?.length || 0} rules applied`}
              />
            </div>

            {/* Pricing Rules Summary */}
            {client?.pricingRules && client.pricingRules.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Active Pricing Rules</h4>
                <div className="space-y-1">
                  {client.pricingRules.slice(0, 3).map((rule, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{rule.ruleName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatAdjustment(rule.adjustmentType, rule.adjustmentValue)}
                      </Badge>
                    </div>
                  ))}
                  {client.pricingRules.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{client.pricingRules.length - 3} more rules
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Purchase History */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4" />
                <h4 className="text-sm font-medium">Recent Orders</h4>
              </div>
              {recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                    >
                      <div>
                        <span className="font-mono">{order.orderNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <span className="font-medium">{formatCurrency(order.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent orders</p>
              )}
            </div>

            {/* Saved Filters */}
            {savedFilters && savedFilters.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Quick Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant="outline"
                      size="sm"
                      onClick={() => onFilterSelect?.(filter.id)}
                    >
                      {filter.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Helper components
function CreditIndicator({ status, available }: { status: string; available?: number }) {
  const colorClass = {
    critical: "text-red-600 bg-red-100",
    warning: "text-orange-600 bg-orange-100",
    normal: "text-green-600 bg-green-100",
  }[status] || "text-gray-600 bg-gray-100";

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>
      {formatCurrency(available || 0)} available
    </span>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  subtext,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  status?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium ${status === "critical" ? "text-red-600" : status === "warning" ? "text-orange-600" : ""}`}>
          {value}
        </p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

function formatAdjustment(type: string, value: number): string {
  const sign = type.includes("MARKUP") ? "+" : "-";
  const unit = type.includes("PERCENT") ? "%" : "$";
  return `${sign}${value}${unit}`;
}

function ClientInfoPodSkeleton() {
  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
```

### 4.2 Integration with Sales Sheet

**File:** `/home/user/TERP/client/src/pages/SalesSheet.tsx`

```typescript
import { ClientInfoPod } from "@/components/clients/ClientInfoPod";

// In layout:
<div className="grid grid-cols-12 gap-4">
  {/* Client Info Pod - collapsible sidebar */}
  <div className="col-span-3">
    <ClientInfoPod
      clientId={selectedClient?.id}
      defaultExpanded={true}
      onFilterSelect={handleQuickFilter}
    />
  </div>

  {/* Main inventory browser */}
  <div className="col-span-9">
    <InventoryBrowserTable
      clientId={selectedClient?.id}
      // ...
    />
  </div>
</div>
```

## 5. UI/UX Specification

### 5.1 User Flow

```
[User opens Sales Sheet]
    → [Select client from dropdown]
    → [Client Info Pod populates with client data]
    → [User can collapse pod to maximize space]
    → [User can click quick filter to apply saved filters]
    → [User can view recent order history]
```

### 5.2 Wireframe - Expanded State

```
┌─────────────────────────────────────┐
│ 👤 Acme Corp                    [▲] │
│    Premium Tier | $15,000 available │
├─────────────────────────────────────┤
│ 💳 Credit Available     🏷️ Profile  │
│    $15,000              Premium     │
│    of $50,000 limit     3 rules     │
├─────────────────────────────────────┤
│ Active Pricing Rules                │
│ ┌─────────────────────────────────┐ │
│ │ Volume Discount        -10%    │ │
│ │ Premium Markup         +5%     │ │
│ │ Flower Special         -$2/oz  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📜 Recent Orders                    │
│ ┌─────────────────────────────────┐ │
│ │ ORD-2024-001  01/10  $5,200    │ │
│ │ ORD-2024-002  01/08  $3,800    │ │
│ │ ORD-2024-003  01/05  $7,100    │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Quick Filters                       │
│ [Favorites] [Flower Only] [High $]  │
└─────────────────────────────────────┘
```

### 5.3 Wireframe - Collapsed State

```
┌─────────────────────────────────────┐
│ 👤 Acme Corp                    [▼] │
│    Premium Tier | $15,000 available │
└─────────────────────────────────────┘
```

### 5.4 Acceptance Criteria (UI)

- [ ] Pod displays client name and basic info
- [ ] Credit indicator shows available credit with color coding
- [ ] Pricing profile name and rule count displayed
- [ ] Up to 3 pricing rules shown with values
- [ ] Last 5 orders shown with date and total
- [ ] Saved filters shown as clickable buttons
- [ ] Collapse/expand works with smooth animation
- [ ] Pod updates when client selection changes
- [ ] Loading skeleton shown during data fetch

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Client with no orders | Show "No recent orders" message |
| Client with no pricing profile | Show "Default" profile |
| Client with no credit limit | Show "Unlimited" |
| Credit exceeded (negative) | Show red warning indicator |
| No saved filters | Hide quick filters section |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Credit indicator color logic
- [ ] Pricing rule formatting
- [ ] Collapsed state persistence

### 7.2 Integration Tests

- [ ] Data fetching from all endpoints
- [ ] Client change updates all sections

### 7.3 E2E Tests

- [ ] Full pod interaction flow
- [ ] Quick filter application

## 8. Migration & Rollout

### 8.1 Component Addition

Add new component to Sales Sheet layout.

### 8.2 Feature Flag

`FEATURE_CLIENT_INFO_POD` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Pod hidden from layout
3. No data impact

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User engagement | 60% expand pod | Analytics |
| Quick filter usage | 20% of sessions | Click tracking |
| Load time | < 300ms | Performance monitoring |

## 10. Open Questions

- [ ] Should we show more than 5 recent orders with pagination?
- [ ] Should we add a "View Full Profile" link?

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
