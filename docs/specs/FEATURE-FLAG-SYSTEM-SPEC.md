# Feature Flag System Implementation Plan v2.0

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 31, 2025 | Initial plan |
| **2.0** | **Dec 31, 2025** | **Revised based on Redhat QA review** |

---

## Executive Summary

**Status:** Full implementation required from scratch  
**Estimated Time:** 21-27 hours (revised from 16-20h)  
**Key Changes from v1:**
- Fixed table naming (camelCase)
- Added RBAC role resolution
- Added cache invalidation strategy
- Extended NavigationItem interface
- Added bulk operations
- Added integration tests

---

## Current State Analysis

### What Exists
| Component | Status | Location |
|-----------|--------|----------|
| Simple utility | ✅ Exists | `server/utils/featureFlags.ts` |
| Environment flag | ✅ Exists | `FEATURE_LIVE_CATALOG` only |
| Cache utility | ✅ Exists | `server/_core/cache.ts` |
| RBAC system | ✅ Exists | `drizzle/schema-rbac.ts` |

### What's Missing
All feature flag infrastructure (schema, service, router, frontend, admin UI)

---

## Phase 1: Database Foundation (3-4 hours)

### Task 1.1: Create Feature Flag Schema

**File:** `drizzle/schema.ts`

**IMPORTANT:** Use camelCase table names to match TERP patterns.

```typescript
// ============================================================================
// FEATURE FLAGS TABLES
// ============================================================================

/**
 * Feature Flags - Main flag definitions
 * Supports system-wide flags and module-level flags
 */
export const featureFlags = mysqlTable("featureFlags", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // kebab-case, e.g., "calendar-sync"
  displayName: varchar("displayName", { length: 255 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }), // e.g., "calendar", "inventory"
  isModuleFlag: boolean("isModuleFlag").default(false).notNull(),
  systemEnabled: boolean("systemEnabled").default(true).notNull(), // Master kill switch
  defaultEnabled: boolean("defaultEnabled").default(false).notNull(),
  dependsOn: varchar("dependsOn", { length: 100 }), // Another flag key this depends on
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  keyIdx: uniqueIndex("key_idx").on(table.key),
  moduleIdx: index("module_idx").on(table.module),
  deletedAtIdx: index("deleted_at_idx").on(table.deletedAt),
}));

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

/**
 * Feature Flag Role Overrides
 * Links to RBAC roles table for role-based flag overrides
 */
export const featureFlagRoleOverrides = mysqlTable("featureFlagRoleOverrides", {
  id: int("id").autoincrement().primaryKey(),
  flagId: int("flagId").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
  roleId: int("roleId").notNull().references(() => roles.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  flagRoleIdx: uniqueIndex("flag_role_idx").on(table.flagId, table.roleId),
}));

export type FeatureFlagRoleOverride = typeof featureFlagRoleOverrides.$inferSelect;

/**
 * Feature Flag User Overrides
 * User-specific overrides (highest priority)
 */
export const featureFlagUserOverrides = mysqlTable("featureFlagUserOverrides", {
  id: int("id").autoincrement().primaryKey(),
  flagId: int("flagId").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  flagUserIdx: uniqueIndex("flag_user_idx").on(table.flagId, table.userId),
}));

export type FeatureFlagUserOverride = typeof featureFlagUserOverrides.$inferSelect;

/**
 * Feature Flag Audit Logs
 * Track all changes to flags and overrides
 */
export const featureFlagAuditLogs = mysqlTable("featureFlagAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  flagKey: varchar("flagKey", { length: 100 }).notNull(),
  changeType: varchar("changeType", { length: 50 }).notNull(), // create, update, delete, role_override, user_override
  oldValue: text("oldValue"), // JSON
  newValue: text("newValue"), // JSON
  actorId: int("actorId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  flagKeyIdx: index("flag_key_idx").on(table.flagKey),
  actorIdx: index("actor_idx").on(table.actorId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type FeatureFlagAuditLog = typeof featureFlagAuditLogs.$inferSelect;
```

### Task 1.2: Add to autoMigrate.ts

**File:** `server/autoMigrate.ts`

```typescript
// Feature Flags tables
await safeExec(`
  CREATE TABLE IF NOT EXISTS featureFlags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`key\` VARCHAR(100) NOT NULL UNIQUE,
    displayName VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(50),
    isModuleFlag BOOLEAN NOT NULL DEFAULT FALSE,
    systemEnabled BOOLEAN NOT NULL DEFAULT TRUE,
    defaultEnabled BOOLEAN NOT NULL DEFAULT FALSE,
    dependsOn VARCHAR(100),
    deleted_at TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX module_idx (module),
    INDEX deleted_at_idx (deleted_at)
  )
`);

await safeExec(`
  CREATE TABLE IF NOT EXISTS featureFlagRoleOverrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flagId INT NOT NULL,
    roleId INT NOT NULL,
    enabled BOOLEAN NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX flag_role_idx (flagId, roleId),
    FOREIGN KEY (flagId) REFERENCES featureFlags(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
  )
`);

