import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  userDashboardPreferences,
  type WidgetConfig,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Dashboard Preferences Router
 *
 * Manages user-specific dashboard customization preferences for cross-device sync.
 * Endpoints handle CRUD operations for widget visibility, layout presets, and settings.
 */

/**
 * Default dashboard preferences
 * Returns the standard "Operations Dashboard" preset with all widgets visible
 */
function getDefaultPreferences() {
  return {
    activeLayout: "operations" as const,
    widgetConfig: [
      { id: "sales-by-client", isVisible: true, order: 1 },
      { id: "cash-flow", isVisible: true, order: 2 },
      { id: "transaction-snapshot", isVisible: true, order: 3 },
      { id: "inventory-snapshot", isVisible: true, order: 4 },
      { id: "total-debt", isVisible: true, order: 5 },
      { id: "sales-comparison", isVisible: true, order: 6 },
      { id: "profitability", isVisible: true, order: 7 },
      { id: "matchmaking-opportunities", isVisible: true, order: 8 },
    ] as WidgetConfig[],
  };
}

/**
 * Widget configuration validation schema
 */
const widgetConfigSchema = z.object({
  id: z.string(),
  isVisible: z.boolean(),
  order: z.number().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Dashboard preferences input validation schema
 */
const preferencesInputSchema = z.object({
  activeLayout: z.enum(["executive", "operations", "sales", "custom"]),
  widgetConfig: z.array(widgetConfigSchema),
});

export const dashboardPreferencesRouter = router({
  /**
   * Get User's Dashboard Preferences
   *
   * Fetches the user's saved dashboard preferences from the database.
   * Returns default preferences if no saved preferences exist.
   *
   * @returns UserDashboardPreferences or default preferences
   */
  getPreferences: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Query for user's preferences
        const preferences = await db.query.userDashboardPreferences.findFirst({
          where: eq(userDashboardPreferences.userId, ctx.user.id),
        });

        // Return saved preferences or defaults
        if (preferences) {
          return {
            id: preferences.id,
            userId: preferences.userId,
            activeLayout: preferences.activeLayout,
            widgetConfig: preferences.widgetConfig,
            createdAt: preferences.createdAt,
            updatedAt: preferences.updatedAt,
          };
        } else {
          // Return default preferences (not saved to DB yet)
          return {
            ...getDefaultPreferences(),
            id: 0, // Indicates not yet saved
            userId: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      } catch (error) {
        console.error("Error fetching dashboard preferences:", error);
        throw new Error("Failed to fetch dashboard preferences");
      }
    }),

  /**
   * Update User's Dashboard Preferences
   *
   * Creates or updates the user's dashboard preferences in the database.
   * Performs an upsert operation: updates if exists, inserts if new.
   *
   * @param input.activeLayout - Selected layout preset
   * @param input.widgetConfig - Array of widget visibility/settings
   * @returns Success status
   */
  updatePreferences: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(preferencesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Check if preferences already exist
        const existing = await db.query.userDashboardPreferences.findFirst({
          where: eq(userDashboardPreferences.userId, ctx.user.id),
        });

        if (existing) {
          // Update existing record
          await db
            .update(userDashboardPreferences)
            .set({
              activeLayout: input.activeLayout,
              widgetConfig: input.widgetConfig,
              updatedAt: new Date(),
            })
            .where(eq(userDashboardPreferences.userId, ctx.user.id));

          return {
            success: true,
            message: "Dashboard preferences updated successfully",
            action: "updated" as const,
          };
        } else {
          // Create new record
          await db.insert(userDashboardPreferences).values({
            userId: ctx.user.id,
            activeLayout: input.activeLayout,
            widgetConfig: input.widgetConfig,
          });

          return {
            success: true,
            message: "Dashboard preferences created successfully",
            action: "created" as const,
          };
        }
      } catch (error) {
        console.error("Error updating dashboard preferences:", error);
        throw new Error("Failed to update dashboard preferences");
      }
    }),

  /**
   * Reset User's Dashboard Preferences
   *
   * Deletes the user's saved preferences from the database.
   * The frontend will fall back to default preferences after reset.
   *
   * @returns Success status
   */
  resetPreferences: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // Delete user's preferences
        await db
          .delete(userDashboardPreferences)
          .where(eq(userDashboardPreferences.userId, ctx.user.id));

        return {
          success: true,
          message: "Dashboard preferences reset to defaults",
        };
      } catch (error) {
        console.error("Error resetting dashboard preferences:", error);
        throw new Error("Failed to reset dashboard preferences");
      }
    }),

  /**
   * Get Default Preferences
   *
   * Returns the default dashboard preferences without saving to database.
   * Useful for preview or comparison purposes.
   *
   * @returns Default preferences object
   */
  getDefaults: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async () => {
      return getDefaultPreferences();
    }),
});
