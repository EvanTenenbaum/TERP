# Specification: ACT-001 - Make KPI Cards Actionable

**Status:** Draft | **Priority:** HIGH | **Estimate:** 8h | **Module:** Dashboard, Clients, Inventory, Orders

---

## Problem Statement

KPI cards display important metrics but do not allow users to take action. Users see "400 Orders" or "37 Low Stock" but cannot click to see the underlying data.

**The Actionability Mandate:** Every data element must be a starting point for action.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Clicking a KPI card must filter the page's data table | Must Have |
| FR-02 | Active filter must be visually indicated on the KPI card | Must Have |
| FR-03 | Clicking same KPI card again must clear the filter | Must Have |
| FR-04 | KPI cards must show pointer cursor on hover | Must Have |
| FR-05 | Filter state must be reflected in URL for shareability | Should Have |

## KPI Card Actions by Page

| Page | KPI Card | Click Action |
|------|----------|--------------|
| **Clients** | Total Clients | Clear all filters (show all) |
| **Clients** | Active Buyers | Filter to clients with orders in last 90 days |
| **Clients** | Clients with Debt | Filter to clients with Amount Owed > 0 |
| **Inventory** | Total Value | Clear all filters (show all) |
| **Inventory** | Awaiting Intake | Filter to status = "Awaiting Intake" |
| **Inventory** | Low Stock | Filter to items below reorder point |
| **Orders** | Total Orders | Clear all filters (show all) |
| **Orders** | Pending | Filter to status = "Pending" |
| **Orders** | Packed | Filter to status = "Packed" |
| **Orders** | Shipped | Filter to status = "Shipped" |

## Technical Specification

### ActionableKPICard Component
```typescript
interface ActionableKPICardProps {
  title: string;
  value: number | string;
  filterKey: string;
  filterValue: string | null;
  isActive: boolean;
  onClick: (filterKey: string, filterValue: string | null) => void;
}

export const ActionableKPICard: React.FC<ActionableKPICardProps> = ({
  title, value, filterKey, filterValue, isActive, onClick,
}) => (
  <Card
    role="button"
    tabIndex={0}
    className={cn(
      "cursor-pointer transition-all hover:shadow-md",
      isActive && "ring-2 ring-primary"
    )}
    onClick={() => onClick(filterKey, isActive ? null : filterValue)}
    aria-pressed={isActive}
  >
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);
```

### URL State Management
```typescript
const [searchParams, setSearchParams] = useSearchParams();

const handleKPIClick = (filterKey: string, filterValue: string | null) => {
  if (filterValue === null) {
    searchParams.delete(filterKey);
  } else {
    searchParams.set(filterKey, filterValue);
  }
  setSearchParams(searchParams);
};
```

## Acceptance Criteria

- [ ] All KPI cards show pointer cursor on hover
- [ ] Clicking a KPI card filters the table
- [ ] Active KPI card has visible selected state
- [ ] Clicking active KPI card clears the filter
- [ ] Filter state is reflected in URL
- [ ] KPI cards are keyboard accessible
