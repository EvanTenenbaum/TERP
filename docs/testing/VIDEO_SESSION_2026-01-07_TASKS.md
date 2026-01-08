# Video Testing Session Tasks (Jan 7, 2026)

## 🎬 Video Testing Session Issues (Jan 7, 2026)

> **Source:** User flow testing video recording analysis
> **Total Tasks:** 46
> **Documentation:** `docs/testing/VIDEO_SESSION_2026-01-07.md`


### 🐛 Critical Bugs from Video Testing

| Task | Description | Priority | Estimate | Status |
|------|-------------|----------|----------|--------|
| BUG-070 | Fix Client List Click Handlers Not Working | HIGH | 4-8h | ready |
| BUG-071 | Fix Create Client Form Submission Failure | HIGH | 4-8h | ready |
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | HIGH | 8h | ready |
| BUG-073 | Fix Live Shopping Feature Not Accessible | HIGH | 8h | ready |
| BUG-074 | Fix Spreadsheet View Empty Grid | HIGH | 8h | ready |
| BUG-075 | Fix Settings Users Tab Authentication Error | HIGH | 4-8h | ready |
| BUG-076 | Fix Search and Filter Functionality | HIGH | 16h | ready |
| BUG-077 | Fix Notification System Not Working | HIGH | 8h | ready |

### 🎨 UI/UX Issues from Video Testing

| Task | Description | Priority | Estimate | Status |
|------|-------------|----------|----------|--------|
| UX-001 | Reorganize Navigation - Dashboard Separate from Sales | HIGH | 8h | ready |
| UX-002 | Improve Form Validation Error Messages | MEDIUM | 8h | ready |
| UX-003 | Visual Distinction Between Actionable and Informational Cards | MEDIUM | 8h | ready |
| UX-004 | Add Confirmation Dialogs for Destructive Actions | MEDIUM | 4-8h | ready |
| UX-005 | Fix Horizontal Scrolling Issues | MEDIUM | 4-8h | ready |
| UX-006 | Improve Search/Filter UI Integration | MEDIUM | 8h | ready |
| UX-007 | Fix User/Permission Management UI Confusion | MEDIUM | 8h | ready |
| UX-008 | Add Quick Add Functionality for Related Entities | MEDIUM | 8h | ready |
| UX-009 | Fix Sidebar Slide Animation | LOW | 2-4h | ready |
| UX-010 | Clarify My Account vs User Settings Navigation | LOW | 2-4h | ready |
| UX-011 | Fix Two Export Buttons Issue | LOW | 1-2h | ready |
| UX-012 | Fix Period Display Formatting | LOW | 1-2h | ready |
| UX-013 | Fix Mirrored Elements Issue | LOW | 2-4h | ready |
| UX-014 | Make Optional Fields Clear | LOW | 2-4h | ready |

### 📋 Feature Tasks from Video Testing

| Task | Description | Priority | Estimate | Status |
|------|-------------|----------|----------|--------|
| FEAT-001 | Client Form Field Updates | MEDIUM | 4-8h | ready |
| FEAT-002 | Tag System Revamp for Clients and Products | HIGH | 16h | ready |
| FEAT-003 | Order Creator Quick Add Quantity Field | MEDIUM | 4-8h | ready |
| FEAT-004 | Add Dollar Amount Discount Option | MEDIUM | 4-8h | ready |
| FEAT-005 | Merge Draft and Quote Workflows | MEDIUM | 8h | ready |
| FEAT-006 | Show Product Name Instead of SKU in Order Creator | MEDIUM | 2-4h | ready |
| FEAT-007 | Add Payment Recording Against Invoices | HIGH | 16h | ready |
| FEAT-008 | Invoice Editing from Order View | MEDIUM | 8h | ready |
| FEAT-009 | Add Product Subcategories (Smalls, Trim, etc.) | MEDIUM | 8h | ready |
| FEAT-010 | Default Warehouse Selection | LOW | 2-4h | ready |
| FEAT-011 | COGS Logic and Sales Flow Integration | HIGH | 16h | ready |
| FEAT-012 | Make Grade Field Optional/Customizable | LOW | 4-8h | ready |
| FEAT-013 | Add Packaged Unit Type for Products | MEDIUM | 4-8h | ready |
| FEAT-014 | Remove Expected Delivery from Purchases | LOW | 2-4h | ready |
| FEAT-015 | Finance Status Customization | MEDIUM | 8h | ready |
| FEAT-016 | Rename Credits to Credit Settings | LOW | 1-2h | ready |
| FEAT-017 | Feature Flags Direct Access | LOW | 2-4h | ready |
| FEAT-018 | Remove Development-Only Features from User-Facing UI | MEDIUM | 4-8h | ready |
| FEAT-019 | VIP Status and Tiers Implementation | MEDIUM | 16h | ready |
| FEAT-020 | Product Subcategory and Strain Matching | MEDIUM | 8h | ready |
| FEAT-021 | Settings Changes Apply to Entire Team | MEDIUM | 4-8h | ready |
| FEAT-022 | Show Role Names Instead of Count in Permissions | LOW | 2-4h | ready |
| FEAT-023 | Notification Preferences - System vs User Level | MEDIUM | 8h | ready |
| FEAT-024 | Inline Notifications Without Page Navigation | MEDIUM | 4-8h | ready |
---

