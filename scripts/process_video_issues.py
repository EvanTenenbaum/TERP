#!/usr/bin/env python3
"""
Process video testing issues into consolidated roadmap tasks.
Groups related issues, deduplicates, and generates proper task format.
"""

import json
import re
from collections import defaultdict

def load_issues():
    """Load the issues from JSON file."""
    with open('/home/ubuntu/TERP_Analysis/TERP_All_Issues.json', 'r') as f:
        return json.load(f)

def consolidate_issues(data):
    """
    Consolidate 139 raw issues into actionable roadmap tasks.
    Groups by area and type, removes duplicates, creates clear task definitions.
    """
    
    # Define consolidated tasks based on analysis of the video
    consolidated_tasks = [
        # === CRITICAL BUGS (P0) ===
        {
            "id": "BUG-070",
            "title": "Fix Client List Click Handlers Not Working",
            "priority": "HIGH",
            "estimate": "4-8h",
            "module": "client/src/pages/ClientsListPage.tsx",
            "type": "BUG",
            "problem": "Clicking on client rows in the Clients list does nothing. Users cannot navigate to client details or perform actions on clients from the list view.",
            "objectives": [
                "Fix click handlers on client list rows to navigate to client detail view",
                "Ensure all interactive elements in the client list are properly clickable",
                "Add visual feedback (hover states) to indicate clickable elements"
            ],
            "deliverables": [
                "Client row click navigates to client detail page",
                "All action buttons in client list are functional",
                "Hover states added for clickable elements",
                "E2E test for client list navigation",
                "Manual QA verification on production"
            ],
            "source_timestamps": ["01:33", "01:44", "02:02"]
        },
        {
            "id": "BUG-071",
            "title": "Fix Create Client Form Submission Failure",
            "priority": "HIGH",
            "estimate": "4-8h",
            "module": "client/src/components/clients/ClientForm.tsx",
            "type": "BUG",
            "problem": "The Create Client form does not submit successfully. Users cannot add new clients to the system.",
            "objectives": [
                "Debug and fix the client creation API endpoint",
                "Ensure form validation works correctly before submission",
                "Add proper error handling and user feedback"
            ],
            "deliverables": [
                "Client creation form submits successfully",
                "Proper validation errors displayed to user",
                "Success message and redirect after creation",
                "API endpoint returns appropriate responses",
                "E2E test for client creation flow"
            ],
            "source_timestamps": ["04:08"]
        },
        {
            "id": "BUG-072",
            "title": "Fix Inventory Data Not Loading in Dashboard",
            "priority": "HIGH",
            "estimate": "8h",
            "module": "server/routers/inventory.ts",
            "type": "BUG",
            "problem": "Inventory data fails to load in multiple views. Dashboard shows no inventory despite system having inventory records. Field load inventory and field fetch inventory both fail.",
            "objectives": [
                "Debug inventory data fetching from database",
                "Fix API endpoints for inventory loading",
                "Ensure inventory displays correctly in dashboard widgets"
            ],
            "deliverables": [
                "Inventory data loads in dashboard",
                "Inventory list page displays all records",
                "Field load inventory works in order creator",
                "Field fetch inventory works in all contexts",
                "Performance optimization for large inventory sets"
            ],
            "source_timestamps": ["00:50", "04:33", "04:56", "05:01"]
        },
        {
            "id": "BUG-073",
            "title": "Fix Live Shopping Feature Not Accessible",
            "priority": "HIGH",
            "estimate": "8h",
            "module": "client/src/components/navigation/",
            "type": "BUG",
            "problem": "Live Shopping feature is not accessible from the dashboard or navigation. This is a major feature that should be prominently available.",
            "objectives": [
                "Add Live Shopping to main navigation sidebar",
                "Ensure Live Shopping page loads correctly",
                "Verify all Live Shopping functionality works"
            ],
            "deliverables": [
                "Live Shopping link in navigation sidebar",
                "Live Shopping accessible from dashboard",
                "Live Shopping page fully functional",
                "Feature flag check for Live Shopping",
                "Documentation for Live Shopping feature"
            ],
            "source_timestamps": ["00:16", "04:18"]
        },
        {
            "id": "BUG-074",
            "title": "Fix Spreadsheet View Empty Grid",
            "priority": "HIGH",
            "estimate": "8h",
            "module": "server/services/spreadsheetViewService.ts",
            "type": "BUG",
            "problem": "Spreadsheet view shows empty grid - cannot see any inventory data. Users cannot use the spreadsheet interface for bulk operations.",
            "objectives": [
                "Debug spreadsheet view data loading",
                "Fix data transformation for spreadsheet format",
                "Ensure proper column configuration"
            ],
            "deliverables": [
                "Spreadsheet view displays inventory data",
                "All columns properly configured",
                "Sorting and filtering work correctly",
                "Bulk edit functionality works",
                "Export from spreadsheet view works"
            ],
            "source_timestamps": ["17:09", "17:24"]
        },
        {
            "id": "BUG-075",
            "title": "Fix Settings Users Tab Authentication Error",
            "priority": "HIGH",
            "estimate": "4-8h",
            "module": "server/_core/trpc.ts",
            "type": "BUG",
            "problem": "Settings Users tab shows misleading authentication error. Account settings don't seem to work properly.",
            "objectives": [
                "Fix authentication check for users settings",
                "Ensure proper error messages are displayed",
                "Verify RBAC permissions for settings access"
            ],
            "deliverables": [
                "Users tab loads without auth error",
                "Proper permission checks in place",
                "Clear error messages when access denied",
                "Admin can manage all users",
                "User can view own settings"
            ],
            "source_timestamps": ["17:55", "21:30"]
        },
        {
            "id": "BUG-076",
            "title": "Fix Search and Filter Functionality",
            "priority": "HIGH",
            "estimate": "16h",
            "module": "server/routers/search.ts",
            "type": "BUG",
            "problem": "Global search and filtering is broken or inconsistent across the application. Search doesn't return results, filters don't work properly.",
            "objectives": [
                "Fix global search to return relevant results",
                "Implement consistent filtering across all list views",
                "Add advanced filter options like date ranges and multiple criteria"
            ],
            "deliverables": [
                "Global search returns relevant results",
                "Filters work consistently across all pages",
                "Advanced filter UI with multiple criteria",
                "Search results properly ranked",
                "Filter state persists during session"
            ],
            "source_timestamps": ["09:43", "18:06", "33:49"]
        },
        {
            "id": "BUG-077",
            "title": "Fix Notification System Not Working",
            "priority": "HIGH",
            "estimate": "8h",
            "module": "client/src/components/notifications/",
            "type": "BUG",
            "problem": "Notification system doesn't work - can't test notification features. Real-time notifications not appearing.",
            "objectives": [
                "Debug notification delivery system",
                "Ensure real-time notifications work",
                "Fix notification preferences saving"
            ],
            "deliverables": [
                "Notifications appear in real-time",
                "Notification preferences save correctly",
                "Notification history accessible",
                "Mark as read functionality works",
                "Notification badge updates correctly"
            ],
            "source_timestamps": ["32:13", "33:36", "33:43"]
        },
        
        # === UI/UX IMPROVEMENTS ===
        {
            "id": "UX-001",
            "title": "Reorganize Navigation - Dashboard Separate from Sales",
            "priority": "HIGH",
            "estimate": "8h",
            "module": "client/src/components/navigation/Sidebar.tsx",
            "type": "UI_UX",
            "problem": "Dashboard is incorrectly grouped under Sales. Navigation hierarchy is confusing. Dashboard should be its own top-level item.",
            "objectives": [
                "Move Dashboard to top-level navigation item",
                "Reorganize Sales section to only include sales-related items",
                "Improve navigation hierarchy clarity"
            ],
            "deliverables": [
                "Dashboard as standalone top-level nav item",
                "Sales section properly organized",
                "Inventory section properly organized",
                "Navigation matches user mental model",
                "Mobile navigation updated accordingly"
            ],
            "source_timestamps": ["00:40", "00:33"]
        },
        {
            "id": "UX-002",
            "title": "Improve Form Validation Error Messages",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/components/forms/",
            "type": "UI_UX",
            "problem": "Validation errors are super vague. Users don't understand what's wrong with their input.",
            "objectives": [
                "Create clear, specific validation error messages",
                "Show errors inline next to relevant fields",
                "Provide guidance on how to fix errors"
            ],
            "deliverables": [
                "Specific error messages for each validation rule",
                "Inline error display next to fields",
                "Error summary at top of forms",
                "Consistent error styling across app",
                "Accessibility improvements for error states"
            ],
            "source_timestamps": ["05:39"]
        },
        {
            "id": "UX-003",
            "title": "Visual Distinction Between Actionable and Informational Cards",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/components/ui/Card.tsx",
            "type": "UI_UX",
            "problem": "Cards that navigate somewhere look the same as cards that just display information. Users don't know what's clickable.",
            "objectives": [
                "Create visual distinction for actionable cards",
                "Add hover states for clickable cards",
                "Implement consistent card styling system"
            ],
            "deliverables": [
                "Actionable cards have distinct styling",
                "Hover states indicate clickability",
                "Cursor changes on actionable cards",
                "Design system documentation updated",
                "All existing cards categorized and styled"
            ],
            "source_timestamps": ["20:46", "20:54"]
        },
        {
            "id": "UX-004",
            "title": "Add Confirmation Dialogs for Destructive Actions",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/components/ui/ConfirmDialog.tsx",
            "type": "UI_UX",
            "problem": "Clear all button has no confirmation. Delete user has no verification. Destructive actions happen immediately without warning.",
            "objectives": [
                "Add confirmation dialog for all destructive actions",
                "Implement consistent confirmation UX pattern",
                "Allow undo where possible"
            ],
            "deliverables": [
                "Confirmation dialog component",
                "Clear all requires confirmation",
                "Delete actions require confirmation",
                "Undo functionality where applicable",
                "Consistent confirmation messaging"
            ],
            "source_timestamps": ["09:32", "23:34"]
        },
        {
            "id": "UX-005",
            "title": "Fix Horizontal Scrolling Issues",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/styles/",
            "type": "UI_UX",
            "problem": "User has to scroll side to side to see content. Tables and forms extend beyond viewport.",
            "objectives": [
                "Fix table layouts to fit viewport",
                "Implement responsive design for wide content",
                "Add horizontal scroll only where necessary"
            ],
            "deliverables": [
                "Tables fit within viewport",
                "Responsive column hiding on smaller screens",
                "Horizontal scroll indicator when needed",
                "Image thumbnails visible without scrolling",
                "Form layouts responsive"
            ],
            "source_timestamps": ["15:05"]
        },
        {
            "id": "UX-006",
            "title": "Improve Search/Filter UI Integration",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/components/filters/",
            "type": "UI_UX",
            "problem": "Search and filter UI feels disconnected. The search box and filter options seem like separate things rather than integrated.",
            "objectives": [
                "Integrate search and filter into cohesive UI",
                "Improve filter discoverability",
                "Make filter state visible and manageable"
            ],
            "deliverables": [
                "Unified search/filter component",
                "Active filters visible as chips/tags",
                "Clear all filters button",
                "Filter presets/saved searches",
                "Mobile-optimized filter UI"
            ],
            "source_timestamps": ["24:33", "24:43"]
        },
        {
            "id": "UX-007",
            "title": "Fix User/Permission Management UI Confusion",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/pages/settings/UsersSettingsPage.tsx",
            "type": "UI_UX",
            "problem": "User and permission management UI is confusing. View and Edit should be combined. Role assignment is unclear.",
            "objectives": [
                "Combine view and edit into single interface",
                "Clarify role and permission assignment flow",
                "Improve user management discoverability"
            ],
            "deliverables": [
                "Unified view/edit user interface",
                "Clear role assignment UI",
                "Permission inheritance visualization",
                "User dropdown for assignment fields",
                "Bulk user management options"
            ],
            "source_timestamps": ["23:08", "23:51", "24:08"]
        },
        {
            "id": "UX-008",
            "title": "Add Quick Add Functionality for Related Entities",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/components/forms/",
            "type": "UI_UX",
            "problem": "When adding a purchase and vendor doesn't exist, there's no way to quickly add the vendor. Same for other related entities.",
            "objectives": [
                "Add inline quick-add for vendors in purchase form",
                "Add inline quick-add for clients in order form",
                "Implement consistent quick-add pattern"
            ],
            "deliverables": [
                "Quick add vendor from purchase form",
                "Quick add client from order form",
                "Quick add product from order form",
                "Modal-based quick add component",
                "Success feedback after quick add"
            ],
            "source_timestamps": ["15:28", "15:44"]
        },
        
        # === CLIENT FORM CHANGES ===
        {
            "id": "FEAT-001",
            "title": "Client Form Field Updates",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/components/clients/ClientForm.tsx",
            "type": "TASK",
            "problem": "Client form has incorrect fields. Terry code should be Client code. Email should be removed. Need Signal username field. Address should be removed.",
            "objectives": [
                "Rename Terry code to Client code",
                "Remove email field from client form",
                "Add Signal username field",
                "Remove address field"
            ],
            "deliverables": [
                "Client code field (renamed from Terry code)",
                "Signal username field added",
                "Email field removed",
                "Address field removed",
                "Database migration for schema changes"
            ],
            "source_timestamps": ["02:52", "03:10", "03:16", "03:23"]
        },
        {
            "id": "FEAT-002",
            "title": "Tag System Revamp for Clients and Products",
            "priority": "HIGH",
            "estimate": "16h",
            "module": "server/tagManagementService.ts",
            "type": "TASK",
            "problem": "Tag system needs complete revamp for both clients and products. Current implementation is inadequate.",
            "objectives": [
                "Redesign tag data model for flexibility",
                "Implement tag management UI for clients",
                "Implement tag management UI for products",
                "Add tag-based filtering and search"
            ],
            "deliverables": [
                "New tag schema with categories",
                "Tag management admin interface",
                "Tag assignment UI for clients",
                "Tag assignment UI for products",
                "Tag-based filtering in list views"
            ],
            "source_timestamps": ["03:52", "04:01"]
        },
        
        # === ORDER/SALES IMPROVEMENTS ===
        {
            "id": "FEAT-003",
            "title": "Order Creator Quick Add Quantity Field",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/pages/OrderCreatorPage.tsx",
            "type": "TASK",
            "problem": "In quick add for orders, need a way to specify quantity directly. Currently have to add item then modify quantity separately.",
            "objectives": [
                "Add quantity field to quick add interface",
                "Allow quantity input before adding to order",
                "Maintain quick workflow efficiency"
            ],
            "deliverables": [
                "Quantity input in quick add modal",
                "Default quantity of 1",
                "Keyboard shortcut for quantity",
                "Quantity validation",
                "Updated quick add UX"
            ],
            "source_timestamps": ["08:49", "08:57", "09:01"]
        },
        {
            "id": "FEAT-004",
            "title": "Add Dollar Amount Discount Option",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/pages/OrderCreatorPage.tsx",
            "type": "TASK",
            "problem": "Can only apply percentage discounts. Should be able to click dollar amount for fixed discounts.",
            "objectives": [
                "Add dollar amount discount option",
                "Toggle between percentage and fixed discount",
                "Calculate totals correctly for both types"
            ],
            "deliverables": [
                "Dollar amount discount input",
                "Toggle between % and $ discount",
                "Correct total calculation",
                "Discount display in order summary",
                "Invoice shows discount type"
            ],
            "source_timestamps": ["09:18"]
        },
        {
            "id": "FEAT-005",
            "title": "Merge Draft and Quote Workflows",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "server/routers/orders.ts",
            "type": "TASK",
            "problem": "There's draft and quote as separate concepts but they should be treated the same. Need to figure out how to merge them.",
            "objectives": [
                "Analyze current draft vs quote implementation",
                "Design unified draft/quote workflow",
                "Implement merged functionality"
            ],
            "deliverables": [
                "Unified draft/quote status",
                "Clear workflow from draft to confirmed",
                "Quote-specific fields preserved",
                "Migration for existing data",
                "Updated UI for unified workflow"
            ],
            "source_timestamps": ["06:43", "06:54", "07:03"]
        },
        {
            "id": "FEAT-006",
            "title": "Show Product Name Instead of SKU in Order Creator",
            "priority": "MEDIUM",
            "estimate": "2-4h",
            "module": "client/src/pages/OrderCreatorPage.tsx",
            "type": "TASK",
            "problem": "Order creator shows SKU instead of product name. Users want to see product names.",
            "objectives": [
                "Display product name as primary identifier",
                "Show SKU as secondary information",
                "Maintain searchability by both"
            ],
            "deliverables": [
                "Product name displayed prominently",
                "SKU shown in smaller text",
                "Search works for both name and SKU",
                "Consistent display across order views",
                "Print/PDF shows both name and SKU"
            ],
            "source_timestamps": ["08:16", "08:20"]
        },
        {
            "id": "FEAT-007",
            "title": "Add Payment Recording Against Invoices",
            "priority": "HIGH",
            "estimate": "16h",
            "module": "server/routers/finance.ts",
            "type": "TASK",
            "problem": "Need ability to add a payment against an invoice and have it flow through correctly to finance.",
            "objectives": [
                "Implement payment recording against invoices",
                "Update invoice status based on payments",
                "Flow payment data to finance/accounting"
            ],
            "deliverables": [
                "Payment recording UI on invoice",
                "Partial payment support",
                "Payment history on invoice",
                "Finance ledger integration",
                "Payment receipt generation"
            ],
            "source_timestamps": ["05:58", "06:04"]
        },
        {
            "id": "FEAT-008",
            "title": "Invoice Editing from Order View",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/components/orders/InvoiceDetail.tsx",
            "type": "TASK",
            "problem": "Should be able to edit the actual invoice from the order view. Currently have to navigate elsewhere.",
            "objectives": [
                "Add inline invoice editing capability",
                "Maintain audit trail for changes",
                "Ensure proper permissions for editing"
            ],
            "deliverables": [
                "Edit invoice button on order view",
                "Inline editing for invoice fields",
                "Audit log for invoice changes",
                "Permission check for editing",
                "Validation before save"
            ],
            "source_timestamps": ["06:10", "06:18"]
        },
        
        # === INVENTORY/PRODUCT IMPROVEMENTS ===
        {
            "id": "FEAT-009",
            "title": "Add Product Subcategories (Smalls, Trim, etc.)",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "server/schema.ts",
            "type": "TASK",
            "problem": "Need optional subcategories for products like flower->smalls, flower->trim. Grade alone isn't sufficient.",
            "objectives": [
                "Design subcategory schema",
                "Implement subcategory management",
                "Add subcategory to product forms"
            ],
            "deliverables": [
                "Subcategory database schema",
                "Subcategory admin management",
                "Subcategory selection in product form",
                "Subcategory filtering in lists",
                "Migration for existing products"
            ],
            "source_timestamps": ["11:52", "12:01"]
        },
        {
            "id": "FEAT-010",
            "title": "Default Warehouse Selection",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/inventory/",
            "type": "TASK",
            "problem": "Warehouse should default to main warehouse. Currently no default is set.",
            "objectives": [
                "Set default warehouse for new inventory",
                "Allow user preference for default warehouse",
                "Handle single-warehouse scenarios"
            ],
            "deliverables": [
                "Default warehouse setting",
                "User preference for default",
                "Auto-select when single warehouse",
                "Clear indicator of selected warehouse",
                "Warehouse validation on save"
            ],
            "source_timestamps": ["12:21", "12:27"]
        },
        {
            "id": "FEAT-011",
            "title": "COGS Logic and Sales Flow Integration",
            "priority": "HIGH",
            "estimate": "16h",
            "module": "server/services/pricingEngine.ts",
            "type": "TASK",
            "problem": "Need to figure out COGS logic - how it shows up in sales, whether as range or specific value, and how setting COGS in one sale can optionally apply to all future transactions.",
            "objectives": [
                "Define COGS display logic in sales",
                "Implement COGS setting per transaction",
                "Add option to apply COGS to all future transactions"
            ],
            "deliverables": [
                "COGS display in sales interface",
                "Per-transaction COGS override",
                "Apply to future transactions option",
                "COGS range display when applicable",
                "Finance integration for COGS"
            ],
            "source_timestamps": ["12:56", "13:06", "13:13", "13:35", "13:48"]
        },
        {
            "id": "FEAT-012",
            "title": "Make Grade Field Optional/Customizable",
            "priority": "LOW",
            "estimate": "4-8h",
            "module": "client/src/components/inventory/ProductForm.tsx",
            "type": "TASK",
            "problem": "Grade field shouldn't always be required. Should be customizable whether it's required or not.",
            "objectives": [
                "Make grade field optionally required",
                "Add setting to control grade requirement",
                "Handle products without grades"
            ],
            "deliverables": [
                "Grade field optional by default",
                "Admin setting for grade requirement",
                "Graceful handling of null grades",
                "Filter/sort works with null grades",
                "Migration for existing data"
            ],
            "source_timestamps": ["16:02", "16:06"]
        },
        {
            "id": "FEAT-013",
            "title": "Add Packaged Unit Type for Products",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "server/schema.ts",
            "type": "TASK",
            "problem": "Units need to include packaged unit type for edibles, vapes, concentrates. Current units are only bulk.",
            "objectives": [
                "Add packaged unit type to schema",
                "Implement unit type selection in forms",
                "Handle inventory tracking for packaged items"
            ],
            "deliverables": [
                "Packaged unit type in schema",
                "Unit type selection in product form",
                "Inventory tracking by unit type",
                "Conversion between unit types",
                "Reporting by unit type"
            ],
            "source_timestamps": ["30:07", "30:20"]
        },
        
        # === PURCHASE IMPROVEMENTS ===
        {
            "id": "FEAT-014",
            "title": "Remove Expected Delivery from Purchases",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/purchases/PurchaseForm.tsx",
            "type": "TASK",
            "problem": "Expected delivery field doesn't make sense for purchases that are already in-house.",
            "objectives": [
                "Remove expected delivery field",
                "Clean up purchase form",
                "Handle existing data gracefully"
            ],
            "deliverables": [
                "Expected delivery field removed",
                "Form layout updated",
                "Migration to null existing values",
                "Documentation updated",
                "Tests updated"
            ],
            "source_timestamps": ["16:46", "16:57"]
        },
        
        # === SETTINGS/ADMIN IMPROVEMENTS ===
        {
            "id": "FEAT-015",
            "title": "Finance Status Customization",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/pages/settings/FinanceSettingsPage.tsx",
            "type": "TASK",
            "problem": "Finance statuses should be customizable. Users want to define their own status values.",
            "objectives": [
                "Implement customizable finance statuses",
                "Add status management UI",
                "Ensure backward compatibility"
            ],
            "deliverables": [
                "Status management interface",
                "Custom status creation",
                "Status color/icon customization",
                "Default status set",
                "Migration for existing statuses"
            ],
            "source_timestamps": ["18:44"]
        },
        {
            "id": "FEAT-016",
            "title": "Rename Credits to Credit Settings",
            "priority": "LOW",
            "estimate": "1-2h",
            "module": "client/src/pages/settings/",
            "type": "TASK",
            "problem": "Credits section should be called Credit Settings for clarity.",
            "objectives": [
                "Rename Credits to Credit Settings",
                "Update all references",
                "Maintain URL compatibility"
            ],
            "deliverables": [
                "Section renamed to Credit Settings",
                "Navigation updated",
                "Breadcrumbs updated",
                "URL redirect from old path",
                "Documentation updated"
            ],
            "source_timestamps": ["19:06"]
        },
        {
            "id": "FEAT-017",
            "title": "Feature Flags Direct Access",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/pages/settings/FeatureFlagsPage.tsx",
            "type": "TASK",
            "problem": "When clicking Feature Flags, should go directly to the page instead of requiring another click.",
            "objectives": [
                "Direct navigation to feature flags page",
                "Remove intermediate step",
                "Improve settings navigation"
            ],
            "deliverables": [
                "Direct link to feature flags",
                "Navigation updated",
                "Consistent with other settings pages",
                "Mobile navigation updated",
                "Breadcrumb trail correct"
            ],
            "source_timestamps": ["27:14", "27:20"]
        },
        {
            "id": "FEAT-018",
            "title": "Remove Development-Only Features from User-Facing UI",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/pages/settings/",
            "type": "TASK",
            "problem": "Some features like seeding defaults and new flag creation should not be visible to regular users.",
            "objectives": [
                "Hide development features from regular users",
                "Add proper permission checks",
                "Create developer-only section"
            ],
            "deliverables": [
                "Development features hidden by default",
                "Super admin access to dev features",
                "Permission checks on dev endpoints",
                "Clear separation of user/dev settings",
                "Documentation for dev features"
            ],
            "source_timestamps": ["27:51", "27:57", "28:00"]
        },
        {
            "id": "FEAT-019",
            "title": "VIP Status and Tiers Implementation",
            "priority": "MEDIUM",
            "estimate": "16h",
            "module": "server/services/vipService.ts",
            "type": "TASK",
            "problem": "VIP status and tiers need to be figured out. Should be more leaderboard focused. Need to confirm all VIP functionality works.",
            "objectives": [
                "Design VIP tier system",
                "Implement leaderboard functionality",
                "Create VIP status management"
            ],
            "deliverables": [
                "VIP tier definitions",
                "Leaderboard page",
                "VIP status calculation",
                "Tier benefits configuration",
                "VIP badge display"
            ],
            "source_timestamps": ["28:31", "28:39", "28:51"]
        },
        {
            "id": "FEAT-020",
            "title": "Product Subcategory and Strain Matching",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "server/services/productMatchingService.ts",
            "type": "TASK",
            "problem": "Product matching should include subcategory and strain. Current matching is insufficient.",
            "objectives": [
                "Add subcategory to matching algorithm",
                "Add strain to matching algorithm",
                "Improve match accuracy"
            ],
            "deliverables": [
                "Subcategory matching",
                "Strain matching",
                "Match confidence score",
                "Match suggestions UI",
                "Bulk matching tool"
            ],
            "source_timestamps": ["29:37", "29:51"]
        },
        {
            "id": "FEAT-021",
            "title": "Settings Changes Apply to Entire Team",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "server/services/settingsService.ts",
            "type": "TASK",
            "problem": "Settings changes should be explicit that they apply to entire team/user base, not just individual user.",
            "objectives": [
                "Clarify team vs user settings",
                "Add confirmation for team-wide changes",
                "Separate personal preferences"
            ],
            "deliverables": [
                "Team settings section",
                "Personal settings section",
                "Confirmation for team changes",
                "Clear labeling of scope",
                "Audit log for team changes"
            ],
            "source_timestamps": ["26:41", "26:47", "26:52"]
        },
        {
            "id": "FEAT-022",
            "title": "Show Role Names Instead of Count in Permissions",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/pages/settings/PermissionsPage.tsx",
            "type": "TASK",
            "problem": "Instead of showing number of roles with access, should list which roles have access.",
            "objectives": [
                "Display role names instead of count",
                "Show role list on hover or expand",
                "Improve permission visibility"
            ],
            "deliverables": [
                "Role names displayed",
                "Expandable role list",
                "Tooltip with full list",
                "Quick role assignment",
                "Permission matrix view"
            ],
            "source_timestamps": ["25:09", "25:13"]
        },
        
        # === NOTIFICATION IMPROVEMENTS ===
        {
            "id": "FEAT-023",
            "title": "Notification Preferences - System vs User Level",
            "priority": "MEDIUM",
            "estimate": "8h",
            "module": "client/src/pages/settings/NotificationsPage.tsx",
            "type": "TASK",
            "problem": "Need distinction between system notification preferences and individual user preferences.",
            "objectives": [
                "Separate system and user notification settings",
                "Allow admins to set system defaults",
                "Let users override with personal preferences"
            ],
            "deliverables": [
                "System notification defaults",
                "User notification overrides",
                "Clear UI separation",
                "Inheritance visualization",
                "Bulk notification settings"
            ],
            "source_timestamps": ["31:33", "31:40"]
        },
        {
            "id": "FEAT-024",
            "title": "Inline Notifications Without Page Navigation",
            "priority": "MEDIUM",
            "estimate": "4-8h",
            "module": "client/src/components/notifications/NotificationPanel.tsx",
            "type": "TASK",
            "problem": "Don't want to click through to notifications page. Notifications should just be there inline.",
            "objectives": [
                "Show notifications in dropdown panel",
                "Allow actions without leaving current page",
                "Maintain notification history access"
            ],
            "deliverables": [
                "Notification dropdown panel",
                "Inline notification actions",
                "Mark as read without navigation",
                "Quick dismiss functionality",
                "Link to full history when needed"
            ],
            "source_timestamps": ["31:26", "31:33"]
        },
        
        # === MISC UI FIXES ===
        {
            "id": "UX-009",
            "title": "Fix Sidebar Slide Animation",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/navigation/Sidebar.tsx",
            "type": "UI_UX",
            "problem": "Sidebar design seems funky - constantly out. Maybe meant to slide in and out but doesn't work properly.",
            "objectives": [
                "Fix sidebar animation",
                "Ensure consistent open/close behavior",
                "Improve mobile sidebar UX"
            ],
            "deliverables": [
                "Smooth slide animation",
                "Consistent toggle behavior",
                "Mobile-friendly sidebar",
                "Persist sidebar state",
                "Keyboard shortcut for toggle"
            ],
            "source_timestamps": ["32:42", "32:48"]
        },
        {
            "id": "UX-010",
            "title": "Clarify My Account vs User Settings Navigation",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/navigation/",
            "type": "UI_UX",
            "problem": "Confusing that My Account is in one place, user settings in another, and there's also a link that goes to the same place.",
            "objectives": [
                "Consolidate account/settings navigation",
                "Create clear hierarchy",
                "Remove duplicate links"
            ],
            "deliverables": [
                "Single account settings entry point",
                "Clear personal vs admin settings",
                "Remove duplicate navigation",
                "Consistent terminology",
                "Updated help documentation"
            ],
            "source_timestamps": ["33:04", "33:09"]
        },
        {
            "id": "UX-011",
            "title": "Fix Two Export Buttons Issue",
            "priority": "LOW",
            "estimate": "1-2h",
            "module": "client/src/components/",
            "type": "UI_UX",
            "problem": "There are two export buttons which doesn't make sense.",
            "objectives": [
                "Remove duplicate export button",
                "Consolidate export functionality",
                "Ensure single clear export action"
            ],
            "deliverables": [
                "Single export button",
                "Export options in dropdown",
                "Consistent export location",
                "Export format selection",
                "Export confirmation"
            ],
            "source_timestamps": ["20:30"]
        },
        {
            "id": "UX-012",
            "title": "Fix Period Display Formatting",
            "priority": "LOW",
            "estimate": "1-2h",
            "module": "client/src/components/finance/",
            "type": "UI_UX",
            "problem": "The way period is presented is strange in finance views.",
            "objectives": [
                "Standardize period display format",
                "Use consistent date formatting",
                "Improve readability"
            ],
            "deliverables": [
                "Consistent period format",
                "Clear date range display",
                "Locale-aware formatting",
                "Period selector improvement",
                "Documentation of format"
            ],
            "source_timestamps": ["20:11", "20:14"]
        },
        {
            "id": "UX-013",
            "title": "Fix Mirrored Elements Issue",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/",
            "type": "UI_UX",
            "problem": "Some elements mirror each other which is driving user nuts. Need to fix the mirroring.",
            "objectives": [
                "Identify mirrored elements",
                "Fix unintended mirroring",
                "Ensure proper element independence"
            ],
            "deliverables": [
                "Mirrored elements identified",
                "Independent element state",
                "No unintended synchronization",
                "Proper component isolation",
                "Regression tests"
            ],
            "source_timestamps": ["31:04", "31:14"]
        },
        {
            "id": "UX-014",
            "title": "Make Optional Fields Clear",
            "priority": "LOW",
            "estimate": "2-4h",
            "module": "client/src/components/forms/",
            "type": "UI_UX",
            "problem": "Should be clear when fields are optional. If you don't set something, it should be obvious that's okay.",
            "objectives": [
                "Mark optional fields clearly",
                "Use consistent optional indicator",
                "Improve form clarity"
            ],
            "deliverables": [
                "Optional field indicator",
                "Consistent (optional) label",
                "Required field indicator",
                "Form validation messages",
                "Help text for optional fields"
            ],
            "source_timestamps": ["30:36", "30:41"]
        }
    ]
    
    return consolidated_tasks

