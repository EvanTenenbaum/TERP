/**
 * Default Warehouse Helper
 * FEAT-010: Provides utilities to get default warehouse for users
 */

import { getDb } from "../db";
import { userPreferences, organizationSettings, locations } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Get the default warehouse/location for a user
 * Hierarchy:
 * 1. User preference (defaultWarehouseId)
 * 2. Team/Organization default (team_default_warehouse_id setting)
 * 3. First active location
 * 4. null (no default)
 *
 * @param userId - The user ID to get default warehouse for
 * @returns Location ID or null if no default is configured
 */
export async function getDefaultWarehouse(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // 1. Check user preference first
    const [userPref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (userPref?.defaultWarehouseId) {
      // Verify the warehouse still exists and is active
      const [warehouse] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.id, userPref.defaultWarehouseId),
            eq(locations.isActive, 1),
            isNull(locations.deletedAt)
          )
        )
        .limit(1);

      if (warehouse) {
        return warehouse.id;
      }
    }

    // 2. Check organization/team default
    const [orgSetting] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.settingKey, "team_default_warehouse_id"))
      .limit(1);

    if (orgSetting?.settingValue) {
      try {
        const warehouseId = JSON.parse(orgSetting.settingValue as string);
        if (typeof warehouseId === "number") {
          // Verify the warehouse still exists and is active
          const [warehouse] = await db
            .select()
            .from(locations)
            .where(
              and(
                eq(locations.id, warehouseId),
                eq(locations.isActive, 1),
                isNull(locations.deletedAt)
              )
            )
            .limit(1);

          if (warehouse) {
            return warehouse.id;
          }
        }
      } catch {
        // Invalid JSON, continue to fallback
      }
    }

    // 3. Fallback to first active location
    const [firstLocation] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.isActive, 1), isNull(locations.deletedAt)))
      .limit(1);

    return firstLocation?.id || null;
  } catch (error) {
    console.error("Error getting default warehouse:", error);
    return null;
  }
}

/**
 * Get the default location for a user (alias for getDefaultWarehouse)
 * Same hierarchy as getDefaultWarehouse
 *
 * @param userId - The user ID to get default location for
 * @returns Location ID or null if no default is configured
 */
export async function getDefaultLocation(userId: number): Promise<number | null> {
  return getDefaultWarehouse(userId);
}
