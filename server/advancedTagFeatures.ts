/**
 * Advanced Tag Features
 * 
 * Main entry point for advanced tag search and management
 * Refactored for better modularity - helper functions extracted to separate modules
 */

import { getDb } from "./db";
import { tokenizeSearchExpression, evaluateBooleanExpression } from "./tagSearchHelpers";

// Re-export tag management functions for backward compatibility
export {
  createTagHierarchy,
  getTagChildren,
  getTagAncestors,
  mergeTags,
  createTagGroup,
  addTagToGroup,
  getTagsInGroup,
  getTagUsageStats,
  bulkAddTags,
  bulkRemoveTags
} from "./tagManagementService";

/**
 * Boolean tag search parser
 * Supports: (indica OR hybrid) AND premium AND NOT cbd
 * 
 * Security: Uses parameterized queries to prevent SQL injection
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