def generate_roadmap_section(tasks):
    """Generate the roadmap markdown section for all tasks."""
    
    # Group by type
    bugs = [t for t in tasks if t['type'] == 'BUG']
    ux_tasks = [t for t in tasks if t['type'] == 'UI_UX']
    features = [t for t in tasks if t['type'] == 'TASK']
    
    output = []
    
    output.append("## 🎬 Video Testing Session Issues (Jan 7, 2026)\n")
    output.append("> **Source:** User flow testing video recording analysis")
    output.append("> **Total Tasks:** " + str(len(tasks)))
    output.append("> **Documentation:** `docs/testing/VIDEO_SESSION_2026-01-07.md`\n")
    
    # Critical Bugs
    output.append("\n### 🐛 Critical Bugs from Video Testing\n")
    output.append("| Task | Description | Priority | Estimate | Status |")
    output.append("|------|-------------|----------|----------|--------|")
    for bug in bugs:
        output.append(f"| {bug['id']} | {bug['title']} | {bug['priority']} | {bug['estimate']} | ready |")
    
    # UX Issues
    output.append("\n### 🎨 UI/UX Issues from Video Testing\n")
    output.append("| Task | Description | Priority | Estimate | Status |")
    output.append("|------|-------------|----------|----------|--------|")
    for ux in ux_tasks:
        output.append(f"| {ux['id']} | {ux['title']} | {ux['priority']} | {ux['estimate']} | ready |")
    
    # Feature Tasks
    output.append("\n### 📋 Feature Tasks from Video Testing\n")
    output.append("| Task | Description | Priority | Estimate | Status |")
    output.append("|------|-------------|----------|----------|--------|")
    for feat in features:
        output.append(f"| {feat['id']} | {feat['title']} | {feat['priority']} | {feat['estimate']} | ready |")
    
    return '\n'.join(output)

