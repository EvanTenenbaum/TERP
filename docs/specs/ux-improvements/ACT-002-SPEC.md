# Specification: ACT-002 - Make Data Tables Actionable

**Status:** Draft | **Priority:** HIGH | **Estimate:** 12h | **Module:** All modules with data tables

---

## Problem Statement

Data tables are primarily view-only. Users can see data but cannot efficiently take action:

1. **No row-level click actions:** Users must find small action buttons
2. **No bulk actions:** Cannot select multiple rows for batch operations
3. **No clickable cell values:** Email, phone, monetary values are static text
4. **Limited action menus:** Options are inconsistent across tables

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Clicking a table row must open the detail view | Must Have |
| FR-02 | Each row must have a checkbox for multi-select | Must Have |
| FR-03 | Bulk actions toolbar must appear when rows selected | Must Have |
| FR-04 | Email cells must open default email client | Must Have |
| FR-05 | Phone cells must be clickable (tel: on mobile, copy on desktop) | Should Have |
| FR-06 | Currency cells must show breakdown tooltip on hover | Should Have |
| FR-07 | Each row must have kebab menu with contextual actions | Must Have |

## Bulk Actions by Table

| Table | Bulk Actions |
|-------|--------------|
| **Clients** | Export Selected, Send Bulk Email, Add Tag, Remove Tag |
| **Inventory** | Export Selected, Adjust Stock, Mark for Photography, Create PO |
| **Orders** | Export Selected, Mark as Shipped, Print Invoices, Cancel |
| **Quotes** | Export Selected, Send to Clients, Convert to Orders, Delete |

## Row Actions by Table

| Table | Row Actions (Kebab Menu) |
|-------|--------------------------|
| **Clients** | View Profile, Edit, Create Quote, Create Order, View History, Send Email |
| **Inventory** | View Details, Edit, Adjust Stock, View History, Create PO |
| **Orders** | View Details, Edit, Mark Shipped, Print Invoice, Cancel, Duplicate |
| **Quotes** | View Details, Edit, Send to Client, Convert to Order, Duplicate, Delete |

## Technical Specification

### Click Zone Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ [✓] │ Client Name │ Email (link) │ Phone │ $Value │ [⋮]   │
│     │             │              │       │        │       │
│ ←A→ │ ←────────── Row Click Zone (B) ──────────→ │ ←─C─→ │
└─────────────────────────────────────────────────────────────┘

A = Checkbox (no row navigation)
B = Row click zone (navigates to detail)
C = Action menu (no row navigation)
```

### Clickable Cell Components
```typescript
// Email cell
export const EmailCell: React.FC<{ email: string }> = ({ email }) => (
  <a href={`mailto:${email}`} className="text-primary hover:underline"
     data-no-row-click onClick={(e) => e.stopPropagation()}>
    {email}
  </a>
);

// Phone cell
export const PhoneCell: React.FC<{ phone: string }> = ({ phone }) => {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile) {
    return <a href={`tel:${phone}`} data-no-row-click>{phone}</a>;
  }
  return (
    <button data-no-row-click onClick={() => {
      navigator.clipboard.writeText(phone);
      toast.success('Phone number copied');
    }}>{phone}</button>
  );
};
```

## Business Rules

| ID | Rule |
|----|------|
| BR-01 | Row click navigates to detail; action menu click does not |
| BR-02 | Bulk actions only appear when 1+ rows selected |
| BR-03 | Destructive bulk actions require confirmation |

## Acceptance Criteria

- [ ] Clicking a row navigates to detail page
- [ ] Checkboxes allow multi-select without navigation
- [ ] Bulk actions toolbar appears when rows selected
- [ ] Kebab menu shows contextual actions
- [ ] Email addresses are clickable mailto links
- [ ] Phone numbers are clickable (tel: or copy)
