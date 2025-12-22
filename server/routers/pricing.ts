import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as pricingEngine from "../pricingEngine";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  nameSchema,
  descriptionSchema,
  idSchema,
  prioritySchema,
  flexiblePricingConditionsSchema,
} from "../_core/validationSchemas";

/**
 * Pricing Router
 * QUAL-002: Updated with proper validation schemas (no z.any())
 */
export const pricingRouter = router({
    // Pricing Rules
    listRules: protectedProcedure.use(requirePermission("pricing:read"))
      .query(async () => {
        return await pricingEngine.getPricingRules();
      }),

    getRuleById: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ ruleId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingRuleById(input.ruleId);
      }),

    createRule: protectedProcedure.use(requirePermission("pricing:create"))
      .input(z.object({
        name: nameSchema,
        description: descriptionSchema,
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
        adjustmentValue: z.number().min(-100, "Adjustment value cannot be less than -100%").max(1000, "Adjustment value cannot exceed 1000%"),
        conditions: flexiblePricingConditionsSchema,
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: prioritySchema.optional(),
      }))
      .mutation(async ({ input }) => {
        return await pricingEngine.createPricingRule(input);
      }),

    updateRule: protectedProcedure.use(requirePermission("pricing:update"))
      .input(z.object({
        ruleId: idSchema,
        name: nameSchema.optional(),
        description: descriptionSchema,
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]).optional(),
        adjustmentValue: z.number().min(-100, "Adjustment value cannot be less than -100%").max(1000, "Adjustment value cannot exceed 1000%").optional(),
        conditions: flexiblePricingConditionsSchema.optional(),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: prioritySchema.optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ruleId, ...data } = input;
        await pricingEngine.updatePricingRule(ruleId, data);
        return { success: true };
      }),

    deleteRule: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ ruleId: idSchema }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingRule(input.ruleId);
        return { success: true };
      }),

    // Pricing Profiles
    listProfiles: protectedProcedure.use(requirePermission("pricing:read"))
      .query(async () => {
        return await pricingEngine.getPricingProfiles();
      }),

    getProfileById: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ profileId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingProfileById(input.profileId);
      }),

    createProfile: protectedProcedure.use(requirePermission("pricing:create"))
      .input(z.object({
        name: nameSchema,
        description: descriptionSchema,
        rules: z.array(z.object({ 
          ruleId: idSchema, 
          priority: prioritySchema 
        })).min(1, "At least one rule is required"),
      }))
      .mutation(async ({ input, ctx }) => {
        return await pricingEngine.createPricingProfile({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    updateProfile: protectedProcedure.use(requirePermission("pricing:update"))
      .input(z.object({
        profileId: idSchema,
        name: nameSchema.optional(),
        description: descriptionSchema,
        rules: z.array(z.object({ 
          ruleId: idSchema, 
          priority: prioritySchema 
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { profileId, ...data } = input;
        await pricingEngine.updatePricingProfile(profileId, data);
        return { success: true };
      }),

    deleteProfile: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ profileId: idSchema }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingProfile(input.profileId);
        return { success: true };
      }),

    applyProfileToClient: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ 
        clientId: idSchema, 
        profileId: idSchema 
      }))
      .mutation(async ({ input }) => {
        await pricingEngine.applyProfileToClient(input.clientId, input.profileId);
        return { success: true };
      }),

    // Client Pricing
    getClientPricingRules: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ clientId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getClientPricingRules(input.clientId);
      }),
  })