## 📝 Detailed Task Specifications (Video Testing Session)


### BUG-070: Fix Client List Click Handlers Not Working

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `client/src/pages/ClientsListPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-070.md`

**Problem:**
Clicking on client rows in the Clients list does nothing. Users cannot navigate to client details or perform actions on clients from the list view.

**Objectives:**

1. Fix click handlers on client list rows to navigate to client detail view
2. Ensure all interactive elements in the client list are properly clickable
3. Add visual feedback (hover states) to indicate clickable elements

**Deliverables:**

- [ ] Client row click navigates to client detail page
- [ ] All action buttons in client list are functional
- [ ] Hover states added for clickable elements
- [ ] E2E test for client list navigation
- [ ] Manual QA verification on production

**Source Timestamps:** 01:33, 01:44, 02:02

---

### BUG-071: Fix Create Client Form Submission Failure

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `client/src/components/clients/ClientForm.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-071.md`

**Problem:**
The Create Client form does not submit successfully. Users cannot add new clients to the system.

**Objectives:**

1. Debug and fix the client creation API endpoint
2. Ensure form validation works correctly before submission
3. Add proper error handling and user feedback

**Deliverables:**

- [ ] Client creation form submits successfully
- [ ] Proper validation errors displayed to user
- [ ] Success message and redirect after creation
- [ ] API endpoint returns appropriate responses
- [ ] E2E test for client creation flow

**Source Timestamps:** 04:08

---

### BUG-072: Fix Inventory Data Not Loading in Dashboard

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `server/routers/inventory.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-072.md`

**Problem:**
Inventory data fails to load in multiple views. Dashboard shows no inventory despite system having inventory records. Field load inventory and field fetch inventory both fail.

**Objectives:**

1. Debug inventory data fetching from database
2. Fix API endpoints for inventory loading
3. Ensure inventory displays correctly in dashboard widgets

**Deliverables:**

- [ ] Inventory data loads in dashboard
- [ ] Inventory list page displays all records
- [ ] Field load inventory works in order creator
- [ ] Field fetch inventory works in all contexts
- [ ] Performance optimization for large inventory sets

**Source Timestamps:** 00:50, 04:33, 04:56, 05:01

---

### BUG-073: Fix Live Shopping Feature Not Accessible

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `client/src/components/navigation/`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-073.md`

**Problem:**
Live Shopping feature is not accessible from the dashboard or navigation. This is a major feature that should be prominently available.

**Objectives:**

1. Add Live Shopping to main navigation sidebar
2. Ensure Live Shopping page loads correctly
3. Verify all Live Shopping functionality works

**Deliverables:**

- [ ] Live Shopping link in navigation sidebar
- [ ] Live Shopping accessible from dashboard
- [ ] Live Shopping page fully functional
- [ ] Feature flag check for Live Shopping
- [ ] Documentation for Live Shopping feature

**Source Timestamps:** 00:16, 04:18

---

### BUG-074: Fix Spreadsheet View Empty Grid

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `server/services/spreadsheetViewService.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-074.md`

**Problem:**
Spreadsheet view shows empty grid - cannot see any inventory data. Users cannot use the spreadsheet interface for bulk operations.

**Objectives:**

1. Debug spreadsheet view data loading
2. Fix data transformation for spreadsheet format
3. Ensure proper column configuration

**Deliverables:**

- [ ] Spreadsheet view displays inventory data
- [ ] All columns properly configured
- [ ] Sorting and filtering work correctly
- [ ] Bulk edit functionality works
- [ ] Export from spreadsheet view works

**Source Timestamps:** 17:09, 17:24

---

### BUG-075: Fix Settings Users Tab Authentication Error

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/_core/trpc.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-075.md`

