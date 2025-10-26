import { getDb } from "./db";
import { 
  tags,
  tagHierarchy,
  tagGroups,
  tagGroupMembers,
  productTags,
  batches,
  type Tag,
  type TagHierarchy,
  type TagGroup
} from "../drizzle/schema";
import { eq, and, or, sql, inArray, desc } from "drizzle-orm";

/**
 * Boolean tag search parser
 * Supports: (indica OR hybrid) AND premium AND NOT cbd
 */
export async function booleanTagSearch(
  searchExpression: string
): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Parse the boolean expression
    // This is a simplified parser - a production version would use a proper parser library
    const tokens = tokenizeSearchExpression(searchExpression);
    const productIds = await evaluateBooleanExpression(tokens);

    return productIds;
  } catch (error: any) {
    throw new Error(`Failed to execute boolean tag search: ${error.message}`);
  }
}

/**
 * Tokenize search expression
 */
function tokenizeSearchExpression(expression: string): string[] {
  // Remove extra spaces and split by operators
  const normalized = expression.replace(/\s+/g, ' ').trim();
  const tokens = normalized.match(/\(|\)|AND|OR|NOT|[^\s()]+/g) || [];
  return tokens;
}

/**
 * Evaluate boolean expression
 * Simplified implementation - handles basic AND, OR, NOT
 */
async function evaluateBooleanExpression(tokens: string[]): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // For simplicity, we'll handle basic cases
  // A full implementation would build an AST and evaluate it
  
  const andTerms: string[] = [];
  const orTerms: string[] = [];
  const notTerms: string[] = [];
  
  let currentOperator = "AND";
  let negate = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === "AND") {
      currentOperator = "AND";
    } else if (token === "OR") {
      currentOperator = "OR";
    } else if (token === "NOT") {
      negate = true;
    } else if (token !== "(" && token !== ")") {
      // It's a tag name
      if (negate) {
        notTerms.push(token.toLowerCase());
        negate = false;
      } else if (currentOperator === "OR") {
        orTerms.push(token.toLowerCase());
      } else {
        andTerms.push(token.toLowerCase());
      }
    }
  }

  // Get products matching the criteria
  let productIds: number[] = [];

  // Start with AND terms (must have all)
  if (andTerms.length > 0) {
    const andTags = await db.select()
      .from(tags)
      .where(sql`LOWER(${tags.name}) IN (${andTerms.map(t => `'${t}'`).join(',')})`);

    if (andTags.length === 0) return [];

    const andTagIds = andTags.map(t => t.id);

    // Get products that have ALL these tags
    const productTagsResult = await db.select()
      .from(productTags)
      .where(inArray(productTags.tagId, andTagIds));

    // Count how many required tags each product has
    const productTagCounts: Record<number, number> = {};
    for (const pt of productTagsResult) {
      productTagCounts[pt.productId] = (productTagCounts[pt.productId] || 0) + 1;
    }

    // Filter to products that have all required tags
    productIds = Object.entries(productTagCounts)
      .filter(([_, count]) => count === andTagIds.length)
      .map(([id, _]) => parseInt(id));
  }

  // Add OR terms (must have at least one)
  if (orTerms.length > 0) {
    const orTags = await db.select()
      .from(tags)
      .where(sql`LOWER(${tags.name}) IN (${orTerms.map(t => `'${t}'`).join(',')})`);

    const orTagIds = orTags.map(t => t.id);

    const orProductTags = await db.select()
      .from(productTags)
      .where(inArray(productTags.tagId, orTagIds));

    const orProductIds = Array.from(new Set(orProductTags.map(pt => pt.productId)));

    if (andTerms.length === 0) {
      productIds = orProductIds;
    } else {
      // Intersect with existing results
      productIds = productIds.filter(id => orProductIds.includes(id));
    }
  }

  // Remove NOT terms (must not have any)
  if (notTerms.length > 0) {
    const notTags = await db.select()
      .from(tags)
      .where(sql`LOWER(${tags.name}) IN (${notTerms.map(t => `'${t}'`).join(',')})`);

    const notTagIds = notTags.map(t => t.id);

    const notProductTags = await db.select()
      .from(productTags)
      .where(inArray(productTags.tagId, notTagIds));

    const notProductIds = new Set(notProductTags.map(pt => pt.productId));

    productIds = productIds.filter(id => !notProductIds.has(id));
  }

  return productIds;
}

