/**
 * Cron Leader Election Utility
 *
 * Implements a database-backed leader election mechanism to ensure that only
 * one instance in a multi-instance deployment executes scheduled cron jobs.
 *
 * This prevents duplicate cron job executions when running multiple app instances
 * on DigitalOcean App Platform (or any horizontally scaled environment).
 *
 * Design:
 * - Uses a database lock table with lease-based expiration
 * - Leader must renew lease periodically (heartbeat)
 * - If leader fails to renew, another instance can claim leadership
 * - Graceful shutdown releases the lock
 * - Atomic lock acquisition using INSERT ON DUPLICATE KEY UPDATE
 */

import { getDb } from "../db";
import { cronLeaderLock } from "../../drizzle/schema-cron";
import { eq, sql } from "drizzle-orm";
import { logger } from "../_core/logger";
import { randomUUID } from "crypto";

// Configuration constants
const LOCK_NAME = "cron_leader";
const LEASE_DURATION_MS = 30_000; // 30 seconds
const HEARTBEAT_INTERVAL_MS = 10_000; // 10 seconds (must be < LEASE_DURATION_MS)
const ACQUIRE_RETRY_INTERVAL_MS = 5_000; // 5 seconds between acquisition attempts

// Instance identifier (unique per process)
const INSTANCE_ID = `${process.env.HOSTNAME || "local"}-${process.pid}-${randomUUID().slice(0, 8)}`;

// Module state
let isLeader = false;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let acquireInterval: ReturnType<typeof setInterval> | null = null;
let isShuttingDown = false;
let shutdownHandlersRegistered = false;

/**
 * Attempts to acquire the leader lock using atomic INSERT ON DUPLICATE KEY UPDATE.
 * Returns true if this instance is now the leader.
 */
async function tryAcquireLock(): Promise<boolean> {
  if (isShuttingDown) return false;

  try {
    const db = await getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic upsert
    // This is atomic and avoids race conditions
    // The lock is acquired if:
    // 1. No lock exists (INSERT succeeds)
    // 2. Lock exists but expired (expires_at < NOW())
    // 3. We already own the lock (instance_id matches)
    await db.execute(sql`
      INSERT INTO cron_leader_lock (lock_name, instance_id, acquired_at, expires_at, last_heartbeat, created_at, updated_at)
      VALUES (${LOCK_NAME}, ${INSTANCE_ID}, ${now}, ${expiresAt}, ${now}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        instance_id = IF(expires_at < NOW() OR instance_id = VALUES(instance_id), VALUES(instance_id), instance_id),
        acquired_at = IF(expires_at < NOW() OR instance_id = VALUES(instance_id), VALUES(acquired_at), acquired_at),
        expires_at = IF(expires_at < NOW() OR instance_id = VALUES(instance_id), VALUES(expires_at), expires_at),
        last_heartbeat = IF(instance_id = VALUES(instance_id), VALUES(last_heartbeat), last_heartbeat),
        updated_at = NOW()
    `);

    // Verify we own the lock by querying it
    const result = await db
      .select()
      .from(cronLeaderLock)
      .where(eq(cronLeaderLock.lockName, LOCK_NAME))
      .limit(1);

    const lock = result[0];
    return lock?.instanceId === INSTANCE_ID;
  } catch (error) {
    logger.error({
      msg: "[CronLeaderElection] Failed to acquire lock",
      error: error instanceof Error ? error.message : String(error),
      instanceId: INSTANCE_ID,
    });
    return false;
  }
}

/**
 * Refreshes the leader lease (heartbeat).
 * Should be called periodically while holding the lock.
 */
async function refreshLease(): Promise<boolean> {
  if (!isLeader || isShuttingDown) return false;

  try {
    const db = await getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    await db
      .update(cronLeaderLock)
      .set({
        expiresAt: expiresAt,
        lastHeartbeat: now,
      })
      .where(eq(cronLeaderLock.lockName, LOCK_NAME));

    // Check if we still own the lock
    const lockResult = await db
      .select()
      .from(cronLeaderLock)
      .where(eq(cronLeaderLock.lockName, LOCK_NAME))
      .limit(1);

    const lock = lockResult[0];
    const success = lock?.instanceId === INSTANCE_ID;

    if (!success) {
      // We lost the lock (someone else claimed it, or it was deleted)
      logger.warn({
        msg: "[CronLeaderElection] Lost leader status",
        instanceId: INSTANCE_ID,
        currentHolder: lock?.instanceId,
      });
      isLeader = false;
    }

    return success;
  } catch (error) {
    logger.error({
      msg: "[CronLeaderElection] Failed to refresh lease",
      error: error instanceof Error ? error.message : String(error),
      instanceId: INSTANCE_ID,
    });
    return false;
  }
}

/**
 * Releases the leader lock.
 * Called during graceful shutdown.
 */
