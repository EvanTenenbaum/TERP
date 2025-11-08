import { z } from "zod";
import { router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import * as paymentMethodsDb from "../paymentMethodsDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const settingsRouter = router({
    // Locations
    locations: router({
      list: requirePermission("settings:read").query(async () => {
        return await inventoryDb.getAllLocations();
      }),
      create: requirePermission("settings:read")
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
      update: requirePermission("settings:read")
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
      delete: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteLocation(input.id);
        }),
    }),

    // Categories
    categories: router({
      list: requirePermission("settings:read").query(async () => {
        return await inventoryDb.getAllCategoriesWithSubcategories();
      }),
      create: requirePermission("settings:read")
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createCategory(input.name);
        }),
      update: requirePermission("settings:read")
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateCategory(input.id, input.name, input.updateProducts);
        }),
      delete: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteCategory(input.id);
        }),
    }),

    // Subcategories
    subcategories: router({
      create: requirePermission("settings:read")
        .input(z.object({
          categoryId: z.number(),
          name: z.string(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createSubcategory(input.categoryId, input.name);
        }),
      update: requirePermission("settings:read")
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateSubcategory(input.id, input.name, input.updateProducts);
        }),
      delete: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteSubcategory(input.id);
        }),
    }),

    // Grades
    grades: router({
      list: requirePermission("settings:read").query(async () => {
        return await inventoryDb.getAllGrades();
      }),
      create: requirePermission("settings:read")
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createGrade(input.name);
        }),
      update: requirePermission("settings:read")
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateGrade(input.id, input.name, input.updateProducts);
        }),
      delete: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteGrade(input.id);
        }),
    }),

    // Payment Methods
    paymentMethods: router({
      list: requirePermission("settings:read")
        .input(z.object({
          activeOnly: z.boolean().optional().default(false),
        }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getAllPaymentMethods(input.activeOnly);
        }),
      
      getById: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodById(input.id);
        }),
      
      getByCode: requirePermission("settings:read")
        .input(z.object({ code: z.string() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodByCode(input.code);
        }),
      
      create: requirePermission("settings:read")
        .input(z.object({
          code: z.string().min(1).max(50),
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          sortOrder: z.number().optional().default(0),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.createPaymentMethod(input);
        }),
      
      update: requirePermission("settings:read")
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
      
      activate: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.activatePaymentMethod(input.id);
        }),
      
      deactivate: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deactivatePaymentMethod(input.id);
        }),
      
      delete: requirePermission("settings:read")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deletePaymentMethod(input.id);
        }),
      
      reorder: requirePermission("settings:read")
        .input(z.object({
          orderedIds: z.array(z.number()),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.reorderPaymentMethods(input.orderedIds);
        }),
      
      seedDefaults: requirePermission("settings:read")
        .mutation(async () => {
          await paymentMethodsDb.seedDefaultPaymentMethods();
          return { success: true };
        }),
    }),
  })
