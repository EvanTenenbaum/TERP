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
import { matchingEnhancedRouter } from "./routers/matchingEnhanced";
import { userManagementRouter } from "./routers/userManagement";
import { dataCardMetricsRouter } from "./routers/dataCardMetrics";
import { adminRouter } from "./routers/admin";
import { adminImportRouter } from "./routers/adminImport";
import { analyticsRouter } from "./routers/analytics";
import { adminMigrationsRouter } from "./routers/adminMigrations";
import { adminQuickFixRouter } from "./routers/adminQuickFix";
import { adminSchemaPushRouter } from "./routers/adminSchemaPush";

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
  matching: matchingEnhancedRouter,
  userManagement: userManagementRouter,
  dataCardMetrics: dataCardMetricsRouter,
  admin: adminRouter,
  adminImport: adminImportRouter,
  analytics: analyticsRouter,
  adminMigrations: adminMigrationsRouter,
  adminQuickFix: adminQuickFixRouter,
  adminSchemaPush: adminSchemaPushRouter,
});

export type AppRouter = typeof appRouter;