def generate_task_details(tasks):
    """Generate detailed task entries for the roadmap."""
    output = []
    
    output.append("\n---\n")
    output.append("## 📝 Detailed Task Specifications (Video Testing Session)\n")
    
    for task in tasks:
        output.append(f"\n### {task['id']}: {task['title']}\n")
        output.append(f"**Status:** ready")
        output.append(f"**Priority:** {task['priority']}")
        output.append(f"**Estimate:** {task['estimate']}")
        output.append(f"**Module:** `{task['module']}`")
        output.append(f"**Dependencies:** None")
        output.append(f"**Prompt:** `docs/prompts/{task['id']}.md`\n")
        output.append(f"**Problem:**")
        output.append(f"{task['problem']}\n")
        output.append("**Objectives:**\n")
        for i, obj in enumerate(task['objectives'], 1):
            output.append(f"{i}. {obj}")
        output.append("\n**Deliverables:**\n")
        for deliv in task['deliverables']:
            output.append(f"- [ ] {deliv}")
        output.append(f"\n**Source Timestamps:** {', '.join(task['source_timestamps'])}")
        output.append("\n---")
    
    return '\n'.join(output)

def main():
    print("Loading issues from video analysis...")
    data = load_issues()
    print(f"Loaded {data['total_issues']} raw issues")
    
    print("Consolidating into actionable tasks...")
    tasks = consolidate_issues(data)
    print(f"Created {len(tasks)} consolidated tasks")
    
    # Generate roadmap section
    roadmap_section = generate_roadmap_section(tasks)
    
    # Generate detailed tasks
    task_details = generate_task_details(tasks)
    
    # Save to files
    with open('/home/ubuntu/TERP/docs/testing/VIDEO_SESSION_2026-01-07_TASKS.md', 'w') as f:
        f.write("# Video Testing Session Tasks (Jan 7, 2026)\n\n")
        f.write(roadmap_section)
        f.write(task_details)
    
    print("Saved task file to docs/testing/VIDEO_SESSION_2026-01-07_TASKS.md")
    
    # Save JSON for further processing
    with open('/home/ubuntu/TERP/docs/testing/VIDEO_SESSION_TASKS.json', 'w') as f:
        json.dump(tasks, f, indent=2)
    
    print("Saved JSON to docs/testing/VIDEO_SESSION_TASKS.json")
    
    # Print summary
    print("\n=== TASK SUMMARY ===")
    bugs = [t for t in tasks if t['type'] == 'BUG']
    ux = [t for t in tasks if t['type'] == 'UI_UX']
    features = [t for t in tasks if t['type'] == 'TASK']
    
    print(f"Critical Bugs: {len(bugs)}")
    print(f"UI/UX Issues: {len(ux)}")
    print(f"Feature Tasks: {len(features)}")
    print(f"Total: {len(tasks)}")

if __name__ == '__main__':
    main()
