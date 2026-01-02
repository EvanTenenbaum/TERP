# VIP-002: Core Functionality (Mobile-First)

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | VIP-002 |
| **Title** | Core Functionality (Mobile-First) |
| **Priority** | HIGH |
| **Estimate** | 48 hours |
| **Status** | Not Started |
| **Dependencies** | VIP-001 (Stabilize & Secure) |
| **Blocks** | VIP-003 |

## Overview

This phase builds the essential B2B portal experience with a mobile-first design. It implements the actionability mandate, ensuring every data element is clickable with meaningful actions.

## Background

Research shows 83% of B2B buyers prefer digital ordering, and 50% of web traffic is mobile. The VIP Portal must be mobile-first to meet these expectations. Additionally, the actionability mandate requires that no data element be a dead end.

## Objectives

1. Implement mobile-first navigation (bottom nav or hybrid approach).
2. Make all KPI cards actionable with drill-down navigation.
3. Make all invoice cards actionable with detail views and payment options.
4. Build the core ordering workflow (Catalog → Cart → Checkout).
5. Implement "Reorder from History" functionality.

## Design Principles

### Mobile-First Navigation

**Option A: Bottom Navigation Bar (4 icons)**
- Home (Dashboard)
- Catalog (Browse & Order)
- Orders (History & Tracking)
- Account (Invoices, Profile)

**Option B: Hybrid Approach**
- Hamburger menu for full navigation
- Floating action button for primary action (New Order)
- Context-aware bottom bar on key pages

**Recommendation:** Option B (Hybrid) is recommended based on red hat analysis. The portal has 6+ sections that don't fit cleanly into 4 icons.

### Actionability Patterns

| Element Type | Click Action | Long-Press Action |
|--------------|--------------|-------------------|
| KPI Card | Navigate to filtered list | Show quick stats tooltip |
| Invoice Card | Open invoice detail modal | Show action menu (Pay, Download) |
| Product Card | Open product detail | Add to cart |
| Order Card | Open order detail | Reorder |

## Tasks

### Task 1: Implement Mobile-First Navigation - 12h

**Subtasks:**
1. Create responsive navigation component (4h)
   - Hamburger menu for mobile
   - Sidebar for desktop
   - Smooth transitions between states
2. Implement floating action button (2h)
   - "New Order" on Catalog page
   - "Pay Now" on Receivables page
3. Add context-aware bottom bar (4h)
   - Cart summary on Catalog
   - Filter shortcuts on list pages
4. Deploy behind feature flag (2h)

**Acceptance Criteria:**
- [ ] Navigation works on mobile (375px) and desktop (1440px).
- [ ] Hamburger menu opens/closes smoothly.
- [ ] FAB is visible and functional on relevant pages.
- [ ] Feature flag allows rollback to old navigation.

### Task 2: Implement Actionable Dashboard - 10h

**Subtasks:**
1. Make KPI cards clickable (4h)
   - Balance Due → Receivables (filtered: unpaid)
   - YTD Spend → Spending history page
   - Credit → Credit detail modal
   - VIP Status → Tier benefits modal
2. Implement Quick Actions (3h)
   - "New Order" → Catalog
   - "Pay Balance" → Receivables
   - "Contact Support" → Support modal
3. Add personalized suggestions (3h)
   - "You have X unpaid invoices"
   - "Reorder your last order?"
   - "New products in your category"

**Acceptance Criteria:**
- [ ] All 4 KPI cards are clickable.
- [ ] Clicking KPI navigates to correct page with filter applied.
- [ ] Quick Actions buttons are functional.
- [ ] Personalized suggestions are displayed.

### Task 3: Implement Actionable Receivables - 10h

**Subtasks:**
1. Create invoice detail modal (4h)
   - Full invoice information
   - Line items
   - Payment history
2. Add "Pay Now" functionality (4h)
   - Payment method selection
   - Amount input (partial payment)
   - Confirmation flow
3. Add "Download PDF" functionality (2h)
   - Generate PDF on demand
   - Download to device

**Acceptance Criteria:**
- [ ] Clicking invoice card opens detail modal.
- [ ] "Pay Now" button initiates payment flow.
- [ ] "Download PDF" downloads invoice as PDF.
- [ ] Invoice status updates after payment.

### Task 4: Build Core Ordering Workflow - 12h

**Subtasks:**
1. Enhance Catalog with cart functionality (4h)
   - Add to cart button on product cards
   - Quantity selector
   - Cart badge in header
2. Implement Cart page (4h)
   - List of items with quantities
   - Remove item functionality
   - Subtotal calculation
3. Implement Checkout flow (4h)
   - Shipping address selection
   - Payment terms selection
   - Order confirmation

**Acceptance Criteria:**
- [ ] User can add products to cart.
- [ ] Cart displays correct items and totals.
- [ ] User can complete checkout.
- [ ] Order is created in system.

### Task 5: Implement Reorder from History - 4h

**Subtasks:**
1. Add "Reorder" button to order cards (2h)
2. Implement reorder logic (2h)
   - Add all items from previous order to cart
   - Handle out-of-stock items gracefully

**Acceptance Criteria:**
- [ ] "Reorder" button is visible on past orders.
- [ ] Clicking "Reorder" adds items to cart.
- [ ] Out-of-stock items show warning.

## Testing Requirements

- [ ] All features tested on mobile viewport (375px).
- [ ] All features tested on tablet viewport (768px).
- [ ] All features tested on desktop viewport (1440px).
- [ ] Actionability verified for all clickable elements.
- [ ] Ordering workflow tested end-to-end.

## User Validation Milestone

After completing this phase, conduct a brief usability test with 3-5 real clients:
1. Can they find and complete a new order?
2. Can they pay an invoice?
3. Is the navigation intuitive on their device?

Document findings and adjust Phase 3 priorities accordingly.
