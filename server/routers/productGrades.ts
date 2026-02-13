/**
 * Product Grades Router (MEET-070)
 * Sprint 5 Track D.5: Product Grades (AAAA/AAA/AA/B/C)
 *
 * Product quality grading:
 * - Define grade scale (AAAA, AAA, AA, A, B, C)
 * - Assign grade to products/batches
 * - Filter by grade
 * - Grade affects pricing suggestions
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


import { batches, products } from "../../drizzle/schema";
import { productGrades } from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, asc, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Input Schemas
// ============================================================================

const createGradeSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  color: z.string().optional(),
  pricingMultiplier: z.number().min(0).max(10).default(1),
  suggestedMarkupPercent: z.number().min(0).max(100).optional(),
});

const updateGradeSchema = z.object({
  id: z.number(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  color: z.string().optional(),
  pricingMultiplier: z.number().min(0).max(10).optional(),
  suggestedMarkupPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const productGradesRouter = router({
  /**
   * List all grades
   */
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(productGrades.deletedAt)];

      if (!input?.includeInactive) {
        conditions.push(eq(productGrades.isActive, true));
      }

      const grades = await db
        .select()
        .from(productGrades)
        .where(and(...conditions))
        .orderBy(asc(productGrades.sortOrder), asc(productGrades.code));

      // Get batch count per grade
      const batchCounts = await db
        .select({
          grade: batches.grade,
          count: sql<number>`COUNT(*)`,
        })
        .from(batches)
        .where(isNull(batches.deletedAt))
        .groupBy(batches.grade);

      const countMap = new Map(batchCounts.map(b => [b.grade, Number(b.count)]));

      return grades.map(g => ({
        ...g,
        batchCount: countMap.get(g.code) || 0,
      }));
    }),

  /**
   * Get grade by ID
   */
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [grade] = await db
        .select()
        .from(productGrades)
        .where(
          and(
            eq(productGrades.id, input.id),
            isNull(productGrades.deletedAt)
          )
        )
        .limit(1);

      if (!grade) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grade not found" });
      }

      return grade;
    }),

  /**
   * Get grade by code
   */
  getByCode: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [grade] = await db
        .select()
        .from(productGrades)
        .where(
          and(
            eq(productGrades.code, input.code),
            isNull(productGrades.deletedAt)
          )
        )
        .limit(1);

      return grade || null;
    }),

  /**
   * Create a new grade
   */
  create: protectedProcedure
    .use(requirePermission("settings:create"))
    .input(createGradeSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check for duplicate code
      const [existing] = await db
        .select({ id: productGrades.id })
        .from(productGrades)
        .where(eq(productGrades.code, input.code.toUpperCase()))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Grade code "${input.code}" already exists`,
        });
      }

      const result = await db.insert(productGrades).values({
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
        color: input.color,
        pricingMultiplier: input.pricingMultiplier.toFixed(4),
        suggestedMarkupPercent: input.suggestedMarkupPercent?.toFixed(2),
      });

      logger.info({
        msg: "[ProductGrades] Created grade",
        code: input.code,
        name: input.name,
      });

      return { id: Number(result[0].insertId), code: input.code.toUpperCase() };
    }),

  /**
   * Update a grade
   */
  update: protectedProcedure
    .use(requirePermission("settings:update"))
    .input(updateGradeSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updates } = input;

      // Check if grade exists
      const [existing] = await db
        .select()
        .from(productGrades)
        .where(eq(productGrades.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grade not found" });
      }

      // If updating code, check for duplicates
      if (updates.code && updates.code.toUpperCase() !== existing.code) {
        const [duplicate] = await db
          .select({ id: productGrades.id })
          .from(productGrades)
          .where(eq(productGrades.code, updates.code.toUpperCase()))
          .limit(1);

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Grade code "${updates.code}" already exists`,
          });
        }
      }

      const updateData: Record<string, unknown> = {};

      if (updates.code !== undefined) updateData.code = updates.code.toUpperCase();
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.pricingMultiplier !== undefined) {
        updateData.pricingMultiplier = updates.pricingMultiplier.toFixed(4);
      }
      if (updates.suggestedMarkupPercent !== undefined) {
        updateData.suggestedMarkupPercent = updates.suggestedMarkupPercent.toFixed(2);
      }
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      await db
        .update(productGrades)
        .set(updateData)
        .where(eq(productGrades.id, id));

      logger.info({
        msg: "[ProductGrades] Updated grade",
        gradeId: id,
        updates: Object.keys(updateData),
      });

      return { success: true, id };
    }),

  /**
   * Delete a grade (soft delete)
   */
  delete: protectedProcedure
    .use(requirePermission("settings:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check how many batches use this grade
      const [grade] = await db
        .select()
        .from(productGrades)
        .where(eq(productGrades.id, input.id))
        .limit(1);

      if (!grade) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grade not found" });
      }

      const [batchCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(batches)
        .where(
          and(
            eq(batches.grade, grade.code),
            isNull(batches.deletedAt)
          )
        );

      if (Number(batchCount?.count || 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete grade. ${batchCount?.count} batches are using this grade.`,
        });
      }

      await db
        .update(productGrades)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(productGrades.id, input.id));

      logger.info({
        msg: "[ProductGrades] Deleted grade",
        gradeId: input.id,
        code: grade.code,
      });

      return { success: true };
    }),

  /**
   * Calculate suggested price based on grade
   */
  calculateSuggestedPrice: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      gradeCode: z.string(),
      basePrice: z.number().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [grade] = await db
        .select()
        .from(productGrades)
        .where(
          and(
            eq(productGrades.code, input.gradeCode),
            eq(productGrades.isActive, true),
            isNull(productGrades.deletedAt)
          )
        )
        .limit(1);

      if (!grade) {
        return {
          suggestedPrice: input.basePrice,
          multiplier: 1,
          markupPercent: 0,
          gradeFound: false,
        };
      }

      const multiplier = parseFloat(grade.pricingMultiplier || "1");
      const markupPercent = parseFloat(grade.suggestedMarkupPercent || "0");

      // Apply multiplier to base price
      let suggestedPrice = input.basePrice * multiplier;

      // Apply markup if set
      if (markupPercent > 0) {
        suggestedPrice = suggestedPrice * (1 + markupPercent / 100);
      }

      return {
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        multiplier,
        markupPercent,
        gradeFound: true,
        gradeName: grade.name,
      };
    }),

  /**
   * Get batches by grade
   */
  getBatchesByGrade: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      gradeCode: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const batchList = await db
        .select({
          batch: batches,
          product: {
            id: products.id,
            name: products.nameCanonical,
          },
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .where(
          and(
            eq(batches.grade, input.gradeCode),
            isNull(batches.deletedAt)
          )
        )
        .orderBy(desc(batches.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(batches)
        .where(
          and(
            eq(batches.grade, input.gradeCode),
            isNull(batches.deletedAt)
          )
        );

      return {
        items: batchList.map(b => ({
          ...b.batch,
          product: b.product,
        })),
        total: Number(countResult?.count || 0),
      };
    }),

  /**
   * Get grade distribution statistics
   */
  getDistribution: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get all grades
      const grades = await db
        .select()
        .from(productGrades)
        .where(
          and(
            eq(productGrades.isActive, true),
            isNull(productGrades.deletedAt)
          )
        )
        .orderBy(asc(productGrades.sortOrder));

      // Get batch counts per grade
      const batchDistribution = await db
        .select({
          grade: batches.grade,
          count: sql<number>`COUNT(*)`,
          totalQuantity: sql<string>`SUM(CAST(on_hand_qty AS DECIMAL(15,2)))`,
        })
        .from(batches)
        .where(isNull(batches.deletedAt))
        .groupBy(batches.grade);

      const distributionMap = new Map(
        batchDistribution.map(b => [
          b.grade,
          {
            count: Number(b.count),
            totalQuantity: parseFloat(b.totalQuantity || "0"),
          },
        ])
      );

      return grades.map(g => ({
        gradeId: g.id,
        gradeCode: g.code,
        gradeName: g.name,
        color: g.color,
        batchCount: distributionMap.get(g.code)?.count || 0,
        totalQuantity: distributionMap.get(g.code)?.totalQuantity || 0,
      }));
    }),

  /**
   * Reorder grades
   */
  reorder: protectedProcedure
    .use(requirePermission("settings:update"))
    .input(z.object({
      gradeIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (let i = 0; i < input.gradeIds.length; i++) {
        await db
          .update(productGrades)
          .set({ sortOrder: i })
          .where(eq(productGrades.id, input.gradeIds[i]));
      }

      return { success: true };
    }),
});
