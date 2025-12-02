# TERP File Analysis Report

**Generated**: 2025-12-02T20:54:20.059Z

## Overview

- **Total Files Analyzed**: 405
- **Total Lines of Code**: 93,128
- **Total Size**: 2.90 MB
- **Files with Issues**: 149

## Files by Type

- **frontend**: 282 files
- **backend**: 123 files

## Issues Found

- **Contains `any` types**: 93 files
- **No exports found**: 40 files
- **Contains console.log statements**: 16 files
- **Large file (566 lines)**: 2 files
- **Large file (1082 lines)**: 1 files
- **Large file (900 lines)**: 1 files
- **Large file (1380 lines)**: 1 files
- **Large file (901 lines)**: 1 files
- **Large file (645 lines)**: 1 files
- **Large file (525 lines)**: 1 files
- **Large file (552 lines)**: 1 files
- **Large file (687 lines)**: 1 files
- **Large file (508 lines)**: 1 files
- **Large file (726 lines)**: 1 files
- **Large file (579 lines)**: 1 files
- **Large file (501 lines)**: 1 files
- **Large file (617 lines)**: 1 files
- **Large file (601 lines)**: 1 files
- **Large file (503 lines)**: 1 files
- **Large file (735 lines)**: 1 files
- **Large file (1242 lines)**: 1 files
- **Large file (945 lines)**: 1 files
- **Large file (560 lines)**: 1 files
- **Large file (535 lines)**: 1 files
- **Large file (756 lines)**: 1 files
- **Large file (716 lines)**: 1 files
- **Large file (573 lines)**: 1 files
- **Large file (604 lines)**: 1 files
- **Large file (936 lines)**: 1 files
- **Large file (517 lines)**: 1 files
- **Large file (502 lines)**: 1 files
- **Large file (1021 lines)**: 1 files
- **Large file (611 lines)**: 1 files
- **Large file (559 lines)**: 1 files
- **Large file (607 lines)**: 1 files
- **Large file (643 lines)**: 1 files
- **Large file (658 lines)**: 1 files
- **Large file (1496 lines)**: 1 files
- **Large file (1143 lines)**: 1 files
- **Large file (994 lines)**: 1 files

## Large Files (>500 lines)

- server/routers/vipPortal.ts (1496 lines)
- client/src/pages/ComponentShowcase.tsx (1380 lines)
- client/src/components/vip-portal/LiveCatalog.tsx (1242 lines)
- server/routers/vipPortalAdmin.ts (1143 lines)
- client/src/pages/ClientProfilePage.tsx (1082 lines)
- server/routers/orders.ts (1021 lines)
- server/services/rbacDefinitions.ts (994 lines)
- client/src/components/vip-portal/LiveCatalogConfig.tsx (945 lines)
- server/routers/calendarInvitations.ts (936 lines)
- client/src/pages/Inventory.tsx (901 lines)
- client/src/pages/ClientsListPage.tsx (900 lines)
- server/routers/accounting.ts (756 lines)
- client/src/components/ui/sidebar.tsx (735 lines)
- client/src/pages/VendorsPage.tsx (726 lines)
- server/routers/admin.ts (716 lines)
- client/src/pages/Settings.tsx (687 lines)
- server/routers/rbac-users.ts (658 lines)
- client/src/pages/Orders.tsx (645 lines)
- server/routers/rbac-roles.ts (643 lines)
- client/src/components/inventory/BatchDetailDrawer.tsx (617 lines)

## Files with `any` Types

