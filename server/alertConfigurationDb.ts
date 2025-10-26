import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { alertConfigurations, users } from "../drizzle/schema";

/**
 * Create alert configuration
 */
export async function createAlertConfiguration(data: {
  userId: number;
  alertType: string;
  targetType: string;
  targetId?: number;
  thresholdValue: number;
  thresholdOperator: string;
  deliveryMethod?: string;
  emailAddress?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db.insert(alertConfigurations).values({
      userId: data.userId,
      alertType: data.alertType as any,
      targetType: data.targetType as any,
      targetId: data.targetId,
      thresholdValue: data.thresholdValue.toString(),
      thresholdOperator: data.thresholdOperator as any,
      deliveryMethod: (data.deliveryMethod as any) || "DASHBOARD",
      emailAddress: data.emailAddress,
      isActive: true,
    });

    return { success: true, alertConfigId: result.insertId };
  } catch (error: any) {
    console.error("Error creating alert configuration:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update alert configuration
 */
export async function updateAlertConfiguration(
  alertConfigId: number,
  data: {
    thresholdValue?: number;
    thresholdOperator?: string;
    deliveryMethod?: string;
    emailAddress?: string;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const updateData: any = {};
    if (data.thresholdValue !== undefined)
      updateData.thresholdValue = data.thresholdValue.toString();
    if (data.thresholdOperator) updateData.thresholdOperator = data.thresholdOperator;
    if (data.deliveryMethod) updateData.deliveryMethod = data.deliveryMethod;
    if (data.emailAddress) updateData.emailAddress = data.emailAddress;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db
      .update(alertConfigurations)
      .set(updateData)
      .where(eq(alertConfigurations.id, alertConfigId));

    return { success: true };
  } catch (error: any) {
    console.error("Error updating alert configuration:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete alert configuration
 */
export async function deleteAlertConfiguration(alertConfigId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .delete(alertConfigurations)
      .where(eq(alertConfigurations.id, alertConfigId));

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting alert configuration:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get alert configurations for a user
 */
export async function getUserAlertConfigurations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const configs = await db
      .select()
      .from(alertConfigurations)
      .where(eq(alertConfigurations.userId, userId))
      .orderBy(desc(alertConfigurations.createdAt));

    return { success: true, configurations: configs };
  } catch (error: any) {
    console.error("Error getting user alert configurations:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active alert configurations
 */
export async function getAllActiveAlertConfigurations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const configs = await db
      .select({
        config: alertConfigurations,
        user: users,
      })
      .from(alertConfigurations)
      .leftJoin(users, eq(alertConfigurations.userId, users.id))
      .where(eq(alertConfigurations.isActive, true));

    return { success: true, configurations: configs };
  } catch (error: any) {
    console.error("Error getting all active alert configurations:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get alert configurations by type
 */
export async function getAlertConfigurationsByType(alertType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const configs = await db
      .select({
        config: alertConfigurations,
        user: users,
      })
      .from(alertConfigurations)
      .leftJoin(users, eq(alertConfigurations.userId, users.id))
      .where(
        and(
          eq(alertConfigurations.alertType, alertType as any),
          eq(alertConfigurations.isActive, true)
        )
      );

    return { success: true, configurations: configs };
  } catch (error: any) {
    console.error("Error getting alert configurations by type:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle alert configuration active status
 */
export async function toggleAlertConfiguration(alertConfigId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db
      .select()
      .from(alertConfigurations)
      .where(eq(alertConfigurations.id, alertConfigId));

    if (!existing) {
      return { success: false, error: "Alert configuration not found" };
    }

    await db
      .update(alertConfigurations)
      .set({ isActive: !existing.isActive })
      .where(eq(alertConfigurations.id, alertConfigId));

    return { success: true, isActive: !existing.isActive };
  } catch (error: any) {
    console.error("Error toggling alert configuration:", error);
    return { success: false, error: error.message };
  }
}

