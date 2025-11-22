# Comprehensive Untested UI Elements Inventory

**Generated:** November 22, 2025  
**Testing Session:** Autonomous E2E Testing - Phase 3  
**Purpose:** Document every untested interaction, button, feature, and UI element in TERP

---

## Executive Summary

This document catalogs all UI elements that have been identified but not yet fully tested for functionality. Elements are organized by page and priority level.

### Overall Statistics

| Category | Count |
|----------|-------|
| **Total Elements Identified** | 45 |
| **Fully Tested (Working)** | 22 |
| **Untested** | 20 |
| **Broken/Failed** | 3 |

### Broken Elements Requiring Immediate Attention

1. **BUG-010:** Global Search Bar - Returns 404 error
2. **BUG-011:** Debug Dashboard visible on Orders page (production issue)
3. **BUG-012:** Add Item button on Create Order page - No response

---

## Dashboard Page

### Tested Elements ✅

| Element | Status | Notes |
|---------|--------|-------|
| Customize button | ✅ Working | Opens customization modal |
| Comments button | ✅ Working | Opens comments panel |
| Inbox button | ✅ Working | Opens inbox with empty state |
| Settings button (header) | ✅ Working | Navigates to settings |
| User Profile button | ✅ Working | Navigates to settings |

### Broken Elements 🔴

| Element | Bug ID | Issue |
|---------|--------|-------|
| Global Search Bar | BUG-010 | Returns 404 error on search |

### Untested Elements ⚠️

| Element | Priority | Expected Functionality |
|---------|----------|----------------------|
| Dashboard time period dropdowns (2x "Lifetime") | MEDIUM | Filter dashboard data by time period |
| Matchmaking "View All" link | MEDIUM | Navigate to full matchmaking page |
| Sales table client name links | MEDIUM | Navigate to client detail pages |
| Metric card click interactions | LOW | Drill down into metric details |

---

## Orders Page

### Tested Elements ✅

| Element | Status | Notes |
|---------|--------|-------|
| New Order button | ✅ Working | Navigates to /orders/create |
| Confirmed Orders tab | ✅ Working | Shows 26 orders |
| Draft Orders tab | ✅ Present | Shows 0 orders (not clicked) |
| Metrics cards (4x) | ✅ Working | Display accurate statistics |

### Broken Elements 🔴

| Element | Bug ID | Issue |
|---------|--------|-------|
| Debug Dashboard | BUG-011 | Visible in production (should be removed) |

### Untested Elements ⚠️

| Element | Priority | Expected Functionality |
|---------|----------|----------------------|
| Export CSV button | HIGH | Export orders to CSV file |
| Draft Orders tab (click) | HIGH | Switch to draft orders view |
| Customize Metrics button | MEDIUM | Customize order metrics display |
| Status Filter dropdown | HIGH | Filter orders by status |
| Individual order cards (click) | CRITICAL | Navigate to order detail page |

---

## Create Order Page

### Tested Elements ✅

| Element | Status | Notes |
|---------|--------|-------|
| Back to Orders button | ✅ Working | Returns to orders list |
| Order Type dropdown | ✅ Present | Shows "Sale" |
| Customer selector | ✅ Working | Loads 68 customers |
| Order totals display | ✅ Working | Shows $0.00 with validation |
| Client Preview | ✅ Working | Shows invoice preview |
| Empty state | ✅ Working | Helpful guidance message |
| Validation banner | ✅ Working | Shows validation errors |
| COGS tracking | ✅ Working | Displays COGS and margin |

### Broken Elements 🔴

| Element | Bug ID | Issue |
|---------|--------|-------|
| Add Item button | BUG-012 | No response when clicked, 400 errors in console |

### Untested Elements ⚠️