await safeExec(`
  CREATE TABLE IF NOT EXISTS featureFlagUserOverrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flagId INT NOT NULL,
    userId INT NOT NULL,
    enabled BOOLEAN NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX flag_user_idx (flagId, userId),
    FOREIGN KEY (flagId) REFERENCES featureFlags(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

await safeExec(`
  CREATE TABLE IF NOT EXISTS featureFlagAuditLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flagKey VARCHAR(100) NOT NULL,
    changeType VARCHAR(50) NOT NULL,
    oldValue TEXT,
    newValue TEXT,
    actorId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX flag_key_idx (flagKey),
    INDEX actor_idx (actorId),
    INDEX created_at_idx (createdAt),
    FOREIGN KEY (actorId) REFERENCES users(id)
  )
`);
```

### Task 1.3: Create Migration File

**File:** `drizzle/migrations/0021_add_feature_flags.sql`

Same SQL as autoMigrate but in migration format for version control.

### Task 1.4: Create Rollback Script

**File:** `drizzle/migrations/0021_add_feature_flags_rollback.sql`

```sql
-- Rollback script for feature flags
-- Run only if migration needs to be reverted

DROP TABLE IF EXISTS featureFlagAuditLogs;
DROP TABLE IF EXISTS featureFlagUserOverrides;
DROP TABLE IF EXISTS featureFlagRoleOverrides;
DROP TABLE IF EXISTS featureFlags;
```

---

## Phase 2: Core Service (5-6 hours)

### Task 2.1: Create Database Operations

**File:** `server/featureFlagsDb.ts`

```typescript
import { getDb } from "./db";
import { 
  featureFlags, 
  featureFlagRoleOverrides, 
  featureFlagUserOverrides,
  featureFlagAuditLogs,
  FeatureFlag,
  InsertFeatureFlag
} from "../drizzle/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

// Kebab-case validation regex
const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function validateFlagKey(key: string): boolean {
  return KEBAB_CASE_REGEX.test(key) && key.length <= 100;
}

export async function createFlag(data: InsertFeatureFlag): Promise<FeatureFlag> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (!validateFlagKey(data.key)) {
    throw new Error("Flag key must be kebab-case (e.g., 'my-feature-flag')");
  }
  
  const [result] = await db.insert(featureFlags).values(data);
  return await getFlagById(result.insertId);
}

export async function getFlagById(id: number): Promise<FeatureFlag | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [flag] = await db.select()
    .from(featureFlags)
    .where(and(eq(featureFlags.id, id), isNull(featureFlags.deletedAt)));
  
  return flag || null;
}

export async function getFlagByKey(key: string): Promise<FeatureFlag | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [flag] = await db.select()
    .from(featureFlags)
    .where(and(eq(featureFlags.key, key), isNull(featureFlags.deletedAt)));
  
  return flag || null;
}

export async function listFlags(includeDeleted = false): Promise<FeatureFlag[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (includeDeleted) {
    return await db.select().from(featureFlags);
  }
  
  return await db.select()
    .from(featureFlags)
    .where(isNull(featureFlags.deletedAt));
}

export async function updateFlag(
  key: string, 
  data: Partial<InsertFeatureFlag>
): Promise<FeatureFlag> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(featureFlags)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(featureFlags.key, key));
  
  const flag = await getFlagByKey(key);
  if (!flag) throw new Error("Flag not found");
  return flag;
}

export async function deleteFlag(key: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete
  await db.update(featureFlags)
    .set({ deletedAt: new Date() })
    .where(eq(featureFlags.key, key));
}

// Role overrides
export async function getRoleOverrides(flagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(featureFlagRoleOverrides)
    .where(eq(featureFlagRoleOverrides.flagId, flagId));
}

export async function setRoleOverride(
  flagId: number, 
  roleId: number, 
  enabled: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(featureFlagRoleOverrides)
    .values({ flagId, roleId, enabled })
    .onDuplicateKeyUpdate({ set: { enabled, updatedAt: new Date() } });
}

export async function removeRoleOverride(flagId: number, roleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(featureFlagRoleOverrides)
    .where(and(
      eq(featureFlagRoleOverrides.flagId, flagId),
      eq(featureFlagRoleOverrides.roleId, roleId)
    ));
}

// User overrides
export async function getUserOverrides(flagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(featureFlagUserOverrides)
    .where(eq(featureFlagUserOverrides.flagId, flagId));
}

export async function setUserOverride(
  flagId: number, 
  userId: number, 
  enabled: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(featureFlagUserOverrides)
    .values({ flagId, userId, enabled })
    .onDuplicateKeyUpdate({ set: { enabled, updatedAt: new Date() } });
}

export async function removeUserOverride(flagId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(featureFlagUserOverrides)
    .where(and(
      eq(featureFlagUserOverrides.flagId, flagId),
      eq(featureFlagUserOverrides.userId, userId)
    ));
}

// Audit logging
export async function logFlagChange(
  flagKey: string,
  changeType: string,
  oldValue: unknown,
  newValue: unknown,
  actorId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(featureFlagAuditLogs).values({
    flagKey,
    changeType,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
    actorId,
  });
}

export async function getAuditHistory(flagKey: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(featureFlagAuditLogs)
    .where(eq(featureFlagAuditLogs.flagKey, flagKey))
    .orderBy(featureFlagAuditLogs.createdAt)
    .limit(limit);
}
```