- client/src/pages/ClientProfilePage.tsx
- client/src/pages/ClientsListPage.tsx
- client/src/pages/Inventory.tsx
- client/src/pages/MatchmakingServicePage.tsx
- client/src/pages/NeedsManagementPage.tsx
- client/src/pages/OrderCreatorPage.tsx
- client/src/pages/Orders.tsx
- client/src/pages/PricingRulesPage.tsx
- client/src/pages/Quotes.tsx
- client/src/pages/ReturnsPage.tsx
- client/src/pages/SalesSheetCreatorPage.tsx
- client/src/pages/Settings.tsx
- client/src/pages/VendorSupplyPage.tsx
- client/src/pages/accounting/AccountingDashboard.tsx
- client/src/pages/accounting/BankAccounts.tsx
- client/src/pages/accounting/BankTransactions.tsx
- client/src/pages/accounting/Bills.tsx
- client/src/pages/accounting/ChartOfAccounts.tsx
- client/src/pages/accounting/Expenses.tsx
- client/src/pages/accounting/FiscalPeriods.tsx
- client/src/pages/accounting/GeneralLedger.tsx
- client/src/pages/accounting/Invoices.tsx
- client/src/pages/accounting/Payments.tsx
- client/src/components/calendar/EventFormDialog.tsx
- client/src/components/clients/AddCommunicationModal.tsx
- client/src/components/clients/PurchasePatternsWidget.tsx
- client/src/components/dashboard/ScratchPad.tsx
- client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx
- client/src/components/dashboard/widgets-v2/SmartOpportunitiesWidget.tsx
- client/src/components/dashboard/widgets-v2/TemplateSelector.tsx
- client/src/components/dashboard/widgets-v2/TopStrainFamiliesWidget.tsx
- client/src/components/inventory/AdvancedFilters.tsx
- client/src/components/inventory/BatchDetailDrawer.tsx
- client/src/components/inventory/ClientInterestWidget.tsx
- client/src/components/inventory/CogsEditModal.tsx
- client/src/components/inventory/PotentialBuyersWidget.tsx
- client/src/components/inventory/PurchaseModal.tsx
- client/src/components/inventory/SaveViewModal.tsx
- client/src/components/inventory/SavedViewsDropdown.tsx
- client/src/components/needs/ClientNeedsTab.tsx
- client/src/components/needs/MatchCard.tsx
- client/src/components/needs/NeedForm.tsx
- client/src/components/orders/AddCustomerOverlay.tsx
- client/src/components/orders/CogsAdjustmentModal.tsx
- client/src/components/orders/ConfirmDraftModal.tsx
- client/src/components/orders/CreditLimitBanner.tsx
- client/src/components/orders/DeleteDraftModal.tsx
- client/src/components/orders/OrderItemCard.tsx
- client/src/components/orders/OrderPreview.tsx
- client/src/components/orders/ProcessReturnModal.tsx
- client/src/components/orders/ShipOrderModal.tsx
- client/src/components/sales/InventoryBrowser.tsx
- client/src/components/sales/SalesSheetPreview.tsx
- client/src/components/settings/rbac/PermissionAssignment.tsx
- client/src/components/settings/rbac/RoleManagement.tsx
- client/src/components/settings/rbac/UserRoleManagement.tsx
- client/src/components/strain/StrainComponents.tsx
- client/src/components/supply/SupplyForm.tsx
- client/src/components/todos/ShareListModal.tsx
- client/src/components/todos/TaskForm.tsx
- client/src/components/vip-portal/AccountsPayable.tsx
- client/src/components/vip-portal/AccountsReceivable.tsx
- client/src/components/vip-portal/Leaderboard.tsx
- client/src/components/vip-portal/LiveCatalog.tsx
- client/src/components/vip-portal/LiveCatalogConfig.tsx
- client/src/components/vip-portal/MarketplaceNeeds.tsx
- client/src/components/vip-portal/MarketplaceSupply.tsx
- client/src/components/vip-portal/TransactionHistory.tsx
- client/src/components/workflow/WorkflowBatchCard.tsx
- client/src/components/workflow/WorkflowBoard.tsx
- client/src/components/workflow/WorkflowSettings.tsx
- client/src/hooks/useDebounceCallback.ts
- client/src/hooks/useInventorySort.ts
- client/src/hooks/usePersistFn.ts
- client/src/utils/exportToCSV.ts
- server/routers/admin.ts
- server/routers/calendar.test.ts
- server/routers/calendar.ts
- server/routers/calendarInvitations.ts
- server/routers/clientNeedsEnhanced.ts
- server/routers/rbac-permissions.ts
- server/routers/rbac-roles.test.ts
- server/routers/rbac-roles.ts
- server/routers/rbac-users.test.ts
- server/routers/vendorSupply.ts
- server/routers/vipPortalAdmin.ts
- server/services/priceAlertsService.test.ts
- server/services/rbacDefinitions.ts
- server/services/seedRBAC.ts
- server/services/strainService.ts

## Detailed Analysis

### client/src/pages/ClientProfilePage.tsx

- **Type**: frontend
- **Lines**: 1082
- **Size**: 39.31 KB
- **Issues**:
  - Contains `any` types
  - Large file (1082 lines)
