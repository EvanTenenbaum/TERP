import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import * as paymentMethodsDb from "../paymentMethodsDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const settingsRouter = router({
    // Locations
    locations: router({
      list: protectedProcedure.use(requirePermission("settings:read")).query(async () => {
        return await inventoryDb.getAllLocations();
      }),
      create: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createLocation(input);
        }),
      update: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          id: z.number(),
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateLocation(input);
        }),
      delete: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteLocation(input.id);
        }),
    }),

    // Categories
    categories: router({
      list: protectedProcedure.use(requirePermission("settings:read")).query(async () => {
        return await inventoryDb.getAllCategoriesWithSubcategories();
      }),
      create: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createCategory(input.name);
        }),
      update: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateCategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteCategory(input.id);
        }),
    }),

    // Subcategories
    subcategories: router({
      create: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          categoryId: z.number(),
          name: z.string(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createSubcategory(input.categoryId, input.name);
        }),
      update: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateSubcategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteSubcategory(input.id);
        }),
    }),

    // Grades
    grades: router({
      list: protectedProcedure.use(requirePermission("settings:read")).query(async () => {
        return await inventoryDb.getAllGrades();
      }),
      create: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createGrade(input.name);
        }),
      update: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateGrade(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteGrade(input.id);
        }),
    }),

    // Payment Methods
    paymentMethods: router({
      list: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          activeOnly: z.boolean().optional().default(false),
        }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getAllPaymentMethods(input.activeOnly);
        }),
      
      getById: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodById(input.id);
        }),
      
      getByCode: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ code: z.string() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodByCode(input.code);
        }),
      
      create: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          code: z.string().min(1).max(50),
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          sortOrder: z.number().optional().default(0),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.createPaymentMethod(input);
        }),
      
      update: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          id: z.number(),
          code: z.string().min(1).max(50).optional(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await paymentMethodsDb.updatePaymentMethod(id, data);
        }),
      
      activate: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.activatePaymentMethod(input.id);
        }),
      
      deactivate: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deactivatePaymentMethod(input.id);
        }),
      
      delete: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deletePaymentMethod(input.id);
        }),
      
      reorder: protectedProcedure.use(requirePermission("settings:read"))
        .input(z.object({
          orderedIds: z.array(z.number()),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.reorderPaymentMethods(input.orderedIds);
        }),
      
      seedDefaults: protectedProcedure.use(requirePermission("settings:read"))
        .mutation(async () => {
          await paymentMethodsDb.seedDefaultPaymentMethods();
          return { success: true };
        }),
    }),

    // Database seeding - Publicly accessible (no auth required)
    seedDatabase: publicProcedure
      .input(z.object({
        scenario: z.enum(["light", "full", "edgeCases", "chaos"]).optional().default("light"),
      }))
      .mutation(async ({ input }) => {
        // Validate scenario value first
        const validScenarios = ["light", "full", "edgeCases", "chaos"] as const;
        const scenario = input.scenario || "light";
        if (!validScenarios.includes(scenario as any)) {
          throw new Error(`Invalid scenario: ${scenario}. Must be one of: ${validScenarios.join(", ")}`);
        }
        
        // Check DATABASE_URL availability with helpful error message
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          console.error("[Seed API] DATABASE_URL check failed", {
            availableEnvVars: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("DB")),
            nodeEnv: process.env.NODE_ENV,
          });
          throw new Error(
            "DATABASE_URL environment variable is not configured on the server. " +
            "Please ensure DATABASE_URL is set in the DigitalOcean App Platform environment variables."
          );
        }
        
        // Set the scenario via process.argv to match the script's expected format
        const originalArgv = process.argv;
        process.argv = ["node", "script", scenario];
        
        try {
          // The seed script uses db-sync.ts which will use process.env.DATABASE_URL
          // We've already verified it exists above, but double-check for safety
          if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL was lost between validation and execution");
          }
          
          // Dynamically import and execute the seed function
          const { seedRealisticData } = await import("../../scripts/seed-realistic-main.js");
          
          if (!seedRealisticData || typeof seedRealisticData !== "function") {
            throw new Error("seedRealisticData function not found or invalid");
          }
          
          // Execute the seed function
          await seedRealisticData();
          
          return {
            success: true,
            message: `Database seeded successfully with ${scenario} scenario`,
          };
        } catch (error: any) {
          // Preserve original error details for debugging
          const errorMessage = error?.message || "Unknown error";
          const errorCode = error?.code || "UNKNOWN_ERROR";
          const errorDetails = error?.cause ? ` (${error.cause})` : "";
          
          // Log the full error for server-side debugging
          console.error("[Seed API Error]", {
            scenario: scenario,
            error: errorMessage,
            code: errorCode,
            stack: error?.stack,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
          });
          
          throw new Error(`Seed failed: ${errorMessage}${errorDetails}`);
        } finally {
          // Always restore original argv
          process.argv = originalArgv;
        }
      }),
  })