### Task 2.2: Create Feature Flag Service

**File:** `server/services/featureFlagService.ts`

```typescript
import { getDb } from "../db";
import { 
  featureFlags, 
  featureFlagRoleOverrides, 
  featureFlagUserOverrides 
} from "../../drizzle/schema";
import { userRoles } from "../../drizzle/schema-rbac";
import { eq, and, isNull, inArray } from "drizzle-orm";
import cache, { CacheKeys, CacheTTL } from "../_core/cache";
import * as featureFlagsDb from "../featureFlagsDb";

// Extend CacheKeys for feature flags
export const FeatureFlagCacheKeys = {
  all: () => "feature_flags:all",
  byKey: (key: string) => `feature_flags:${key}`,
  userEffective: (userId: number) => `feature_flags:user:${userId}`,
  moduleFlags: () => "feature_flags:modules",
};

interface EvaluationContext {
  userId: number;
  userRoleIds: number[];
}

/**
 * Get user's role IDs from RBAC system
 */
export async function getUserRoleIds(userId: number, userOpenId: string): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const roles = await db.select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userOpenId));
  
  return roles.map(r => r.roleId);
}

/**
 * Evaluate a single feature flag for a user
 * 
 * Priority (highest to lowest):
 * 1. System disabled → always false
 * 2. Dependency check → if depends on disabled flag, false
 * 3. Module disabled → if module flag disabled, false
 * 4. User override → explicit user setting
 * 5. Role override → most permissive wins (any role enabled = enabled)
 * 6. Default value → fallback
 */
export async function isFeatureEnabled(
  ctx: EvaluationContext,
  flagKey: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Get flag (with caching)
  const flag = await cache.getOrSet(
    FeatureFlagCacheKeys.byKey(flagKey),
    () => featureFlagsDb.getFlagByKey(flagKey),
    CacheTTL.SHORT
  );
  
  if (!flag) return false;
  
  // 1. System disabled check
  if (!flag.systemEnabled) {
    return false;
  }
  
  // 2. Dependency check
  if (flag.dependsOn) {
    const dependencyEnabled = await isFeatureEnabled(ctx, flag.dependsOn);
    if (!dependencyEnabled) {
      return false;
    }
  }
  
  // 3. Module disabled check (if this is not a module flag itself)
  if (flag.module && !flag.isModuleFlag) {
    const moduleEnabled = await isModuleEnabled(ctx, flag.module);
    if (!moduleEnabled) {
      return false;
    }
  }
  
  // 4. User override check
  const [userOverride] = await db.select()
    .from(featureFlagUserOverrides)
    .where(and(
      eq(featureFlagUserOverrides.flagId, flag.id),
      eq(featureFlagUserOverrides.userId, ctx.userId)
    ));
  
  if (userOverride) {
    return userOverride.enabled;
  }
  
  // 5. Role override check (most permissive wins)
  if (ctx.userRoleIds.length > 0) {
    const roleOverrides = await db.select()
      .from(featureFlagRoleOverrides)
      .where(and(
        eq(featureFlagRoleOverrides.flagId, flag.id),
        inArray(featureFlagRoleOverrides.roleId, ctx.userRoleIds)
      ));
    
    // If ANY role has enabled = true, the flag is enabled
    if (roleOverrides.some(ro => ro.enabled)) {
      return true;
    }
    
    // If ANY role has an override (even if false), use that
    if (roleOverrides.length > 0) {
      return false;
    }
  }
  
  // 6. Default value
  return flag.defaultEnabled;
}

/**
 * Check if a module is enabled
 */
export async function isModuleEnabled(
  ctx: EvaluationContext,
  moduleKey: string
): Promise<boolean> {
  const moduleFlagKey = `module-${moduleKey}`;
  return await isFeatureEnabled(ctx, moduleFlagKey);
}

/**
 * Get all effective flags for a user (cached)
 */
export async function getEffectiveFlags(
  ctx: EvaluationContext
): Promise<Record<string, boolean>> {
  const cacheKey = FeatureFlagCacheKeys.userEffective(ctx.userId);
  
  return await cache.getOrSet(cacheKey, async () => {
    const flags = await featureFlagsDb.listFlags();
    const result: Record<string, boolean> = {};
    
    for (const flag of flags) {
      result[flag.key] = await isFeatureEnabled(ctx, flag.key);
    }
    
    return result;
  }, CacheTTL.SHORT);
}

/**
 * Invalidate all feature flag caches
 * Call this when any flag or override changes
 */
export function invalidateAllCaches(): void {
  cache.invalidatePattern(/^feature_flags:/);
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateUserCache(userId: number): void {
  cache.delete(FeatureFlagCacheKeys.userEffective(userId));
}

/**
 * Invalidate cache for a specific flag
 */
export function invalidateFlagCache(flagKey: string): void {
  cache.delete(FeatureFlagCacheKeys.byKey(flagKey));
  // Also invalidate all user caches since flag changed
  cache.invalidatePattern(/^feature_flags:user:/);
}
```

### Task 2.3-2.9: Property Tests