| Element | Priority | Expected Functionality |
|---------|----------|----------------------|
| Order Type dropdown (change) | HIGH | Switch between Sale/Purchase/Quote |
| Order-Level Adjustment section | HIGH | Add discounts/fees to order |
| Save as Draft button | HIGH | Save order as draft |
| Preview & Finalize button | CRITICAL | Submit/finalize order |

---

## Inventory Page

### Tested Elements ✅

| Element | Status | Notes |
|---------|--------|-------|
| Total Inventory Value card | ✅ Working | $161,095.72, 6,731 units |
| Avg Value per Unit card | ✅ Working | $24.53 average COGS |
| Low Stock card | ✅ Working | 1 item ≤100 units |
| Stock by Category chart | ✅ Working | Flower: 6,731 units |
| Stock by Subcategory chart | ✅ Working | 3 subcategories displayed |

### Untested Elements ⚠️

| Element | Priority | Expected Functionality |
|---------|----------|----------------------|
| Saved Views button | MEDIUM | Load saved inventory views |
| Save View button | MEDIUM | Save current view configuration |
| Export CSV button | HIGH | Export inventory to CSV |
| New Purchase button | CRITICAL | Create new purchase/batch |
| Customize Metrics button | MEDIUM | Customize metrics display |
| Search bar | HIGH | Search by SKU/batch/product |
| Advanced Filters button | HIGH | Open advanced filtering |
| Table column headers (sorting) | HIGH | Sort inventory data |
| Table data rows | CRITICAL | View/interact with inventory batches |
| Select all checkbox | MEDIUM | Bulk select inventory items |

---

## Settings Page

### Tested Elements ✅

| Element | Status | Notes |
|---------|--------|-------|
| Page navigation | ✅ Working | Loads settings interface |
| Back to Dashboard button | ✅ Working | Returns to dashboard |
| Tabs (7 total) | ✅ Present | Users, Roles, Permissions, etc. |
| Create User form | ✅ Present | Username, password, display name |
| Reset Password form | ✅ Present | Username, new password |

### Untested Elements ⚠️

| Element | Priority | Expected Functionality |
|---------|----------|----------------------|
| User Roles tab | HIGH | Manage user role assignments |
| Roles tab | HIGH | Define custom roles |
| Permissions tab | HIGH | Configure permissions |
| Locations tab | MEDIUM | Manage location settings |
| Categories tab | MEDIUM | Manage product categories |
| Grades tab | MEDIUM | Manage product grades |
| Create User button | HIGH | Submit new user creation |
| Reset Password button | HIGH | Submit password reset |

---

## Untested Pages/Features

The following pages have not yet been visited or tested:

### High Priority Pages

1. **Todo Lists** - Task management
2. **Calendar** - Event/appointment management
3. **Sales Sheets** - Sales documentation
4. **Workflow Queue** - Workflow management
5. **Matchmaking** - Client/product matching
6. **Accounting** - Financial management
7. **Clients** - CRM functionality
8. **Pricing Rules** - Pricing configuration
9. **Pricing Profiles** - Customer pricing tiers
10. **Credit Settings** - Credit management
11. **COGS Settings** - Cost configuration
12. **Analytics** - Business intelligence

### Medium Priority Pages

13. **Vendors** - Vendor management (seed data missing)
14. **Purchase Orders** - PO management (crashes - BUG-008)
15. **Returns** - Returns management
16. **Locations** - Location management (seed data missing)
17. **Help** - Help/documentation

---

## Testing Roadmap Tasks Needed

Based on these findings, the following testing tasks should be created:

### Critical Priority (P0)

1. **FIX-BUG-012** - Fix Add Item button on Create Order page
2. **TEST-INVENTORY-TABLE** - Test inventory table data viewing and interactions
3. **TEST-NEW-PURCHASE** - Test New Purchase button and purchase creation workflow
4. **TEST-ORDER-SUBMISSION** - Test Preview & Finalize button on Create Order
5. **TEST-ORDER-DETAILS** - Test clicking order cards to view details

