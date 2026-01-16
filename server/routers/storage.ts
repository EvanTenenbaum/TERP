/**
 * Storage Router
 * Sprint 5 Track E: MEET-067 (Storage Zones), MEET-068 (Multi-Site Support)
 *
 * Provides CRUD operations for:
 * - Storage Zones (A, B, C, D or custom)
 * - Sites (Samples, Storage, Shipping)
 * - Site Transfers
 * - Zone-based inventory views
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  storageZones,
  batchZoneAssignments,
  sites,
  siteTransfers,
  siteInventoryCounts,
} from "../../drizzle/schema-storage";
import { batches, users, products } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, isNull, ne } from "drizzle-orm";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const storageZoneInputSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  siteId: z.number().int().optional(),
  temperatureControl: z
    .enum(["ambient", "cool", "cold", "frozen", "controlled"])
    .optional()
    .default("ambient"),
  accessLevel: z
    .enum(["public", "restricted", "secure", "high_security"])
    .optional()
    .default("public"),
  maxCapacity: z.number().positive().optional(),
  capacityUnit: z.string().max(50).optional().default("units"),
  minTemp: z.number().optional(),
  maxTemp: z.number().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default("#6B7280"),
  displayOrder: z.number().int().optional().default(0),
});

const siteInputSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  siteType: z
    .enum(["samples", "storage", "shipping", "warehouse", "office", "custom"])
    .optional()
    .default("storage"),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional().default("USA"),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(320).optional(),
  operatingHours: z
    .record(
      z.object({
        open: z.string(),
        close: z.string(),
      })
    )
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default("#3B82F6"),
  displayOrder: z.number().int().optional().default(0),
  isDefault: z.boolean().optional().default(false),
});

const siteTransferInputSchema = z.object({
  fromSiteId: z.number().int(),
  toSiteId: z.number().int(),
  batchId: z.number().int(),
  quantity: z.number().positive(),
  expectedArrival: z.string().optional(), // ISO date string
  carrier: z.string().max(255).optional(),
  trackingNumber: z.string().max(255).optional(),
  notes: z.string().optional(),
  destinationZoneId: z.number().int().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique transfer number
 */
function generateTransferNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TR-${timestamp}-${random}`;
}

// ============================================================================
// ROUTER
// ============================================================================

export const storageRouter = router({
  // ==========================================================================
  // STORAGE ZONE CRUD - MEET-067
  // ==========================================================================

  /**
   * Create a new storage zone
   */
  createZone: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(storageZoneInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [result] = await db.insert(storageZones).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        siteId: input.siteId || null,
        temperatureControl: input.temperatureControl,
        accessLevel: input.accessLevel,
        maxCapacity: input.maxCapacity?.toString() || null,
        capacityUnit: input.capacityUnit,
        minTemp: input.minTemp?.toString() || null,
        maxTemp: input.maxTemp?.toString() || null,
        color: input.color,
        displayOrder: input.displayOrder,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List all storage zones
   */
  listZones: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z
        .object({
          siteId: z.number().int().optional(),
          temperatureControl: z
            .enum(["ambient", "cool", "cold", "frozen", "controlled"])
            .optional(),
          accessLevel: z
            .enum(["public", "restricted", "secure", "high_security"])
            .optional(),
          isActive: z.boolean().optional().default(true),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(storageZones.isActive, input.isActive));
      }
      if (input?.siteId) {
        conditions.push(eq(storageZones.siteId, input.siteId));
      }
      if (input?.temperatureControl) {
        conditions.push(
          eq(storageZones.temperatureControl, input.temperatureControl)
        );
      }
      if (input?.accessLevel) {
        conditions.push(eq(storageZones.accessLevel, input.accessLevel));
      }
      conditions.push(isNull(storageZones.deletedAt));

      const result = await db
        .select({
          zone: storageZones,
          site: sites,
        })
        .from(storageZones)
        .leftJoin(sites, eq(storageZones.siteId, sites.id))
        .where(and(...conditions))
        .orderBy(storageZones.displayOrder, storageZones.code);

      return result.map(r => ({
        ...r.zone,
        site: r.site,
      }));
    }),

  /**
   * Get a single zone by ID
   */
  getZone: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [result] = await db
        .select({
          zone: storageZones,
          site: sites,
        })
        .from(storageZones)
        .leftJoin(sites, eq(storageZones.siteId, sites.id))
        .where(
          and(eq(storageZones.id, input.id), isNull(storageZones.deletedAt))
        )
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Storage zone not found",
        });
      }

      return {
        ...result.zone,
        site: result.site,
      };
    }),

  /**
   * Update a storage zone
   */
  updateZone: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(
      z.object({
        id: z.number().int(),
        data: storageZoneInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updateData: Record<string, unknown> = {};
      if (input.data.code !== undefined) updateData.code = input.data.code;
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined)
        updateData.description = input.data.description;
      if (input.data.siteId !== undefined)
        updateData.siteId = input.data.siteId;
      if (input.data.temperatureControl !== undefined)
        updateData.temperatureControl = input.data.temperatureControl;
      if (input.data.accessLevel !== undefined)
        updateData.accessLevel = input.data.accessLevel;
      if (input.data.maxCapacity !== undefined)
        updateData.maxCapacity = input.data.maxCapacity.toString();
      if (input.data.capacityUnit !== undefined)
        updateData.capacityUnit = input.data.capacityUnit;
      if (input.data.minTemp !== undefined)
        updateData.minTemp = input.data.minTemp.toString();
      if (input.data.maxTemp !== undefined)
        updateData.maxTemp = input.data.maxTemp.toString();
      if (input.data.color !== undefined) updateData.color = input.data.color;
      if (input.data.displayOrder !== undefined)
        updateData.displayOrder = input.data.displayOrder;

      await db
        .update(storageZones)
        .set(updateData)
        .where(eq(storageZones.id, input.id));

      return { success: true };
    }),

  /**
   * Delete (soft) a storage zone
   */
  deleteZone: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(storageZones)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(storageZones.id, input.id));

      return { success: true };
    }),

  /**
   * Assign batch to zone
   */
  assignBatchToZone: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(
      z.object({
        batchId: z.number().int(),
        zoneId: z.number().int(),
        quantity: z.number().positive(),
        rack: z.string().max(50).optional(),
        shelf: z.string().max(50).optional(),
        bin: z.string().max(50).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Check if assignment already exists
      const [existing] = await db
        .select()
        .from(batchZoneAssignments)
        .where(
          and(
            eq(batchZoneAssignments.batchId, input.batchId),
            eq(batchZoneAssignments.zoneId, input.zoneId),
            input.rack
              ? eq(batchZoneAssignments.rack, input.rack)
              : isNull(batchZoneAssignments.rack),
            input.shelf
              ? eq(batchZoneAssignments.shelf, input.shelf)
              : isNull(batchZoneAssignments.shelf),
            input.bin
              ? eq(batchZoneAssignments.bin, input.bin)
              : isNull(batchZoneAssignments.bin)
          )
        )
        .limit(1);

      if (existing) {
        // Update quantity
        await db
          .update(batchZoneAssignments)
          .set({
            quantity: sql`${batchZoneAssignments.quantity} + ${input.quantity.toString()}`,
            notes: input.notes || existing.notes,
          })
          .where(eq(batchZoneAssignments.id, existing.id));

        return { id: existing.id, success: true, updated: true };
      }

      const [result] = await db.insert(batchZoneAssignments).values({
        batchId: input.batchId,
        zoneId: input.zoneId,
        quantity: input.quantity.toString(),
        rack: input.rack || null,
        shelf: input.shelf || null,
        bin: input.bin || null,
        assignedById: userId,
        notes: input.notes || null,
      });

      // Update zone capacity
      await db
        .update(storageZones)
        .set({
          currentCapacity: sql`COALESCE(${storageZones.currentCapacity}, 0) + ${input.quantity.toString()}`,
        })
        .where(eq(storageZones.id, input.zoneId));

      return { id: result.insertId, success: true, updated: false };
    }),

  /**
   * Get inventory by zone
   */
  getZoneInventory: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        zoneId: z.number().int(),
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          assignment: batchZoneAssignments,
          batch: batches,
          product: products,
        })
        .from(batchZoneAssignments)
        .innerJoin(batches, eq(batchZoneAssignments.batchId, batches.id))
        .innerJoin(products, eq(batches.productId, products.id))
        .where(eq(batchZoneAssignments.zoneId, input.zoneId))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(batchZoneAssignments.assignedAt));

      return result.map(r => ({
        ...r.assignment,
        batch: r.batch,
        product: r.product,
      }));
    }),

  // ==========================================================================
  // SITE CRUD - MEET-068
  // ==========================================================================

  /**
   * Create a new site
   */
  createSite: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(siteInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(sites)
          .set({ isDefault: false })
          .where(eq(sites.isDefault, true));
      }

      const [result] = await db.insert(sites).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        siteType: input.siteType,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zipCode: input.zipCode || null,
        country: input.country,
        contactName: input.contactName || null,
        contactPhone: input.contactPhone || null,
        contactEmail: input.contactEmail || null,
        operatingHours: input.operatingHours || null,
        color: input.color,
        displayOrder: input.displayOrder,
        isDefault: input.isDefault,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List all sites
   */
  listSites: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z
        .object({
          siteType: z
            .enum([
              "samples",
              "storage",
              "shipping",
              "warehouse",
              "office",
              "custom",
            ])
            .optional(),
          isActive: z.boolean().optional().default(true),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(sites.isActive, input.isActive));
      }
      if (input?.siteType) {
        conditions.push(eq(sites.siteType, input.siteType));
      }
      conditions.push(isNull(sites.deletedAt));

      const result = await db
        .select()
        .from(sites)
        .where(and(...conditions))
        .orderBy(sites.displayOrder, sites.name);

      return result;
    }),

  /**
   * Get a single site by ID
   */
  getSite: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [site] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.id, input.id), isNull(sites.deletedAt)))
        .limit(1);

      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }

      // Get zones for this site
      const zones = await db
        .select()
        .from(storageZones)
        .where(
          and(eq(storageZones.siteId, input.id), isNull(storageZones.deletedAt))
        )
        .orderBy(storageZones.displayOrder, storageZones.code);

      return {
        ...site,
        zones,
      };
    }),

  /**
   * Update a site
   */
  updateSite: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(
      z.object({
        id: z.number().int(),
        data: siteInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // If setting as default, unset other defaults
      if (input.data.isDefault) {
        await db
          .update(sites)
          .set({ isDefault: false })
          .where(and(eq(sites.isDefault, true), ne(sites.id, input.id)));
      }

      await db.update(sites).set(input.data).where(eq(sites.id, input.id));

      return { success: true };
    }),

  /**
   * Delete (soft) a site
   */
  deleteSite: protectedProcedure
    .use(requirePermission("inventory:locations:manage"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(sites)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(sites.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // SITE TRANSFERS - MEET-068
  // ==========================================================================

  /**
   * Create a site transfer
   */
  createTransfer: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(siteTransferInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Validate source and destination are different
      if (input.fromSiteId === input.toSiteId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source and destination sites must be different",
        });
      }

      // Check available quantity at source site
      const [sourceInventory] = await db
        .select()
        .from(siteInventoryCounts)
        .where(
          and(
            eq(siteInventoryCounts.siteId, input.fromSiteId),
            eq(siteInventoryCounts.batchId, input.batchId)
          )
        )
        .limit(1);

      const availableQty = sourceInventory
        ? Number(sourceInventory.quantity) -
          Number(sourceInventory.reservedQuantity || 0)
        : 0;

      if (availableQty < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient quantity. Available: ${availableQty}, Requested: ${input.quantity}`,
        });
      }

      // Reserve quantity at source
      if (sourceInventory) {
        await db
          .update(siteInventoryCounts)
          .set({
            reservedQuantity: sql`COALESCE(${siteInventoryCounts.reservedQuantity}, 0) + ${input.quantity.toString()}`,
          })
          .where(eq(siteInventoryCounts.id, sourceInventory.id));
      }

      const [result] = await db.insert(siteTransfers).values({
        transferNumber: generateTransferNumber(),
        fromSiteId: input.fromSiteId,
        toSiteId: input.toSiteId,
        batchId: input.batchId,
        quantity: input.quantity.toString(),
        status: "pending",
        requestedById: userId,
        expectedArrival: input.expectedArrival
          ? new Date(input.expectedArrival)
          : null,
        carrier: input.carrier || null,
        trackingNumber: input.trackingNumber || null,
        notes: input.notes || null,
        destinationZoneId: input.destinationZoneId || null,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List site transfers
   */
  listTransfers: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z
        .object({
          fromSiteId: z.number().int().optional(),
          toSiteId: z.number().int().optional(),
          batchId: z.number().int().optional(),
          status: z
            .enum(["pending", "in_transit", "received", "cancelled"])
            .optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.number().int().min(1).max(1000).default(100),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [];
      if (input?.fromSiteId) {
        conditions.push(eq(siteTransfers.fromSiteId, input.fromSiteId));
      }
      if (input?.toSiteId) {
        conditions.push(eq(siteTransfers.toSiteId, input.toSiteId));
      }
      if (input?.batchId) {
        conditions.push(eq(siteTransfers.batchId, input.batchId));
      }
      if (input?.status) {
        conditions.push(eq(siteTransfers.status, input.status));
      }
      if (input?.startDate) {
        conditions.push(
          gte(siteTransfers.requestedAt, new Date(input.startDate))
        );
      }
      if (input?.endDate) {
        conditions.push(
          lte(siteTransfers.requestedAt, new Date(input.endDate))
        );
      }

      const result = await db
        .select({
          transfer: siteTransfers,
          fromSite: sites,
          batch: batches,
          requestedBy: users,
        })
        .from(siteTransfers)
        .leftJoin(sites, eq(siteTransfers.fromSiteId, sites.id))
        .leftJoin(batches, eq(siteTransfers.batchId, batches.id))
        .leftJoin(users, eq(siteTransfers.requestedById, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(input?.limit || 100)
        .offset(input?.offset || 0)
        .orderBy(desc(siteTransfers.requestedAt));

      return result.map(r => ({
        ...r.transfer,
        fromSite: r.fromSite,
        batch: r.batch,
        requestedBy: r.requestedBy,
      }));
    }),

  /**
   * Update transfer status (ship)
   */
  shipTransfer: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number().int(),
        carrier: z.string().max(255).optional(),
        trackingNumber: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Get transfer
      const [transfer] = await db
        .select()
        .from(siteTransfers)
        .where(eq(siteTransfers.id, input.id))
        .limit(1);

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer not found",
        });
      }

      if (transfer.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot ship transfer in ${transfer.status} status`,
        });
      }

      // Deduct from source site inventory
      await db
        .update(siteInventoryCounts)
        .set({
          quantity: sql`${siteInventoryCounts.quantity} - ${transfer.quantity}`,
          reservedQuantity: sql`COALESCE(${siteInventoryCounts.reservedQuantity}, 0) - ${transfer.quantity}`,
        })
        .where(
          and(
            eq(siteInventoryCounts.siteId, transfer.fromSiteId),
            eq(siteInventoryCounts.batchId, transfer.batchId)
          )
        );

      await db
        .update(siteTransfers)
        .set({
          status: "in_transit",
          shippedAt: new Date(),
          shippedById: userId,
          carrier: input.carrier || transfer.carrier,
          trackingNumber: input.trackingNumber || transfer.trackingNumber,
        })
        .where(eq(siteTransfers.id, input.id));

      return { success: true };
    }),

  /**
   * Receive transfer
   */
  receiveTransfer: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number().int(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Get transfer
      const [transfer] = await db
        .select()
        .from(siteTransfers)
        .where(eq(siteTransfers.id, input.id))
        .limit(1);

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer not found",
        });
      }

      if (transfer.status !== "in_transit") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot receive transfer in ${transfer.status} status`,
        });
      }

      // Add to destination site inventory
      const [destInventory] = await db
        .select()
        .from(siteInventoryCounts)
        .where(
          and(
            eq(siteInventoryCounts.siteId, transfer.toSiteId),
            eq(siteInventoryCounts.batchId, transfer.batchId)
          )
        )
        .limit(1);

      if (destInventory) {
        await db
          .update(siteInventoryCounts)
          .set({
            quantity: sql`${siteInventoryCounts.quantity} + ${transfer.quantity}`,
          })
          .where(eq(siteInventoryCounts.id, destInventory.id));
      } else {
        await db.insert(siteInventoryCounts).values({
          siteId: transfer.toSiteId,
          batchId: transfer.batchId,
          quantity: transfer.quantity,
          lastCountAt: new Date(),
          lastCountById: userId,
        });
      }

      // Assign to destination zone if specified
      if (transfer.destinationZoneId) {
        await db.insert(batchZoneAssignments).values({
          batchId: transfer.batchId,
          zoneId: transfer.destinationZoneId,
          quantity: transfer.quantity,
          assignedById: userId,
          notes: `Received via transfer ${transfer.transferNumber}`,
        });
      }

      await db
        .update(siteTransfers)
        .set({
          status: "received",
          receivedAt: new Date(),
          receivedById: userId,
          notes: input.notes || transfer.notes,
        })
        .where(eq(siteTransfers.id, input.id));

      return { success: true };
    }),

  /**
   * Cancel transfer
   */
  cancelTransfer: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get transfer
      const [transfer] = await db
        .select()
        .from(siteTransfers)
        .where(eq(siteTransfers.id, input.id))
        .limit(1);

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer not found",
        });
      }

      if (transfer.status === "received") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a received transfer",
        });
      }

      // If pending, release reserved quantity
      if (transfer.status === "pending") {
        await db
          .update(siteInventoryCounts)
          .set({
            reservedQuantity: sql`COALESCE(${siteInventoryCounts.reservedQuantity}, 0) - ${transfer.quantity}`,
          })
          .where(
            and(
              eq(siteInventoryCounts.siteId, transfer.fromSiteId),
              eq(siteInventoryCounts.batchId, transfer.batchId)
            )
          );
      }

      // If in transit, return quantity to source
      if (transfer.status === "in_transit") {
        await db
          .update(siteInventoryCounts)
          .set({
            quantity: sql`${siteInventoryCounts.quantity} + ${transfer.quantity}`,
          })
          .where(
            and(
              eq(siteInventoryCounts.siteId, transfer.fromSiteId),
              eq(siteInventoryCounts.batchId, transfer.batchId)
            )
          );
      }

      await db
        .update(siteTransfers)
        .set({ status: "cancelled" })
        .where(eq(siteTransfers.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // SITE INVENTORY - MEET-068
  // ==========================================================================

  /**
   * Get site inventory counts
   */
  getSiteInventory: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        siteId: z.number().int(),
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          inventory: siteInventoryCounts,
          batch: batches,
          product: products,
        })
        .from(siteInventoryCounts)
        .innerJoin(batches, eq(siteInventoryCounts.batchId, batches.id))
        .innerJoin(products, eq(batches.productId, products.id))
        .where(eq(siteInventoryCounts.siteId, input.siteId))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(products.name);

      return result.map(r => ({
        ...r.inventory,
        batch: r.batch,
        product: r.product,
        availableQuantity:
          Number(r.inventory.quantity) -
          Number(r.inventory.reservedQuantity || 0),
      }));
    }),

  /**
   * Initialize site inventory for a batch
   */
  initializeSiteInventory: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        siteId: z.number().int(),
        batchId: z.number().int(),
        quantity: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Check if already exists
      const [existing] = await db
        .select()
        .from(siteInventoryCounts)
        .where(
          and(
            eq(siteInventoryCounts.siteId, input.siteId),
            eq(siteInventoryCounts.batchId, input.batchId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(siteInventoryCounts)
          .set({
            quantity: input.quantity.toString(),
            lastCountAt: new Date(),
            lastCountById: userId,
          })
          .where(eq(siteInventoryCounts.id, existing.id));

        return { id: existing.id, success: true, updated: true };
      }

      const [result] = await db.insert(siteInventoryCounts).values({
        siteId: input.siteId,
        batchId: input.batchId,
        quantity: input.quantity.toString(),
        lastCountAt: new Date(),
        lastCountById: userId,
      });

      return { id: result.insertId, success: true, updated: false };
    }),

  /**
   * Get inventory summary by site
   */
  getInventorySummaryBySite: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const result = await db
        .select({
          siteId: siteInventoryCounts.siteId,
          siteName: sites.name,
          siteCode: sites.code,
          siteType: sites.siteType,
          totalBatches: sql<number>`COUNT(DISTINCT ${siteInventoryCounts.batchId})`,
          totalQuantity: sql<string>`SUM(CAST(${siteInventoryCounts.quantity} AS DECIMAL(15,4)))`,
          reservedQuantity: sql<string>`SUM(CAST(COALESCE(${siteInventoryCounts.reservedQuantity}, 0) AS DECIMAL(15,4)))`,
        })
        .from(siteInventoryCounts)
        .innerJoin(sites, eq(siteInventoryCounts.siteId, sites.id))
        .groupBy(
          siteInventoryCounts.siteId,
          sites.name,
          sites.code,
          sites.siteType
        )
        .orderBy(sites.displayOrder);

      return result.map(r => ({
        ...r,
        availableQuantity: Number(r.totalQuantity) - Number(r.reservedQuantity),
      }));
    }),

  // ==========================================================================
  // QUICK SETUP HELPERS
  // ==========================================================================

  /**
   * Initialize default sites (Samples, Main Storage, Shipping)
   */
  initializeDefaultSites: protectedProcedure
    .use(requirePermission("admin"))
    .mutation(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const defaultSites = [
        {
          code: "SAMPLES",
          name: "Sample Room",
          siteType: "samples" as const,
          isDefault: false,
          color: "#8B5CF6",
          displayOrder: 1,
        },
        {
          code: "STORAGE",
          name: "Main Storage",
          siteType: "storage" as const,
          isDefault: true,
          color: "#10B981",
          displayOrder: 2,
        },
        {
          code: "SHIPPING",
          name: "Shipping Dock",
          siteType: "shipping" as const,
          isDefault: false,
          color: "#F59E0B",
          displayOrder: 3,
        },
      ];

      const created: number[] = [];

      for (const site of defaultSites) {
        // Check if already exists
        const [existing] = await db
          .select()
          .from(sites)
          .where(eq(sites.code, site.code))
          .limit(1);

        if (!existing) {
          const [result] = await db.insert(sites).values(site);
          created.push(result.insertId);
        }
      }

      return { created, success: true };
    }),

  /**
   * Initialize default zones (A, B, C, D) for a site
   */
  initializeDefaultZones: protectedProcedure
    .use(requirePermission("admin"))
    .input(z.object({ siteId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const defaultZones = [
        { code: "A", name: "Zone A", color: "#EF4444", displayOrder: 1 },
        { code: "B", name: "Zone B", color: "#F59E0B", displayOrder: 2 },
        { code: "C", name: "Zone C", color: "#10B981", displayOrder: 3 },
        { code: "D", name: "Zone D", color: "#3B82F6", displayOrder: 4 },
      ];

      const created: number[] = [];

      for (const zone of defaultZones) {
        // Check if already exists for this site
        const [existing] = await db
          .select()
          .from(storageZones)
          .where(
            and(
              eq(storageZones.siteId, input.siteId),
              eq(storageZones.code, zone.code)
            )
          )
          .limit(1);

        if (!existing) {
          const [result] = await db.insert(storageZones).values({
            ...zone,
            siteId: input.siteId,
          });
          created.push(result.insertId);
        }
      }

      return { created, success: true };
    }),
});