**Problem:**
Settings Users tab shows misleading authentication error. Account settings don't seem to work properly.

**Objectives:**

1. Fix authentication check for users settings
2. Ensure proper error messages are displayed
3. Verify RBAC permissions for settings access

**Deliverables:**

- [ ] Users tab loads without auth error
- [ ] Proper permission checks in place
- [ ] Clear error messages when access denied
- [ ] Admin can manage all users
- [ ] User can view own settings

**Source Timestamps:** 17:55, 21:30

---

### BUG-076: Fix Search and Filter Functionality

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/routers/search.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-076.md`

**Problem:**
Global search and filtering is broken or inconsistent across the application. Search doesn't return results, filters don't work properly.

**Objectives:**

1. Fix global search to return relevant results
2. Implement consistent filtering across all list views
3. Add advanced filter options like date ranges and multiple criteria

**Deliverables:**

- [ ] Global search returns relevant results
- [ ] Filters work consistently across all pages
- [ ] Advanced filter UI with multiple criteria
- [ ] Search results properly ranked
- [ ] Filter state persists during session

**Source Timestamps:** 09:43, 18:06, 33:49

---

### BUG-077: Fix Notification System Not Working

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `client/src/components/notifications/`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-077.md`

**Problem:**
Notification system doesn't work - can't test notification features. Real-time notifications not appearing.

**Objectives:**

1. Debug notification delivery system
2. Ensure real-time notifications work
3. Fix notification preferences saving

**Deliverables:**

- [ ] Notifications appear in real-time
- [ ] Notification preferences save correctly
- [ ] Notification history accessible
- [ ] Mark as read functionality works
- [ ] Notification badge updates correctly

**Source Timestamps:** 32:13, 33:36, 33:43

---

### UX-001: Reorganize Navigation - Dashboard Separate from Sales

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `client/src/components/navigation/Sidebar.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-001.md`

**Problem:**
Dashboard is incorrectly grouped under Sales. Navigation hierarchy is confusing. Dashboard should be its own top-level item.

**Objectives:**

1. Move Dashboard to top-level navigation item
2. Reorganize Sales section to only include sales-related items
3. Improve navigation hierarchy clarity

**Deliverables:**

- [ ] Dashboard as standalone top-level nav item
- [ ] Sales section properly organized
- [ ] Inventory section properly organized
- [ ] Navigation matches user mental model
- [ ] Mobile navigation updated accordingly

**Source Timestamps:** 00:40, 00:33

---

### UX-002: Improve Form Validation Error Messages

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/forms/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-002.md`

**Problem:**
Validation errors are super vague. Users don't understand what's wrong with their input.

**Objectives:**

1. Create clear, specific validation error messages
2. Show errors inline next to relevant fields
3. Provide guidance on how to fix errors

**Deliverables:**

- [ ] Specific error messages for each validation rule
- [ ] Inline error display next to fields
- [ ] Error summary at top of forms
- [ ] Consistent error styling across app
- [ ] Accessibility improvements for error states

**Source Timestamps:** 05:39

---

### UX-003: Visual Distinction Between Actionable and Informational Cards

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/ui/Card.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-003.md`

**Problem:**
Cards that navigate somewhere look the same as cards that just display information. Users don't know what's clickable.

**Objectives:**

1. Create visual distinction for actionable cards
2. Add hover states for clickable cards
3. Implement consistent card styling system

**Deliverables:**

- [ ] Actionable cards have distinct styling
- [ ] Hover states indicate clickability
- [ ] Cursor changes on actionable cards
- [ ] Design system documentation updated
- [ ] All existing cards categorized and styled