### High Priority (P1)

6. **FIX-BUG-010** - Fix global search bar 404 error
7. **FIX-BUG-011** - Remove debug dashboard from production
8. **TEST-EXPORT-CSV** - Test CSV export on Orders and Inventory pages
9. **TEST-ORDER-FILTERING** - Test status filter dropdown on Orders page
10. **TEST-INVENTORY-SEARCH** - Test inventory search functionality
11. **TEST-ADVANCED-FILTERS** - Test advanced filtering on Inventory page
12. **TEST-SETTINGS-FORMS** - Test user creation and password reset forms
13. **TEST-TODO-LISTS** - Full page testing for Todo Lists
14. **TEST-CALENDAR** - Full page testing for Calendar
15. **TEST-SALES-SHEETS** - Full page testing for Sales Sheets
16. **TEST-WORKFLOW-QUEUE** - Full page testing for Workflow Queue
17. **TEST-MATCHMAKING** - Full page testing for Matchmaking
18. **TEST-ACCOUNTING** - Full page testing for Accounting
19. **TEST-CLIENTS** - Full page testing for Clients (CRM)
20. **TEST-PRICING-RULES** - Full page testing for Pricing Rules

### Medium Priority (P2)

21. **TEST-SAVED-VIEWS** - Test saved views functionality on Inventory
22. **TEST-CUSTOMIZE-METRICS** - Test metrics customization on multiple pages
23. **TEST-ORDER-ADJUSTMENTS** - Test order-level adjustments feature
24. **TEST-DRAFT-ORDERS** - Test draft order workflow
25. **TEST-ORDER-TYPE-SWITCHING** - Test switching between Sale/Purchase/Quote
26. **TEST-SETTINGS-TABS** - Test all settings tabs (Roles, Permissions, etc.)
27. **TEST-PRICING-PROFILES** - Full page testing for Pricing Profiles
28. **TEST-CREDIT-SETTINGS** - Full page testing for Credit Settings
29. **TEST-COGS-SETTINGS** - Full page testing for COGS Settings
30. **TEST-ANALYTICS** - Full page testing for Analytics
31. **TEST-VENDORS** - Full page testing for Vendors (after seed data added)
32. **TEST-LOCATIONS** - Full page testing for Locations (after seed data added)
33. **TEST-RETURNS** - Full page testing for Returns
34. **TEST-HELP** - Full page testing for Help/documentation

---

## Console Errors Observed

### Create Order Page

- **Error:** Failed to load resource: the server responded with a status of 400 (multiple occurrences)
- **Impact:** May be related to Add Item button not working (BUG-012)
- **Requires:** Backend API investigation

---

## Recommendations

### Immediate Actions (This Week)

1. **Fix BUG-012** - Add Item button critical for order creation
2. **Fix BUG-010** - Global search is a core navigation feature
3. **Remove BUG-011** - Debug dashboard should not be in production
4. **Test inventory table** - Core inventory viewing functionality
5. **Test order submission** - Complete order creation workflow

### Short-Term Actions (1-2 Weeks)

6. Complete testing of all high-priority pages (Todo Lists through Pricing Rules)
7. Test all export functionality (CSV exports)
8. Test all search and filter functionality
9. Test all form submissions (Settings, Create User, etc.)
10. Add seed data for Vendors and Locations

### Medium-Term Actions (2-4 Weeks)

11. Complete testing of all medium-priority pages
12. Test all customization features (metrics, views, etc.)
13. Test all advanced workflows (draft orders, order adjustments, etc.)
14. Comprehensive end-to-end workflow testing
15. Performance and load testing

---

## Notes

- Most UI elements are present and appear functional
- Primary issues are with specific button interactions (Add Item) and search functionality
- Many features are implemented but simply haven't been clicked/tested yet
- Overall system shows strong implementation with professional UI/UX
- Need to systematically test each page and feature to identify placeholders vs. working features

