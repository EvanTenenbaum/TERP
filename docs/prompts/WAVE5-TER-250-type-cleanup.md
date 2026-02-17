# TER-250: Type Cleanup — Eliminate `as any` and `z.any()` Patterns

**Classification**: Low | **Mode**: SAFE | **Estimate**: 8h
**Linear**: TER-250 | **Wave**: 5

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with a lock icon, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **SAFE MODE RULES.** No schema changes. No database migrations. Only TypeScript and Zod type improvements.
8. **ONE FILE AT A TIME.** Complete and verify each file before moving to the next.
9. **NEVER INTRODUCE `db.delete(`.** Any hard delete is CI-blocked and will fail the task.
10. **DO NOT FIX ALL 465 INSTANCES.** The scope is strictly the targets listed in this prompt. Fixing unlisted instances is out of scope.

---

## Mission Brief

The codebase contains **465 instances of `as any`** across 117 TypeScript files and **7 instances of `z.any()`** in server routers. This task eliminates the highest-impact instances — those in router business logic — replacing them with proper TypeScript types and Zod validators.

`z.any()` in router inputs is a security concern: it means any payload shape passes input validation. `as any` in router logic means TypeScript cannot catch type errors at compile time.

**This is SAFE Mode.** No database schema changes. No migrations. TypeScript improvements only.

**Scope is strictly**:

- `z.any()` in 6 router files (security priority)
- `as any` in 5 router business logic files (type safety)
- `{ headers: {} } as any` pattern in 7 co-located test files (test reliability)

**Scope is NOT**:

- Any file in `drizzle/`, `scripts/`, `build/`, or `*.config.ts`
- The 465-instance global sweep
- Any file not explicitly listed in the task list below

---

## Pre-Work: Gather Baseline Counts

Before writing any code, establish a baseline so progress is measurable.

Run these commands and record the output:

```bash
grep -rn "z\.any()" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup"
```

```bash
grep -rn " as any" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup" | grep -v ".test.ts" | grep -v "permission-checks"
```

```bash
grep -rn "as any" /home/user/TERP/server/routers/*.test.ts 2>/dev/null | grep "headers.*as any\|res.*as any" | wc -l
```

LOCK **GATE 0**: Before editing anything, document:

- Exact count of `z.any()` instances in scope
- Exact count of `as any` instances in scope (business logic files)
- Exact count of `as any` instances in scope (test files)

Expected baseline (verify these match):

| File                     | Pattern   | Count |
| ------------------------ | --------- | ----- |
| `configuration.ts`       | `z.any()` | 2     |
| `dashboard.ts`           | `z.any()` | 1     |
| `freeformNotes.ts`       | `z.any()` | 2     |
| `inventory.ts`           | `z.any()` | 1     |
| `orderEnhancements.ts`   | `z.any()` | 1     |
| `admin.ts`               | `as any`  | 4     |
| `adminImport.ts`         | `as any`  | 1     |
| `calendar.ts`            | `as any`  | 4     |
| `clientNeedsEnhanced.ts` | `as any`  | 2     |

---

## Task 1: Fix `z.any()` in `server/routers/configuration.ts`

**File**: `server/routers/configuration.ts`

**Read the file first**:

```bash
# Read lines 30-75
```

### 1a: Fix `setValue` mutation — Line 35

**Current code**:

```typescript
z.object({
  path: z.string(),
  value: z.any(),
  reason: z.string().optional(),
});
```

**The problem**: `setConfigValue` in `server/configurationManager.ts` already accepts `value: unknown`. The `z.any()` passes anything through without validation.

**Fix**: Replace `z.any()` with a union of all valid config value types. Configuration values in TERP are primitives or nested objects:

```typescript
z.object({
  path: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), z.unknown()),
  ]),
  reason: z.string().optional(),
});
```

### 1b: Fix `validate` procedure — Line 70

**Current code**:

```typescript
.input(z.any())
.query(({ input }) => {
  const errors = configManager.validateConfiguration(input);
  return { valid: errors.length === 0, errors };
})
```

**The problem**: `validateConfiguration` in `configurationManager.ts` is typed `(config: SystemConfiguration): string[]`. Passing `z.any()` means the input is untyped.

