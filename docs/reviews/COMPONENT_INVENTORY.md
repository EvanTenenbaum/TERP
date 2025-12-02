# TERP Component Inventory

**Generated**: 2025-12-02T20:54:19.986Z

## Frontend Components

### Pages (49)

- client/src/pages/AnalyticsPage.tsx
- client/src/pages/CalendarPage.tsx
- client/src/pages/ClientProfilePage.tsx
- client/src/pages/ClientsListPage.tsx
- client/src/pages/CogsSettingsPage.tsx
- client/src/pages/ComponentShowcase.tsx
- client/src/pages/CreditSettingsPage.tsx
- client/src/pages/DashboardV3.tsx
- client/src/pages/DebugOrders.tsx
- client/src/pages/Help.tsx
- client/src/pages/InboxPage.tsx
- client/src/pages/Inventory.tsx
- client/src/pages/LocationsPage.tsx
- client/src/pages/Login.tsx
- client/src/pages/MatchmakingServicePage.test.tsx
- client/src/pages/MatchmakingServicePage.tsx
- client/src/pages/NeedsManagementPage.tsx
- client/src/pages/NotFound.tsx
- client/src/pages/OrderCreatorPage.tsx
- client/src/pages/Orders.tsx
- client/src/pages/OrdersDebug.tsx
- client/src/pages/PricingProfilesPage.tsx
- client/src/pages/PricingRulesPage.tsx
- client/src/pages/PurchaseOrdersPage.tsx
- client/src/pages/Quotes.tsx
- client/src/pages/ReturnsPage.tsx
- client/src/pages/SalesSheetCreatorPage.tsx
- client/src/pages/SearchResultsPage.tsx
- client/src/pages/Settings.tsx
- client/src/pages/TodoListDetailPage.tsx
- client/src/pages/TodoListsPage.tsx
- client/src/pages/VIPPortalConfigPage.tsx
- client/src/pages/VendorProfilePage.tsx
- client/src/pages/VendorSupplyPage.tsx
- client/src/pages/VendorsPage.tsx
- client/src/pages/WorkflowQueuePage.test.tsx
- client/src/pages/WorkflowQueuePage.tsx
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
- client/src/pages/vip-portal/VIPDashboard.tsx
- client/src/pages/vip-portal/VIPLogin.tsx

### Components (215)

