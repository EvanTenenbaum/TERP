import { getDb } from "./db";
import { dashboardWidgetLayouts, dashboardKpiConfigs, users } from "../drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";

/**
 * Dashboard Database Access Layer
 * Handles widget layouts and KPI configurations
 */

// ============================================================================
// WIDGET LAYOUT QUERIES
// ============================================================================

/**
 * Get widget layout for a user
 * Falls back to role default if user has no custom layout
 */
export async function getUserWidgetLayout(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get user's role
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  // Try to get user's custom layout first
  const userLayout = await db
    .select()
    .from(dashboardWidgetLayouts)
    .where(eq(dashboardWidgetLayouts.userId, userId))
    .orderBy(dashboardWidgetLayouts.position);

  // If user has custom layout, return it
  if (userLayout.length > 0) {
    return userLayout;
  }

  // Otherwise, return role default
  const roleLayout = await db
    .select()
    .from(dashboardWidgetLayouts)
    .where(
      and(
        eq(dashboardWidgetLayouts.role, user.role),
        isNull(dashboardWidgetLayouts.userId)
      )
    )
    .orderBy(dashboardWidgetLayouts.position);

  return roleLayout;
}

/**
 * Save user's widget layout
 */
export async function saveUserWidgetLayout(
  userId: number,
  widgets: Array<{
    widgetType: string;
    position: number;
    width: number;
    height: number;
    isVisible: boolean;
    config?: any;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing user layout
  await db
    .delete(dashboardWidgetLayouts)
    .where(eq(dashboardWidgetLayouts.userId, userId));

  // Insert new layout
  if (widgets.length > 0) {
    await db.insert(dashboardWidgetLayouts).values(
      widgets.map((widget) => ({
        userId,
        widgetType: widget.widgetType,
        position: widget.position,
        width: widget.width,
        height: widget.height,
        isVisible: widget.isVisible,
        config: widget.config,
      }))
    );
  }

  return { success: true };
}

/**
 * Reset user's layout to role default
 */
export async function resetUserWidgetLayout(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete user's custom layout
  await db
    .delete(dashboardWidgetLayouts)
    .where(eq(dashboardWidgetLayouts.userId, userId));

  return { success: true };
}

/**
 * Get role default widget layout (admin only)
 */
export async function getRoleDefaultLayout(role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const layout = await db
    .select()
    .from(dashboardWidgetLayouts)
    .where(
      and(
        eq(dashboardWidgetLayouts.role, role),
        isNull(dashboardWidgetLayouts.userId)
      )
    )
    .orderBy(dashboardWidgetLayouts.position);

  return layout;
}

/**
 * Save role default widget layout (admin only)
 */
export async function saveRoleDefaultLayout(
  role: "user" | "admin",
  widgets: Array<{
    widgetType: string;
    position: number;
    width: number;
    height: number;
    isVisible: boolean;
    config?: any;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing role default
  await db
    .delete(dashboardWidgetLayouts)
    .where(
      and(
        eq(dashboardWidgetLayouts.role, role),
        isNull(dashboardWidgetLayouts.userId)
      )
    );

  // Insert new role default
  if (widgets.length > 0) {
    await db.insert(dashboardWidgetLayouts).values(
      widgets.map((widget) => ({
        role,
        widgetType: widget.widgetType,
        position: widget.position,
        width: widget.width,
        height: widget.height,
        isVisible: widget.isVisible,
        config: widget.config,
      }))
    );
  }

  return { success: true };
}

// ============================================================================
// KPI CONFIGURATION QUERIES
// ============================================================================

/**
 * Get KPI configuration for a role
 */
export async function getRoleKpiConfig(role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const config = await db
    .select()
    .from(dashboardKpiConfigs)
    .where(eq(dashboardKpiConfigs.role, role))
    .orderBy(dashboardKpiConfigs.position);

  return config;
}

/**
 * Save KPI configuration for a role (admin only)
 */
export async function saveRoleKpiConfig(
  role: "user" | "admin",
  kpis: Array<{
    kpiType: string;
    position: number;
    isVisible: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing config
  await db
    .delete(dashboardKpiConfigs)
    .where(eq(dashboardKpiConfigs.role, role));

  // Insert new config
  if (kpis.length > 0) {
    await db.insert(dashboardKpiConfigs).values(
      kpis.map((kpi) => ({
        role,
        kpiType: kpi.kpiType,
        position: kpi.position,
        isVisible: kpi.isVisible,
      }))
    );
  }

  return { success: true };
}