async function releaseLock(): Promise<void> {
  if (!isLeader) return;

  try {
    const db = await getDb();

    // Only delete if we own the lock
    const lockResult = await db
      .select()
      .from(cronLeaderLock)
      .where(eq(cronLeaderLock.lockName, LOCK_NAME))
      .limit(1);

    const lock = lockResult[0];
    if (lock?.instanceId === INSTANCE_ID) {
      await db
        .delete(cronLeaderLock)
        .where(eq(cronLeaderLock.lockName, LOCK_NAME));

      logger.info({
        msg: "[CronLeaderElection] Released leader lock",
        instanceId: INSTANCE_ID,
      });
    }
  } catch (error) {
    logger.error({
      msg: "[CronLeaderElection] Failed to release lock",
      error: error instanceof Error ? error.message : String(error),
      instanceId: INSTANCE_ID,
    });
  } finally {
    isLeader = false;
  }
}

/**
 * Handles graceful shutdown signals.
 */
async function handleShutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  await stopLeaderElection();
}

/**
 * Starts the leader election process.
 * This should be called once during application startup.
 * Includes retry logic for database unavailability.
 */
export async function startLeaderElection(): Promise<void> {
  if (isShuttingDown) return;

  logger.info({
    msg: "[CronLeaderElection] Starting leader election",
    instanceId: INSTANCE_ID,
    leaseDuration: LEASE_DURATION_MS,
    heartbeatInterval: HEARTBEAT_INTERVAL_MS,
  });

  // Initial acquisition attempt with retries
  let acquired = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      acquired = await tryAcquireLock();
      break;
    } catch (error) {
      logger.warn({
        msg: `[CronLeaderElection] Acquisition attempt ${attempt}/3 failed`,
        error: error instanceof Error ? error.message : String(error),
        instanceId: INSTANCE_ID,
      });
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  isLeader = acquired;

  if (isLeader) {
    logger.info({
      msg: "[CronLeaderElection] Acquired leader status",
      instanceId: INSTANCE_ID,
    });
  } else {
    logger.info({
      msg: "[CronLeaderElection] Another instance is leader, will retry",
      instanceId: INSTANCE_ID,
    });
  }

  // Start heartbeat interval (refreshes lease if leader)
  heartbeatInterval = setInterval(async () => {
    if (isLeader && !isShuttingDown) {
      await refreshLease();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Start acquisition retry interval (tries to become leader if not already)
  acquireInterval = setInterval(async () => {
    if (!isLeader && !isShuttingDown) {
      try {
        const acquired = await tryAcquireLock();
        if (acquired && !isLeader) {
          isLeader = true;
          logger.info({
            msg: "[CronLeaderElection] Acquired leader status",
            instanceId: INSTANCE_ID,
          });
        }
      } catch (error) {
        // Silently ignore acquisition errors during retry
        logger.debug({
          msg: "[CronLeaderElection] Acquisition retry failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }, ACQUIRE_RETRY_INTERVAL_MS);

  // Register shutdown handlers only once
  if (!shutdownHandlersRegistered) {
    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);
    shutdownHandlersRegistered = true;
  }
}

/**
 * Stops the leader election process.
 * Called during graceful shutdown.
 */
export async function stopLeaderElection(): Promise<void> {
  isShuttingDown = true;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (acquireInterval) {
    clearInterval(acquireInterval);
    acquireInterval = null;
  }

  await releaseLock();

  logger.info({
    msg: "[CronLeaderElection] Leader election stopped",
    instanceId: INSTANCE_ID,
  });
}

/**
 * Returns whether this instance is currently the leader.
 * Use this to guard cron job execution.
 */
export function isCronLeader(): boolean {
  return isLeader && !isShuttingDown;
}

/**
 * Wrapper function to execute a cron job only if this instance is the leader.
 * Provides a clean API for cron jobs to use.
 *
 * @param jobName - Name of the cron job (for logging)
 * @param job - The async function to execute
 * @returns A wrapped function that only executes if this instance is the leader
 */
export function withLeaderGuard<T>(
  jobName: string,
  job: () => Promise<T>
): () => Promise<T | undefined> {
  return async () => {
    if (!isCronLeader()) {
      logger.debug({
        msg: `[${jobName}] Skipping - not the leader instance`,
        instanceId: INSTANCE_ID,
      });
      return undefined;
    }

    return job();
  };
}

/**
 * Gets the current instance ID (useful for debugging/logging).
 */
export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Returns current leader election state (for testing/debugging).
 */
export function getLeaderElectionState(): {
  isLeader: boolean;
  isShuttingDown: boolean;
  instanceId: string;
} {
  return {
    isLeader,
    isShuttingDown,
    instanceId: INSTANCE_ID,
  };
}

/**
 * Resets leader election state (for testing only).
 * WARNING: Do not use in production code.
 */
export function _resetForTesting(): void {
  isLeader = false;
  isShuttingDown = false;
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (acquireInterval) {
    clearInterval(acquireInterval);
    acquireInterval = null;
  }
}
