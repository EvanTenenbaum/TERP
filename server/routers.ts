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
import { creditRouter } from "./routers/credit";
import { creditsRouter } from "./routers/credits";
import { badDebtRouter } from "./routers/badDebt";
import { inventoryMovementsRouter } from "./routers/inventoryMovements";
import { pricingRouter } from "./routers/pricing";
import { salesSheetsRouter } from "./routers/salesSheets";
import { ordersRouter } from "./routers/orders";
import { auditLogsRouter } from "./routers/auditLogs";
import { configurationRouter } from "./routers/configuration";
import { accountingHooksRouter } from "./routers/accountingHooks";
import { samplesRouter } from "./routers/samples";
import { dashboardEnhancedRouter } from "./routers/dashboardEnhanced";
import { salesSheetEnhancementsRouter } from "./routers/salesSheetEnhancements";
import { advancedTagFeaturesRouter } from "./routers/advancedTagFeatures";
import { productIntakeRouter } from "./routers/productIntake";
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
  credit: creditRouter,
  credits: creditsRouter,
  badDebt: badDebtRouter,
  inventoryMovements: inventoryMovementsRouter,
  pricing: pricingRouter,
  salesSheets: salesSheetsRouter,
  orders: ordersRouter,
  auditLogs: auditLogsRouter,
  configuration: configurationRouter,
  accountingHooks: accountingHooksRouter,
  samples: samplesRouter,
  dashboardEnhanced: dashboardEnhancedRouter,
  salesSheetEnhancements: salesSheetEnhancementsRouter,
  advancedTagFeatures: advancedTagFeaturesRouter,
  productIntake: productIntakeRouter,
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
  // Debug router - only registered in development
  ...(debugRouter ? { debug: debugRouter } : {}),
});

export type AppRouter = typeof appRouter;