/**
 * Create tag hierarchy (parent-child relationship)
 */
export async function createTagHierarchy(
  parentTagId: number,
  childTagId: number
): Promise<TagHierarchy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Check for circular reference
    const wouldCreateCircle = await checkCircularReference(parentTagId, childTagId);
    if (wouldCreateCircle) {
      throw new Error("Cannot create hierarchy: would create circular reference");
    }

    // Check if relationship already exists
    const existing = await db.select()
      .from(tagHierarchy)
      .where(and(
        eq(tagHierarchy.parentTagId, parentTagId),
        eq(tagHierarchy.childTagId, childTagId)
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Tag hierarchy already exists");
    }

    const [hierarchy] = await db.insert(tagHierarchy).values({
      parentTagId,
      childTagId
    });

    const [created] = await db.select()
      .from(tagHierarchy)
      .where(eq(tagHierarchy.id, hierarchy.insertId))
      .limit(1);

    return created;
  } catch (error: any) {
    throw new Error(`Failed to create tag hierarchy: ${error.message}`);
  }
}

/**
 * Check for circular reference in tag hierarchy
 */
async function checkCircularReference(
  parentTagId: number,
  childTagId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if childTagId is an ancestor of parentTagId
  let currentId = parentTagId;
  const visited = new Set<number>();

  while (currentId) {
    if (currentId === childTagId) {
      return true; // Circular reference detected
    }

    if (visited.has(currentId)) {
      break; // Already checked this path
    }

    visited.add(currentId);

    // Get parent of current tag
    const [parent] = await db.select()
      .from(tagHierarchy)
      .where(eq(tagHierarchy.childTagId, currentId))
      .limit(1);

    if (!parent) break;

    currentId = parent.parentTagId;
  }

  return false;
}

/**
 * Get tag children (direct descendants)
 */
export async function getTagChildren(tagId: number): Promise<Tag[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const hierarchies = await db.select()
      .from(tagHierarchy)
      .where(eq(tagHierarchy.parentTagId, tagId));

    const childIds = hierarchies.map(h => h.childTagId);

    if (childIds.length === 0) return [];

    const children = await db.select()
      .from(tags)
      .where(inArray(tags.id, childIds));

    return children;
  } catch (error: any) {
    throw new Error(`Failed to get tag children: ${error.message}`);
  }
}

/**
 * Get tag ancestors (all parents up the hierarchy)
 */
export async function getTagAncestors(tagId: number): Promise<Tag[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const ancestors: Tag[] = [];
    let currentId = tagId;
    const visited = new Set<number>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const [parent] = await db.select()
        .from(tagHierarchy)
        .where(eq(tagHierarchy.childTagId, currentId))
        .limit(1);

      if (!parent) break;

      const [parentTag] = await db.select()
        .from(tags)
        .where(eq(tags.id, parent.parentTagId))
        .limit(1);

      if (parentTag) {
        ancestors.push(parentTag);
      }

      currentId = parent.parentTagId;
    }

    return ancestors;
  } catch (error: any) {
    throw new Error(`Failed to get tag ancestors: ${error.message}`);
  }
}

/**
 * Merge two tags
 * Moves all associations from sourceTag to targetTag, then deletes sourceTag
 */
