import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { grades, categories, subcategories, locations } from "../../drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
// Static import - esbuild bundles this at build time, solving path resolution and TypeScript compilation
import { seedRealisticData } from "../../scripts/legacy/seed-realistic-main";

// Track if seeding is in progress
let isSeeding = false;

// Nested router for grades
const gradesRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(grades).where(isNull(grades.deletedAt));
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(grades).values({ name: input.name, description: input.description });
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(grades).set(updates).where(eq(grades.id, id));
      return { success: true };
    }),
  delete: publicProcedure
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
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(categories).where(isNull(categories.deletedAt));
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(categories).values({ name: input.name, description: input.description });
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(categories).set(updates).where(eq(categories.id, id));
      return { success: true };
    }),
  delete: publicProcedure
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
  list: publicProcedure
    .input(z.object({ categoryId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input?.categoryId) {
        return db.select().from(subcategories).where(and(isNull(subcategories.deletedAt), eq(subcategories.categoryId, input.categoryId)));
      }
      return db.select().from(subcategories).where(isNull(subcategories.deletedAt));
    }),
  create: publicProcedure
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
  update: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(subcategories).set(updates).where(eq(subcategories.id, id));
      return { success: true };
    }),
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(subcategories).set({ deletedAt: new Date() }).where(eq(subcategories.id, input.id));
      return { success: true };
    }),
});

// Nested router for locations
const locationsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(locations).where(isNull(locations.deletedAt));
  }),
  create: publicProcedure
    .input(z.object({ site: z.string().min(1), zone: z.string().optional(), rack: z.string().optional(), shelf: z.string().optional(), bin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(locations).values(input);
      return { success: true };
    }),
  update: publicProcedure
    .input(z.object({ id: z.number(), site: z.string().optional(), zone: z.string().optional(), rack: z.string().optional(), shelf: z.string().optional(), bin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(locations).set(updates).where(eq(locations.id, id));
      return { success: true };
    }),
  delete: publicProcedure
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
  locations: locationsRouter,

  hello: publicProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? "world"}`,
      };
    }),

  seedDatabase: publicProcedure
    .input(
      z.object({
        scenario: z
          .enum(["light", "full", "edgeCases", "chaos"])
          .optional()
          .default("light"),
      })
    )
    .mutation(async ({ input }) => {
      const { scenario } = input;

      // Check if seeding is disabled via environment variable (case-insensitive)
      const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
      if (skipSeeding === "true" || skipSeeding === "1") {
        throw new Error(
          "Seeding is disabled via SKIP_SEEDING environment variable. Remove or set SKIP_SEEDING=false to enable seeding."
        );
      }

      // Check if seeding is already in progress
      if (isSeeding) {
        throw new Error(
          "Seeding is already in progress. Please wait for it to complete."
        );
      }

      isSeeding = true;
      console.log(
        `[Seed] Starting database seed with scenario: ${scenario} (async)`
      );

      // Start seeding in background (fire-and-forget)
      (async () => {
        const originalArgv = process.argv;
        try {
          // Set process.argv to pass scenario to the seed script
          process.argv = [process.argv[0], process.argv[1], scenario];

          // Call the bundled seed function directly
          await seedRealisticData();

          console.log(
            `[Seed] ✅ Database seeded successfully with ${scenario} scenario`
          );
        } catch (error) {
          console.error("[Seed Error]:", error);
          // Log error but don't throw (this is fire-and-forget)
        } finally {
          // Restore original argv
          process.argv = originalArgv;
          isSeeding = false;
        }
      })();

      // Return immediately
      return {
        success: true,
        message: `Database seeding started in background with ${scenario} scenario. Check server logs for progress.`,
      };
    }),
});
