# VIP-A-001: Actionability Implementation

**Priority:** HIGH
**Estimate:** 32 hours
**Status:** Not Started
**Depends On:** VIP-F-001

---

## Overview

Per the universal actionability mandate, every data element in the VIP Portal must be clickable and provide meaningful actions. Currently, 0% of the UI elements are actionable. This specification defines the click-through behavior for every element.

---

## The Actionability Mandate

> "There should be no table, KPI card, or widget which does not allow a user to click on it and bring up options to take action."

---

## Task 1: Make Dashboard KPIs Actionable (12h)

| KPI Card | Click Action |
|----------|--------------|
| **Outstanding Balance** | Navigate to Receivables tab, filtered to show only unpaid invoices |
| **Total Spent YTD** | Navigate to a new "Spending History" view showing monthly breakdown |
| **Available Credit** | Open a modal explaining credit terms and how to request an increase |
| **VIP Status** | Open a modal showing tier benefits and progress to next tier |
| **Credit Utilization** | Navigate to Receivables tab with a focus on the oldest debt |
| **Recent Orders** | Navigate to a "My Orders" view (if implemented) or Receivables |
| **Next Payment Due** | Navigate to Receivables tab, filtered to the specific invoice |

**Implementation Pattern:**
```tsx
<KPICard
  title="Outstanding Balance"
  value={formatCurrency(data.outstandingBalance)}
  onClick={() => {
    setActiveTab('ar');
    setArFilter({ status: 'unpaid' });
  }}
  actionHint="View unpaid invoices"
/>
```

### Task 2: Make Invoice/Bill Cards Actionable (8h)

| Element | Click Action |
|---------|--------------|
| **Invoice Card** | Expand to show line items, due date, and payment history |
| **"Download PDF" Button** | Download a PDF of the invoice (placeholder until VIP-B-001) |
| **"View Details" Button** | Open a full-page invoice detail view |
| **Status Badge** | Show a tooltip explaining the status (e.g., "PAID on 12/13/2025") |

**Invoice Detail View Content:**
- Invoice number, date, due date
- Client information
- Line items with quantities and prices
- Subtotal, tax, total
- Payment history
- Download PDF button

### Task 3: Make Catalog Products Actionable (12h)

| Element | Click Action |
|---------|--------------|
| **Product Card** | Open a product detail modal with full information |
| **"Add to Draft" Button** | Add the item to the draft interest list, show confirmation toast |
| **Category Badge** | Filter the catalog to show only products in that category |
| **Price** | If price alerts are enabled, offer to set a price alert |

**Product Detail Modal Content:**
- Product name, SKU, category
- Full description
- Current price (personalized for this client)
- Availability/quantity
- "Add to Draft" button
- "Set Price Alert" button

**Draft Interest List Actions:**
| Element | Click Action |
|---------|--------------|
| **Draft FAB** | Open the draft drawer showing all items |
| **Item in Draft** | Allow quantity adjustment or removal |
| **"Submit Interest List" Button** | Submit the draft and show confirmation |
| **"Clear Draft" Button** | Clear all items with confirmation dialog |

---

## Acceptance Criteria

1. Every KPI card on the dashboard is clickable and performs a meaningful action
2. Every invoice/bill card can be expanded to show details
3. Every product card in the catalog opens a detail modal when clicked
4. All click actions provide visual feedback (hover state, loading state, confirmation)
5. No element appears clickable but does nothing (no "dead" buttons)

---

## Testing

1. **Click Coverage Audit:** Manually verify every visible element has a click handler
2. **Accessibility Testing:** Ensure all clickable elements are keyboard-navigable
3. **User Testing:** Observe 3 users attempting to complete common tasks

---

## Dependencies

- VIP-F-001 must be complete (frontend rendering bugs fixed)
