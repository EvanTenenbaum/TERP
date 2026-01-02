# Specification: ENH-002 - Improve Empty States

**Status:** Draft | **Priority:** MEDIUM | **Estimate:** 6h | **Module:** All pages

---

## Problem Statement

Empty states across the application are inconsistent and unhelpful:
- Some show only "No data found" with no guidance
- Some have no icon or visual hierarchy
- None provide contextual next steps

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | All empty states must include an icon | Must Have |
| FR-02 | All empty states must include a title | Must Have |
| FR-03 | All empty states must include a description | Must Have |
| FR-04 | All empty states must include a primary CTA | Must Have |
| FR-05 | CTAs must be contextually appropriate | Must Have |
| FR-06 | Empty states must use consistent styling | Must Have |

## Empty State Content by Page

| Page | Icon | Title | Description | Primary CTA |
|------|------|-------|-------------|-------------|
| Quotes | FileText | No quotes yet | Create quotes to send pricing to your clients. Quotes can be converted to orders once accepted. | Create Quote |
| Orders | Package | No orders found | Orders are created when quotes are accepted or entered directly. Start by creating a quote or order. | Create Order |
| Tasks | CheckSquare | No tasks yet | Create tasks to track to-dos, follow-ups, and reminders. Tasks can be assigned to team members. | Create Task |
| Inventory | Box | No inventory | Add products to start tracking stock levels, costs, and availability. | Add Product |
| Clients | Users | No clients yet | Add your first client to start managing relationships, orders, and payments. | Add Client |
| Returns | RotateCcw | No returns | Returns will appear here when processed. Returns can be initiated from orders. | View Orders |
| Purchase Orders | Truck | No purchase orders | Create purchase orders to track inventory procurement from vendors. | Create PO |

## Technical Specification

### EmptyState Component
```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-center max-w-md mb-6">
      {description}
    </p>
    <div className="flex gap-3">
      <Button onClick={primaryAction.onClick}>
        {primaryAction.label}
      </Button>
      {secondaryAction && (
        <Button variant="outline" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </div>
  </div>
);
```

## Acceptance Criteria

- [ ] All empty states include icon, title, description, and CTA
- [ ] Empty states use consistent visual styling
- [ ] CTAs navigate to appropriate creation flows
- [ ] Empty states are centered and visually balanced