**Source Timestamps:** 20:46, 20:54

---

### UX-004: Add Confirmation Dialogs for Destructive Actions

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/components/ui/ConfirmDialog.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-004.md`

**Problem:**
Clear all button has no confirmation. Delete user has no verification. Destructive actions happen immediately without warning.

**Objectives:**

1. Add confirmation dialog for all destructive actions
2. Implement consistent confirmation UX pattern
3. Allow undo where possible

**Deliverables:**

- [ ] Confirmation dialog component
- [ ] Clear all requires confirmation
- [ ] Delete actions require confirmation
- [ ] Undo functionality where applicable
- [ ] Consistent confirmation messaging

**Source Timestamps:** 09:32, 23:34

---

### UX-005: Fix Horizontal Scrolling Issues

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/styles/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-005.md`

**Problem:**
User has to scroll side to side to see content. Tables and forms extend beyond viewport.

**Objectives:**

1. Fix table layouts to fit viewport
2. Implement responsive design for wide content
3. Add horizontal scroll only where necessary

**Deliverables:**

- [ ] Tables fit within viewport
- [ ] Responsive column hiding on smaller screens
- [ ] Horizontal scroll indicator when needed
- [ ] Image thumbnails visible without scrolling
- [ ] Form layouts responsive

**Source Timestamps:** 15:05

---

### UX-006: Improve Search/Filter UI Integration

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/filters/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-006.md`

**Problem:**
Search and filter UI feels disconnected. The search box and filter options seem like separate things rather than integrated.

**Objectives:**

1. Integrate search and filter into cohesive UI
2. Improve filter discoverability
3. Make filter state visible and manageable

**Deliverables:**

- [ ] Unified search/filter component
- [ ] Active filters visible as chips/tags
- [ ] Clear all filters button
- [ ] Filter presets/saved searches
- [ ] Mobile-optimized filter UI

**Source Timestamps:** 24:33, 24:43

---

### UX-007: Fix User/Permission Management UI Confusion

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/pages/settings/UsersSettingsPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-007.md`

**Problem:**
User and permission management UI is confusing. View and Edit should be combined. Role assignment is unclear.

**Objectives:**

1. Combine view and edit into single interface
2. Clarify role and permission assignment flow
3. Improve user management discoverability

**Deliverables:**

- [ ] Unified view/edit user interface
- [ ] Clear role assignment UI
- [ ] Permission inheritance visualization
- [ ] User dropdown for assignment fields
- [ ] Bulk user management options

**Source Timestamps:** 23:08, 23:51, 24:08

---

### UX-008: Add Quick Add Functionality for Related Entities

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/forms/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-008.md`

**Problem:**
When adding a purchase and vendor doesn't exist, there's no way to quickly add the vendor. Same for other related entities.

**Objectives:**

1. Add inline quick-add for vendors in purchase form
2. Add inline quick-add for clients in order form
3. Implement consistent quick-add pattern

**Deliverables:**

- [ ] Quick add vendor from purchase form
- [ ] Quick add client from order form
- [ ] Quick add product from order form
- [ ] Modal-based quick add component
- [ ] Success feedback after quick add

**Source Timestamps:** 15:28, 15:44

---

### FEAT-001: Client Form Field Updates

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/components/clients/ClientForm.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-001.md`

**Problem:**
Client form has incorrect fields. Terry code should be Client code. Email should be removed. Need Signal username field. Address should be removed.

**Objectives:**

1. Rename Terry code to Client code
2. Remove email field from client form
3. Add Signal username field
4. Remove address field

**Deliverables:**

- [ ] Client code field (renamed from Terry code)
- [ ] Signal username field added
- [ ] Email field removed
- [ ] Address field removed
- [ ] Database migration for schema changes

**Source Timestamps:** 02:52, 03:10, 03:16, 03:23

---

