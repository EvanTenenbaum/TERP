/**
 * Sequence Database Access Layer
 * Handles atomic, sequential code generation for lots, batches, and other entities
 *
 * This module implements:
 * - Atomic sequence generation using database transactions
 * - Row-level locking to prevent collisions
 * - Configurable prefixes and padding
 * - Thread-safe operation for concurrent requests
 */

import { getDb } from "./db";
import { sequences, type Sequence } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * Get the next sequence value atomically
 * Uses SELECT ... FOR UPDATE to ensure thread-safety
 *
 * @param sequenceName Name of the sequence (e.g., "lot_code", "batch_code")
 * @param padding Optional zero-padding length (default: 6)
 * @returns The next formatted code (e.g., "LOT-001234")
 */
export async function getNextSequence(
  sequenceName: string,
  padding: number = 6
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Use transaction with row-level locking
    const result = await db.transaction(async tx => {
      // Lock the sequence row for update
      const [sequence] = await tx
        .select()
        .from(sequences)
        .where(eq(sequences.name, sequenceName))
        .for("update"); // Row-level lock

      if (!sequence) {
        throw new Error(`Sequence '${sequenceName}' not found`);
      }

      // Increment the sequence
      const nextValue = sequence.currentValue + 1;

      // Update the sequence
      await tx
        .update(sequences)
        .set({ currentValue: nextValue })
        .where(eq(sequences.id, sequence.id));

      // Format the code with padding
      const paddedValue = nextValue.toString().padStart(padding, "0");
      return `${sequence.prefix}${paddedValue}`;
    });

    return result;
  } catch (error) {
    logger.error({ sequenceName, error }, "Error getting next sequence");
    throw new Error(
      `Failed to generate sequence: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get the current sequence value without incrementing
 *
 * @param sequenceName Name of the sequence
 * @returns The current sequence record
 */
export async function getCurrentSequence(
  sequenceName: string
): Promise<Sequence | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [sequence] = await db
      .select()
      .from(sequences)
      .where(eq(sequences.name, sequenceName))
      .limit(1);

    return sequence || null;
  } catch (error) {
    logger.error({ sequenceName, error }, "Error fetching sequence");
    throw new Error(
      `Failed to fetch sequence: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Initialize or update a sequence
 *
 * @param sequenceName Name of the sequence
 * @param prefix Prefix for generated codes
 * @param initialValue Initial value (default: 0)
 * @returns The created or updated sequence
 */
export async function initializeSequence(
  sequenceName: string,
  prefix: string,
  initialValue: number = 0
): Promise<Sequence> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Check if sequence exists
    const existing = await getCurrentSequence(sequenceName);

    if (existing) {
      // Update existing sequence
      await db
        .update(sequences)
        .set({ prefix, currentValue: initialValue })
        .where(eq(sequences.name, sequenceName));

      const [updated] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.name, sequenceName));

      return updated;
    } else {
      // Create new sequence
      const [created] = await db
        .insert(sequences)
        .values({
          name: sequenceName,
          prefix,
          currentValue: initialValue,
        })
        .$returningId();

      const [sequence] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.id, created.id));

      return sequence;
    }
  } catch (error) {
    logger.error({ sequenceName, error }, "Error initializing sequence");
    throw new Error(
      `Failed to initialize sequence: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Reset a sequence to a specific value
 * ⚠️ Use with caution - this can cause code collisions if not used properly
 *
 * @param sequenceName Name of the sequence
 * @param newValue New value to set
 */
export async function resetSequence(
  sequenceName: string,
  newValue: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(sequences)
      .set({ currentValue: newValue })
      .where(eq(sequences.name, sequenceName));
  } catch (error) {
    logger.error({ sequenceName, error }, "Error resetting sequence");
    throw new Error(
      `Failed to reset sequence: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all sequences
 * @returns Array of all sequence records
 */
export async function getAllSequences(): Promise<Sequence[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allSequences = await db.select().from(sequences);
    return allSequences;
  } catch (error) {
    logger.error({ error }, "Error fetching all sequences");
    throw new Error(
      `Failed to fetch sequences: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