**File:** `server/services/featureFlagService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as featureFlagService from './featureFlagService';

describe('Feature Flag Service', () => {
  // Property 1: Flag Storage Round Trip
  describe('Flag Storage Round Trip', () => {
    it('should store and retrieve flag with same values', async () => {
      // Test implementation
    });
  });
  
  // Property 2: Kebab-Case Key Validation
  describe('Kebab-Case Key Validation', () => {
    it('should accept valid kebab-case keys', () => {
      expect(featureFlagsDb.validateFlagKey('my-feature')).toBe(true);
      expect(featureFlagsDb.validateFlagKey('calendar-sync')).toBe(true);
      expect(featureFlagsDb.validateFlagKey('a')).toBe(true);
    });
    
    it('should reject invalid keys', () => {
      expect(featureFlagsDb.validateFlagKey('MyFeature')).toBe(false);
      expect(featureFlagsDb.validateFlagKey('my_feature')).toBe(false);
      expect(featureFlagsDb.validateFlagKey('my feature')).toBe(false);
      expect(featureFlagsDb.validateFlagKey('')).toBe(false);
    });
  });
  
  // Property 3: System Disabled Always Wins
  describe('System Disabled Always Wins', () => {
    it('should return false when systemEnabled is false regardless of overrides', async () => {
      // Test implementation
    });
  });
  
  // Property 4: User Override Takes Precedence
  describe('User Override Takes Precedence', () => {
    it('should use user override over role override', async () => {
      // Test implementation
    });
  });
  
  // Property 5: Role Override Resolution - Most Permissive Wins
  describe('Role Override Resolution', () => {
    it('should return true if any role has enabled=true', async () => {
      // Test implementation
    });
  });
  
  // Property 6: Fallback to Default
  describe('Fallback to Default', () => {
    it('should use defaultEnabled when no overrides exist', async () => {
      // Test implementation
    });
  });
  
  // Property 7: Module Hierarchy
  describe('Module Hierarchy', () => {
    it('should return false for feature if module is disabled', async () => {
      // Test implementation
    });
  });
  
  // Property 8: Cache Invalidation
  describe('Cache Invalidation', () => {
    it('should invalidate user cache when flag changes', async () => {
      // Test implementation
    });
  });
  
  // Property 9: Dependency Check
  describe('Dependency Check', () => {
    it('should return false if dependent flag is disabled', async () => {
      // Test implementation
    });
  });
});
```

---

## Phase 3: Override Management (2-3 hours)

### Task 3.1: Role Override Management

Already included in `featureFlagsDb.ts`:
- `setRoleOverride(flagId, roleId, enabled)`
- `removeRoleOverride(flagId, roleId)`
- `getRoleOverrides(flagId)`

### Task 3.2: User Override Management

Already included in `featureFlagsDb.ts`:
- `setUserOverride(flagId, userId, enabled)`
- `removeUserOverride(flagId, userId)`
- `getUserOverrides(flagId)`

### Task 3.3: Audit Logging

Already included in `featureFlagsDb.ts`:
- `logFlagChange(flagKey, changeType, oldValue, newValue, actorId)`
- `getAuditHistory(flagKey, limit)`

---

## Phase 4: Module Hierarchy (1-2 hours)

### Task 4.1: Module Flag Implementation

Already included in `featureFlagService.ts`:
- `isModuleEnabled(ctx, moduleKey)`
- Module check in `isFeatureEnabled()`

### Supported Modules

| Module Key | Module Flag Key | Description |
|------------|-----------------|-------------|
| calendar | module-calendar | Calendar features |
| inventory | module-inventory | Inventory management |
| accounting | module-accounting | Accounting features |
| orders | module-orders | Order management |
| clients | module-clients | Client management |
| vip-portal | module-vip-portal | VIP Portal features |
| leaderboard | module-leaderboard | Leaderboard features |
| matching | module-matching | Matchmaking features |

---

## Phase 5: Export/Import (1-2 hours)

### Task 5.1: Export Functionality

**Add to `featureFlagService.ts`:**

```typescript
interface ExportData {
  version: string;
  exportedAt: string;
  flags: Array<{
    key: string;
    displayName: string;
    description: string | null;
    module: string | null;
    isModuleFlag: boolean;
    systemEnabled: boolean;
    defaultEnabled: boolean;
    dependsOn: string | null;
    roleOverrides: Array<{ roleId: number; roleName: string; enabled: boolean }>;
  }>;
}

export async function exportFlags(): Promise<ExportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const flags = await featureFlagsDb.listFlags();
  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    flags: [],
  };
  
  for (const flag of flags) {
    const roleOverrides = await featureFlagsDb.getRoleOverrides(flag.id);
    // Get role names for each override
    const roleOverridesWithNames = await Promise.all(
      roleOverrides.map(async (ro) => {
        const [role] = await db.select().from(roles).where(eq(roles.id, ro.roleId));
        return {
          roleId: ro.roleId,
          roleName: role?.name || 'unknown',
          enabled: ro.enabled,
        };
      })
    );
    
    exportData.flags.push({
      key: flag.key,
      displayName: flag.displayName,
      description: flag.description,
      module: flag.module,
      isModuleFlag: flag.isModuleFlag,
      systemEnabled: flag.systemEnabled,
      defaultEnabled: flag.defaultEnabled,
      dependsOn: flag.dependsOn,
      roleOverrides: roleOverridesWithNames,
    });
  }
  
  return exportData;
}
```

