/**
 * Database Locking Mechanism for Seeding Operations
 *
 * Prevents concurrent seeding operations using MySQL advisory locks.
 * Uses GET_LOCK(), RELEASE_LOCK(), and IS_USED_LOCK() functions.
 */

import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { seedLogger } from "./logging";

// ============================================================================
// Error Classes
// ============================================================================

export class LockAcquisitionError extends Error {
  constructor(
    public lockName: string,
    public reason: string,
    public holderConnection?: number
  ) {
    super(`Failed to acquire lock '${lockName}': ${reason}`);
    this.name = "LockAcquisitionError";
  }
}

export class LockReleaseError extends Error {
  constructor(
    public lockName: string,
    public reason: string
  ) {
    super(`Failed to release lock '${lockName}': ${reason}`);
    this.name = "LockReleaseError";
  }
}

// ============================================================================
// Lock Status Interface
// ============================================================================

export interface LockStatus {
  isLocked: boolean;
  holderConnection: number | null;
  lockName: string;
}

// ============================================================================
// SeedingLock Class
// ============================================================================

/**
 * MySQL Advisory Lock Manager for Seeding Operations
 *
 * Uses MySQL's advisory locking functions:
 * - GET_LOCK(str, timeout) - Acquires named lock
 * - RELEASE_LOCK(str) - Releases named lock
 * - IS_USED_LOCK(str) - Returns connection ID holding lock, or NULL
 *
 * @example
 * ```typescript
 * const lock = new SeedingLock(db);
 * try {
 *   const acquired = await lock.acquire('terp_seeding_clients', 0);
 *   if (!acquired) throw new Error('Another seeding operation is in progress');
 *   // ... seeding logic ...
 * } finally {
 *   await lock.release('terp_seeding_clients');
 * }
 * ```
 */
export class SeedingLock {
  private db: MySql2Database<Record<string, never>>;
  private acquiredLocks: Set<string> = new Set();
  private isShuttingDown = false;

  constructor(db: MySql2Database<Record<string, never>>) {
    this.db = db;
    this.setupShutdownHandlers();
  }

  /**
   * Format lock name with standard prefix
   */
  static formatLockName(tableName: string): string {
    return `terp_seeding_${tableName}`;
  }

  /**
   * Get global seeding lock name
   */
  static get GLOBAL_LOCK(): string {
    return "terp_seeding_global";
  }