- client/src/components/CommandPalette.tsx
- client/src/components/DashboardLayout.tsx
- client/src/components/DashboardLayoutSkeleton.tsx
- client/src/components/ErrorBoundary.tsx
- client/src/components/ManusDialog.tsx
- client/src/components/UserManagement.tsx
- client/src/components/VendorNotesDialog.tsx
- client/src/components/VersionChecker.tsx
- client/src/components/accounting/AccountSelector.tsx
- client/src/components/accounting/AgingBadge.tsx
- client/src/components/accounting/AmountInput.tsx
- client/src/components/accounting/FiscalPeriodSelector.tsx
- client/src/components/accounting/JournalEntryForm.tsx
- client/src/components/accounting/StatusBadge.tsx
- client/src/components/accounting/index.ts
- client/src/components/calendar/AgendaView.tsx
- client/src/components/calendar/CalendarFilters.tsx
- client/src/components/calendar/DayView.tsx
- client/src/components/calendar/EventFormDialog.test.tsx
- client/src/components/calendar/EventFormDialog.tsx
- client/src/components/calendar/EventInvitationDialog.tsx
- client/src/components/calendar/InvitationSettingsDialog.tsx
- client/src/components/calendar/InvitationStatusBadge.tsx
- client/src/components/calendar/MonthView.tsx
- client/src/components/calendar/PendingInvitationsWidget.tsx
- client/src/components/calendar/WeekView.tsx
- client/src/components/clients/AddClientWizard.tsx
- client/src/components/clients/AddCommunicationModal.tsx
- client/src/components/clients/ClientCalendarTab.tsx
- client/src/components/clients/CommunicationTimeline.tsx
- client/src/components/clients/PurchasePatternsWidget.tsx
- client/src/components/cogs/CogsClientSettings.tsx
- client/src/components/cogs/CogsGlobalSettings.tsx
- client/src/components/comments/CommentItem.tsx
- client/src/components/comments/CommentList.tsx
- client/src/components/comments/CommentWidget.tsx
- client/src/components/comments/MentionInput.tsx
- client/src/components/comments/MentionRenderer.test.tsx
- client/src/components/comments/MentionRenderer.tsx
- client/src/components/common/BackButton.test.tsx
- client/src/components/common/BackButton.tsx
- client/src/components/common/UserSelector.test.tsx
- client/src/components/common/UserSelector.tsx
- client/src/components/credit/CreditLimitWidget.tsx
- client/src/components/dashboard/DashboardGrid.tsx
- client/src/components/dashboard/KpiSummaryRow.tsx
- client/src/components/dashboard/ScratchPad.tsx
- client/src/components/dashboard/WidgetContainer.tsx
- client/src/components/dashboard/v3/CustomizationPanel.tsx
- client/src/components/dashboard/v3/DashboardHeader.tsx
- client/src/components/dashboard/v3/DashboardLayoutManager.tsx
- client/src/components/dashboard/v3/WidgetContainer.tsx
- client/src/components/dashboard/v3/WidgetExplainer.tsx
- client/src/components/dashboard/v3/index.ts
- client/src/components/dashboard/widgets-v2/ActivityLogPanel.tsx
- client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/CashFlowWidget.tsx
- client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx
- client/src/components/dashboard/widgets-v2/CommentsPanel.tsx
- client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx
- client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx
- client/src/components/dashboard/widgets-v2/MatchmakingOpportunitiesWidget.tsx
- client/src/components/dashboard/widgets-v2/ProfitabilityWidget.tsx
- client/src/components/dashboard/widgets-v2/SalesByClientWidget.test.tsx
- client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx
- client/src/components/dashboard/widgets-v2/SalesComparisonWidget.tsx
- client/src/components/dashboard/widgets-v2/SmartOpportunitiesWidget.tsx
- client/src/components/dashboard/widgets-v2/TemplateSelector.tsx
- client/src/components/dashboard/widgets-v2/TopStrainFamiliesWidget.tsx
- client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx
- client/src/components/dashboard/widgets-v2/TransactionSnapshotWidget.tsx
- client/src/components/dashboard/widgets-v2/WorkflowActivityWidget.tsx
- client/src/components/dashboard/widgets-v2/WorkflowQueueWidget.tsx
- client/src/components/dashboard/widgets-v2/index.ts
- client/src/components/dashboard/widgets-v3/index.ts
- client/src/components/data-cards/DataCard.tsx
- client/src/components/data-cards/DataCardConfigDropdown.tsx
- client/src/components/data-cards/DataCardConfigModal.tsx
- client/src/components/data-cards/DataCardGrid.tsx
- client/src/components/data-cards/DataCardSection.tsx
- client/src/components/data-cards/index.ts
- client/src/components/inbox/InboxItem.tsx
- client/src/components/inbox/InboxPanel.tsx
- client/src/components/inbox/InboxWidget.tsx
- client/src/components/inventory/AdvancedFilters.tsx
- client/src/components/inventory/BatchDetailDrawer.tsx
- client/src/components/inventory/BulkActionsBar.tsx
- client/src/components/inventory/BulkConfirmDialog.tsx
- client/src/components/inventory/ClientInterestWidget.tsx
- client/src/components/inventory/CogsEditModal.tsx
- client/src/components/inventory/DashboardStats.tsx
- client/src/components/inventory/EditBatchModal.tsx
- client/src/components/inventory/FilterChips.tsx
- client/src/components/inventory/InventoryCard.tsx
- client/src/components/inventory/PotentialBuyersWidget.tsx
- client/src/components/inventory/PriceSimulationModal.tsx
- client/src/components/inventory/PurchaseModal.tsx
- client/src/components/inventory/SaveViewModal.tsx
- client/src/components/inventory/SavedViewsDropdown.tsx
- client/src/components/inventory/SearchHighlight.tsx
- client/src/components/inventory/SortControls.tsx
- client/src/components/inventory/StockLevelChart.tsx
- client/src/components/inventory/StrainInput.tsx
- client/src/components/layout/AppHeader.test.tsx
- client/src/components/layout/AppHeader.tsx
- client/src/components/layout/AppShell.tsx
- client/src/components/layout/AppSidebar.tsx
- client/src/components/needs/ClientNeedsTab.tsx
- client/src/components/needs/MatchBadge.tsx
- client/src/components/needs/MatchCard.tsx
- client/src/components/needs/NeedForm.tsx
- client/src/components/orders/AddCustomerOverlay.tsx
- client/src/components/orders/COGSInput.tsx
- client/src/components/orders/ClientPreview.tsx
- client/src/components/orders/CogsAdjustmentModal.tsx
- client/src/components/orders/ConfirmDraftModal.tsx
- client/src/components/orders/CreditLimitBanner.tsx
- client/src/components/orders/DeleteDraftModal.tsx
- client/src/components/orders/LineItemRow.tsx
- client/src/components/orders/LineItemTable.tsx
- client/src/components/orders/MarginInput.tsx
- client/src/components/orders/OrderAdjustmentPanel.tsx
- client/src/components/orders/OrderItemCard.tsx
- client/src/components/orders/OrderPreview.tsx
- client/src/components/orders/OrderStatusBadge.tsx
- client/src/components/orders/OrderStatusTimeline.tsx
- client/src/components/orders/OrderTotalsPanel.tsx
- client/src/components/orders/ProcessReturnModal.tsx
- client/src/components/orders/ReturnHistorySection.tsx
- client/src/components/orders/ShipOrderModal.tsx
- client/src/components/pricing/PricingConfigTab.tsx
- client/src/components/sales/InventoryBrowser.tsx
- client/src/components/sales/SalesSheetPreview.tsx
- client/src/components/settings/rbac/PermissionAssignment.tsx
- client/src/components/settings/rbac/RoleManagement.tsx
- client/src/components/settings/rbac/UserRoleManagement.tsx
- client/src/components/strain/StrainComponents.tsx
- client/src/components/supply/SupplyForm.tsx
- client/src/components/todos/QuickAddTaskModal.tsx
- client/src/components/todos/ShareListModal.tsx
- client/src/components/todos/TaskCard.tsx
- client/src/components/todos/TaskDetailModal.tsx
- client/src/components/todos/TaskForm.tsx
- client/src/components/todos/TodoListCard.tsx
- client/src/components/todos/TodoListForm.tsx
- client/src/components/ui/accordion.tsx
- client/src/components/ui/alert-dialog.tsx
- client/src/components/ui/alert.tsx
- client/src/components/ui/aspect-ratio.tsx
- client/src/components/ui/avatar.tsx
- client/src/components/ui/badge.tsx
- client/src/components/ui/breadcrumb.tsx
- client/src/components/ui/button-group.tsx
- client/src/components/ui/button.tsx
- client/src/components/ui/calendar.tsx
- client/src/components/ui/card.tsx
- client/src/components/ui/carousel.tsx
- client/src/components/ui/chart.tsx
- client/src/components/ui/checkbox.tsx
- client/src/components/ui/collapsible.tsx
- client/src/components/ui/command.tsx
- client/src/components/ui/context-menu.tsx
- client/src/components/ui/dialog.tsx
- client/src/components/ui/drawer.tsx
- client/src/components/ui/dropdown-menu.tsx
- client/src/components/ui/empty.tsx
- client/src/components/ui/field.tsx
- client/src/components/ui/form.tsx
- client/src/components/ui/hover-card.tsx
- client/src/components/ui/input-group.tsx
- client/src/components/ui/input-otp.tsx
- client/src/components/ui/input.tsx
- client/src/components/ui/item.tsx
- client/src/components/ui/kbd.tsx
- client/src/components/ui/kpi-card.tsx
- client/src/components/ui/label.tsx
- client/src/components/ui/menubar.tsx
- client/src/components/ui/navigation-menu.tsx
- client/src/components/ui/note-card.tsx
- client/src/components/ui/pagination.tsx
- client/src/components/ui/popover.tsx
- client/src/components/ui/progress.tsx
- client/src/components/ui/radio-group.tsx
- client/src/components/ui/resizable.tsx
- client/src/components/ui/scroll-area.tsx
- client/src/components/ui/select.tsx
- client/src/components/ui/separator.tsx
- client/src/components/ui/sheet.tsx
- client/src/components/ui/sidebar.tsx
- client/src/components/ui/skeleton.tsx
- client/src/components/ui/slider.tsx
- client/src/components/ui/sonner.tsx
- client/src/components/ui/spinner.tsx
- client/src/components/ui/switch.tsx
- client/src/components/ui/table.tsx
- client/src/components/ui/tabs.tsx
- client/src/components/ui/textarea.tsx
- client/src/components/ui/toggle-group.tsx
- client/src/components/ui/toggle.tsx
- client/src/components/ui/tooltip.tsx
- client/src/components/vip-portal/AccountsPayable.tsx
- client/src/components/vip-portal/AccountsReceivable.tsx
- client/src/components/vip-portal/Leaderboard.tsx
- client/src/components/vip-portal/LiveCatalog.tsx
- client/src/components/vip-portal/LiveCatalogConfig.tsx
- client/src/components/vip-portal/MarketplaceNeeds.tsx
- client/src/components/vip-portal/MarketplaceSupply.tsx
- client/src/components/vip-portal/TransactionHistory.tsx
- client/src/components/workflow/WorkflowAnalytics.tsx
- client/src/components/workflow/WorkflowBatchCard.tsx
- client/src/components/workflow/WorkflowBoard.tsx
- client/src/components/workflow/WorkflowColumn.tsx
- client/src/components/workflow/WorkflowHistory.tsx
- client/src/components/workflow/WorkflowSettings.tsx