- **Dependencies**: 22

### client/src/pages/ClientsListPage.tsx

- **Type**: frontend
- **Lines**: 900
- **Size**: 35.74 KB
- **Issues**:
  - Contains `any` types
  - Contains console.log statements
  - Large file (900 lines)
- **Dependencies**: 10

### client/src/pages/ComponentShowcase.tsx

- **Type**: frontend
- **Lines**: 1380
- **Size**: 54.38 KB
- **Issues**:
  - Contains console.log statements
  - Large file (1380 lines)
- **Dependencies**: 25

### client/src/pages/DashboardV3.tsx

- **Type**: frontend
- **Lines**: 109
- **Size**: 3.52 KB
- **Issues**:
  - Contains console.log statements
- **Dependencies**: 7

### client/src/pages/Inventory.tsx

- **Type**: frontend
- **Lines**: 901
- **Size**: 33.09 KB
- **Issues**:
  - Contains `any` types
  - Large file (901 lines)
- **Dependencies**: 27

### client/src/pages/MatchmakingServicePage.test.tsx

- **Type**: frontend
- **Lines**: 155
- **Size**: 4.15 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/pages/MatchmakingServicePage.tsx

- **Type**: frontend
- **Lines**: 482
- **Size**: 18.11 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 10

### client/src/pages/NeedsManagementPage.tsx

- **Type**: frontend
- **Lines**: 352
- **Size**: 14.16 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 11

### client/src/pages/OrderCreatorPage.tsx

- **Type**: frontend
- **Lines**: 450
- **Size**: 15.00 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 12

### client/src/pages/Orders.tsx

- **Type**: frontend
- **Lines**: 645
- **Size**: 24.33 KB
- **Issues**:
  - Contains `any` types
  - Large file (645 lines)
- **Dependencies**: 20

### client/src/pages/PricingRulesPage.tsx

- **Type**: frontend
- **Lines**: 525
- **Size**: 17.38 KB
- **Issues**:
  - Contains `any` types
  - Large file (525 lines)
- **Dependencies**: 12

### client/src/pages/PurchaseOrdersPage.tsx

- **Type**: frontend
- **Lines**: 552
- **Size**: 17.73 KB
- **Issues**:
  - Large file (552 lines)
- **Dependencies**: 10

### client/src/pages/Quotes.tsx

- **Type**: frontend
- **Lines**: 360
- **Size**: 13.52 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 11

### client/src/pages/ReturnsPage.tsx

- **Type**: frontend
- **Lines**: 382
- **Size**: 14.28 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 11

### client/src/pages/SalesSheetCreatorPage.tsx

- **Type**: frontend
- **Lines**: 129
- **Size**: 4.47 KB
- **Issues**:
  - Contains `any` types
  - Contains console.log statements
- **Dependencies**: 8

### client/src/pages/Settings.tsx

- **Type**: frontend
- **Lines**: 687
- **Size**: 27.39 KB
- **Issues**:
  - Contains `any` types
  - Large file (687 lines)
- **Dependencies**: 14

### client/src/pages/VendorProfilePage.tsx

- **Type**: frontend
- **Lines**: 508
- **Size**: 16.50 KB
- **Issues**:
  - Large file (508 lines)
- **Dependencies**: 12

### client/src/pages/VendorSupplyPage.tsx

- **Type**: frontend
- **Lines**: 204
- **Size**: 7.37 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/pages/VendorsPage.tsx

- **Type**: frontend
- **Lines**: 726
- **Size**: 24.35 KB
- **Issues**:
  - Large file (726 lines)
- **Dependencies**: 11

### client/src/pages/WorkflowQueuePage.test.tsx

- **Type**: frontend
- **Lines**: 144
- **Size**: 4.29 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/pages/accounting/AccountingDashboard.tsx

- **Type**: frontend
- **Lines**: 293
- **Size**: 11.33 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 7

### client/src/pages/accounting/BankAccounts.tsx

- **Type**: frontend
- **Lines**: 157
- **Size**: 5.92 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 7

### client/src/pages/accounting/BankTransactions.tsx

- **Type**: frontend
- **Lines**: 249
- **Size**: 9.68 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/pages/accounting/Bills.tsx

- **Type**: frontend
- **Lines**: 241
- **Size**: 8.69 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/pages/accounting/ChartOfAccounts.tsx