### FEAT-002: Tag System Revamp for Clients and Products

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/tagManagementService.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-002.md`

**Problem:**
Tag system needs complete revamp for both clients and products. Current implementation is inadequate.

**Objectives:**

1. Redesign tag data model for flexibility
2. Implement tag management UI for clients
3. Implement tag management UI for products
4. Add tag-based filtering and search

**Deliverables:**

- [ ] New tag schema with categories
- [ ] Tag management admin interface
- [ ] Tag assignment UI for clients
- [ ] Tag assignment UI for products
- [ ] Tag-based filtering in list views

**Source Timestamps:** 03:52, 04:01

---

### FEAT-003: Order Creator Quick Add Quantity Field

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/pages/OrderCreatorPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-003.md`

**Problem:**
In quick add for orders, need a way to specify quantity directly. Currently have to add item then modify quantity separately.

**Objectives:**

1. Add quantity field to quick add interface
2. Allow quantity input before adding to order
3. Maintain quick workflow efficiency

**Deliverables:**

- [ ] Quantity input in quick add modal
- [ ] Default quantity of 1
- [ ] Keyboard shortcut for quantity
- [ ] Quantity validation
- [ ] Updated quick add UX

**Source Timestamps:** 08:49, 08:57, 09:01

---

### FEAT-004: Add Dollar Amount Discount Option

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/pages/OrderCreatorPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-004.md`

**Problem:**
Can only apply percentage discounts. Should be able to click dollar amount for fixed discounts.

**Objectives:**

1. Add dollar amount discount option
2. Toggle between percentage and fixed discount
3. Calculate totals correctly for both types

**Deliverables:**

- [ ] Dollar amount discount input
- [ ] Toggle between % and $ discount
- [ ] Correct total calculation
- [ ] Discount display in order summary
- [ ] Invoice shows discount type

**Source Timestamps:** 09:18

---

### FEAT-005: Merge Draft and Quote Workflows

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `server/routers/orders.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-005.md`

**Problem:**
There's draft and quote as separate concepts but they should be treated the same. Need to figure out how to merge them.

**Objectives:**

1. Analyze current draft vs quote implementation
2. Design unified draft/quote workflow
3. Implement merged functionality

**Deliverables:**

- [ ] Unified draft/quote status
- [ ] Clear workflow from draft to confirmed
- [ ] Quote-specific fields preserved
- [ ] Migration for existing data
- [ ] Updated UI for unified workflow

**Source Timestamps:** 06:43, 06:54, 07:03

---

### FEAT-006: Show Product Name Instead of SKU in Order Creator

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 2-4h
**Module:** `client/src/pages/OrderCreatorPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-006.md`

**Problem:**
Order creator shows SKU instead of product name. Users want to see product names.

**Objectives:**

1. Display product name as primary identifier
2. Show SKU as secondary information
3. Maintain searchability by both

**Deliverables:**

- [ ] Product name displayed prominently
- [ ] SKU shown in smaller text
- [ ] Search works for both name and SKU
- [ ] Consistent display across order views
- [ ] Print/PDF shows both name and SKU

**Source Timestamps:** 08:16, 08:20

---

### FEAT-007: Add Payment Recording Against Invoices

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/routers/finance.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-007.md`

**Problem:**
Need ability to add a payment against an invoice and have it flow through correctly to finance.

**Objectives:**

1. Implement payment recording against invoices
2. Update invoice status based on payments
3. Flow payment data to finance/accounting

**Deliverables:**

- [ ] Payment recording UI on invoice
- [ ] Partial payment support
- [ ] Payment history on invoice
- [ ] Finance ledger integration
- [ ] Payment receipt generation

**Source Timestamps:** 05:58, 06:04

---

### FEAT-008: Invoice Editing from Order View

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/orders/InvoiceDetail.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-008.md`

**Problem:**
Should be able to edit the actual invoice from the order view. Currently have to navigate elsewhere.

**Objectives:**

1. Add inline invoice editing capability
2. Maintain audit trail for changes
3. Ensure proper permissions for editing

**Deliverables:**

- [ ] Edit invoice button on order view
- [ ] Inline editing for invoice fields
- [ ] Audit log for invoice changes
- [ ] Permission check for editing
- [ ] Validation before save

**Source Timestamps:** 06:10, 06:18

---

### FEAT-009: Add Product Subcategories (Smalls, Trim, etc.)

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `server/schema.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-009.md`

**Problem:**
Need optional subcategories for products like flower->smalls, flower->trim. Grade alone isn't sufficient.

**Objectives:**

1. Design subcategory schema
2. Implement subcategory management
3. Add subcategory to product forms

**Deliverables:**

- [ ] Subcategory database schema
- [ ] Subcategory admin management
- [ ] Subcategory selection in product form
- [ ] Subcategory filtering in lists
- [ ] Migration for existing products

**Source Timestamps:** 11:52, 12:01

---

### FEAT-010: Default Warehouse Selection

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/inventory/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-010.md`