### Hooks (17)

- client/src/hooks/orders/useMarginLookup.ts
- client/src/hooks/orders/useOrderCalculations.ts
- client/src/hooks/use-toast.ts
- client/src/hooks/use-version-check.ts
- client/src/hooks/useAuth.ts
- client/src/hooks/useComposition.ts
- client/src/hooks/useDebounce.ts
- client/src/hooks/useDebounceCallback.ts
- client/src/hooks/useInventoryFilters.ts
- client/src/hooks/useInventorySort.ts
- client/src/hooks/useKeyboardShortcuts.ts
- client/src/hooks/useMobile.tsx
- client/src/hooks/usePermissions.tsx
- client/src/hooks/usePersistFn.ts
- client/src/hooks/useStrainHooks.ts
- client/src/hooks/useUrlState.ts
- client/src/hooks/useVIPPortalAuth.ts

### Utils (1)

- client/src/utils/exportToCSV.ts

## Backend Components

### Routers (96)

- server/routers/accounting.test.ts
- server/routers/accounting.ts
- server/routers/accountingHooks.ts
- server/routers/admin-security.test.ts
- server/routers/admin.ts
- server/routers/adminImport.ts
- server/routers/adminMigrations.ts
- server/routers/adminQuickFix.ts
- server/routers/adminSchemaPush.ts
- server/routers/advancedTagFeatures.ts
- server/routers/analytics.test.ts
- server/routers/analytics.ts
- server/routers/auditLogs.ts
- server/routers/auth.ts
- server/routers/badDebt.test.ts
- server/routers/badDebt.ts
- server/routers/batches.test.ts
- server/routers/calendar.pagination.test.ts
- server/routers/calendar.qa042.test.ts
- server/routers/calendar.qa043.test.ts
- server/routers/calendar.test.ts
- server/routers/calendar.ts
- server/routers/calendarFinancials.test.ts
- server/routers/calendarFinancials.ts
- server/routers/calendarInvitations.test.ts
- server/routers/calendarInvitations.ts
- server/routers/calendarMeetings.ts
- server/routers/calendarParticipants.ts
- server/routers/calendarRecurrence.ts
- server/routers/calendarReminders.ts
- server/routers/calendarViews.ts
- server/routers/clientNeedsEnhanced.ts
- server/routers/clients.test.ts
- server/routers/clients.ts
- server/routers/cogs.ts
- server/routers/comments.test.ts
- server/routers/comments.ts
- server/routers/configuration.ts
- server/routers/credit.ts
- server/routers/credits.test.ts
- server/routers/credits.ts
- server/routers/dashboard.pagination.test.ts
- server/routers/dashboard.test.ts
- server/routers/dashboard.ts
- server/routers/dashboardEnhanced.ts
- server/routers/dashboardPreferences.ts
- server/routers/dataCardMetrics.ts
- server/routers/deployments.ts
- server/routers/freeformNotes.ts
- server/routers/inbox.ts
- server/routers/inventory.test.ts
- server/routers/inventory.ts
- server/routers/inventoryMovements.ts
- server/routers/locations.ts
- server/routers/matchingEnhanced.ts
- server/routers/monitoring.ts
- server/routers/orderEnhancements.ts
- server/routers/orders.test.ts
- server/routers/orders.ts
- server/routers/poReceiving.ts
- server/routers/pricing.test.ts
- server/routers/pricing.ts
- server/routers/pricingDefaults.ts
- server/routers/productIntake.ts
- server/routers/purchaseOrders.ts
- server/routers/rbac-permissions.test.ts
- server/routers/rbac-permissions.ts
- server/routers/rbac-roles.test.ts
- server/routers/rbac-roles.ts
- server/routers/rbac-users.test.ts
- server/routers/rbac-users.ts
- server/routers/refunds.ts
- server/routers/returns.ts
- server/routers/salesSheetEnhancements.ts
- server/routers/salesSheets.test.ts
- server/routers/salesSheets.ts
- server/routers/samples.ts
- server/routers/scratchPad.ts
- server/routers/search.ts
- server/routers/settings.ts
- server/routers/strains.ts
- server/routers/todoActivity.ts
- server/routers/todoLists.ts
- server/routers/todoTasks.ts
- server/routers/userManagement.ts
- server/routers/users.ts
- server/routers/vendorSupply.ts
- server/routers/vendors.test.ts
- server/routers/vendors.ts
- server/routers/vipPortal.liveCatalog.test.ts
- server/routers/vipPortal.ts
- server/routers/vipPortalAdmin.liveCatalog.test.ts
- server/routers/vipPortalAdmin.ts
- server/routers/warehouseTransfers.ts
- server/routers/workflow-queue.test.ts
- server/routers/workflow-queue.ts

