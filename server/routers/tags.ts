/**
 * FEAT-002: Tag Management Router
 *
 * Provides CRUD operations for tags with color-coding and category support
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tags, productTags, clientTags } from "../../drizzle/schema";
import { eq, like, or, and, isNull, desc } from "drizzle-orm";

const tagCategoryEnum = z.enum(["STATUS", "PRIORITY", "TYPE", "CUSTOM", "STRAIN", "FLAVOR", "EFFECT"]);

export const tagsRouter = router({
  /**
   * List all tags
   */
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          category: tagCategoryEnum.optional(),
          includeDeleted: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Filter by search term
      if (input?.search) {
        conditions.push(
          or(
            like(tags.name, `%${input.search}%`),
            like(tags.description, `%${input.search}%`)
          )
        );
      }

      // Filter by category
      if (input?.category) {
        conditions.push(eq(tags.category, input.category));
      }

      // Filter out deleted tags unless explicitly requested
      if (!input?.includeDeleted) {
        conditions.push(isNull(tags.deletedAt));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allTags = await db
        .select()
        .from(tags)
        .where(whereClause)
        .orderBy(desc(tags.createdAt));

      return allTags;
    }),

  /**
   * Get a single tag by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [tag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, input.id), isNull(tags.deletedAt)))
        .limit(1);

      if (!tag) {
        throw new Error("Tag not found");
      }

      return tag;
    }),

  /**
   * Create a new tag
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Tag name is required"),
        standardizedName: z.string().min(1),
        category: tagCategoryEnum.optional().default("CUSTOM"),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional().default("#6B7280"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if tag with same name already exists
      const [existing] = await db
        .select()
        .from(tags)
        .where(eq(tags.name, input.name))
        .limit(1);

      if (existing) {
        throw new Error("A tag with this name already exists");
      }

      const [result] = await db.insert(tags).values({
        name: input.name,
        standardizedName: input.standardizedName,
        category: input.category,
        color: input.color,
        description: input.description,
      });

      const [newTag] = await db
        .select()
        .from(tags)
        .where(eq(tags.id, result.insertId))
        .limit(1);

      return newTag;
    }),

  /**
   * Update an existing tag
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: tagCategoryEnum.optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;

      // If name is being updated, check for duplicates
      if (updates.name) {
        const [existing] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.name, updates.name), eq(tags.id, id)))
          .limit(1);

        if (existing && existing.id !== id) {
          throw new Error("A tag with this name already exists");
        }
      }

      await db
        .update(tags)
        .set({
          ...updates,
          ...(updates.name && { standardizedName: updates.name.toLowerCase().replace(/\s+/g, "-") }),
        })
        .where(eq(tags.id, id));

      const [updatedTag] = await db
        .select()
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);

      return updatedTag;
    }),

  /**
   * Soft delete a tag
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Soft delete the tag
      await db
        .update(tags)
        .set({ deletedAt: new Date() })
        .where(eq(tags.id, input.id));

      // Also soft delete all tag associations
      await db
        .update(productTags)
        .set({ deletedAt: new Date() })
        .where(eq(productTags.tagId, input.id));

      await db
        .update(clientTags)
        .set({ deletedAt: new Date() })
        .where(eq(clientTags.tagId, input.id));

      return { success: true };
    }),

  /**
   * Get tags for a specific product
   */
  getProductTags: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const productTagsData = await db
        .select({
          tag: tags,
        })
        .from(productTags)
        .innerJoin(tags, eq(productTags.tagId, tags.id))
        .where(
          and(
            eq(productTags.productId, input.productId),
            isNull(productTags.deletedAt),
            isNull(tags.deletedAt)
          )
        );

      return productTagsData.map((pt) => pt.tag);
    }),

  /**
   * Get tags for a specific client
   */
  getClientTags: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const clientTagsData = await db
        .select({
          tag: tags,
        })
        .from(clientTags)
        .innerJoin(tags, eq(clientTags.tagId, tags.id))
        .where(
          and(
            eq(clientTags.clientId, input.clientId),
            isNull(clientTags.deletedAt),
            isNull(tags.deletedAt)
          )
        );

      return clientTagsData.map((ct) => ct.tag);
    }),

  /**
   * Add tags to a product
   */
  addProductTags: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const tagId of input.tagIds) {
        // Check if already tagged
        const [existing] = await db
          .select()
          .from(productTags)
          .where(
            and(
              eq(productTags.productId, input.productId),
              eq(productTags.tagId, tagId),
              isNull(productTags.deletedAt)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(productTags).values({
            productId: input.productId,
            tagId,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Add tags to a client
   */
  addClientTags: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const tagId of input.tagIds) {
        // Check if already tagged
        const [existing] = await db
          .select()
          .from(clientTags)
          .where(
            and(
              eq(clientTags.clientId, input.clientId),
              eq(clientTags.tagId, tagId),
              isNull(clientTags.deletedAt)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(clientTags).values({
            clientId: input.clientId,
            tagId,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Remove tags from a product
   */
  removeProductTags: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const tagId of input.tagIds) {
        await db
          .update(productTags)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(productTags.productId, input.productId),
              eq(productTags.tagId, tagId)
            )
          );
      }

      return { success: true };
    }),

  /**
   * Remove tags from a client
   */
  removeClientTags: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        tagIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const tagId of input.tagIds) {
        await db
          .update(clientTags)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(clientTags.clientId, input.clientId),
              eq(clientTags.tagId, tagId)
            )
          );
      }

      return { success: true };
    }),
});
