# Specification: STAB-003 - Fix UI Bugs

**Status:** Draft | **Priority:** HIGH | **Estimate:** 4h | **Module:** UI Components

---

## Problem Statement

Several UI bugs degrade the user experience:

1. **Duplicate Navigation Items:** Sidebar occasionally renders items twice
2. **Non-Functional KPI Cards:** Cards have `role="button"` and hover states but clicking does nothing
3. **Inconsistent Empty States:** Some pages show "No quotes found" with no guidance

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Navigation items must render exactly once | Must Have |
| FR-02 | KPI cards must either be actionable OR not appear clickable | Must Have |
| FR-03 | All empty states must include description and primary CTA | Must Have |
| FR-04 | Empty state CTAs must be contextually appropriate | Should Have |

## Technical Specification

### KPI Card Fix (Option A - Recommended: Make Actionable)
```typescript
<KPICard
  title="Total Orders"
  value={400}
  onClick={() => setFilter({ status: 'all' })}
  hint="Click to view all orders"
/>
```

### Empty State Component
```typescript
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, primaryAction, secondaryAction,
}) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="text-muted-foreground mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
    <div className="flex gap-3">
      <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
      {secondaryAction && (
        <Button variant="outline" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </div>
  </div>
);
```

### Empty State Content by Page

| Page | Title | Description | Primary CTA |
|------|-------|-------------|-------------|
| Quotes | No quotes yet | Create quotes to send pricing to clients. | Create Quote |
| Orders | No orders found | Orders are created from confirmed quotes. | Go to Sales Portal |
| Tasks | No tasks yet | Create tasks to track to-dos and follow-ups. | Create Task |
| Inventory | No inventory | Add products to start tracking stock levels. | Add Product |

## Acceptance Criteria

- [ ] Navigation renders without duplicates on all pages
- [ ] KPI cards either perform action on click OR do not appear clickable
- [ ] All empty states include icon, title, description, and CTA
- [ ] Empty state CTAs navigate to appropriate action
