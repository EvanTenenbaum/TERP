# TER-263: storage.createZone INSERT Failure

**Wave:** 10 — Infrastructure & Edge Cases
**Priority:** HIGH | **Mode:** STRICT
**Estimate:** 4h

---

## Context

The `storage.createZone` mutation fails on INSERT. The `storage_zones` table uses reusable `mysqlEnum` definitions that may have column naming issues.

## Root Cause Analysis

The schema in `drizzle/schema-storage.ts` defines:

```typescript
// Line 33 — enum type name, used as column definition
export const temperatureControlEnum = mysqlEnum("temperature_control", [
  "ambient",
  "cool",
  "cold",
  "frozen",
  "controlled",
]);

// Line 44 — enum type name, used as column definition
export const zoneAccessLevelEnum = mysqlEnum("zone_access_level", [
  "public",
  "restricted",
  "secure",
  "high_security",
]);
```

These are used in the `storageZones` table (line 55):

```typescript
temperatureControl: temperatureControlEnum.notNull().default("ambient"),
accessLevel: zoneAccessLevelEnum.notNull().default("public"),
```

**CRITICAL BUG (mysqlEnum naming rule):** When a reusable `mysqlEnum` is used as a table column, the first argument becomes the DB column name. So:

- `temperatureControl` field → DB column `temperature_control` ✅ (matches snake_case convention)
- `accessLevel` field → DB column `zone_access_level` ❌ (should be `access_level`, not `zone_access_level`)

If the production DB was created with column `access_level` but the schema generates `zone_access_level`, the INSERT will fail with "Unknown column 'zone_access_level'".

**Alternative root cause:** The `storage_zones` table may not exist in production at all (migration never run). Check if the table was part of Sprint 5 Track E and whether those migrations have been applied.

## Investigation Steps

1. Read `drizzle/schema-storage.ts` in full — understand all table definitions
2. Read `server/routers/storage.ts` — the `createZone` mutation (line 131)
3. Check migration files: `ls drizzle/migrations/` for any storage-related migrations
4. Check if `storage_zones` is in `drizzle/schema.ts` exports or `drizzle/index.ts`
5. Verify the `sites` table exists (FK reference from `storageZones.siteId`)

## Required Fix

### Fix 1: Inline the enums with correct column names

```typescript
// BEFORE — reusable enum with type name as first arg
export const temperatureControlEnum = mysqlEnum("temperature_control", [...]);
export const zoneAccessLevelEnum = mysqlEnum("zone_access_level", [...]);

// Used as:
temperatureControl: temperatureControlEnum.notNull().default("ambient"),
accessLevel: zoneAccessLevelEnum.notNull().default("public"),
```

```typescript
// AFTER — inline with correct DB column names
temperatureControl: mysqlEnum("temperature_control", [
  "ambient", "cool", "cold", "frozen", "controlled",
]).notNull().default("ambient"),

accessLevel: mysqlEnum("access_level", [
  "public", "restricted", "secure", "high_security",
]).notNull().default("public"),
```

**Note:** Verify whether the production DB column is `access_level` or `zone_access_level` before making this change. If the migration used the schema as-is, the column name is `zone_access_level` and the schema is correct.

### Fix 2: Ensure table exists in production

If the `storage_zones` table hasn't been migrated, create a Drizzle migration.

### Fix 3: Input schema alignment

Verify that `storageZoneInputSchema` (defined earlier in `storage.ts`) matches the columns being inserted. Check for any field name mismatches between the Zod schema and the Drizzle insert.

## Key Files

| File                            | Purpose                         |
| ------------------------------- | ------------------------------- |
| `drizzle/schema-storage.ts`     | Storage zone schema definitions |
| `server/routers/storage.ts:131` | `createZone` mutation           |
| `drizzle/migrations/`           | Migration files                 |

## Verification Checklist

- [ ] All `mysqlEnum` first args match actual DB column names
- [ ] `storage_zones` table confirmed to exist in production (or migration created)
- [ ] `sites` FK reference is valid
- [ ] `pnpm check` passes
- [ ] `pnpm lint` — no new errors
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

## Acceptance Criteria

1. `storage.createZone` successfully inserts a new zone
2. Enum columns align with production DB
3. No regressions in zone list/update/delete operations
