import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { grades, categories, subcategories, locations, products } from "../../drizzle/schema";
import { eq, isNull, and, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
// Legacy seeding system has been deprecated
// Use the new seeding system: pnpm seed:new
// See: scripts/seed/README.md and docs/deployment/SEEDING_RUNBOOK.md

// Nested router for grades
const gradesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(grades).where(isNull(grades.deletedAt));
  }),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(grades).values({ name: input.name, description: input.description });
      return { success: true };
    }),
  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(grades).set(updates).where(eq(grades.id, id));
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(grades).set({ deletedAt: new Date() }).where(eq(grades.id, input.id));
      return { success: true };
    }),
});

// Nested router for categories
const categoriesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(categories).where(isNull(categories.deletedAt));
  }),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(categories).values({ name: input.name, description: input.description });
      return { success: true };
    }),
  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(categories).set(updates).where(eq(categories.id, id));
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, input.id));
      return { success: true };
    }),
});

// Nested router for subcategories
const subcategoriesRouter = router({
  list: protectedProcedure
    .input(z.object({ categoryId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input?.categoryId) {
        return db.select().from(subcategories).where(and(isNull(subcategories.deletedAt), eq(subcategories.categoryId, input.categoryId)));
      }
      return db.select().from(subcategories).where(isNull(subcategories.deletedAt));
    }),
  create: adminProcedure
    .input(z.object({ categoryId: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(subcategories).values({
        categoryId: input.categoryId,
        name: input.name,
        description: input.description
      });
      return { success: true };
    }),
  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(subcategories).set(updates).where(eq(subcategories.id, id));
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // First, get the subcategory name to check for usage
      const [subcategory] = await db.select().from(subcategories).where(eq(subcategories.id, input.id));
      if (!subcategory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subcategory not found"
        });
      }

      // Check for products using this subcategory
      const [usage] = await db.select({ count: count() })
        .from(products)
        .where(and(
          eq(products.subcategory, subcategory.name),
          isNull(products.deletedAt)
        ));

      if (usage && usage.count > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete: ${usage.count} product(s) use this subcategory`
        });
      }

      // Soft delete the subcategory
      await db.update(subcategories).set({ deletedAt: new Date() }).where(eq(subcategories.id, input.id));
      return { success: true };
    }),
});

// Nested router for locations
const locationsSettingsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(locations).where(isNull(locations.deletedAt));
  }),
  create: adminProcedure
    .input(z.object({ site: z.string().min(1), zone: z.string().optional(), rack: z.string().optional(), shelf: z.string().optional(), bin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(locations).values(input);
      return { success: true };
    }),
  update: adminProcedure
    .input(z.object({ id: z.number(), site: z.string().optional(), zone: z.string().optional(), rack: z.string().optional(), shelf: z.string().optional(), bin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(locations).set(updates).where(eq(locations.id, id));
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(locations).set({ deletedAt: new Date() }).where(eq(locations.id, input.id));
      return { success: true };
    }),
});

export const settingsRouter = router({
  // Nested routers for settings management
  grades: gradesRouter,
  categories: categoriesRouter,
  subcategories: subcategoriesRouter,
  locations: locationsSettingsRouter,

  hello: protectedProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? "world"}`,
      };
    }),

  seedDatabase: protectedProcedure
    .input(
      z.object({
        scenario: z
          .enum(["light", "full", "edgeCases", "chaos"])
          .optional()
          .default("light"),
      })
    )
    .mutation(async ({ input }) => {
      // Legacy seeding endpoint - deprecated
      throw new Error(
        "⚠️  DEPRECATED: This seeding endpoint is deprecated. Use the new seeding system instead:\n\n" +
        "Command line: pnpm seed:new --size=small\n" +
        "Documentation: scripts/seed/README.md\n" +
        "Production guide: docs/deployment/SEEDING_RUNBOOK.md\n\n" +
        "The new system provides better reliability, safety features, and production support."
      );
    }),
});
