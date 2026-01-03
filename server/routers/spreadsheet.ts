import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { middleware, protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { featureFlagService } from "../services/featureFlagService";
import {
  getClientGridData,
  getInventoryGridData,
  type ClientGridQuery,
  type InventoryGridQuery,
} from "../services/spreadsheetViewService";

const spreadsheetFeatureGuard = middleware(async ({ ctx, next }) => {
  const enabled = await featureFlagService.isEnabled("spreadsheet-view", {
    userOpenId: ctx.user.openId,
  });

  if (!enabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Spreadsheet view is disabled by feature flag",
    });
  }

  return next();
});

const inventoryInputSchema = z
  .object({
    limit: z.number().min(1).max(200).optional(),
    cursor: z.number().optional(),
    status: z.string().optional(),
    category: z.string().optional(),
  })
  .optional();

const clientInputSchema = z.object({
  clientId: z.number(),
});

export const spreadsheetRouter = router({
  getInventoryGridData: protectedProcedure
    .use(spreadsheetFeatureGuard)
    .use(requirePermission("inventory:read"))
    .input(inventoryInputSchema)
    .query(async ({ input }) => {
      const params: InventoryGridQuery = input ?? {};
      return getInventoryGridData(params);
    }),

  getClientGridData: protectedProcedure
    .use(spreadsheetFeatureGuard)
    .use(requirePermission("orders:read"))
    .input(clientInputSchema)
    .query(async ({ input }) => {
      const params: ClientGridQuery = input;
      return getClientGridData(params);
    }),
});