**Problem:**
Warehouse should default to main warehouse. Currently no default is set.

**Objectives:**

1. Set default warehouse for new inventory
2. Allow user preference for default warehouse
3. Handle single-warehouse scenarios

**Deliverables:**

- [ ] Default warehouse setting
- [ ] User preference for default
- [ ] Auto-select when single warehouse
- [ ] Clear indicator of selected warehouse
- [ ] Warehouse validation on save

**Source Timestamps:** 12:21, 12:27

---

### FEAT-011: COGS Logic and Sales Flow Integration

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/services/pricingEngine.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-011.md`

**Problem:**
Need to figure out COGS logic - how it shows up in sales, whether as range or specific value, and how setting COGS in one sale can optionally apply to all future transactions.

**Objectives:**

1. Define COGS display logic in sales
2. Implement COGS setting per transaction
3. Add option to apply COGS to all future transactions

**Deliverables:**

- [ ] COGS display in sales interface
- [ ] Per-transaction COGS override
- [ ] Apply to future transactions option
- [ ] COGS range display when applicable
- [ ] Finance integration for COGS

**Source Timestamps:** 12:56, 13:06, 13:13, 13:35, 13:48

---

### FEAT-012: Make Grade Field Optional/Customizable

**Status:** ready
**Priority:** LOW
**Estimate:** 4-8h
**Module:** `client/src/components/inventory/ProductForm.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-012.md`

**Problem:**
Grade field shouldn't always be required. Should be customizable whether it's required or not.

**Objectives:**

1. Make grade field optionally required
2. Add setting to control grade requirement
3. Handle products without grades

**Deliverables:**

- [ ] Grade field optional by default
- [ ] Admin setting for grade requirement
- [ ] Graceful handling of null grades
- [ ] Filter/sort works with null grades
- [ ] Migration for existing data

**Source Timestamps:** 16:02, 16:06

---

### FEAT-013: Add Packaged Unit Type for Products

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `server/schema.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-013.md`

**Problem:**
Units need to include packaged unit type for edibles, vapes, concentrates. Current units are only bulk.

**Objectives:**

1. Add packaged unit type to schema
2. Implement unit type selection in forms
3. Handle inventory tracking for packaged items

**Deliverables:**

- [ ] Packaged unit type in schema
- [ ] Unit type selection in product form
- [ ] Inventory tracking by unit type
- [ ] Conversion between unit types
- [ ] Reporting by unit type

**Source Timestamps:** 30:07, 30:20

---

### FEAT-014: Remove Expected Delivery from Purchases

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/purchases/PurchaseForm.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-014.md`

**Problem:**
Expected delivery field doesn't make sense for purchases that are already in-house.

**Objectives:**

1. Remove expected delivery field
2. Clean up purchase form
3. Handle existing data gracefully

**Deliverables:**

- [ ] Expected delivery field removed
- [ ] Form layout updated
- [ ] Migration to null existing values
- [ ] Documentation updated
- [ ] Tests updated

**Source Timestamps:** 16:46, 16:57

---

### FEAT-015: Finance Status Customization

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/pages/settings/FinanceSettingsPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-015.md`

**Problem:**
Finance statuses should be customizable. Users want to define their own status values.

**Objectives:**

1. Implement customizable finance statuses
2. Add status management UI
3. Ensure backward compatibility

**Deliverables:**

- [ ] Status management interface
- [ ] Custom status creation
- [ ] Status color/icon customization
- [ ] Default status set
- [ ] Migration for existing statuses

**Source Timestamps:** 18:44

---

### FEAT-016: Rename Credits to Credit Settings

**Status:** ready
**Priority:** LOW
**Estimate:** 1-2h
**Module:** `client/src/pages/settings/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-016.md`

**Problem:**
Credits section should be called Credit Settings for clarity.

**Objectives:**

1. Rename Credits to Credit Settings
2. Update all references
3. Maintain URL compatibility

**Deliverables:**

- [ ] Section renamed to Credit Settings
- [ ] Navigation updated
- [ ] Breadcrumbs updated
- [ ] URL redirect from old path
- [ ] Documentation updated

**Source Timestamps:** 19:06

---

### FEAT-017: Feature Flags Direct Access

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/pages/settings/FeatureFlagsPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-017.md`

