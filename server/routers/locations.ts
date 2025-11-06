/**
 * Locations Router
 * API endpoints for warehouse location management
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { locations, batchLocations, batches } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const locationsRouter = router({
  // Get all locations
  getAll: publicProcedure
    .input(
      z
        .object({
          site: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      let query = db
        .select()
        .from(locations)
        .orderBy(locations.site, locations.zone, locations.rack, locations.shelf, locations.bin)
        .limit(limit)
        .offset(offset);

      if (input?.site) {
        query = query.where(eq(locations.site, input.site)) as typeof query;
      }

      if (input?.isActive !== undefined) {
        query = query.where(eq(locations.isActive, input.isActive ? 1 : 0)) as typeof query;
      }

      return await query;
    }),

  // Get location by ID
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, input.id));

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  }),

  // Create location
  create: publicProcedure
    .input(
      z.object({
        site: z.string().min(1),
        zone: z.string().optional(),
        rack: z.string().optional(),
        shelf: z.string().optional(),
        bin: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [result] = await db.insert(locations).values({
        site: input.site,
        zone: input.zone,
        rack: input.rack,
        shelf: input.shelf,
        bin: input.bin,
        isActive: input.isActive ? 1 : 0,
      });

      return { id: result.insertId };
    }),

  // Update location
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        site: z.string().min(1).optional(),
        zone: z.string().optional(),
        rack: z.string().optional(),
        shelf: z.string().optional(),
        bin: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.site !== undefined) updateData.site = updates.site;
      if (updates.zone !== undefined) updateData.zone = updates.zone;
      if (updates.rack !== undefined) updateData.rack = updates.rack;
      if (updates.shelf !== undefined) updateData.shelf = updates.shelf;
      if (updates.bin !== undefined) updateData.bin = updates.bin;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;

      await db.update(locations).set(updateData).where(eq(locations.id, id));

      return { success: true };
    }),

  // Delete location (soft delete by setting isActive = 0)
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.update(locations).set({ isActive: 0 }).where(eq(locations.id, input.id));

    return { success: true };
  }),

  // Get batch locations (where batches are stored)
  getBatchLocations: publicProcedure
    .input(z.object({ batchId: z.number().optional() }))
    .query(async ({ input }) => {
      let query = db
        .select({
          id: batchLocations.id,
          batchId: batchLocations.batchId,
          site: batchLocations.site,
          zone: batchLocations.zone,
          rack: batchLocations.rack,
          shelf: batchLocations.shelf,
          bin: batchLocations.bin,
          quantity: batchLocations.quantity,
          createdAt: batchLocations.createdAt,
          updatedAt: batchLocations.updatedAt,
        })
        .from(batchLocations);

      if (input.batchId) {
        query = query.where(eq(batchLocations.batchId, input.batchId)) as typeof query;
      }

      return await query;
    }),

  // Assign batch to location
  assignBatchToLocation: publicProcedure
    .input(
      z.object({
        batchId: z.number(),
        site: z.string(),
        zone: z.string().optional(),
        rack: z.string().optional(),
        shelf: z.string().optional(),
        bin: z.string().optional(),
        quantity: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [result] = await db.insert(batchLocations).values({
        batchId: input.batchId,
        site: input.site,
        zone: input.zone,
        rack: input.rack,
        shelf: input.shelf,
        bin: input.bin,
        quantity: input.quantity,
      });

      return { id: result.insertId };
    }),

  // Get location inventory summary
  getLocationInventory: publicProcedure
    .input(z.object({ site: z.string().optional() }))
    .query(async ({ input }) => {
      let query = db
        .select({
          site: batchLocations.site,
          zone: batchLocations.zone,
          rack: batchLocations.rack,
          shelf: batchLocations.shelf,
          bin: batchLocations.bin,
          totalQuantity: sql<string>`SUM(CAST(${batchLocations.quantity} AS DECIMAL(15,4)))`,
          batchCount: sql<number>`COUNT(DISTINCT ${batchLocations.batchId})`,
        })
        .from(batchLocations)
        .groupBy(
          batchLocations.site,
          batchLocations.zone,
          batchLocations.rack,
          batchLocations.shelf,
          batchLocations.bin
        );

      if (input?.site) {
        query = query.where(eq(batchLocations.site, input.site)) as typeof query;
      }

      return await query;
    }),
});
