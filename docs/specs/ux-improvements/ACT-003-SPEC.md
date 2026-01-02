# Specification: ACT-003 - Make Widgets Actionable

**Status:** Draft | **Priority:** HIGH | **Estimate:** 8h | **Module:** Dashboard

---

## Problem Statement

Dashboard widgets display valuable summary data but are dead ends. Users see "Top Clients" or "Inventory by Category" but cannot drill down to see underlying data or take action.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Every row in a widget table must be clickable | Must Have |
| FR-02 | Every segment in a widget chart must be clickable | Must Have |
| FR-03 | Every numeric value in a widget must be clickable | Must Have |
| FR-04 | Clicks must navigate to relevant page with appropriate filters | Must Have |
| FR-05 | Hover states must indicate clickability | Must Have |

## Widget Actions

| Widget | Clickable Element | Action |
|--------|-------------------|--------|
| **CashFlow** | "Cash Collected" value | Navigate to `/accounting/payments?period=today` |
| **CashFlow** | "Cash Spent" value | Navigate to `/accounting/bills?period=today` |
| **Top Clients** | Client row | Navigate to `/clients/{id}` |
| **Top Clients** | "View All" | Navigate to `/clients?sort=totalSpent` |
| **Transaction Snapshot** | "Sales" value | Navigate to `/orders?period={today/week}` |
| **Inventory Snapshot** | Category row | Navigate to `/inventory?category={category}` |
| **Inventory Snapshot** | Subcategory row | Navigate to `/inventory?subcategory={subcategory}` |
| **Total Debt** | "Owed to Me" value | Navigate to `/clients?filter=hasDebt` |
| **Total Debt** | "I Owe Vendors" value | Navigate to `/accounting/bills?status=unpaid` |
| **Sales Comparison** | Period row | Navigate to `/orders?period={period}` |
| **Matchmaking** | Opportunity card | Navigate to `/matchmaking?id={id}` |

## Technical Specification

### Clickable Widget Row Component
```typescript
interface WidgetRowProps {
  children: React.ReactNode;
  href: string;
}

export const WidgetRow: React.FC<WidgetRowProps> = ({ children, href }) => {
  const navigate = useNavigate();
  return (
    <div
      role="link"
      tabIndex={0}
      className="cursor-pointer hover:bg-muted/50 transition-colors rounded px-2 py-1"
      onClick={() => navigate(href)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(href)}
    >
      {children}
    </div>
  );
};
```

### Clickable Value Component
```typescript
interface ClickableValueProps {
  value: string | number;
  href: string;
  format?: 'currency' | 'number' | 'percent';
}

export const ClickableValue: React.FC<ClickableValueProps> = ({ value, href, format }) => {
  const navigate = useNavigate();
  const formattedValue = format === 'currency' 
    ? formatCurrency(value as number)
    : formatNumber(value as number);
  
  return (
    <button
      className="font-bold text-2xl hover:text-primary hover:underline"
      onClick={() => navigate(href)}
    >
      {formattedValue}
    </button>
  );
};
```

## User Flow

```
User views Dashboard → Hovers over "Flower" in Inventory widget →
  → Row highlights, cursor changes to pointer →
  → User clicks → Navigates to /inventory?category=Flower →
  → Inventory page loads with Flower filter pre-applied
```

## Acceptance Criteria

- [ ] All widget table rows are clickable
- [ ] All chart segments are clickable
- [ ] All numeric values are clickable
- [ ] Hover states clearly indicate clickability
- [ ] Clicks navigate to correct filtered pages
- [ ] Keyboard navigation works (Tab + Enter)
