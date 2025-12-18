import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { grades, categories, subcategories, locations, systemSettings } from "../../drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
// Legacy seeding system has been deprecated
// Use the new seeding system: pnpm seed:new
// See: scripts/seed/README.md and docs/deployment/SEEDING_RUNBOOK.md

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

// Nested router for system settings (company info, defaults, financial settings)
const systemSettingsRouter = router({
  // Get all system settings
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(systemSettings);
  }),

  // Get settings by category
  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(systemSettings).where(eq(systemSettings.category, input.category));
    }),

  // Get a single setting by key
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key));
      return results[0] || null;
    }),

  // Update a single setting
  update: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if setting exists
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key));

      if (existing.length === 0) {
        throw new Error(`Setting with key "${input.key}" not found`);
      }

      await db.update(systemSettings)
        .set({ value: input.value })
        .where(eq(systemSettings.key, input.key));

      return { success: true };
    }),

  // Bulk update multiple settings
  updateMany: publicProcedure
    .input(z.array(z.object({
      key: z.string(),
      value: z.string().nullable(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const setting of input) {
        await db.update(systemSettings)
          .set({ value: setting.value })
          .where(eq(systemSettings.key, setting.key));
      }

      return { success: true, updated: input.length };
    }),

  // Create a new setting (admin only)
  create: publicProcedure
    .input(z.object({
      key: z.string().min(1),
      value: z.string().nullable().optional(),
      dataType: z.enum(["string", "number", "boolean", "json"]).default("string"),
      category: z.enum(["general", "defaults", "financial", "quotes"]).default("general"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(systemSettings).values({
        key: input.key,
        value: input.value ?? null,
        dataType: input.dataType,
        category: input.category,
        description: input.description,
      });

      return { success: true };
    }),

  // Delete a setting (admin only)
  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(systemSettings).where(eq(systemSettings.key, input.key));
      return { success: true };
    }),

  // Initialize default settings if they don't exist
  initializeDefaults: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const defaults = [
      { key: "company_name", value: "TERP Company", dataType: "string", category: "general", description: "Company name displayed in the application" },
      { key: "company_address", value: "", dataType: "string", category: "general", description: "Company physical address" },
      { key: "company_phone", value: "", dataType: "string", category: "general", description: "Company phone number" },
      { key: "company_email", value: "", dataType: "string", category: "general", description: "Company email address" },
      { key: "default_currency", value: "USD", dataType: "string", category: "defaults", description: "Default currency for transactions" },
      { key: "default_timezone", value: "America/New_York", dataType: "string", category: "defaults", description: "Default timezone for the application" },
      { key: "tax_rate", value: "0", dataType: "number", category: "financial", description: "Default tax rate percentage" },
      { key: "invoice_prefix", value: "INV-", dataType: "string", category: "financial", description: "Prefix for invoice numbers" },
      { key: "quote_validity_days", value: "30", dataType: "number", category: "quotes", description: "Default number of days a quote is valid" },
    ];

    let created = 0;
    for (const setting of defaults) {
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, setting.key));
      if (existing.length === 0) {
        await db.insert(systemSettings).values(setting);
        created++;
      }
    }

    return { success: true, created };
  }),
});

export const settingsRouter = router({
  // Nested routers for settings management
  grades: gradesRouter,
  categories: categoriesRouter,
  subcategories: subcategoriesRouter,
  locations: locationsRouter,
  system: systemSettingsRouter,

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
