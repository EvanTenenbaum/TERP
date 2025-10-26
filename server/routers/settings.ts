import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import * as paymentMethodsDb from "../paymentMethodsDb";

export const settingsRouter = router({
    // Locations
    locations: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllLocations();
      }),
      create: protectedProcedure
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
      update: protectedProcedure
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
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteLocation(input.id);
        }),
    }),

    // Categories
    categories: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllCategoriesWithSubcategories();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createCategory(input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateCategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteCategory(input.id);
        }),
    }),

    // Subcategories
    subcategories: router({
      create: protectedProcedure
        .input(z.object({
          categoryId: z.number(),
          name: z.string(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createSubcategory(input.categoryId, input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateSubcategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteSubcategory(input.id);
        }),
    }),

    // Grades
    grades: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllGrades();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createGrade(input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateGrade(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteGrade(input.id);
        }),
    }),

    // Payment Methods
    paymentMethods: router({
      list: protectedProcedure
        .input(z.object({
          activeOnly: z.boolean().optional().default(false),
        }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getAllPaymentMethods(input.activeOnly);
        }),
      
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodById(input.id);
        }),
      
      getByCode: protectedProcedure
        .input(z.object({ code: z.string() }))
        .query(async ({ input }) => {
          return await paymentMethodsDb.getPaymentMethodByCode(input.code);
        }),
      
      create: protectedProcedure
        .input(z.object({
          code: z.string().min(1).max(50),
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          sortOrder: z.number().optional().default(0),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.createPaymentMethod(input);
        }),
      
      update: protectedProcedure
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
      
      activate: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.activatePaymentMethod(input.id);
        }),
      
      deactivate: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deactivatePaymentMethod(input.id);
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.deletePaymentMethod(input.id);
        }),
      
      reorder: protectedProcedure
        .input(z.object({
          orderedIds: z.array(z.number()),
        }))
        .mutation(async ({ input }) => {
          return await paymentMethodsDb.reorderPaymentMethods(input.orderedIds);
        }),
      
      seedDefaults: protectedProcedure
        .mutation(async () => {
          await paymentMethodsDb.seedDefaultPaymentMethods();
          return { success: true };
        }),
    }),
  })