**Problem:**
When clicking Feature Flags, should go directly to the page instead of requiring another click.

**Objectives:**

1. Direct navigation to feature flags page
2. Remove intermediate step
3. Improve settings navigation

**Deliverables:**

- [ ] Direct link to feature flags
- [ ] Navigation updated
- [ ] Consistent with other settings pages
- [ ] Mobile navigation updated
- [ ] Breadcrumb trail correct

**Source Timestamps:** 27:14, 27:20

---

### FEAT-018: Remove Development-Only Features from User-Facing UI

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/pages/settings/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-018.md`

**Problem:**
Some features like seeding defaults and new flag creation should not be visible to regular users.

**Objectives:**

1. Hide development features from regular users
2. Add proper permission checks
3. Create developer-only section

**Deliverables:**

- [ ] Development features hidden by default
- [ ] Super admin access to dev features
- [ ] Permission checks on dev endpoints
- [ ] Clear separation of user/dev settings
- [ ] Documentation for dev features

**Source Timestamps:** 27:51, 27:57, 28:00

---

### FEAT-019: VIP Status and Tiers Implementation

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 16h
**Module:** `server/services/vipService.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-019.md`

**Problem:**
VIP status and tiers need to be figured out. Should be more leaderboard focused. Need to confirm all VIP functionality works.

**Objectives:**

1. Design VIP tier system
2. Implement leaderboard functionality
3. Create VIP status management

**Deliverables:**

- [ ] VIP tier definitions
- [ ] Leaderboard page
- [ ] VIP status calculation
- [ ] Tier benefits configuration
- [ ] VIP badge display

**Source Timestamps:** 28:31, 28:39, 28:51

---

### FEAT-020: Product Subcategory and Strain Matching

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `server/services/productMatchingService.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-020.md`

**Problem:**
Product matching should include subcategory and strain. Current matching is insufficient.

**Objectives:**

1. Add subcategory to matching algorithm
2. Add strain to matching algorithm
3. Improve match accuracy

**Deliverables:**

- [ ] Subcategory matching
- [ ] Strain matching
- [ ] Match confidence score
- [ ] Match suggestions UI
- [ ] Bulk matching tool

**Source Timestamps:** 29:37, 29:51

---

### FEAT-021: Settings Changes Apply to Entire Team

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `server/services/settingsService.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-021.md`

**Problem:**
Settings changes should be explicit that they apply to entire team/user base, not just individual user.

**Objectives:**

1. Clarify team vs user settings
2. Add confirmation for team-wide changes
3. Separate personal preferences

**Deliverables:**

- [ ] Team settings section
- [ ] Personal settings section
- [ ] Confirmation for team changes
- [ ] Clear labeling of scope
- [ ] Audit log for team changes

**Source Timestamps:** 26:41, 26:47, 26:52

---

### FEAT-022: Show Role Names Instead of Count in Permissions

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/pages/settings/PermissionsPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-022.md`

**Problem:**
Instead of showing number of roles with access, should list which roles have access.

**Objectives:**

1. Display role names instead of count
2. Show role list on hover or expand
3. Improve permission visibility

**Deliverables:**

- [ ] Role names displayed
- [ ] Expandable role list
- [ ] Tooltip with full list
- [ ] Quick role assignment
- [ ] Permission matrix view

**Source Timestamps:** 25:09, 25:13

---

### FEAT-023: Notification Preferences - System vs User Level

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/pages/settings/NotificationsPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-023.md`

**Problem:**
Need distinction between system notification preferences and individual user preferences.

**Objectives:**

1. Separate system and user notification settings
2. Allow admins to set system defaults
3. Let users override with personal preferences

**Deliverables:**

- [ ] System notification defaults
- [ ] User notification overrides
- [ ] Clear UI separation
- [ ] Inheritance visualization
- [ ] Bulk notification settings

**Source Timestamps:** 31:33, 31:40

---

### FEAT-024: Inline Notifications Without Page Navigation

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/components/notifications/NotificationPanel.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-024.md`

