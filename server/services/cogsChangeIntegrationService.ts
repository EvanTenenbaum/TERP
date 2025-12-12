/**
 * COGS Change Integration Service
 * Handles integration with existing COGS tracking system
 * v2.0 Sales Order Enhancements
 */

import { getDb } from "../db";
import { batches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface COGSChangeRecord {
  batchId: number;
  originalCOGS: number;
  overriddenCOGS: number;
  reason: string;
  timestamp: Date;
}

export const cogsChangeIntegrationService = {
  /**
   * Get current COGS for a batch
   */
  async getCurrentCOGS(batchId: number): Promise<number | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const batch = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batch.length === 0) {
      return null;
    }

    // Return the COGS from the batch
    // Note: The actual field name may vary based on schema
    return parseFloat(batch[0].unitCogs || '0');
  },

  /**
   * Track COGS override for reporting
   * This integrates with the existing COGS tracking system
   */
  async trackCOGSOverride(
    batchId: number,
    originalCOGS: number,
    overriddenCOGS: number,
    reason: string
  ): Promise<COGSChangeRecord> {
    const record: COGSChangeRecord = {
      batchId,
      originalCOGS,
      overriddenCOGS,
      reason,
      timestamp: new Date(),
    };

    // In a full implementation, this would:
    // 1. Store the override in a dedicated tracking table
    // 2. Trigger notifications if override exceeds threshold
    // 3. Update analytics/reporting dashboards
    // 4. Log to external systems if needed

    // For now, we return the record for audit logging
    return record;
  },

  /**
   * Calculate COGS variance
   */
  calculateVariance(
    originalCOGS: number,
    overriddenCOGS: number
  ): {
    varianceDollar: number;
    variancePercent: number;
  } {
    const varianceDollar = overriddenCOGS - originalCOGS;
    const variancePercent =
      originalCOGS > 0 ? (varianceDollar / originalCOGS) * 100 : 0;

    return {
      varianceDollar: Math.round(varianceDollar * 100) / 100,
      variancePercent: Math.round(variancePercent * 100) / 100,
    };
  },

  /**
   * Check if COGS override requires approval
   * Based on variance threshold
   */
  requiresApproval(
    originalCOGS: number,
    overriddenCOGS: number,
    thresholdPercent: number = 20
  ): boolean {
    const variance = this.calculateVariance(originalCOGS, overriddenCOGS);
    return Math.abs(variance.variancePercent) > thresholdPercent;
  },

  /**
   * Get COGS override statistics for a batch
   */
  async getCOGSOverrideStats(_batchId: number): Promise<{
    overrideCount: number;
    averageVariancePercent: number;
    maxVariancePercent: number;
  }> {
    // In a full implementation, this would query the tracking table
    // For now, return placeholder data
    return {
      overrideCount: 0,
      averageVariancePercent: 0,
      maxVariancePercent: 0,
    };
  },

  /**
   * Validate COGS value
   */
  validateCOGS(cogs: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (cogs < 0) {
      errors.push("COGS cannot be negative");
    }

    if (cogs === 0) {
      warnings.push("COGS is zero - verify this is correct");
    }

    if (cogs > 10000) {
      warnings.push("COGS is unusually high - verify this is correct");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};
