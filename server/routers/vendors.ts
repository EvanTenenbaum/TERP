import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import * as vendorContextDb from "../vendorContextDb";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { vendorNotes } from "../../drizzle/schema";
import { requirePermission } from "../_core/permissionMiddleware";
import { TRPCError } from "@trpc/server";
import { getClientIdForVendor } from "../services/vendorMappingService";

/**
 * Vendors Router
 *
 * Handles vendor-specific operations for clients with isSeller=true.
 * For basic CRUD on suppliers, use the clients router with clientTypes=['seller'].
 *
 * Feature: MF-015 Vendor Payment Terms (and vendor management foundation)
 */
export const vendorsRouter = router({
  /**
   * Get vendor by ID - resolves legacy vendorId or clientId to a supplier record.
   * Used by VendorRedirect for backward-compatible URL routing.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        // First try to find by legacy vendor ID
        let supplier = await inventoryDb.getSupplierByLegacyVendorId(input.id);

        // If not found, try as client ID
        if (!supplier) {
          supplier = await inventoryDb.getSupplierByClientId(input.id);
        }

        if (!supplier) {
          return {
            success: false,
            error: "Vendor not found",
          };
        }

        // Return with _clientId for redirect resolution
        return {
          success: true,
          data: {
            id: supplier.supplierProfile?.legacyVendorId ?? supplier.id,
            name: supplier.name,
            contactName: supplier.supplierProfile?.contactName ?? null,
            contactEmail: supplier.supplierProfile?.contactEmail ?? null,
            contactPhone: supplier.supplierProfile?.contactPhone ?? null,
            paymentTerms: supplier.supplierProfile?.paymentTerms ?? null,
            notes: supplier.supplierProfile?.supplierNotes ?? null,
            createdAt: supplier.createdAt,
            updatedAt: supplier.updatedAt,
            _clientId: supplier.id,
          },
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
   * Get all notes for a vendor
   * Feature: MF-016 Vendor Notes & History
   */
  getNotes: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { users } = await import("../../drizzle/schema");

        // Resolve canonical clientId for this legacy vendorId (TER-235)
        const resolvedClientId = await getClientIdForVendor(input.vendorId);

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
          // Prefer clientId match; fall back to vendorId for un-backfilled rows (TER-235)
          .where(
            resolvedClientId !== null
              ? or(
                  eq(vendorNotes.clientId, resolvedClientId),
                  and(
                    isNull(vendorNotes.clientId),
                    eq(vendorNotes.vendorId, input.vendorId)
                  )
                )
              : eq(vendorNotes.vendorId, input.vendorId)
          )
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
  createNote: protectedProcedure
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

        // Resolve canonical clientId for backfill alongside legacy vendorId (TER-235)
        const resolvedClientId = await getClientIdForVendor(input.vendorId);

        const result = await db.insert(vendorNotes).values({
          vendorId: input.vendorId,
          clientId: resolvedClientId ?? null, // Write canonical ref alongside legacy (TER-235)
          userId: input.userId,
          note: input.note,
        });

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
  updateNote: protectedProcedure
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
  deleteNote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // PARTY-004: Use soft delete instead of hard delete
        await db
          .update(vendorNotes)
          .set({ deletedAt: new Date() })
          .where(eq(vendorNotes.id, input.id));

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error soft-deleting vendor note:", error);
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
  getHistory: protectedProcedure
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

  /**
   * Get comprehensive vendor context - FEAT-002-BE
   *
   * Returns complete vendor history and performance metrics including:
   * - Vendor info (name, contact, payment terms, relationship start)
   * - Supply history (lots with products, dates, quantities)
   * - Product performance (units supplied, sold, sell-through rate, avg days to sell)
   * - Aggregate metrics (total supplied, sold, revenue, profit)
   * - Active inventory from this vendor
   * - Payment history (optional)
   * - Related brands
   */
  getContext: protectedProcedure
    .use(requirePermission("vendors:read"))
    .input(
      z.object({
        clientId: z.number().describe("Vendor's client ID (isSeller=true)"),
        dateRange: z
          .object({
            startDate: z.string().optional().describe("ISO date string"),
            endDate: z.string().optional().describe("ISO date string"),
          })
          .optional(),
        includeActiveInventory: z.boolean().default(true),
        includePaymentHistory: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      try {
        const startDate = input.dateRange?.startDate
          ? new Date(input.dateRange.startDate)
          : undefined;
        const endDate = input.dateRange?.endDate
          ? new Date(input.dateRange.endDate)
          : undefined;

        const context = await vendorContextDb.getVendorContext({
          clientId: input.clientId,
          startDate,
          endDate,
          includeActiveInventory: input.includeActiveInventory,
          includePaymentHistory: input.includePaymentHistory,
        });

        return {
          success: true,
          data: context,
        };
      } catch (error) {
        console.error("Error fetching vendor context:", error);

        if (error instanceof Error) {
          if (error.message === "Vendor not found") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Vendor not found",
            });
          }
          if (error.message.includes("not a vendor")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Client is not a vendor",
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor context",
        });
      }
    }),

  /**
   * Search vendors with related brands - MEET-030
   *
   * When searching vendors, returns their associated brands
   * with product counts for quick filtering.
   */
  searchWithBrands: protectedProcedure
    .use(requirePermission("vendors:read"))
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await vendorContextDb.searchVendorsWithBrands(
          input.query,
          input.limit
        );

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error("Error searching vendors with brands:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to search vendors",
        });
      }
    }),

  /**
   * Get vendor with farmer/grower associations - MEET-029
   *
   * For Flower category products, returns associated farmer names.
   * Farmers are represented as brands in the data model.
   */
  getWithFarmerInfo: protectedProcedure
    .use(requirePermission("vendors:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        const result = await vendorContextDb.getVendorWithFarmerInfo(
          input.clientId
        );

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vendor not found",
          });
        }

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error fetching vendor with farmer info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch vendor info",
        });
      }
    }),
});
