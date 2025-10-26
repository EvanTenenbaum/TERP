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
});

export type AppRouter = typeof appRouter;

