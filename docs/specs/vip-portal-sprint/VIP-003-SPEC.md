# VIP-003: Enhance & Differentiate

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | VIP-003 |
| **Title** | Enhance & Differentiate |
| **Priority** | MEDIUM |
| **Estimate** | 40 hours |
| **Status** | Not Started |
| **Dependencies** | VIP-002 (Core Functionality) |
| **Blocks** | None |

## Overview

This phase adds advanced features that differentiate the VIP Portal from competitors. These features are informed by user feedback from the Phase 2 validation milestone.

## Background

With the core functionality in place, this phase focuses on power-user features and workflow optimizations that provide a competitive advantage in the cannabis wholesale market.

## Objectives

1. Implement "Quick Order" by SKU for experienced buyers.
2. Build the "My Needs" marketplace feature.
3. Implement role-based access for client organizations with multiple users.
4. Develop a customizable dashboard with widgets.

## Tasks

### Task 1: Implement Quick Order by SKU - 8h

**Problem:** Experienced buyers know exactly what they want. Browsing the catalog is slow.

**Solution:** A "Quick Order" form that allows entering SKUs directly.

**Subtasks:**
1. Create Quick Order page (4h)
   - Multi-line SKU input
   - Quantity input per line
   - Real-time validation
   - "Add to Cart" button
2. Implement SKU lookup API (2h)
   - Validate SKU exists
   - Return product info and client-specific price
3. Add Quick Order to navigation (2h)
   - Prominent link in Catalog
   - Keyboard shortcut (Ctrl+K)

**Acceptance Criteria:**
- [ ] User can enter multiple SKUs with quantities.
- [ ] Invalid SKUs show error message.
- [ ] Valid SKUs show product name and price.
- [ ] "Add to Cart" adds all items to cart.

### Task 2: Build My Needs Marketplace - 12h

**Problem:** Buyers have specific product needs that may not be in the current catalog.

**Solution:** A "My Needs" feature where buyers can post what they're looking for.

**Subtasks:**
1. Create "Add Need" form (4h)
   - Product category selection
   - Quantity range
   - Price range
   - Notes field
2. Implement needs listing (4h)
   - Display user's posted needs
   - Edit/Delete functionality
   - Status tracking (Open, Matched, Fulfilled)
3. Implement admin matching (4h)
   - Admin can view all needs
   - Admin can match needs to inventory
   - Notification to buyer when matched

**Acceptance Criteria:**
- [ ] Buyer can post a new need.
- [ ] Buyer can view their posted needs.
- [ ] Buyer can edit or delete a need.
- [ ] Admin can view and match needs.
- [ ] Buyer receives notification when need is matched.

### Task 3: Implement Role-Based Access - 10h

**Problem:** Client organizations may have multiple users with different permissions.

**Solution:** Role-based access control for client portal users.

**Roles:**
| Role | Permissions |
|------|-------------|
| Admin | Full access, manage users |
| Buyer | Place orders, view invoices |
| Viewer | View only, no ordering |

**Subtasks:**
1. Create user management page (4h)
   - List users in organization
   - Invite new user
   - Assign/change roles
2. Implement permission checks (4h)
   - Restrict ordering for Viewers
   - Restrict user management for non-Admins
3. Add role indicator in UI (2h)
   - Show current user's role
   - Disable restricted actions with tooltip

**Acceptance Criteria:**
- [ ] Admin can invite new users.
- [ ] Admin can assign roles.
- [ ] Viewers cannot place orders.
- [ ] Non-Admins cannot manage users.

### Task 4: Customizable Dashboard Widgets - 10h

**Problem:** Different users have different priorities. A one-size-fits-all dashboard doesn't serve everyone.

**Solution:** A customizable dashboard where users can add, remove, and rearrange widgets.

**Available Widgets:**
- KPI Summary (default)
- Recent Orders
- Unpaid Invoices
- Wishlist
- Price Alerts
- Order Status Tracker

**Subtasks:**
1. Create widget framework (4h)
   - Drag-and-drop grid
   - Widget registry
   - Persistence (save layout)
2. Implement 6 widgets (4h)
   - Each widget is a self-contained component
   - Widgets fetch their own data
3. Add customization UI (2h)
   - "Customize" button
   - Widget picker modal
   - Reset to default option

**Acceptance Criteria:**
- [ ] User can add widgets to dashboard.
- [ ] User can remove widgets.
- [ ] User can rearrange widgets via drag-and-drop.
- [ ] Layout persists across sessions.
- [ ] "Reset to default" restores original layout.

## Testing Requirements

- [ ] Quick Order tested with valid and invalid SKUs.
- [ ] My Needs tested end-to-end (post, match, fulfill).
- [ ] Role-based access tested for all 3 roles.
- [ ] Dashboard customization tested across sessions.

## Future Considerations

Features that were considered but deferred to a future sprint:
- Push notifications for order status
- In-app chat with sales rep
- Loyalty points/rewards program
- Advanced analytics dashboard