- **Type**: frontend
- **Lines**: 579
- **Size**: 19.97 KB
- **Issues**:
  - Contains `any` types
  - Large file (579 lines)
- **Dependencies**: 12

### client/src/pages/accounting/Expenses.tsx

- **Type**: frontend
- **Lines**: 310
- **Size**: 11.69 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/pages/accounting/FiscalPeriods.tsx

- **Type**: frontend
- **Lines**: 472
- **Size**: 15.68 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 13

### client/src/pages/accounting/GeneralLedger.tsx

- **Type**: frontend
- **Lines**: 430
- **Size**: 15.67 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 13

### client/src/pages/accounting/Invoices.tsx

- **Type**: frontend
- **Lines**: 256
- **Size**: 9.27 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 10

### client/src/pages/accounting/Payments.tsx

- **Type**: frontend
- **Lines**: 205
- **Size**: 7.40 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/components/calendar/EventFormDialog.test.tsx

- **Type**: frontend
- **Lines**: 181
- **Size**: 4.47 KB
- **Issues**:
  - No exports found
- **Dependencies**: 4

### client/src/components/calendar/EventFormDialog.tsx

- **Type**: frontend
- **Lines**: 501
- **Size**: 19.35 KB
- **Issues**:
  - Contains `any` types
  - Large file (501 lines)
- **Dependencies**: 3

### client/src/components/calendar/EventInvitationDialog.tsx

- **Type**: frontend
- **Lines**: 432
- **Size**: 15.51 KB
- **Issues**:
  - Contains console.log statements
- **Dependencies**: 4

### client/src/components/calendar/InvitationSettingsDialog.tsx

- **Type**: frontend
- **Lines**: 314
- **Size**: 10.69 KB
- **Issues**:
  - Contains console.log statements
- **Dependencies**: 3

### client/src/components/clients/AddCommunicationModal.tsx

- **Type**: frontend
- **Lines**: 189
- **Size**: 5.40 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 8

### client/src/components/clients/PurchasePatternsWidget.tsx

- **Type**: frontend
- **Lines**: 474
- **Size**: 19.83 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 4

### client/src/components/comments/MentionRenderer.test.tsx

- **Type**: frontend
- **Lines**: 136
- **Size**: 5.04 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/components/common/BackButton.test.tsx

- **Type**: frontend
- **Lines**: 102
- **Size**: 2.86 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/components/common/UserSelector.test.tsx

- **Type**: frontend
- **Lines**: 126
- **Size**: 3.24 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/components/dashboard/ScratchPad.tsx

- **Type**: frontend
- **Lines**: 218
- **Size**: 6.62 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 9

### client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx

- **Type**: frontend
- **Lines**: 78
- **Size**: 2.92 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 6

### client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx

- **Type**: frontend
- **Lines**: 71
- **Size**: 2.46 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 5

### client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx

- **Type**: frontend
- **Lines**: 64
- **Size**: 2.26 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 5

### client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx

- **Type**: frontend
- **Lines**: 318
- **Size**: 9.77 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 13

### client/src/components/dashboard/widgets-v2/SalesByClientWidget.test.tsx

- **Type**: frontend
- **Lines**: 76
- **Size**: 2.31 KB
- **Issues**:
  - No exports found
- **Dependencies**: 3

### client/src/components/dashboard/widgets-v2/SmartOpportunitiesWidget.tsx

- **Type**: frontend
- **Lines**: 165
- **Size**: 5.70 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 8

### client/src/components/dashboard/widgets-v2/TemplateSelector.tsx

- **Type**: frontend
- **Lines**: 449
- **Size**: 11.50 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 2

### client/src/components/dashboard/widgets-v2/TopStrainFamiliesWidget.tsx

- **Type**: frontend
- **Lines**: 109
- **Size**: 3.67 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 6

### client/src/components/inventory/AdvancedFilters.tsx

- **Type**: frontend
- **Lines**: 274
- **Size**: 8.59 KB
- **Issues**:
  - Contains `any` types
- **Dependencies**: 7

### client/src/components/inventory/BatchDetailDrawer.tsx

- **Type**: frontend
- **Lines**: 617
- **Size**: 20.68 KB
- **Issues**:
  - Contains `any` types
  - Large file (617 lines)
- **Dependencies**: 11
