import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

// Import domain-specific routers
import { authRouter } from "./routers/auth";
import { inventoryRouter } from "./routers/inventory";
import { settingsRouter } from "./routers/settings";
import { strainsRouter } from "./routers/strains";
import { cogsRouter } from "./routers/cogs";
import { scratchPadRouter } from "./routers/scratchPad";
import { dashboardRouter } from "./routers/dashboard";
import { accountingRouter } from "./routers/accounting";
import { freeformNotesRouter } from "./routers/freeformNotes";
import { clientsRouter } from "./routers/clients";
import { clientLedgerRouter } from "./routers/clientLedger";
import { creditRouter } from "./routers/credit";
import { creditsRouter } from "./routers/credits";
import { badDebtRouter } from "./routers/badDebt";
import { inventoryMovementsRouter } from "./routers/inventoryMovements";
import { pricingRouter } from "./routers/pricing";
import { salesSheetsRouter } from "./routers/salesSheets";
import { ordersRouter } from "./routers/orders";
import { quotesRouter } from "./routers/quotes";
import { invoicesRouter } from "./routers/invoices";
import { paymentsRouter } from "./routers/payments";
import { auditLogsRouter } from "./routers/auditLogs";
import { configurationRouter } from "./routers/configuration";
import { accountingHooksRouter } from "./routers/accountingHooks";
import { samplesRouter } from "./routers/samples";
import { dashboardEnhancedRouter } from "./routers/dashboardEnhanced";
import { salesSheetEnhancementsRouter } from "./routers/salesSheetEnhancements";
import { advancedTagFeaturesRouter } from "./routers/advancedTagFeatures";
import { tagsRouter } from "./routers/tags"; // FEAT-002: Tag System Revamp
import { productIntakeRouter } from "./routers/productIntake";
import { intakeReceiptsRouter } from "./routers/intakeReceipts"; // FEAT-008: Intake Verification System
import { orderEnhancementsRouter } from "./routers/orderEnhancements";
import { clientNeedsEnhancedRouter } from "./routers/clientNeedsEnhanced";
import { vendorSupplyRouter } from "./routers/vendorSupply";
import { vendorsRouter } from "./routers/vendors";
import { purchaseOrdersRouter } from "./routers/purchaseOrders";
import { locationsRouter } from "./routers/locations";
import { returnsRouter } from "./routers/returns";
import { refundsRouter } from "./routers/refunds";
import { warehouseTransfersRouter } from "./routers/warehouseTransfers";
import { poReceivingRouter } from "./routers/poReceiving";
import { matchingEnhancedRouter } from "./routers/matchingEnhanced";
import { userManagementRouter } from "./routers/userManagement";
import { dataCardMetricsRouter } from "./routers/dataCardMetrics";
import { adminRouter } from "./routers/admin";
import { adminImportRouter } from "./routers/adminImport";
import { analyticsRouter } from "./routers/analytics";
import { adminMigrationsRouter } from "./routers/adminMigrations";
import { adminQuickFixRouter } from "./routers/adminQuickFix";
import { adminSchemaPushRouter } from "./routers/adminSchemaPush";
import { adminSchemaRouter } from "./routers/adminSchema";
import { adminDataAugmentRouter } from "./routers/adminDataAugment";
import { vipPortalRouter } from "./routers/vipPortal";
import { vipPortalAdminRouter } from "./routers/vipPortalAdmin";
import { vipTiersRouter } from "./routers/vipTiers";
// ordersEnhancedV2Router consolidated into ordersRouter (RF-001)
import { pricingDefaultsRouter } from "./routers/pricingDefaults";
import { dashboardPreferencesRouter } from "./routers/dashboardPreferences";
import { todoListsRouter } from "./routers/todoLists";
import { todoTasksRouter } from "./routers/todoTasks";
import { commentsRouter } from "./routers/comments";
import { usersRouter } from "./routers/users";
import { inboxRouter } from "./routers/inbox";
import { notificationsRouter } from "./routers/notifications";
import { todoActivityRouter } from "./routers/todoActivity";
import { calendarRouter } from "./routers/calendar";
import { calendarParticipantsRouter } from "./routers/calendarParticipants";
import { calendarRemindersRouter } from "./routers/calendarReminders";
import { calendarViewsRouter } from "./routers/calendarViews";
import { calendarRecurrenceRouter } from "./routers/calendarRecurrence";
import { calendarMeetingsRouter } from "./routers/calendarMeetings";
import { calendarFinancialsRouter } from "./routers/calendarFinancials";
import { calendarInvitationsRouter } from "./routers/calendarInvitations";
import { calendarsManagementRouter } from "./routers/calendars"; // Refactored per QA review (PR #110)
import { appointmentRequestsRouter } from "./routers/appointmentRequests";
import { timeOffRequestsRouter } from "./routers/timeOffRequests";
import { rbacUsersRouter } from "./routers/rbac-users";
import { rbacRolesRouter } from "./routers/rbac-roles";
import { rbacPermissionsRouter } from "./routers/rbac-permissions";
import { workflowQueueRouter } from "./routers/workflow-queue";
import { deploymentsRouter } from "./routers/deployments";
import { monitoringRouter } from "./routers/monitoring";
import { searchRouter } from "./routers/search";
import { leaderboardRouter } from "./routers/leaderboard";
import { liveShoppingRouter } from "./routers/liveShopping";
import { vipPortalLiveShoppingRouter } from "./routers/vipPortalLiveShopping";
import { unifiedSalesPortalRouter } from "./routers/unifiedSalesPortal";
import { pickPackRouter } from "./routers/pickPack";
import { referralsRouter } from "./routers/referrals";
import { auditRouter } from "./routers/audit";
import { receiptsRouter } from "./routers/receipts";
// DELETED: flowerIntakeRouter - unused (Wave 5 cleanup)
import { alertsRouter } from "./routers/alerts";
// DELETED: inventoryShrinkageRouter - unused (Wave 5 cleanup)
import { photographyRouter } from "./routers/photography";
// DELETED: quickCustomerRouter - unused (Wave 5 cleanup)
// DELETED: customerPreferencesRouter - unused (Wave 5 cleanup)
import { vendorRemindersRouter } from "./routers/vendorReminders";
import { featureFlagsRouter } from "./routers/featureFlags";
import { adminSetupRouter } from "./routers/adminSetup";
import { spreadsheetRouter } from "./routers/spreadsheet";
import { catalogRouter } from "./routers/catalog";
import { organizationSettingsRouter } from "./routers/organizationSettings";
import { cashAuditRouter } from "./routers/cashAudit";
import { vendorPayablesRouter } from "./routers/vendorPayables"; // MEET-005: Payables Due When SKU Hits Zero
import { schedulingRouter } from "./routers/scheduling"; // Sprint 4 Track D: Scheduling System
import { client360Router } from "./routers/client360"; // Sprint 4 Track B: Client 360 View
import { clientWantsRouter } from "./routers/clientWants"; // Sprint 4 Track B: Client Wants/Needs (MEET-021)
import { officeSupplyRouter } from "./routers/officeSupply"; // Sprint 4 Track B: Office Supply (MEET-055)
import { storageRouter } from "./routers/storage"; // Sprint 5 Track E: Storage & Location (MEET-067, MEET-068)
import { productCategoriesRouter } from "./routers/productCategories"; // Sprint 5 Track E: Category/Subcategory Data Flow (MEET-069)
import { hourTrackingRouter } from "./routers/hourTracking"; // Sprint 5 Track E: Hour Tracking (MEET-048)
import { rbacEnhancedRouter } from "./routers/rbacEnhanced"; // Sprint 5 Track E: User Roles & Permissions (MEET-051)
import { gamificationRouter } from "./routers/gamification"; // Sprint 5 Track B: Gamification (MEET-044, MEET-045, FEAT-006)