**Problem:**
Don't want to click through to notifications page. Notifications should just be there inline.

**Objectives:**

1. Show notifications in dropdown panel
2. Allow actions without leaving current page
3. Maintain notification history access

**Deliverables:**

- [ ] Notification dropdown panel
- [ ] Inline notification actions
- [ ] Mark as read without navigation
- [ ] Quick dismiss functionality
- [ ] Link to full history when needed

**Source Timestamps:** 31:26, 31:33

---

### UX-009: Fix Sidebar Slide Animation

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/navigation/Sidebar.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-009.md`

**Problem:**
Sidebar design seems funky - constantly out. Maybe meant to slide in and out but doesn't work properly.

**Objectives:**

1. Fix sidebar animation
2. Ensure consistent open/close behavior
3. Improve mobile sidebar UX

**Deliverables:**

- [ ] Smooth slide animation
- [ ] Consistent toggle behavior
- [ ] Mobile-friendly sidebar
- [ ] Persist sidebar state
- [ ] Keyboard shortcut for toggle

**Source Timestamps:** 32:42, 32:48

---

### UX-010: Clarify My Account vs User Settings Navigation

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/navigation/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-010.md`

**Problem:**
Confusing that My Account is in one place, user settings in another, and there's also a link that goes to the same place.

**Objectives:**

1. Consolidate account/settings navigation
2. Create clear hierarchy
3. Remove duplicate links

**Deliverables:**

- [ ] Single account settings entry point
- [ ] Clear personal vs admin settings
- [ ] Remove duplicate navigation
- [ ] Consistent terminology
- [ ] Updated help documentation

**Source Timestamps:** 33:04, 33:09

---

### UX-011: Fix Two Export Buttons Issue

**Status:** ready
**Priority:** LOW
**Estimate:** 1-2h
**Module:** `client/src/components/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-011.md`

**Problem:**
There are two export buttons which doesn't make sense.

**Objectives:**

1. Remove duplicate export button
2. Consolidate export functionality
3. Ensure single clear export action

**Deliverables:**

- [ ] Single export button
- [ ] Export options in dropdown
- [ ] Consistent export location
- [ ] Export format selection
- [ ] Export confirmation

**Source Timestamps:** 20:30

---

### UX-012: Fix Period Display Formatting

**Status:** ready
**Priority:** LOW
**Estimate:** 1-2h
**Module:** `client/src/components/finance/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-012.md`

**Problem:**
The way period is presented is strange in finance views.

**Objectives:**

1. Standardize period display format
2. Use consistent date formatting
3. Improve readability

**Deliverables:**

- [ ] Consistent period format
- [ ] Clear date range display
- [ ] Locale-aware formatting
- [ ] Period selector improvement
- [ ] Documentation of format

**Source Timestamps:** 20:11, 20:14

---

### UX-013: Fix Mirrored Elements Issue

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-013.md`

**Problem:**
Some elements mirror each other which is driving user nuts. Need to fix the mirroring.

**Objectives:**

1. Identify mirrored elements
2. Fix unintended mirroring
3. Ensure proper element independence

**Deliverables:**

- [ ] Mirrored elements identified
- [ ] Independent element state
- [ ] No unintended synchronization
- [ ] Proper component isolation
- [ ] Regression tests

**Source Timestamps:** 31:04, 31:14

---

### UX-014: Make Optional Fields Clear

**Status:** ready
**Priority:** LOW
**Estimate:** 2-4h
**Module:** `client/src/components/forms/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-014.md`

**Problem:**
Should be clear when fields are optional. If you don't set something, it should be obvious that's okay.

**Objectives:**

1. Mark optional fields clearly
2. Use consistent optional indicator
3. Improve form clarity

**Deliverables:**

- [ ] Optional field indicator
- [ ] Consistent (optional) label
- [ ] Required field indicator
- [ ] Form validation messages
- [ ] Help text for optional fields

**Source Timestamps:** 30:36, 30:41

---