export async function mergeTags(
  sourceTagId: number,
  targetTagId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all products tagged with source tag
    const sourceProductTags = await db.select()
      .from(productTags)
      .where(eq(productTags.tagId, sourceTagId));

    // Add target tag to those products (if not already tagged)
    for (const pt of sourceProductTags) {
      const existing = await db.select()
        .from(productTags)
        .where(and(
          eq(productTags.productId, pt.productId),
          eq(productTags.tagId, targetTagId)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(productTags).values({
          productId: pt.productId,
          tagId: targetTagId
        });
      }
    }

    // Delete source tag associations
    await db.delete(productTags)
      .where(eq(productTags.tagId, sourceTagId));

    // Delete source tag from hierarchy
    await db.delete(tagHierarchy)
      .where(or(
        eq(tagHierarchy.parentTagId, sourceTagId),
        eq(tagHierarchy.childTagId, sourceTagId)
      ));

    // Delete source tag
    await db.delete(tags)
      .where(eq(tags.id, sourceTagId));
  } catch (error: any) {
    throw new Error(`Failed to merge tags: ${error.message}`);
  }
}

/**
 * Create tag group
 */
export async function createTagGroup(
  name: string,
  description: string,
  color: string,
  createdBy: number
): Promise<TagGroup> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [group] = await db.insert(tagGroups).values({
      name,
      description,
      color,
      createdBy
    });

    const [created] = await db.select()
      .from(tagGroups)
      .where(eq(tagGroups.id, group.insertId))
      .limit(1);

    return created;
  } catch (error: any) {
    throw new Error(`Failed to create tag group: ${error.message}`);
  }
}

/**
 * Add tag to group
 */
export async function addTagToGroup(
  groupId: number,
  tagId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Check if already in group
    const existing = await db.select()
      .from(tagGroupMembers)
      .where(and(
        eq(tagGroupMembers.groupId, groupId),
        eq(tagGroupMembers.tagId, tagId)
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Tag already in group");
    }

    await db.insert(tagGroupMembers).values({
      groupId,
      tagId
    });
  } catch (error: any) {
    throw new Error(`Failed to add tag to group: ${error.message}`);
  }
}

/**
 * Get tags in group
 */
export async function getTagsInGroup(groupId: number): Promise<Tag[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const members = await db.select()
      .from(tagGroupMembers)
      .where(eq(tagGroupMembers.groupId, groupId));

    const tagIds = members.map(m => m.tagId);

    if (tagIds.length === 0) return [];

    const tagsInGroup = await db.select()
      .from(tags)
      .where(inArray(tags.id, tagIds));

    return tagsInGroup;
  } catch (error: any) {
    throw new Error(`Failed to get tags in group: ${error.message}`);
  }
}

/**
 * Get tag usage statistics
 */
export async function getTagUsageStats(): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allTags = await db.select().from(tags);
    const stats = [];

    for (const tag of allTags) {
      const productCount = await db.select()
        .from(productTags)
        .where(eq(productTags.tagId, tag.id));

      stats.push({
        tagId: tag.id,
        tagName: tag.name,
        category: tag.category,
        productCount: productCount.length
      });
    }

    return stats.sort((a, b) => b.productCount - a.productCount);
  } catch (error: any) {
    throw new Error(`Failed to get tag usage stats: ${error.message}`);
  }
}

/**
 * Bulk tag operations
 */
export async function bulkAddTags(
  productIds: number[],
  tagIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    for (const productId of productIds) {
      for (const tagId of tagIds) {
        // Check if already tagged
        const existing = await db.select()
          .from(productTags)
          .where(and(
            eq(productTags.productId, productId),
            eq(productTags.tagId, tagId)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(productTags).values({
            productId,
            tagId
          });
        }
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to bulk add tags: ${error.message}`);
  }
}

/**
 * Bulk remove tags
 */
export async function bulkRemoveTags(
  productIds: number[],
  tagIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(productTags)
      .where(and(
        inArray(productTags.productId, productIds),
        inArray(productTags.tagId, tagIds)
      ));
  } catch (error: any) {
    throw new Error(`Failed to bulk remove tags: ${error.message}`);
  }
}