### Services (22)

- server/services/cogsChangeIntegrationService.ts
- server/services/liveCatalogService.test.ts
- server/services/liveCatalogService.ts
- server/services/marginCalculationService.ts
- server/services/mentionParser.test.ts
- server/services/mentionParser.ts
- server/services/migrate.ts
- server/services/orderAuditService.ts
- server/services/orderValidationService.ts
- server/services/permissionService.test.ts
- server/services/permissionService.ts
- server/services/priceAlertsService.test.ts
- server/services/priceAlertsService.ts
- server/services/priceCalculationService.ts
- server/services/pricingService.ts
- server/services/pushSchema.ts
- server/services/rbacDefinitions.ts
- server/services/seedDefaults.ts
- server/services/seedRBAC.test.ts
- server/services/seedRBAC.ts
- server/services/strainService.ts
- server/services/todoPermissions.ts

### Database (1)

- server/db/queries/workflow-queue.ts

### Utils (4)

- server/utils/displayHelpers.ts
- server/utils/featureFlags.ts
- server/utils/softDelete.ts
- server/utils/strainAliases.ts

## Database

### Tables (0)

### Migrations (15)

15 migration files

## Tests

### Unit Tests (2)

- tests/integration/data-integrity.test.ts
- tests/setup.ts

### Integration Tests (0)

### E2E Tests (16)

- tests-e2e/auth.spec.ts
- tests-e2e/clients-crud.spec.ts
- tests-e2e/create-order.spec.ts
- tests-e2e/inventory-crud.spec.ts
- tests-e2e/live-catalog-admin.spec.ts
- tests-e2e/live-catalog-client.spec.ts
- tests-e2e/navigation-ui.spec.ts
- tests-e2e/orders-crud.spec.ts
- tests-e2e/page-objects/BasePage.ts
- tests-e2e/page-objects/CRUDPage.ts
- tests-e2e/page-objects/DashboardPage.ts
- tests-e2e/patterns/crud.spec.ts
- tests-e2e/patterns/dashboard.spec.ts
- tests-e2e/specialized/auth.spec.ts
- tests-e2e/utils/accessibility.ts
- tests-e2e/workflows-dashboard.spec.ts

## Summary

- **Total Frontend Files**: 282
- **Total Backend Files**: 123
- **Total Database Tables**: 0
- **Total Test Files**: 18
