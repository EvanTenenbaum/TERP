import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { alertConfigurations, users } from "../drizzle/schema";
import { logger } from "./_core/logger";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } as any);

    return { success: true, alertConfigId: result.insertId };
  } catch (error) {
    logger.error({
      msg: "Error creating alert configuration",
      userId: data.userId,
      alertType: data.alertType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
    const updateData: { thresholdValue?: string; thresholdOperator?: string; deliveryMethod?: string; emailAddress?: string; isActive?: boolean } = {};
    if (data.thresholdValue !== undefined)
      updateData.thresholdValue = data.thresholdValue.toString();
    if (data.thresholdOperator) (updateData as any).thresholdOperator = data.thresholdOperator;
    if (data.deliveryMethod) (updateData as any).deliveryMethod = data.deliveryMethod;
    if (data.emailAddress) updateData.emailAddress = data.emailAddress;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db
      .update(alertConfigurations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(eq(alertConfigurations.id, alertConfigId));

    return { success: true };
  } catch (error) {
    logger.error({
      msg: "Error updating alert configuration",
      alertConfigId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (error) {
    logger.error({
      msg: "Error deleting alert configuration",
      alertConfigId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (error) {
    logger.error({
      msg: "Error getting user alert configurations",
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (error) {
    logger.error({
      msg: "Error getting all active alert configurations",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq(alertConfigurations.alertType, alertType as any),
          eq(alertConfigurations.isActive, true)
        )
      );

    return { success: true, configurations: configs };
  } catch (error) {
    logger.error({
      msg: "Error getting alert configurations by type",
      alertType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (error) {
    logger.error({
      msg: "Error toggling alert configuration",
      alertConfigId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get alert configuration by ID (for ownership validation)
 */
export async function getAlertConfigurationById(alertConfigId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(alertConfigurations)
    .where(eq(alertConfigurations.id, alertConfigId));

  return config || null;
}

