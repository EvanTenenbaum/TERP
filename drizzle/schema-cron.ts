/**
 * Cron System Schema
 *
 * Database schema for cron job coordination in a multi-instance environment.
 */

import {
  int,
  mysqlTable,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Cron Leader Lock Table
 *
 * Implements a lease-based lock for leader election.
 * Only one instance at a time can hold the lock and execute cron jobs.
 */
export const cronLeaderLock = mysqlTable(
  "cron_leader_lock",
  {
    id: int("id").autoincrement().primaryKey(),

    // Lock identifier (e.g., "cron_leader")
    lockName: varchar("lock_name", { length: 100 }).notNull().unique(),

    // The instance currently holding the lock
    instanceId: varchar("instance_id", { length: 255 }).notNull(),

    // When the lock was acquired
    acquiredAt: timestamp("acquired_at").notNull(),

    // When the lock expires (lease expiration)
    expiresAt: timestamp("expires_at").notNull(),

    // Last heartbeat timestamp
    lastHeartbeat: timestamp("last_heartbeat").notNull(),

    // Standard audit fields
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    lockNameIdx: index("idx_cll_lock_name").on(table.lockName),
    expiresAtIdx: index("idx_cll_expires_at").on(table.expiresAt),
  })
);

export type CronLeaderLock = typeof cronLeaderLock.$inferSelect;
export type InsertCronLeaderLock = typeof cronLeaderLock.$inferInsert;
