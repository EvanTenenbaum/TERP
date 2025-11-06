import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../db";
import { vendorNotes } from "../../drizzle/schema";

/**
 * Vendors Router
 * Handles CRUD operations for vendor management
 * Feature: MF-015 Vendor Payment Terms (and vendor management foundation)
 */
export const vendorsRouter = router({
  /**
   * Get all vendors
   */
  getAll: publicProcedure.query(async () => {
    try {
      const vendors = await inventoryDb.getAllVendors();
      return {
        success: true,
        data: vendors,
      };
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch vendors",
      };
    }
  }),

  /**
   * Get vendor by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const vendor = await inventoryDb.getVendorById(input.id);

        if (!vendor) {
          return {
            success: false,
            error: "Vendor not found",
          };
        }

        return {
          success: true,
          data: vendor,
        };
      } catch (error) {
        console.error("Error fetching vendor:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch vendor",
        };
      }
    }),

  /**
   * Search vendors by name
   */
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      try {
        const vendors = await inventoryDb.searchVendors(input.query);
        return {
          success: true,
          data: vendors,
        };
      } catch (error) {
        console.error("Error searching vendors:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to search vendors",
        };
      }
    }),

  /**
   * Create a new vendor
   * Supports payment terms field (MF-015)
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Vendor name is required"),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        paymentTerms: z.string().optional(), // MF-015: Vendor Payment Terms
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await inventoryDb.createVendor(input);

        // Fetch the created vendor to return full data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertId = (result as any).insertId;
        const vendor = await inventoryDb.getVendorById(Number(insertId));

        if (!vendor) {
          throw new Error("Failed to fetch created vendor");
        }

        return {
          success: true,
          data: vendor,
        };
      } catch (error) {
        console.error("Error creating vendor:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create vendor",
        };
      }
    }),

  /**
   * Update an existing vendor
   * Supports payment terms field (MF-015)
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        paymentTerms: z.string().optional(), // MF-015: Vendor Payment Terms
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...updates } = input;

        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        // Import vendors table
        const { vendors } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Update vendor
        await db.update(vendors).set(updates).where(eq(vendors.id, id));

        // Invalidate cache
        const cache = (await import("../_core/cache")).default;
        const { CacheKeys } = await import("../_core/cache");
        cache.delete(CacheKeys.vendors());

        // Fetch updated vendor
        const vendor = await inventoryDb.getVendorById(id);

        return {
          success: true,
          data: vendor,
        };
      } catch (error) {
        console.error("Error updating vendor:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update vendor",
        };
      }
    }),

  /**
   * Delete a vendor
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { vendors } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        await db.delete(vendors).where(eq(vendors.id, input.id));

        // Invalidate cache
        const cache = (await import("../_core/cache")).default;
        const { CacheKeys } = await import("../_core/cache");
        cache.delete(CacheKeys.vendors());

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error deleting vendor:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete vendor",
        };
      }
    }),

  /**
   * Get all notes for a vendor
   * Feature: MF-016 Vendor Notes & History
   */
  getNotes: publicProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { users } = await import("../../drizzle/schema");

        const notes = await db
          .select({
            id: vendorNotes.id,
            vendorId: vendorNotes.vendorId,
            userId: vendorNotes.userId,
            note: vendorNotes.note,
            createdAt: vendorNotes.createdAt,
            updatedAt: vendorNotes.updatedAt,
            userName: users.name,
          })
          .from(vendorNotes)
          .leftJoin(users, eq(vendorNotes.userId, users.id))
          .where(eq(vendorNotes.vendorId, input.vendorId))
          .orderBy(desc(vendorNotes.createdAt));

        return {
          success: true,
          data: notes,
        };
      } catch (error) {
        console.error("Error fetching vendor notes:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor notes",
        };
      }
    }),

  /**
   * Create a new note for a vendor
   * Feature: MF-016 Vendor Notes & History
   */
  createNote: publicProcedure
    .input(
      z.object({
        vendorId: z.number(),
        userId: z.number(),
        note: z.string().min(1, "Note cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(vendorNotes).values(input);

        // Fetch the created note with user info
        const { users } = await import("../../drizzle/schema");
        const [note] = await db
          .select({
            id: vendorNotes.id,
            vendorId: vendorNotes.vendorId,
            userId: vendorNotes.userId,
            note: vendorNotes.note,
            createdAt: vendorNotes.createdAt,
            updatedAt: vendorNotes.updatedAt,
            userName: users.name,
          })
          .from(vendorNotes)
          .leftJoin(users, eq(vendorNotes.userId, users.id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .where(eq(vendorNotes.id, Number((result as any).insertId)))
          .limit(1);

        return {
          success: true,
          data: note,
        };
      } catch (error) {
        console.error("Error creating vendor note:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create vendor note",
        };
      }
    }),

  /**
   * Update a vendor note
   * Feature: MF-016 Vendor Notes & History
   */
  updateNote: publicProcedure
    .input(
      z.object({
        id: z.number(),
        note: z.string().min(1, "Note cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(vendorNotes)
          .set({ note: input.note })
          .where(eq(vendorNotes.id, input.id));

        // Fetch updated note with user info
        const { users } = await import("../../drizzle/schema");
        const [note] = await db
          .select({
            id: vendorNotes.id,
            vendorId: vendorNotes.vendorId,
            userId: vendorNotes.userId,
            note: vendorNotes.note,
            createdAt: vendorNotes.createdAt,
            updatedAt: vendorNotes.updatedAt,
            userName: users.name,
          })
          .from(vendorNotes)
          .leftJoin(users, eq(vendorNotes.userId, users.id))
          .where(eq(vendorNotes.id, input.id))
          .limit(1);

        return {
          success: true,
          data: note,
        };
      } catch (error) {
        console.error("Error updating vendor note:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update vendor note",
        };
      }
    }),

  /**
   * Delete a vendor note
   * Feature: MF-016 Vendor Notes & History
   */
  deleteNote: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(vendorNotes).where(eq(vendorNotes.id, input.id));

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error deleting vendor note:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete vendor note",
        };
      }
    }),

  /**
   * Get vendor history from audit logs
   * Feature: MF-016 Vendor Notes & History
   */
  getHistory: publicProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { auditLogs, users } = await import("../../drizzle/schema");

        const history = await db
          .select({
            id: auditLogs.id,
            actorId: auditLogs.actorId,
            entity: auditLogs.entity,
            entityId: auditLogs.entityId,
            action: auditLogs.action,
            before: auditLogs.before,
            after: auditLogs.after,
            reason: auditLogs.reason,
            createdAt: auditLogs.createdAt,
            actorName: users.name,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.actorId, users.id))
          .where(
            and(
              eq(auditLogs.entity, "vendor"),
              eq(auditLogs.entityId, input.vendorId)
            )
          )
          .orderBy(desc(auditLogs.createdAt));

        return {
          success: true,
          data: history,
        };
      } catch (error) {
        console.error("Error fetching vendor history:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor history",
        };
      }
    }),
});