### Task 5.2: Import Functionality

```typescript
interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function importFlags(data: ExportData, actorId: number): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, errors: [] };
  
  for (const flagData of data.flags) {
    try {
      const existing = await featureFlagsDb.getFlagByKey(flagData.key);
      
      if (existing) {
        await featureFlagsDb.updateFlag(flagData.key, {
          displayName: flagData.displayName,
          description: flagData.description,
          module: flagData.module,
          isModuleFlag: flagData.isModuleFlag,
          systemEnabled: flagData.systemEnabled,
          defaultEnabled: flagData.defaultEnabled,
          dependsOn: flagData.dependsOn,
        });
        result.updated++;
      } else {
        await featureFlagsDb.createFlag({
          key: flagData.key,
          displayName: flagData.displayName,
          description: flagData.description,
          module: flagData.module,
          isModuleFlag: flagData.isModuleFlag,
          systemEnabled: flagData.systemEnabled,
          defaultEnabled: flagData.defaultEnabled,
          dependsOn: flagData.dependsOn,
        });
        result.created++;
      }
      
      // Log the change
      await featureFlagsDb.logFlagChange(
        flagData.key,
        existing ? 'import_update' : 'import_create',
        existing,
        flagData,
        actorId
      );
    } catch (error) {
      result.errors.push(`Failed to import ${flagData.key}: ${error.message}`);
    }
  }
  
  // Invalidate all caches after import
  invalidateAllCaches();
  
  return result;
}
```

---

## Phase 6: tRPC Router (3-4 hours)

### Task 6.1: Create Feature Flags Router

