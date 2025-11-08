import { z } from "zod";
import { router } from "../_core/trpc";
import * as pricingEngine from "../pricingEngine";
import { requirePermission } from "../_core/permissionMiddleware";

export const pricingRouter = router({
    // Pricing Rules
    listRules: requirePermission("pricing:read")
      .query(async () => {
        return await pricingEngine.getPricingRules();
      }),

    getRuleById: requirePermission("pricing:read")
      .input(z.object({ ruleId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingRuleById(input.ruleId);
      }),

    createRule: requirePermission("pricing:create")
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
        adjustmentValue: z.number(),
        conditions: z.record(z.string(), z.any()),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await pricingEngine.createPricingRule(input);
      }),

    updateRule: requirePermission("pricing:update")
      .input(z.object({
        ruleId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]).optional(),
        adjustmentValue: z.number().optional(),
        conditions: z.record(z.string(), z.any()).optional(),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ruleId, ...data } = input;
        await pricingEngine.updatePricingRule(ruleId, data);
        return { success: true };
      }),

    deleteRule: requirePermission("pricing:read")
      .input(z.object({ ruleId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingRule(input.ruleId);
        return { success: true };
      }),

    // Pricing Profiles
    listProfiles: requirePermission("pricing:read")
      .query(async () => {
        return await pricingEngine.getPricingProfiles();
      }),

    getProfileById: requirePermission("pricing:read")
      .input(z.object({ profileId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingProfileById(input.profileId);
      }),

    createProfile: requirePermission("pricing:create")
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })),
      }))
      .mutation(async ({ input, ctx }) => {
        return await pricingEngine.createPricingProfile({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    updateProfile: requirePermission("pricing:update")
      .input(z.object({
        profileId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { profileId, ...data } = input;
        await pricingEngine.updatePricingProfile(profileId, data);
        return { success: true };
      }),

    deleteProfile: requirePermission("pricing:read")
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingProfile(input.profileId);
        return { success: true };
      }),

    applyProfileToClient: requirePermission("pricing:read")
      .input(z.object({ clientId: z.number(), profileId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.applyProfileToClient(input.clientId, input.profileId);
        return { success: true };
      }),

    // Client Pricing
    getClientPricingRules: requirePermission("pricing:read")
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getClientPricingRules(input.clientId);
      }),
  })