**Fix**: `SystemConfiguration` is a complex object. The validate procedure should accept the full shape. However, rather than duplicating the entire `SystemConfiguration` interface as a Zod schema (which would require significant work and is out of this task's scope), use `z.record(z.string(), z.unknown())` which accurately represents "a validated JS object we'll type-check internally":

```typescript
.input(z.record(z.string(), z.unknown()))
.query(({ input }) => {
  const errors = configManager.validateConfiguration(input as SystemConfiguration);
  return { valid: errors.length === 0, errors };
})
```

Also add the `SystemConfiguration` import at the top of the file:

```typescript
import type { SystemConfiguration } from "../configurationManager";
```

**Why `as SystemConfiguration` is acceptable here**: The validate function itself performs structural validation and returns errors for invalid shapes — it is the validator. The `as SystemConfiguration` cast is narrowing an already-validated "object of unknown structure" into the expected type for the validation function to inspect. This is a different and acceptable use of type assertion compared to using `as any` to bypass type checking on router output.

**Acceptance Criteria**:

- [ ] `z.any()` removed from both sites in `configuration.ts`
- [ ] `setValue` accepts `z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())])`
- [ ] `validate` accepts `z.record(z.string(), z.unknown())`
- [ ] `SystemConfiguration` imported as a type

**Verification**:

```bash
grep -n "z\.any()" /home/user/TERP/server/routers/configuration.ts
```

Expected: zero matches.

---

## Task 2: Fix `z.any()` in `server/routers/dashboard.ts`

**File**: `server/routers/dashboard.ts`

**Read lines 58-72 first.**

### Current code (around line 60-67):

```typescript
const widgetSchema = z.object({
  widgetType: z.string(),
  position: z.number(),
  width: z.number(),
  height: z.number(),
  isVisible: z.boolean(),
  config: z.any().optional(),
});
```

**The problem**: Widget `config` is a free-form JSON blob stored per widget type. The full set of widget config shapes is not currently typed.

**Fix**: Replace `z.any()` with `z.record(z.string(), z.unknown()).optional()`. This accepts any object structure while still being typed as "an object with string keys and unknown values" rather than completely untyped:

```typescript
const widgetSchema = z.object({
  widgetType: z.string(),
  position: z.number(),
  width: z.number(),
  height: z.number(),
  isVisible: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});
```

**Acceptance Criteria**:

- [ ] `z.any()` removed from `widgetSchema` in `dashboard.ts`
- [ ] `config` field uses `z.record(z.string(), z.unknown()).optional()`

**Verification**:

```bash
grep -n "z\.any()" /home/user/TERP/server/routers/dashboard.ts
```

Expected: zero matches.

---

## Task 3: Fix `z.any()` in `server/routers/freeformNotes.ts`

**File**: `server/routers/freeformNotes.ts`

**Read lines 32-57 first.**

The `content` field in note `create` and `update` procedures holds rich-text editor content (e.g., a Tiptap/ProseMirror JSON document). It is a nested JSON object with a known top-level structure.

### Fix both instances:

**Current code** (lines 36 and 50):

```typescript
content: z.any().optional(),
```

**Fix**: Rich-text editor content is always either `null`/`undefined`, a plain `string`, or a JSON object. Use a discriminated approach:

```typescript
content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
```

Apply this replacement to **both** occurrences (in `create` at line 36 and in `update` at line 50).

**Acceptance Criteria**:

- [ ] Both `z.any()` instances removed from `freeformNotes.ts`
- [ ] Both replaced with `z.union([z.string(), z.record(z.string(), z.unknown())]).optional()`

**Verification**:

```bash
grep -n "z\.any()" /home/user/TERP/server/routers/freeformNotes.ts
```

Expected: zero matches.

---

## Task 4: Fix `z.any()` in `server/routers/inventory.ts`

**File**: `server/routers/inventory.ts`

**Read lines 1395-1425 first.**

### Current code (around line 1402-1403):

```typescript
z.object({
  name: z.string().min(1).max(100),
  filters: z.any(), // JSON object
  isShared: z.boolean().optional().default(false),
});
```

**The problem**: `filters` is a saved inventory view filter object. It holds key-value pairs representing filter state from the UI (column filters, sort, etc.).

**Fix**: Replace with `z.record(z.string(), z.unknown())`. This accurately describes "a JSON object with string keys":

```typescript
z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()),
  isShared: z.boolean().optional().default(false),
});
```

Remove the `// JSON object` comment — the type now documents itself.

**Acceptance Criteria**:

- [ ] `z.any()` removed from `inventory.ts` views save procedure
- [ ] `filters` field uses `z.record(z.string(), z.unknown())`
- [ ] Comment `// JSON object` removed

**Verification**:

```bash
grep -n "z\.any()" /home/user/TERP/server/routers/inventory.ts
```

Expected: zero matches.

---

## Task 5: Fix `z.any()` in `server/routers/orderEnhancements.ts`

**File**: `server/routers/orderEnhancements.ts`

**Read lines 46-65 first.**

### Current code (around line 54):

```typescript
orderTemplate: z.any().optional(),
```

**Context**: `orderTemplate` in `updateRecurringOrder` is a JSON blob representing an order template (line items, quantities, etc.).

**Fix**: Replace with `z.record(z.string(), z.unknown()).optional()`:

```typescript
orderTemplate: z.record(z.string(), z.unknown()).optional(),
```

**Acceptance Criteria**:

- [ ] `z.any()` removed from `orderEnhancements.ts`
- [ ] `orderTemplate` field uses `z.record(z.string(), z.unknown()).optional()`

**Verification**:

```bash
grep -n "z\.any()" /home/user/TERP/server/routers/orderEnhancements.ts
```

Expected: zero matches.

---

## LOCK GATE 1: All `z.any()` Eliminated from Routers

Run the full scan before proceeding to `as any` fixes:

```bash
grep -rn "z\.any()" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup"
```

Expected: **zero matches**.

If any remain, fix them before continuing.

---

## Task 6: Fix `as any` in `server/routers/admin.ts`

**File**: `server/routers/admin.ts`

**Read lines 230-370 first** to understand all four instances.

All four instances follow the same pattern: `db.execute(sql\`...\`)`returns a`MySqlRawQueryResult`or similar untyped result, and the code accesses`[0]?.count` on it.

### 6a: Understand the pattern

The Drizzle `db.execute()` method returns `[QueryResult, FieldPacket[]]` in MySQL, or a type that doesn't expose individual row shapes. The correct fix is to avoid `db.execute()` for queries that return rows — use `db.select()` instead, which is fully typed.

### 6b: Lines 238-245 — schema columns count

**Current code**:

```typescript
const result = await db.execute(sql`
  SELECT COUNT(*) as count
  FROM information_schema.columns
  WHERE table_name = 'strains'
  AND column_name IN ('openthcId', 'openthcStub')
`);
const count = (result as any)[0]?.count || 0;
```

**Fix**: Use `db.select()` with an explicit return type:

```typescript
const result = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(sql`information_schema.columns`)
  .where(
    sql`table_name = 'strains' AND column_name IN ('openthcId', 'openthcStub')`
  );
const count = result[0]?.count ?? 0;
```

### 6c: Lines 257-264 — index count

**Current code**:

```typescript
const result = await db.execute(sql`
  SELECT COUNT(*) as count
  FROM information_schema.statistics
  WHERE table_name = 'strains'
  AND index_name LIKE 'idx_strains_%'
`);
const count = (result as any)[0]?.count || 0;
```

**Fix**:

```typescript
const result = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(sql`information_schema.statistics`)
  .where(sql`table_name = 'strains' AND index_name LIKE 'idx_strains_%'`);
const count = result[0]?.count ?? 0;
```

### 6d: Lines 285-292 — OpenTHC strain count (first instance)

**Current code**:

```typescript
const result = await db.execute(sql`
  SELECT COUNT(*) as count
  FROM strains
  WHERE openthcId IS NOT NULL
`);
const count = (result as any)[0]?.count || 0;
```

**Fix**:

```typescript
const result = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(strains)
  .where(sql`openthcId IS NOT NULL`);
const count = result[0]?.count ?? 0;
```

Note: Verify `strains` is already imported at the top of `admin.ts`. If not, add the import.

### 6e: Lines 355-362 — OpenTHC strain count (second instance)

**Current code**:

```typescript
const openthcStrains = await db.execute(sql`
  SELECT COUNT(*) as count FROM strains WHERE openthcId IS NOT NULL
`);
openthcCount = (openthcStrains as any)[0]?.count || 0;
```

**Fix**:

```typescript
const openthcStrains = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(strains)
  .where(sql`openthcId IS NOT NULL`);
openthcCount = openthcStrains[0]?.count ?? 0;
```

**Important note on `|| 0` vs `?? 0`**: The original code uses `|| 0`. Replace with `?? 0` (nullish coalescing). The `||` operator treats `0` as falsy, meaning a count of zero would incorrectly fall back to `0` anyway in this case — but `??` is the semantically correct null-guard here and avoids the type issue.

**Acceptance Criteria**:

- [ ] All 4 `as any` instances removed from `admin.ts`
- [ ] All replaced with typed `db.select({ count: sql<number>\`COUNT(\*)\` })` queries
- [ ] `|| 0` replaced with `?? 0` at all four sites
- [ ] `strains` table imported if not already present

**Verification**:

```bash
grep -n "as any" /home/user/TERP/server/routers/admin.ts
```

Expected: zero matches.

---

## Task 7: Fix `as any` in `server/routers/adminImport.ts`

**File**: `server/routers/adminImport.ts`

**Read around line 205-220 first.**

### Current code (around line 212):

```typescript
const openthcCount = (openthcStrains as any)[0]?.count || 0;
```

This is the same pattern as Task 6. Find the `db.execute()` call immediately before line 212 and apply the same fix:

**Fix**: Replace the preceding `db.execute(sql\`SELECT COUNT(\*) as count FROM strains WHERE...\`)`with a typed`db.select()`:

```typescript
const openthcStrains = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(strains)
  .where(sql`openthcId IS NOT NULL`);
const openthcCount = openthcStrains[0]?.count ?? 0;
```

Read the actual lines around 212 before making the edit to confirm the exact query being replaced.

**Acceptance Criteria**:

- [ ] `as any` removed from `adminImport.ts`
- [ ] Replaced with typed `db.select()` query
- [ ] `strains` table imported in `adminImport.ts` if not already present

**Verification**:

```bash
grep -n "as any" /home/user/TERP/server/routers/adminImport.ts
```

Expected: zero matches.

---

## Task 8: Fix `as any` in `server/routers/calendar.ts`

**File**: `server/routers/calendar.ts`

**Read lines 22-38 and 87-108 first.**

### The problem

The `getEvents` procedure input schema defines `modules`, `eventTypes`, `statuses`, and `priorities` as `z.array(z.string())`. But the `calendarEvents` Drizzle schema columns are typed as `MySqlEnum` — which means `inArray()` expects the specific enum value type, not `string[]`. The `as any[]` casts bypass this mismatch.

The correct fix is to define the input schema arrays using the same enum values defined in `drizzle/schema.ts` for the `calendarEvents` table, so the types align.

### The enum values from `drizzle/schema.ts`:

```typescript
// module column
[
  "INVENTORY",
  "ACCOUNTING",
  "CLIENTS",
  "VENDORS",
  "ORDERS",
  "SAMPLES",
  "COMPLIANCE",
  "GENERAL",
][
  // event_type column
  ("MEETING",
  "DEADLINE",
  "TASK",
  "DELIVERY",
  "PAYMENT_DUE",
  "FOLLOW_UP",
  "AUDIT",
  "INTAKE",
  "PHOTOGRAPHY",
  "BATCH_EXPIRATION",
  "RECURRING_ORDER",
  "SAMPLE_REQUEST",
  "OTHER",
  "AR_COLLECTION",
  "AP_PAYMENT")
][
  // status column
  ("SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED")
][
  // priority column
  ("LOW", "MEDIUM", "HIGH", "URGENT")
];
```

### Fix the input schema (lines 26-38)

**Current code**:

```typescript
modules: z.array(z.string()).optional(),
eventTypes: z.array(z.string()).optional(),
statuses: z.array(z.string()).optional(),
priorities: z.array(z.string()).optional(),
```

**Fix** — update these four fields to use proper `z.enum()` arrays:

```typescript
modules: z.array(z.enum([
  "INVENTORY", "ACCOUNTING", "CLIENTS", "VENDORS",
  "ORDERS", "SAMPLES", "COMPLIANCE", "GENERAL",
])).optional(),
eventTypes: z.array(z.enum([
  "MEETING", "DEADLINE", "TASK", "DELIVERY", "PAYMENT_DUE",
  "FOLLOW_UP", "AUDIT", "INTAKE", "PHOTOGRAPHY", "BATCH_EXPIRATION",
  "RECURRING_ORDER", "SAMPLE_REQUEST", "OTHER", "AR_COLLECTION", "AP_PAYMENT",
])).optional(),
statuses: z.array(z.enum([
  "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED",
])).optional(),
priorities: z.array(z.enum([
  "LOW", "MEDIUM", "HIGH", "URGENT",
])).optional(),
```

### Fix the `inArray()` calls (lines 89-104)

Once the input schema uses `z.enum()`, the arrays are typed correctly and the `as any[]` casts can be removed. The `inArray()` call signature will now accept the typed arrays directly:

**Current code**:

```typescript
eventConditions.push(inArray(calendarEvents.module, input.modules as any[]));
eventConditions.push(
  inArray(calendarEvents.eventType, input.eventTypes as any[])
);
eventConditions.push(inArray(calendarEvents.status, input.statuses as any[]));
eventConditions.push(
  inArray(calendarEvents.priority, input.priorities as any[])
);
```

**Fix**:

```typescript
eventConditions.push(inArray(calendarEvents.module, input.modules));
eventConditions.push(inArray(calendarEvents.eventType, input.eventTypes));
eventConditions.push(inArray(calendarEvents.status, input.statuses));
eventConditions.push(inArray(calendarEvents.priority, input.priorities));
```

Note: The `if` guards (`if (input.modules && input.modules.length > 0)`) already narrow the type to non-undefined before these calls, so TypeScript will accept this. If TypeScript still complains, use a non-null assertion (`input.modules!`) which is safer than `as any[]`.

**Acceptance Criteria**:

- [ ] All 4 `as any[]` casts removed from `calendar.ts`
- [ ] Input schema `modules`, `eventTypes`, `statuses`, `priorities` all use `z.array(z.enum([...]))`
- [ ] Enum values in input schema exactly match enum values in `drizzle/schema.ts`

**Verification**:

```bash
grep -n "as any" /home/user/TERP/server/routers/calendar.ts
```

Expected: zero matches.

**Critical cross-check** — verify enum values match schema exactly:

```bash
grep -A8 'module: mysqlEnum' /home/user/TERP/drizzle/schema.ts | grep -A8 '"INVENTORY"'
grep -A15 'eventType: mysqlEnum' /home/user/TERP/drizzle/schema.ts
grep -A5 "priority: mysqlEnum.*LOW" /home/user/TERP/drizzle/schema.ts
```

---

## Task 9: Fix `as any` in `server/routers/clientNeedsEnhanced.ts`

**File**: `server/routers/clientNeedsEnhanced.ts`

**Read the full file first** (it should be under 400 lines).

### Instance 1 — Line 44: `create` procedure

**Current code**:

```typescript
const result = await clientNeedsDb.createClientNeed({
  ...input,
  neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
  expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
} as any);
```

**The problem**: The `create` procedure input includes `createdBy: z.number()` (a violation of the TERP actor attribution rule — it trusts a client-provided user ID). The `InsertClientNeed` type likely has a `createdBy` field, but the types don't align perfectly, causing the `as any` cast.

**Two problems to fix simultaneously**:

1. Remove `as any` by aligning the input shape with `InsertClientNeed`
2. Remove `createdBy: z.number()` from the input schema (TERP rule: never trust client-provided actor)

**Fix the input schema** — remove `createdBy: z.number()` from the `z.object({...})` input definition around line 17-35.

**Fix the mutation body** — the `createClientNeed` call should not spread `input` directly if `input` had `createdBy`. After removing `createdBy` from the input, the spread will be clean. The `as any` cast can then be removed:

```typescript
const result = await clientNeedsDb.createClientNeed({
  ...input,
  neededBy: input.neededBy ? new Date(input.neededBy) : undefined,
  expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
});
```

If TypeScript still reports a type mismatch after removing `as any` and `createdBy`, read `InsertClientNeed` carefully to identify which fields are required vs. optional and adjust the input schema accordingly. Do not re-add `as any`.

### Instance 2 — Line 364: `createQuoteFromMatch` procedure

**Current code** (around line 360-365):

```typescript
.input(
  z.object({
    clientId: z.number(),
    clientNeedId: z.number().optional(),
    matches: z.array(z.unknown()),
    userId: z.number(),
    matchRecordId: z.number().optional(),
  })
)
.mutation(async ({ input }) => {
  const result = await needsMatchingService.createQuoteFromMatch(input as any);
```

**The problem**: `needsMatchingService.createQuoteFromMatch` is typed as:

```typescript
async function createQuoteFromMatch(matchData: {
  clientId: number;
  clientNeedId?: number;
  matches: Match[];
  userId: number;
  matchRecordId?: number;
}): Promise<any>;
```

The `as any` cast is needed because `input.matches` is typed as `unknown[]` (from `z.array(z.unknown())`), but `createQuoteFromMatch` expects `matches: Match[]`.

**Fix**: Update the `matches` field to use the proper `Match` type shape as a Zod schema. First read `needsMatchingService.ts` to find the `Match` type definition, then replicate its shape as a Zod object. If `Match` is complex, at minimum use `z.array(z.object({ ... }))` with the key fields, or use `z.array(z.record(z.string(), z.unknown()))` as an interim improvement over `z.unknown()`.

A practical fix that removes `as any` without requiring a full `Match` Zod schema:

```typescript
matches: z.array(z.record(z.string(), z.unknown())),
```

Then the `createQuoteFromMatch` call becomes:

```typescript
const result = await needsMatchingService.createQuoteFromMatch({
  ...input,
  matches: input.matches as Match[],
});
```

Import `Match` type from the service:

```typescript
import type { Match } from "../needsMatchingService"; // or wherever Match is exported
```

If `Match` is not exported, export it from `needsMatchingService.ts` and import it here.

**Acceptance Criteria**:

- [ ] Both `as any` instances removed from `clientNeedsEnhanced.ts`
- [ ] `createdBy: z.number()` removed from the `create` procedure input schema
- [ ] `create` mutation no longer passes a client-provided actor ID
- [ ] `createQuoteFromMatch` call uses properly typed input

**Verification**:

```bash
grep -n "as any\|createdBy.*z\.number" /home/user/TERP/server/routers/clientNeedsEnhanced.ts
```

Expected: zero matches.

---

## Task 10: Fix `as any` in Test Files (Co-located in `server/routers/`)

**Files**:

- `server/routers/auth.test.ts`
- `server/routers/badDebt.test.ts`
- `server/routers/calendarFinancials.test.ts`
- `server/routers/clients.test.ts`
- `server/routers/dashboard.pagination.test.ts`
- `server/routers/leaderboard.test.ts`
- `server/routers/orders.test.ts`
- `server/routers/salesSheets.test.ts`
- `server/routers/search.test.ts`

**The problem**: Each test file creates a mock Express context inline with:

```typescript
req: { headers: {} } as any,
res: {} as any,
```

A proper mock context helper already exists at `tests/unit/mocks/db.mock.ts`:

```typescript
export function createMockContext(
  overrides?: Partial<TrpcContext>
): TrpcContext;
```

### The fix

Each test file should import and use `createMockContext` instead of building inline `as any` context objects.

**Pattern to replace** (varies slightly per file):

```typescript
// Current (bad)
const ctx = await createContext({
  req: { headers: {} } as any,
  res: {} as any,
});

// Or inline:
const caller = appRouter.createCaller({
  req: { headers: {} } as any,
  res: {} as any,
  user: mockUser,
});
```

**Fix template** — add the import and replace the inline context:

```typescript
import { createMockContext } from "../../tests/unit/mocks/db.mock";
// Note: verify the relative path from each file's location

// Replace inline context with:
const ctx = createMockContext({ user: mockUser });
const caller = appRouter.createCaller(ctx);
```

**Before editing each file**: Read it first. Verify:

1. The exact path to `db.mock.ts` from that file's location
2. Whether the file uses `createContext()` from the app or builds context inline
3. Whether any overrides need to be passed to `createMockContext()`

For files that call `await createContext({ req: ..., res: ... })` and then add `user` to the result, the replacement is:

```typescript
const ctx = createMockContext({ user: mockUser });
```

No `await` needed — `createMockContext` is synchronous.

**Acceptance Criteria**:

- [ ] All `{ headers: {} } as any` patterns removed from the 9 test files
- [ ] All `res: {} as any` patterns removed from the 9 test files
- [ ] Each file imports `createMockContext` from `db.mock.ts`
- [ ] Tests still pass after the change

**Verification**:

```bash
grep -rn "headers.*as any\|res.*as any" /home/user/TERP/server/routers/*.test.ts 2>/dev/null
```

Expected: zero matches.

---

## Task 11: Full Verification Suite

LOCK **GATE 2**: Run ALL of these and paste output:

```bash
pnpm check 2>&1 | tail -30
```

```bash
pnpm lint 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -30
```

```bash
pnpm build 2>&1 | tail -20
```

All four must pass before proceeding to the QA protocol.

---

## Task 12: Final Count Verification

After all changes, run the baseline commands from Gate 0 again and document the reduction:

```bash
grep -rn "z\.any()" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup"
```

Expected: **0 matches** (down from 7).

```bash
grep -rn " as any" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup" | grep -v ".test.ts" | grep -v "permission-checks"
```

Expected: **0 matches in business logic files** (down from 11 — note `vendors.ts`, `vipPortal.ts`, and `vendorSupply.ts` are OUT OF SCOPE for this task, do not count those as failures).

```bash
grep -rn "headers.*as any\|res.*as any" /home/user/TERP/server/routers/*.test.ts 2>/dev/null
```

Expected: **0 matches** (down from ~18).

---

## QA Protocol (2-Lens for SAFE Mode)

### Lens 1: Forbidden Pattern Scan

```bash
# No z.any() remains in in-scope routers
grep -rn "z\.any()" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup"

# No as any remains in business logic (non-test) routers in scope
grep -n "as any" /home/user/TERP/server/routers/admin.ts
grep -n "as any" /home/user/TERP/server/routers/adminImport.ts
grep -n "as any" /home/user/TERP/server/routers/calendar.ts
grep -n "as any" /home/user/TERP/server/routers/clientNeedsEnhanced.ts
grep -n "as any" /home/user/TERP/server/routers/configuration.ts
grep -n "as any" /home/user/TERP/server/routers/freeformNotes.ts

# No createdBy from input introduced
grep -n "input\.createdBy\|input\.userId" /home/user/TERP/server/routers/clientNeedsEnhanced.ts

# No hard deletes introduced
grep -rn "db\.delete(" /home/user/TERP/server/routers/ --include="*.ts" | grep -v ".backup"
```

Expected for `db.delete(`: zero matches (unless pre-existing — do not introduce new ones).

### Lens 2: Type Safety Regression Check

Verify that the `z.union` and `z.record` replacements do not reject valid production inputs. Check these by reading the actual calling code or UI code if available:

| Schema Change                             | Valid Input Shape                                         | Should Still Pass |
| ----------------------------------------- | --------------------------------------------------------- | ----------------- |
| `configuration.setValue` `value` field    | `"some string"`, `42`, `true`, `{ key: "val" }`           | Yes               |
| `dashboard.widgetSchema` `config` field   | `{}`, `{ refreshInterval: 30 }`, `undefined`              | Yes               |
| `freeformNotes` `content` field           | `null`, `"plain text"`, `{ type: "doc", content: [...] }` | Yes               |
| `inventory.views.save` `filters` field    | `{ status: "ACTIVE", search: "abc" }`                     | Yes               |
| `orderEnhancements` `orderTemplate` field | `{ items: [], notes: "" }`, `undefined`                   | Yes               |
| `calendar.getEvents` `modules` field      | `["INVENTORY", "ORDERS"]`                                 | Yes               |
| `calendar.getEvents` `statuses` field     | `["SCHEDULED", "COMPLETED"]`                              | Yes               |

If any of these would be rejected by the new schema, document it and adjust the schema to accept it without reverting to `z.any()`.

---

## Fix Cycle

For each issue found during QA:

1. Fix the issue
2. Re-run the specific verification command that caught it
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Rollback Plan

This task makes only TypeScript and Zod schema changes. No database schema is touched.

**Full rollback**:

```bash
git checkout -- server/routers/
```

**Per-file rollback** (if only one file regressed):

```bash
git checkout -- server/routers/configuration.ts
git checkout -- server/routers/dashboard.ts
git checkout -- server/routers/freeformNotes.ts
git checkout -- server/routers/inventory.ts
git checkout -- server/routers/orderEnhancements.ts
git checkout -- server/routers/admin.ts
git checkout -- server/routers/adminImport.ts
git checkout -- server/routers/calendar.ts
git checkout -- server/routers/clientNeedsEnhanced.ts
```

**Risk level**: LOW. These are input validation tightenings. The only risk is if the new Zod schemas reject valid inputs that `z.any()` previously accepted. Mitigated by Lens 2 of the QA protocol.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

**z.any() Fixes**:

- [ ] `configuration.ts` — `setValue` `value` field uses `z.union([z.string(), z.number(), z.boolean(), z.record(...)])`
- [ ] `configuration.ts` — `validate` input uses `z.record(z.string(), z.unknown())`
- [ ] `dashboard.ts` — `widgetSchema.config` uses `z.record(z.string(), z.unknown()).optional()`
- [ ] `freeformNotes.ts` — both `content` fields use `z.union([z.string(), z.record(...)]).optional()`
- [ ] `inventory.ts` — `filters` field uses `z.record(z.string(), z.unknown())`
- [ ] `orderEnhancements.ts` — `orderTemplate` uses `z.record(z.string(), z.unknown()).optional()`

**as any Fixes (business logic)**:

- [ ] `admin.ts` — all 4 instances replaced with typed `db.select({ count: sql<number>\`COUNT(\*)\` })` queries
- [ ] `adminImport.ts` — 1 instance replaced with typed `db.select()` query
- [ ] `calendar.ts` — all 4 `as any[]` casts removed; input schema uses `z.array(z.enum([...]))`
- [ ] `clientNeedsEnhanced.ts` — `create` `as any` removed; `createdBy` removed from input
- [ ] `clientNeedsEnhanced.ts` — `createQuoteFromMatch` `as any` removed; proper typing applied

**as any Fixes (test files)**:

- [ ] `auth.test.ts` — `{ headers: {} } as any` and `res: {} as any` replaced
- [ ] `badDebt.test.ts` — same
- [ ] `calendarFinancials.test.ts` — same
- [ ] `clients.test.ts` — same
- [ ] `dashboard.pagination.test.ts` — same
- [ ] `leaderboard.test.ts` — same
- [ ] `orders.test.ts` — same
- [ ] `salesSheets.test.ts` — same
- [ ] `search.test.ts` — same

**Verification**:

- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm lint` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] Final `z.any()` scan returns zero matches in scope (paste output)
- [ ] Final `as any` scan returns zero matches in business logic scope (paste output)
- [ ] No new `any` types introduced (no `z.any()` or `: any`)
- [ ] No `createdBy` or `userId` passed via input in `clientNeedsEnhanced.ts`
- [ ] No TODO/FIXME/HACK comments introduced

---

## Out-of-Scope Callouts (Do Not Fix in This Task)

The following `as any` instances were identified during research but are NOT in scope for TER-250. Document them for future tasks:

| File                                          | Pattern                        | Suggested Task                     |
| --------------------------------------------- | ------------------------------ | ---------------------------------- |
| `server/routers/vendors.ts:468`               | `(result as any).insertId`     | Fix with typed insert result       |
| `server/routers/vipPortal.ts:752,810,869,873` | `status as any`, `type as any` | Requires VIP Portal enum alignment |
| `server/routers/vendorSupply.ts:48`           | `} as any`                     | Part of vendor migration work      |
| `server/configurationManager.ts:200`          | Internal `any`                 | Separate config refactor task      |
| `server/needsMatchingService.ts:47`           | `Promise<any>` return type     | Separate matching service task     |

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **SAFE MODE.** No schema migrations. No database changes. TypeScript only.
4. **SCOPE GUARD.** Only the files listed. Do not fix out-of-scope `as any` instances.
5. **ACTOR RULE.** Removing `createdBy` from `clientNeedsEnhanced.ts` input is mandatory, not optional.
6. **READ BEFORE EDIT.** Read every file before modifying it. Line numbers shift.