**File:** `server/routers/featureFlags.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as featureFlagsDb from "../featureFlagsDb";
import * as featureFlagService from "../services/featureFlagService";
import { TRPCError } from "@trpc/server";

export const featureFlagsRouter = router({
  // ============================================================================
  // PUBLIC ENDPOINTS (Protected - any authenticated user)
  // ============================================================================
  
  /**
   * Get all effective flags for the current user
   */
  getEffectiveFlags: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const userRoleIds = await featureFlagService.getUserRoleIds(
        ctx.user.id,
        ctx.user.openId
      );
      
      return await featureFlagService.getEffectiveFlags({
        userId: ctx.user.id,
        userRoleIds,
      });
    }),
  
  /**
   * Check if a specific flag is enabled for the current user
   */
  isEnabled: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const userRoleIds = await featureFlagService.getUserRoleIds(
        ctx.user.id,
        ctx.user.openId
      );
      
      return await featureFlagService.isFeatureEnabled(
        { userId: ctx.user.id, userRoleIds },
        input.key
      );
    }),
  
  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================
  
  /**
   * List all feature flags
   */
  list: adminProcedure
    .input(z.object({ includeDeleted: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return await featureFlagsDb.listFlags(input?.includeDeleted);
    }),
  
  /**
   * Create a new feature flag
   */
  create: adminProcedure
    .input(z.object({
      key: z.string().min(1).max(100),
      displayName: z.string().min(1).max(255),
      description: z.string().optional(),
      module: z.string().max(50).optional(),
      isModuleFlag: z.boolean().optional(),
      systemEnabled: z.boolean().optional(),
      defaultEnabled: z.boolean().optional(),
      dependsOn: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await featureFlagsDb.createFlag(input);
      
      await featureFlagsDb.logFlagChange(
        input.key,
        'create',
        null,
        flag,
        ctx.user!.id
      );
      
      featureFlagService.invalidateAllCaches();
      return flag;
    }),
  
  /**
   * Update a feature flag
   */
  update: adminProcedure
    .input(z.object({
      key: z.string(),
      displayName: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      module: z.string().max(50).optional(),
      isModuleFlag: z.boolean().optional(),
      systemEnabled: z.boolean().optional(),
      defaultEnabled: z.boolean().optional(),
      dependsOn: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { key, ...data } = input;
      const oldFlag = await featureFlagsDb.getFlagByKey(key);
      const flag = await featureFlagsDb.updateFlag(key, data);
      
      await featureFlagsDb.logFlagChange(
        key,
        'update',
        oldFlag,
        flag,
        ctx.user!.id
      );
      
      featureFlagService.invalidateFlagCache(key);
      return flag;
    }),
  
  /**
   * Delete a feature flag (soft delete)
   */
  delete: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const oldFlag = await featureFlagsDb.getFlagByKey(input.key);
      await featureFlagsDb.deleteFlag(input.key);
      
      await featureFlagsDb.logFlagChange(
        input.key,
        'delete',
        oldFlag,
        null,
        ctx.user!.id
      );
      
      featureFlagService.invalidateFlagCache(input.key);
      return { success: true };
    }),
  
  /**
   * Bulk update multiple flags
   */
  bulkUpdate: adminProcedure
    .input(z.object({
      keys: z.array(z.string()),
      systemEnabled: z.boolean().optional(),
      defaultEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { keys, ...data } = input;
      const results = [];
      
      for (const key of keys) {
        const oldFlag = await featureFlagsDb.getFlagByKey(key);
        const flag = await featureFlagsDb.updateFlag(key, data);
        
        await featureFlagsDb.logFlagChange(
          key,
          'bulk_update',
          oldFlag,
          flag,
          ctx.user!.id
        );
        
        results.push(flag);
      }
      
      featureFlagService.invalidateAllCaches();
      return results;
    }),
  
  // ============================================================================
  // OVERRIDE ENDPOINTS
  // ============================================================================
  
  /**
   * Set role override
   */
  setRoleOverride: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      roleId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await featureFlagsDb.getFlagByKey(input.flagKey);
      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });
      
      await featureFlagsDb.setRoleOverride(flag.id, input.roleId, input.enabled);
      
      await featureFlagsDb.logFlagChange(
        input.flagKey,
        'role_override_set',
        null,
        { roleId: input.roleId, enabled: input.enabled },
        ctx.user!.id
      );
      
      featureFlagService.invalidateAllCaches();
      return { success: true };
    }),
  
  /**
   * Remove role override
   */
  removeRoleOverride: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      roleId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await featureFlagsDb.getFlagByKey(input.flagKey);
      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });
      
      await featureFlagsDb.removeRoleOverride(flag.id, input.roleId);
      
      await featureFlagsDb.logFlagChange(
        input.flagKey,
        'role_override_remove',
        { roleId: input.roleId },
        null,
        ctx.user!.id
      );
      
      featureFlagService.invalidateAllCaches();
      return { success: true };
    }),
  
  /**
   * Set user override
   */
  setUserOverride: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      userId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await featureFlagsDb.getFlagByKey(input.flagKey);
      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });
      
      await featureFlagsDb.setUserOverride(flag.id, input.userId, input.enabled);
      
      await featureFlagsDb.logFlagChange(
        input.flagKey,
        'user_override_set',
        null,
        { userId: input.userId, enabled: input.enabled },
        ctx.user!.id
      );
      
      featureFlagService.invalidateUserCache(input.userId);
      return { success: true };
    }),
  
  /**
   * Remove user override
   */
  removeUserOverride: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const flag = await featureFlagsDb.getFlagByKey(input.flagKey);
      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });
      
      await featureFlagsDb.removeUserOverride(flag.id, input.userId);
      
      await featureFlagsDb.logFlagChange(
        input.flagKey,
        'user_override_remove',
        { userId: input.userId },
        null,
        ctx.user!.id
      );
      
      featureFlagService.invalidateUserCache(input.userId);
      return { success: true };
    }),
  
  // ============================================================================
  // AUDIT & TESTING ENDPOINTS
  // ============================================================================
  
  /**
   * Get audit history for a flag
   */
  getAuditHistory: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      return await featureFlagsDb.getAuditHistory(input.flagKey, input.limit);
    }),
  
  /**
   * Test flag evaluation for a specific user
   */
  testEvaluation: adminProcedure
    .input(z.object({
      flagKey: z.string(),
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      const userRoleIds = await featureFlagService.getUserRoleIds(
        input.userId,
        '' // Would need to look up openId
      );
      
      const enabled = await featureFlagService.isFeatureEnabled(
        { userId: input.userId, userRoleIds },
        input.flagKey
      );
      
      return {
        enabled,
        evaluationContext: {
          userId: input.userId,
          userRoleIds,
        },
      };
    }),
  
  // ============================================================================
  // EXPORT/IMPORT ENDPOINTS
  // ============================================================================
  
  /**
   * Export all flags
   */
  export: adminProcedure
    .query(async () => {
      return await featureFlagService.exportFlags();
    }),
  
  /**
   * Import flags
   */
  import: adminProcedure
    .input(z.object({
      data: z.object({
        version: z.string(),
        exportedAt: z.string(),
        flags: z.array(z.object({
          key: z.string(),
          displayName: z.string(),
          description: z.string().nullable(),
          module: z.string().nullable(),
          isModuleFlag: z.boolean(),
          systemEnabled: z.boolean(),
          defaultEnabled: z.boolean(),
          dependsOn: z.string().nullable(),
          roleOverrides: z.array(z.object({
            roleId: z.number(),
            roleName: z.string(),
            enabled: z.boolean(),
          })),
        })),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      return await featureFlagService.importFlags(input.data, ctx.user!.id);
    }),
});
```

### Task 6.2: Create Feature Flag Middleware

**File:** `server/_core/featureFlagMiddleware.ts`

```typescript
import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";
import * as featureFlagService from "../services/featureFlagService";

/**
 * Middleware that requires a specific feature flag to be enabled
 */
export function requireFeature(flagKey: string) {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    
    const userRoleIds = await featureFlagService.getUserRoleIds(
      ctx.user.id,
      ctx.user.openId
    );
    
    const enabled = await featureFlagService.isFeatureEnabled(
      { userId: ctx.user.id, userRoleIds },
      flagKey
    );
    
    if (!enabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Feature '${flagKey}' is not enabled for your account`,
      });
    }
    
    return next({ ctx });
  });
}

/**
 * Middleware that requires a specific module to be enabled
 */