  /**
   * Acquire a named advisory lock
   *
   * @param lockName - Name of the lock to acquire
   * @param timeoutSeconds - Timeout in seconds (0 = fail immediately if locked)
   * @returns true if lock was acquired, false otherwise
   * @throws LockAcquisitionError if lock cannot be acquired due to error
   */
  async acquire(lockName: string, timeoutSeconds = 0): Promise<boolean> {
    try {
      seedLogger.lockAttempt(lockName, timeoutSeconds);

      // Check if already locked by another process
      const status = await this.getStatus(lockName);
      if (status.isLocked) {
        seedLogger.lockConflict(lockName, status.holderConnection);

        if (timeoutSeconds === 0) {
          return false;
        }
      }

      // Attempt to acquire lock
      const result = await this.db.execute(
        sql`SELECT GET_LOCK(${lockName}, ${timeoutSeconds}) as acquired`
      );

      // Parse result - Drizzle returns [rows, metadata]
      const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
      const acquired = (rows as Array<{ acquired: number | null }>)[0]?.acquired;

      if (acquired === 1) {
        this.acquiredLocks.add(lockName);
        seedLogger.lockAcquired(lockName);
        return true;
      } else if (acquired === 0) {
        // Timeout - lock held by another session
        seedLogger.lockTimeout(lockName, timeoutSeconds);
        return false;
      } else {
        // NULL - error occurred
        throw new LockAcquisitionError(lockName, "MySQL returned NULL - possible error");
      }
    } catch (error) {
      if (error instanceof LockAcquisitionError) {
        throw error;
      }
      throw new LockAcquisitionError(
        lockName,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Release a named advisory lock
   *
   * @param lockName - Name of the lock to release
   * @throws LockReleaseError if lock cannot be released
   */
  async release(lockName: string): Promise<void> {
    try {
      const result = await this.db.execute(
        sql`SELECT RELEASE_LOCK(${lockName}) as released`
      );

      // Parse result
      const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
      const released = (rows as Array<{ released: number | null }>)[0]?.released;

      this.acquiredLocks.delete(lockName);

      if (released === 1) {
        seedLogger.lockReleased(lockName);
      } else if (released === 0) {
        // Lock exists but not held by this session
        seedLogger.lockNotOwned(lockName);
      } else {
        // NULL - lock does not exist
        seedLogger.lockNotFound(lockName);
      }
    } catch (error) {
      throw new LockReleaseError(
        lockName,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Check lock status
   *
   * @param lockName - Name of the lock to check
   * @returns Lock status including holder connection ID
   */
  async getStatus(lockName: string): Promise<LockStatus> {
    try {
      const result = await this.db.execute(
        sql`SELECT IS_USED_LOCK(${lockName}) as holder`
      );

      // Parse result
      const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
      const holder = (rows as Array<{ holder: number | null }>)[0]?.holder;

      return {
        isLocked: holder !== null,
        holderConnection: holder,
        lockName,
      };
    } catch (error) {
      seedLogger.operationFailure(
        "getStatus",
        error instanceof Error ? error : new Error(String(error)),
        { lockName }
      );
      // Return unlocked status on error to allow operation to proceed
      return {
        isLocked: false,
        holderConnection: null,
        lockName,
      };
    }
  }

  /**
   * Check if a lock is currently held
   *
   * @param lockName - Name of the lock to check
   * @returns true if lock is held by any session
   */
  async isLocked(lockName: string): Promise<boolean> {
    const status = await this.getStatus(lockName);
    return status.isLocked;
  }

  /**
   * Release all locks acquired by this instance
   */
  async releaseAll(): Promise<void> {
    const locks = Array.from(this.acquiredLocks);

    for (const lockName of locks) {
      try {
        await this.release(lockName);
      } catch {
        // Log but continue releasing other locks
        seedLogger.operationFailure(
          "releaseAll",
          new Error(`Failed to release lock: ${lockName}`),
          { lockName }
        );
      }
    }
  }

  /**
   * Execute a function with lock protection
   *
   * @param lockName - Name of the lock to acquire
   * @param fn - Function to execute while holding lock
   * @param timeoutSeconds - Lock acquisition timeout
   * @returns Result of the function
   */
  async withLock<T>(
    lockName: string,
    fn: () => Promise<T>,
    timeoutSeconds = 0
  ): Promise<T> {
    const acquired = await this.acquire(lockName, timeoutSeconds);

    if (!acquired) {
      const status = await this.getStatus(lockName);
      throw new LockAcquisitionError(
        lockName,
        "Lock already held by another process",
        status.holderConnection ?? undefined
      );
    }

    try {
      return await fn();
    } finally {
      await this.release(lockName);
    }
  }

  /**
   * Set up process shutdown handlers to release locks
   */
  private setupShutdownHandlers(): void {
    const cleanup = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (this.acquiredLocks.size > 0) {
        seedLogger.operationStart("cleanup", {
          locksToRelease: Array.from(this.acquiredLocks),
        });
        await this.releaseAll();
      }
    };

    // Handle various termination signals
    process.on("SIGINT", () => {
      cleanup().finally(() => process.exit(130));
    });

    process.on("SIGTERM", () => {
      cleanup().finally(() => process.exit(143));
    });

    process.on("uncaughtException", (error) => {
      seedLogger.operationFailure("uncaughtException", error, {});
      cleanup().finally(() => process.exit(1));
    });

    process.on("unhandledRejection", (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      seedLogger.operationFailure("unhandledRejection", error, {});
      cleanup().finally(() => process.exit(1));
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export default SeedingLock;
