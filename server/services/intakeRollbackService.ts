/**
 * Intake Rollback Service
 * TER-1228: Soft-delete entities created during a failed intake transaction
 */

import { getDb } from "../db";
import {
  vendors,
  brands,
  products,
  lots,
  batches,
  batchLocations,
  auditLogs,
  vendorPayables,
} from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "../_core/logger";
import type { IntakeStepName } from "@shared/intakeProgress";

export interface RollbackTarget {
  step: IntakeStepName;
  entityId: number;
}

export interface RollbackResult {
  success: boolean;
  rolledBackSteps: IntakeStepName[];
  error?: string;
}

/**
 * Rollback entities created during a failed intake
 * Soft-deletes entities in reverse order of creation
 */
export async function rollbackIntake(
  targets: RollbackTarget[],
  actorId: number
): Promise<RollbackResult> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      rolledBackSteps: [],
      error: "Database not available",
    };
  }

  const rolledBackSteps: IntakeStepName[] = [];
  const now = new Date();

  try {
    // Process rollback in reverse order
    const reversedTargets = [...targets].reverse();

    for (const target of reversedTargets) {
      try {
        switch (target.step) {
          case "CREATE_PAYABLE":
            // Soft-delete vendor payable
            await db
              .update(vendorPayables)
              .set({ deletedAt: now })
              .where(
                and(
                  eq(vendorPayables.id, target.entityId),
                  isNull(vendorPayables.deletedAt)
                )
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_AUDIT":
            // Soft-delete audit log
            await db
              .update(auditLogs)
              .set({ deletedAt: now })
              .where(
                and(
                  eq(auditLogs.id, target.entityId),
                  isNull(auditLogs.deletedAt)
                )
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_LOCATION":
            // Soft-delete batch location
            await db
              .update(batchLocations)
              .set({ deletedAt: now })
              .where(
                and(
                  eq(batchLocations.id, target.entityId),
                  isNull(batchLocations.deletedAt)
                )
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_BATCH":
            // Soft-delete batch
            await db
              .update(batches)
              .set({ deletedAt: now })
              .where(
                and(eq(batches.id, target.entityId), isNull(batches.deletedAt))
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_LOT":
            // Soft-delete lot
            await db
              .update(lots)
              .set({ deletedAt: now })
              .where(and(eq(lots.id, target.entityId), isNull(lots.deletedAt)));
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_PRODUCT":
            // Soft-delete product
            await db
              .update(products)
              .set({ deletedAt: now })
              .where(
                and(eq(products.id, target.entityId), isNull(products.deletedAt))
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_BRAND":
            // Soft-delete brand
            await db
              .update(brands)
              .set({ deletedAt: now })
              .where(
                and(eq(brands.id, target.entityId), isNull(brands.deletedAt))
              );
            rolledBackSteps.push(target.step);
            break;

          case "CREATE_VENDOR":
            // Soft-delete vendor
            await db
              .update(vendors)
              .set({ deletedAt: now })
              .where(
                and(eq(vendors.id, target.entityId), isNull(vendors.deletedAt))
              );
            rolledBackSteps.push(target.step);
            break;

          default:
            // Skip non-entity steps (VALIDATE_COGS, LOOKUP_SUPPLIER)
            logger.info({
              msg: "Skipping rollback for non-entity step",
              step: target.step,
            });
        }

        // Create audit log for rollback action
        await db.insert(auditLogs).values({
          actorId,
          entity: "Batch",
          entityId: target.entityId,
          action: "ROLLBACK",
          before: null,
          after: JSON.stringify({ step: target.step, rolledBack: true }),
          reason: "Intake transaction rollback",
          deletedAt: null,
        });
      } catch (stepError) {
        logger.error({
          msg: "Error rolling back step",
          step: target.step,
          entityId: target.entityId,
          error: stepError,
        });
        // Continue with remaining rollback steps
      }
    }

    logger.info({
      msg: "Intake rollback completed",
      rolledBackSteps,
      totalSteps: targets.length,
    });

    return {
      success: true,
      rolledBackSteps,
    };
  } catch (error) {
    logger.error({
      msg: "Error during intake rollback",
      error,
      rolledBackSteps,
    });
    return {
      success: false,
      rolledBackSteps,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