export function requireModule(moduleKey: string) {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    
    const userRoleIds = await featureFlagService.getUserRoleIds(
      ctx.user.id,
      ctx.user.openId
    );
    
    const enabled = await featureFlagService.isModuleEnabled(
      { userId: ctx.user.id, userRoleIds },
      moduleKey
    );
    
    if (!enabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Module '${moduleKey}' is not enabled for your account`,
      });
    }
    
    return next({ ctx });
  });
}
```

### Task 6.3: Register Router

**File:** `server/routers.ts`

Add to the router:
```typescript
import { featureFlagsRouter } from "./routers/featureFlags";

export const appRouter = router({
  // ... existing routers
  featureFlags: featureFlagsRouter,
});
```

---

## Phase 7: Frontend Integration (4-5 hours)

### Task 7.1: Create Feature Flag Context

**File:** `client/src/contexts/FeatureFlagContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (key: string) => boolean;
  isModuleEnabled: (module: string) => boolean;
  refetch: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  
  const { data, isLoading, error, refetch } = trpc.featureFlags.getEffectiveFlags.useQuery(
    undefined,
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    }
  );
  
  useEffect(() => {
    if (data) {
      setFlags(data);
    }
  }, [data]);
  
  const isEnabled = useCallback((key: string): boolean => {
    return flags[key] ?? false;
  }, [flags]);
  
  const isModuleEnabled = useCallback((module: string): boolean => {
    return flags[`module-${module}`] ?? true; // Default to true if not found
  }, [flags]);
  
  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        isLoading,
        error: error as Error | null,
        isEnabled,
        isModuleEnabled,
        refetch,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagProvider");
  }
  return context;
}
```

### Task 7.2: Create Feature Flag Hooks

**File:** `client/src/hooks/useFeatureFlag.ts`

```typescript
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { isEnabled, isLoading } = useFeatureFlags();
  return {
    enabled: isEnabled(key),
    isLoading,
  };
}

/**
 * Hook to check if a module is enabled
 */
export function useModuleEnabled(module: string): boolean {
  const { isModuleEnabled } = useFeatureFlags();
  return isModuleEnabled(module);
}
```

### Task 7.3: Create Feature Flag Components

**File:** `client/src/components/feature-flags/FeatureFlag.tsx`

```typescript
import React from "react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render children based on feature flag
 */
export function FeatureFlag({ flag, children, fallback = null }: FeatureFlagProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);
  
  if (isLoading) {
    return null; // Or a loading spinner
  }
  
  return enabled ? <>{children}</> : <>{fallback}</>;
}

interface ModuleGateProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render children based on module flag
 */
export function ModuleGate({ module, children, fallback = null }: ModuleGateProps) {
  return (
    <FeatureFlag flag={`module-${module}`} fallback={fallback}>
      {children}
    </FeatureFlag>
  );
}
```

**File:** `client/src/components/feature-flags/FeatureDisabledError.tsx`

```typescript
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface FeatureDisabledErrorProps {
  feature: string;
  message?: string;
  fallbackPath?: string;
}

export function FeatureDisabledError({
  feature,
  message = "This feature is currently disabled.",
  fallbackPath = "/",
}: FeatureDisabledErrorProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Feature Unavailable</h2>
      <p className="text-muted-foreground text-center mb-4">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">
        Feature: <code className="bg-muted px-2 py-1 rounded">{feature}</code>
      </p>
      <Button onClick={() => setLocation(fallbackPath)}>
        Go Back
      </Button>
    </div>
  );
}
```

### Task 7.4: Extend NavigationItem Interface

**File:** `client/src/config/navigation.ts`

```typescript
export interface NavigationItem {
  /** Display name shown in the sidebar */
  name: string;
  /** Route path */
  path: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional: Group this item belongs to */
  group?: "core" | "sales" | "fulfillment" | "finance" | "settings";
  /** Optional: Module this item belongs to (for feature flag gating) */
  module?: string;
  /** Optional: Specific feature flag required */
  featureFlag?: string;
}

// Update navigation items with module assignments
export const navigationItems: NavigationItem[] = [
  // CORE
  { name: "Dashboard", path: "/", icon: LayoutDashboard, group: "core" },
  { name: "Tasks", path: "/todos", icon: ListTodo, group: "core" },
  { name: "Calendar", path: "/calendar", icon: Calendar, group: "core", module: "calendar" },
  
  // SALES
  { name: "Sales Portal", path: "/sales-portal", icon: Kanban, group: "sales" },
  { name: "Clients", path: "/clients", icon: Users, group: "sales", module: "clients" },
  { name: "Live Shopping", path: "/live-shopping", icon: Video, group: "sales", featureFlag: "live-shopping" },
  // ... etc
];
```

### Task 7.5: Integrate Provider in App.tsx

**File:** `client/src/App.tsx`

```typescript
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <FeatureFlagProvider>
            <Router />
          </FeatureFlagProvider>
        </trpc.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## Phase 8: Admin UI (3-4 hours)

### Task 8.1: Create Feature Flags Admin Page

**File:** `client/src/pages/admin/FeatureFlagsPage.tsx`

(Full implementation with table, create/edit dialogs, override panels)

### Task 8.2-8.6: Admin Components

- `FlagEditDialog.tsx` - Create/edit flag form
- `RoleOverridePanel.tsx` - Manage role overrides
- `UserOverridePanel.tsx` - Manage user overrides
- `FlagTestPanel.tsx` - Test evaluation for users
- `FlagAuditHistory.tsx` - View change history

### Task 8.7: Add Admin Route

**File:** `client/src/App.tsx`

```typescript
import FeatureFlagsPage from "@/pages/admin/FeatureFlagsPage";

// In Router component
<Route path="/admin/feature-flags" component={FeatureFlagsPage} />
```

---

## Phase 9: Navigation & Seeding (2-3 hours)

### Task 9.1: Navigation Integration

**File:** `client/src/components/layout/Sidebar.tsx`

```typescript
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { navigationItems } from "@/config/navigation";

function Sidebar() {
  const { isEnabled, isModuleEnabled } = useFeatureFlags();
  
  const visibleItems = navigationItems.filter(item => {
    // Check module flag
    if (item.module && !isModuleEnabled(item.module)) {
      return false;
    }
    // Check specific feature flag
    if (item.featureFlag && !isEnabled(item.featureFlag)) {
      return false;
    }
    return true;
  });
  
  // Render visibleItems...
}
```

### Task 9.2: Add Module Middleware to Routers

Example for calendar router:
```typescript
import { requireModule } from "../_core/featureFlagMiddleware";

export const calendarRouter = router({
  list: protectedProcedure
    .use(requireModule("calendar"))
    .query(async ({ ctx }) => {
      // ...
    }),
});
```

### Task 9.3: Seed Default Flags

**File:** `scripts/seed/seeders/seed-feature-flags.ts`

```typescript
const defaultModuleFlags = [
  { key: "module-calendar", displayName: "Calendar Module", module: "calendar", isModuleFlag: true, defaultEnabled: true },
  { key: "module-inventory", displayName: "Inventory Module", module: "inventory", isModuleFlag: true, defaultEnabled: true },
  { key: "module-accounting", displayName: "Accounting Module", module: "accounting", isModuleFlag: true, defaultEnabled: true },
  { key: "module-orders", displayName: "Orders Module", module: "orders", isModuleFlag: true, defaultEnabled: true },
  { key: "module-clients", displayName: "Clients Module", module: "clients", isModuleFlag: true, defaultEnabled: true },
  { key: "module-vip-portal", displayName: "VIP Portal Module", module: "vip-portal", isModuleFlag: true, defaultEnabled: true },
  { key: "module-leaderboard", displayName: "Leaderboard Module", module: "leaderboard", isModuleFlag: true, defaultEnabled: true },
  { key: "module-matching", displayName: "Matchmaking Module", module: "matching", isModuleFlag: true, defaultEnabled: true },
];

const defaultFeatureFlags = [
  { key: "live-shopping", displayName: "Live Shopping", module: "sales", defaultEnabled: false },
  { key: "calendar-sync", displayName: "Calendar Sync", module: "calendar", dependsOn: "module-calendar", defaultEnabled: false },
  // Migrate existing env flag
  { key: "live-catalog", displayName: "Live Catalog", module: "vip-portal", dependsOn: "module-vip-portal", defaultEnabled: process.env.FEATURE_LIVE_CATALOG === 'true' },
];
```

---

## Phase 10: Integration Testing (2 hours)

### Task 10.1: Integration Tests

**File:** `tests/integration/featureFlags.test.ts`

```typescript
describe('Feature Flags Integration', () => {
  it('should create flag and evaluate correctly', async () => {
    // Create flag via API
    // Set role override
    // Evaluate for user with that role
    // Verify result
  });
  
  it('should invalidate cache on flag change', async () => {
    // Get effective flags (cached)
    // Update flag
    // Get effective flags again
    // Verify new value
  });
  
  it('should gate navigation items', async () => {
    // Disable module
    // Check navigation doesn't show module items
  });
  
  it('should block API when module disabled', async () => {
    // Disable module
    // Call module API
    // Verify 403 response
  });
});
```

---

## Summary of Changes from v1

| Area | v1 | v2 |
|------|----|----|
| Table naming | snake_case | camelCase |
| Role resolution | Unspecified | RBAC userRoles table |
| Cache strategy | Mentioned only | Full implementation with invalidation |
| Navigation | Basic mention | Extended interface + filtering |
| Bulk operations | Missing | Added bulkUpdate endpoint |
| Dependencies | Missing | Added dependsOn field |
| Error handling | Basic | FeatureDisabledError component |
| Integration tests | Missing | Added Phase 10 |
| Time estimate | 16-20h | 21-27h |

---

## Success Criteria

- [ ] All 4 database tables created and migrated
- [ ] Service passes all 9 property tests
- [ ] tRPC router with all 15+ endpoints
- [ ] Frontend context, hooks, and components working
- [ ] Admin UI fully functional
- [ ] Module gating in navigation
- [ ] Module middleware blocking disabled modules
- [ ] Seed data for all default modules
- [ ] Build passes without errors
- [ ] Integration tests passing
- [ ] Cache invalidation working correctly