// Sprint 5 Track D: Transaction & Product Features
import { invoiceDisputesRouter } from "./routers/invoiceDisputes"; // MEET-017: Invoice History (Debt Disputes)
import { transactionFeesRouter } from "./routers/transactionFees"; // MEET-018: Transaction Fee Per Client
import { paymentTermsRouter } from "./routers/paymentTerms"; // MEET-035: Payment Terms (Consignment/Cash/COD)
import { productCategoriesExtendedRouter } from "./routers/productCategoriesExtended"; // MEET-032: Customizable Categories
import { productGradesRouter } from "./routers/productGrades"; // MEET-070: Product Grades (AAAA/AAA/AA/B/C)
import { serviceBillingRouter } from "./routers/serviceBilling"; // MEET-009: Billing for Services
import { cryptoPaymentsRouter } from "./routers/cryptoPayments"; // MEET-019: Crypto Payment Tracking
import { installmentPaymentsRouter } from "./routers/installmentPayments"; // MEET-036: Installment Payments

import { healthRouter } from "./routers/health";

import { productCatalogueRouter } from "./routers/productCatalogue";

// Debug router - only imported in development
// Wrapped in try-catch to handle module resolution issues in test environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let debugRouter: any = null;
// TEMPORARY: Enable debug router in production for diagnostics (REMOVE AFTER DEBUGGING)
// Original: if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  try {
    debugRouter = require("./routers/debug").debugRouter;
  } catch {
    // Debug router not available - this is fine in test environments
    debugRouter = null;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  inventory: inventoryRouter,
  settings: settingsRouter,
  strains: strainsRouter,
  cogs: cogsRouter,
  scratchPad: scratchPadRouter,
  dashboard: dashboardRouter,
  accounting: accountingRouter,
  freeformNotes: freeformNotesRouter,
  clients: clientsRouter,
  clientLedger: clientLedgerRouter, // FEAT-009 / MEET-010: Client Ledger System
  credit: creditRouter,
  credits: creditsRouter,
  badDebt: badDebtRouter,
  inventoryMovements: inventoryMovementsRouter,
  pricing: pricingRouter,
  salesSheets: salesSheetsRouter,
  orders: ordersRouter,
  quotes: quotesRouter, // Wave 5A: Sales Workflow - Quote Management
  invoices: invoicesRouter, // Wave 5A: Sales Workflow - Invoice Management
  payments: paymentsRouter, // Wave 5A: Sales Workflow - Payment Recording
  auditLogs: auditLogsRouter,
  configuration: configurationRouter,
  accountingHooks: accountingHooksRouter,
  samples: samplesRouter,
  dashboardEnhanced: dashboardEnhancedRouter,
  salesSheetEnhancements: salesSheetEnhancementsRouter,
  advancedTagFeatures: advancedTagFeaturesRouter,
  tags: tagsRouter, // FEAT-002: Tag System Revamp
  productIntake: productIntakeRouter,
  intakeReceipts: intakeReceiptsRouter, // FEAT-008: Intake Verification System (MEET-064 to MEET-066)
  orderEnhancements: orderEnhancementsRouter,
  clientNeeds: clientNeedsEnhancedRouter,
  vendorSupply: vendorSupplyRouter,
  vendors: vendorsRouter,
  purchaseOrders: purchaseOrdersRouter,
  locations: locationsRouter,
  returns: returnsRouter,
  refunds: refundsRouter,
  warehouseTransfers: warehouseTransfersRouter,
  poReceiving: poReceivingRouter,
  matching: matchingEnhancedRouter,
  userManagement: userManagementRouter,
  dataCardMetrics: dataCardMetricsRouter,
  admin: adminRouter,
  adminImport: adminImportRouter,
  analytics: analyticsRouter,
  adminMigrations: adminMigrationsRouter,
  adminQuickFix: adminQuickFixRouter,
  adminSchemaPush: adminSchemaPushRouter,
  adminSchema: adminSchemaRouter,
  adminDataAugment: adminDataAugmentRouter,
  vipPortal: vipPortalRouter,
  vipPortalAdmin: vipPortalAdminRouter,
  vipTiers: vipTiersRouter, // FEAT-019: VIP Tier System
  // ordersEnhancedV2: Consolidated into orders router (RF-001)
  pricingDefaults: pricingDefaultsRouter,
  dashboardPreferences: dashboardPreferencesRouter,
  todoLists: todoListsRouter,
  todoTasks: todoTasksRouter,
  comments: commentsRouter,
  users: usersRouter,
  inbox: inboxRouter,
  notifications: notificationsRouter,
  todoActivity: todoActivityRouter,
  calendar: calendarRouter,
  calendarParticipants: calendarParticipantsRouter,
  calendarReminders: calendarRemindersRouter,
  calendarViews: calendarViewsRouter,
  calendarRecurrence: calendarRecurrenceRouter,
  calendarMeetings: calendarMeetingsRouter,
  calendarFinancials: calendarFinancialsRouter,
  calendarInvitations: calendarInvitationsRouter,
  calendarsManagement: calendarsManagementRouter, // CAL-001/CAL-002: Calendar Foundation
  appointmentRequests: appointmentRequestsRouter, // CAL-003: Appointment Request/Approval
  timeOffRequests: timeOffRequestsRouter, // CAL-004: Time Off Management
  rbacUsers: rbacUsersRouter,
  rbacRoles: rbacRolesRouter,
  rbacPermissions: rbacPermissionsRouter,
  workflowQueue: workflowQueueRouter,
  deployments: deploymentsRouter,
  monitoring: monitoringRouter,
  search: searchRouter,
  leaderboard: leaderboardRouter,
  liveShopping: liveShoppingRouter,
  vipPortalLiveShopping: vipPortalLiveShoppingRouter,
  unifiedSalesPortal: unifiedSalesPortalRouter,
  pickPack: pickPackRouter, // WS-003: Pick & Pack Module
  referrals: referralsRouter, // WS-004: Referral Credits System
  audit: auditRouter, // WS-005: No Black Box Audit Trail
  receipts: receiptsRouter, // WS-006: Receipt Generation
  // DELETED: flowerIntake - unused (Wave 5 cleanup)
  alerts: alertsRouter, // WS-008: Low Stock & Needs-Based Alerts
  // DELETED: inventoryShrinkage - unused (Wave 5 cleanup)
  photography: photographyRouter, // WS-010: Photography Module
  // DELETED: quickCustomer - unused (Wave 5 cleanup)
  // DELETED: customerPreferences - unused (Wave 5 cleanup)
  vendorReminders: vendorRemindersRouter, // WS-014: Vendor Harvest Reminders
  featureFlags: featureFlagsRouter,
  adminSetup: adminSetupRouter, // Feature Flag System
  spreadsheet: spreadsheetRouter,
  catalog: catalogRouter, // INV-4: Catalog Publishing
  organizationSettings: organizationSettingsRouter, // FEAT-010 to FEAT-015: Organization Settings & Preferences
  cashAudit: cashAuditRouter, // FEAT-007: Cash Audit System
  vendorPayables: vendorPayablesRouter, // MEET-005: Payables Due When SKU Hits Zero
  scheduling: schedulingRouter, // Sprint 4 Track D: Scheduling System (FEAT-005-BE, MEET-046, MEET-047, MEET-050, MEET-034)
  client360: client360Router, // Sprint 4 Track B: Client 360 View (ENH-002, MEET-007, MEET-012, MEET-013, MEET-020, MEET-021, MEET-022, WS-011)
  clientWants: clientWantsRouter, // Sprint 4 Track B: Client Wants/Needs Tracking (MEET-021)
  officeSupply: officeSupplyRouter, // Sprint 4 Track B: Office Supply Needs (MEET-055)
  storage: storageRouter, // Sprint 5 Track E: Storage & Location (MEET-067, MEET-068)
  productCategories: productCategoriesRouter, // Sprint 5 Track E: Category/Subcategory Data Flow (MEET-069)
  hourTracking: hourTrackingRouter, // Sprint 5 Track E: Hour Tracking (MEET-048)
  gamification: gamificationRouter, // Sprint 5 Track B: Gamification (MEET-044, MEET-045, FEAT-006)

  // Sprint 5 Track D: Transaction & Product Features
  invoiceDisputes: invoiceDisputesRouter, // MEET-017: Invoice History (Debt Disputes)
  transactionFees: transactionFeesRouter, // MEET-018: Transaction Fee Per Client
  paymentTerms: paymentTermsRouter, // MEET-035: Payment Terms (Consignment/Cash/COD)
  productCategoriesExtended: productCategoriesExtendedRouter, // MEET-032: Customizable Categories
  productGrades: productGradesRouter, // MEET-070: Product Grades (AAAA/AAA/AA/B/C)
  serviceBilling: serviceBillingRouter, // MEET-009: Billing for Services
  cryptoPayments: cryptoPaymentsRouter, // MEET-019: Crypto Payment Tracking
  installmentPayments: installmentPaymentsRouter, // MEET-036: Installment Payments

  health: healthRouter, // INFRA-004: Health Check Endpoint

  productCatalogue: productCatalogueRouter, // FEATURE-011: Unified Product Catalogue

  // Debug router - only registered in development
  ...(debugRouter ? { debug: debugRouter } : {}),
});

export type AppRouter = typeof appRouter;
