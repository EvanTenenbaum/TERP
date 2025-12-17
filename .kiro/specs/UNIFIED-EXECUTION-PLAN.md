# 🎯 Unified Execution Plan: Data & Architecture Initiative

**Created**: December 16, 2025  
**Total Specs**: 3  
**Total Tasks**: ~145 subtasks  
**Estimated Duration**: 8-12 hours (sequential execution)

---

## Executive Summary

This document provides a **stacked, sequential execution plan** for three related specifications:

1. **Spec 1: Data Completeness Fix** - Seeder enhancements (LOW RISK)
2. **Spec 2: Orphan Feature Linkage Cleanup** - UI/routing fixes (LOW RISK)  
3. **Spec 3: Canonical Model Unification** - Schema/security hardening (HIGH RISK)

Each spec includes a **red-hat analysis** identifying risks, counterexamples, and mitigations.

---

## 🔴 Red-Hat Analysis Summary

### Spec 1: Data Completeness Fix

| Risk | Severity | Mitigation |
|------|----------|------------|
| Products table empty when seeding orders | Medium | Check for products before enriching order items |
| Vendors table empty when seeding bills/POs | Medium | Skip seeder with warning if no vendors |
| FK constraint failures on createdBy=1 | Low | Verify user ID 1 exists before seeding |
| Reserved quantity exceeds onHand | Low | Cap reservedQty at onHandQty |
| Bill status enum mismatch | Medium | Verify schema enum values before using |

**Overall Risk**: 🟢 LOW - Isolated seeder changes, no schema modifications

### Spec 2: Orphan Feature Linkage Cleanup

| Risk | Severity | Mitigation |
|------|----------|------------|
| Quotes page has bugs/incomplete functionality | Medium | Verify tRPC endpoints work before routing |
| Cron job fails silently on startup | Medium | Wrap in try-catch, log errors, server continues |
| Existing bookmarks to /orders/:id break | Low | Already 404, no regression |
| DebugOrders.tsx has unique functionality | Low | Compare with OrdersDebug.tsx before deletion |
| Navigation component location unknown | Low | Search for sidebar/nav in components |

**Overall Risk**: 🟢 LOW - UI changes, no data modifications

### Spec 3: Canonical Model Unification

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Orphaned customerId values** | 🔴 CRITICAL | Run data audit BEFORE adding FK constraints |
| **Vendor-client name collisions** | 🟡 HIGH | Run collision detection, manual review queue |
| **protectedProcedure allows public user** | 🔴 CRITICAL | Add explicit check for ctx.user.id === -1 |
| **Schema drift more extensive than known** | 🟡 HIGH | Run full schema introspection first |
| **50+ fallback user ID patterns** | 🟡 HIGH | Systematic replacement across 11 files |
| **VIP portal security not implemented** | 🟡 HIGH | Create vipPortalProcedure middleware |
| **createdBy accepted from input** | 🟡 HIGH | Remove from input schemas, derive from context |
| **Mixed naming conventions** | 🟡 MEDIUM | Standardize on snake_case for DB |
| **Inconsistent onDelete behavior** | 🟡 MEDIUM | Document and standardize by relationship type |

**Overall Risk**: 🔴 HIGH - Schema changes, security hardening, data migrations

---

## 📋 Stacked Execution Prompts

### How to Use

Copy each prompt below into a **new Kiro session**. Wait for completion before starting the next prompt. The prompts are designed to be executed sequentially with the output of each feeding into the next.

---

## PROMPT 1: Data Completeness Fix

```
# SPEC EXECUTION: Data Completeness Fix

Execute all tasks from:
#File .kiro/specs/data-completeness-fix/tasks.md

## RED-HAT MITIGATIONS (Apply These First)

Before starting, verify these preconditions:

1. **Check products table has data**:
   ```sql
   SELECT COUNT(*) FROM products;
   ```
   If 0, skip order item metadata enrichment (tasks 1.1, 1.2)

2. **Check vendors table has data**:
   ```sql
   SELECT COUNT(*) FROM vendors;
   ```
   If 0, skip vendor bills seeder (task 7) and purchase orders seeder (task 8)

3. **Check user ID 1 exists**:
   ```sql
   SELECT id FROM users WHERE id = 1;
   ```
   If not exists, create system user or use different ID for createdBy

4. **Verify bill status enum values** in schema before creating bills:
   - Check `drizzle/schema.ts` for bills table status enum
   - Use exact enum values: DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE

## EXECUTION RULES

1. Execute tasks in order (1 → 13)
2. Run `pnpm test` after tasks 3, 6, 9, and 13
3. Run `pnpm typecheck` after each major task
4. Commit after each numbered task group with message: `feat(seed): [description]`
5. Skip "Checkpoint" tasks - just verify tests pass
6. If a test fails, fix it before continuing
7. If a seeder fails due to missing dependencies, log warning and continue

## TASK-SPECIFIC CORRECTIONS

### Task 1.1 (Order Items Metadata)
- Query products table FIRST to check if data exists
- If products empty, log warning and skip metadata enrichment
- Use LEFT JOIN to strains table (products may not have strainId)
- Handle null strainId gracefully (set strain to null, not "Unknown")

### Task 4.1 (Batch Status Distribution)
- Verify these status values exist in schema enum: LIVE, SOLD_OUT, AWAITING_INTAKE, ON_HOLD, QUARANTINED, CLOSED
- If enum values differ, use actual schema values

### Task 7.1 (Vendor Bills Seeder)
- Check lots table has data before linking bills to lots
- If no lots, create bills without lot references
- Verify billLineItems table exists and has correct columns

### Task 8.1 (Purchase Orders Seeder)
- Verify purchaseOrders and purchaseOrderItems tables exist
- Check column names match schema (may be camelCase or snake_case)

### Task 10.1 (Reserved Quantity)
- ALWAYS ensure reservedQty <= onHandQty
- Use: `Math.min(calculatedReserved, onHandQty)`

## SUCCESS CRITERIA

- [ ] All property tests pass
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] New seeders registered in index.ts
- [ ] --complete flag works

When complete, provide a brief summary of:
1. Tasks completed
2. Any tasks skipped and why
3. Any issues encountered
```

---

## PROMPT 2: Orphan Feature Linkage Cleanup

```
# SPEC EXECUTION: Orphan Feature Linkage Cleanup

Execute all tasks from:
#File .kiro/specs/orphan-feature-linkage-cleanup/tasks.md

## PREREQUISITE

Spec 1 (Data Completeness Fix) must be complete before starting this spec.

## RED-HAT MITIGATIONS (Apply These First)

Before starting, verify these preconditions:

1. **Verify Quotes.tsx exists and has tRPC calls**:
   - Check `client/src/pages/Quotes.tsx` exists
   - Verify it uses `trpc.orders.getAll` or similar with orderType filter
   - If Quotes.tsx is broken, fix it before routing

2. **Verify orders router supports QUOTE filtering**:
   - Check `server/routers/orders.ts` getAll endpoint
   - Verify it accepts `orderType: 'QUOTE'` filter
   - If not supported, add filter support first

3. **Locate navigation component**:
   - Search for sidebar/nav in `client/src/components/layout/`
   - Identify where Sales-related nav items are defined
   - Note the exact file path for task 2.1

4. **Verify cron module exists**:
   - Check `server/cron/priceAlertsCron.ts` exists
   - Verify it exports `startPriceAlertsCron` function
   - Check the cron schedule string (should be `'0 * * * *'`)

5. **Compare DebugOrders.tsx vs OrdersDebug.tsx**:
   - Read both files
   - Document unique functionality in each
   - Decide: delete DebugOrders.tsx OR consolidate

## EXECUTION RULES

1. Execute Phase 1 tasks first (1-5), then Phase 2 (6-11)
2. Run `pnpm test` after tasks 3, 5, 8, and 11
3. Run `pnpm typecheck` after each major task
4. Commit after each numbered task group with message: `fix(ui): [description]` or `chore: [description]`
5. Skip "Checkpoint" tasks - just verify tests pass
6. If a test fails, fix it before continuing

## TASK-SPECIFIC CORRECTIONS

### Task 1.2 (Search Router URL Fix)
- Use `/quotes?selected=${q.id}` format (not `/quotes?id=`)
- Ensure URL encoding for special characters in IDs

### Task 1.4 (Add /quotes Route)
- Import Quotes component: `import Quotes from "@/pages/Quotes";`
- Add route AFTER /orders route to avoid conflicts
- Use exact path: `<Route path="/quotes" component={Quotes} />`

### Task 1.5 (URL Selection Parameter)
- Use `useSearchParams` or `useLocation` to read `selected` param
- Use `useEffect` to trigger quote selection when param changes
- Handle case where quote ID doesn't exist (show error toast)

### Task 2.1 (Navigation Entry)
- File is likely `client/src/components/layout/AppSidebar.tsx`
- Add `FileText` to lucide-react imports
- Add entry: `{ name: "Quotes", href: "/quotes", icon: FileText }`
- Place AFTER Orders entry in navigation array

### Task 4.1 (Cron Migration)
- Import: `import { startPriceAlertsCron } from "../cron/priceAlertsCron.js";`
- Call INSIDE `server.listen()` callback, not at top level
- Wrap in try-catch:
  ```typescript
  try {
    startPriceAlertsCron();
    logger.info("✅ Price alerts cron job started");
  } catch (error) {
    logger.error({ msg: "Failed to start price alerts cron", error });
    // Server continues - cron is non-critical
  }
  ```

### Task 6.1 (Deprecation Notice)
- Add JSDoc comment at TOP of server/index.ts
- Include: @deprecated tag, reason, alternative, what NOT to use it for

### Task 7.2 (DebugOrders.tsx Evaluation)
- If DebugOrders.tsx has NO unique functionality → DELETE it
- If it has unique functionality → CONSOLIDATE into OrdersDebug.tsx
- OrdersDebug.tsx is the more complete version (has database info, isDraftType checks)

### Task 9.1 (Namespace Audit)
- Create `docs/audits/SERVER_NAMESPACE_AUDIT.md`
- List ALL server namespaces from `server/routers/index.ts`
- For each, check if referenced in `client/src/` using grepSearch
- Categorize as: admin-only, ops-only, background job, or dead code

## SUCCESS CRITERIA

- [ ] /quotes route works and displays quotes
- [ ] Search results for quotes navigate correctly
- [ ] Quotes appears in navigation sidebar
- [ ] Price alerts cron runs on server startup
- [ ] server/index.ts has deprecation notice
- [ ] DebugOrders.tsx removed or consolidated
- [ ] Namespace audit report created
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes

When complete, provide a brief summary of:
1. Tasks completed
2. Any tasks skipped and why
3. Any issues encountered
```

---

## PROMPT 3: Canonical Model Unification - Phase 0-1 (Audit & Auth Hardening)

```
# SPEC EXECUTION: Canonical Model Unification - Phase 0-1

Execute tasks 1-8 from:
#File .kiro/specs/canonical-model-unification/tasks.md

## PREREQUISITE

Specs 1 and 2 must be complete before starting this spec.

## ⚠️ CRITICAL: This spec involves security-critical changes. Execute carefully.

## RED-HAT MITIGATIONS (Apply These First)

### PHASE 0: Data Audit (MANDATORY)

Before ANY schema changes, run these queries:

1. **Orphan Detection - customerId**:
   ```sql
   SELECT 'invoices' as tbl, COUNT(*) as orphans 
   FROM invoices WHERE customerId NOT IN (SELECT id FROM clients)
   UNION ALL
   SELECT 'sales', COUNT(*) FROM sales 
   WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients)
   UNION ALL
   SELECT 'payments', COUNT(*) FROM payments 
   WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients);
   ```
   **If orphans > 0**: Document them, create resolution plan BEFORE adding FK constraints

2. **Vendor-Client Collision Detection**:
   ```sql
   SELECT v.id as vendor_id, v.name as vendor_name, 
          c.id as client_id, c.name as client_name
   FROM vendors v
   INNER JOIN clients c ON LOWER(TRIM(v.name)) = LOWER(TRIM(c.name));
   ```
   **If collisions > 0**: Create manual review queue, decide merge vs rename

3. **Schema Drift Detection**:
   - Run `scripts/utils/schema-introspection.ts` if it exists
   - Compare Drizzle schema to actual database
   - Document ALL mismatches

### PHASE 1: Auth Hardening (CRITICAL SECURITY)

4. **Verify protectedProcedure fallback**:
   - Read `server/_core/trpc.ts`
   - Check if `requireUser` middleware has fallback to public user
   - If `ctx.user.id === -1` is possible, this is a security issue

5. **Count fallback patterns**:
   ```bash
   grep -r "ctx.user?.id || 1" server/routers/ | wc -l
   ```
   Expected: ~50 occurrences across 11 files

## EXECUTION RULES

1. Execute Phase 0 tasks (1-3) FIRST - these are read-only audits
2. Execute Phase 1 tasks (4-8) SECOND - these are security fixes
3. Run `pnpm test` after tasks 3 and 8
4. Run `pnpm typecheck` after each major task
5. Commit after each phase with message: `security: [description]`
6. **STOP after task 8** and report status before continuing

## TASK-SPECIFIC CORRECTIONS

### Task 1.1 (Orphan Detection Script)
- Create `scripts/audit/detect-orphans.ts`
- Output CSV report to `docs/audits/orphan-records.csv`
- Include: table, column, orphan_value, count

### Task 1.3 (Schema Drift Detection)
- Use existing `scripts/utils/schema-introspection.ts` if available
- Compare ALL 110 tables, not just critical ones
- Output JSON report to `docs/audits/schema-drift.json`

### Task 4.1 (strictlyProtectedProcedure)
- Create NEW middleware, don't modify existing protectedProcedure
- Reject requests where `ctx.user.id === -1`
- Throw UNAUTHORIZED error with clear message
- Keep existing protectedProcedure for backward compatibility

### Task 4.2 (Update protectedProcedure for mutations)
- Add check in requireUser middleware for mutations only
- Allow public user for read operations (queries)
- Reject public user for write operations (mutations)

### Task 5.1-5.4 (Remove fallback patterns)
- Replace `ctx.user?.id || 1` with strict auth check
- Pattern:
  ```typescript
  if (!ctx.user?.id || ctx.user.id === -1) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  const userId = ctx.user.id;
  ```
- Do NOT use fallback to 1 - this is a security vulnerability

### Task 6.1 (Convert salesSheetEnhancements.deactivateExpired)
- Change from `publicProcedure.mutation` to `protectedProcedure.mutation`
- Add RBAC permission check if applicable
- Consider: should this be a cron job instead of API endpoint?

### Task 7.1 (Remove createdBy from input)
- In `server/routers/refunds.ts`, remove `createdBy` from input schema
- Derive from context: `createdBy: ctx.user.id`
- Search for other routers with actor fields in input

## SUCCESS CRITERIA

- [ ] Orphan detection script created and run
- [ ] Collision detection script created and run
- [ ] Schema drift report generated
- [ ] strictlyProtectedProcedure middleware created
- [ ] All 50+ fallback patterns removed
- [ ] salesSheetEnhancements.deactivateExpired secured
- [ ] createdBy removed from input schemas
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes

**⚠️ STOP HERE AND REPORT STATUS**

When complete, provide:
1. Orphan record counts by table
2. Collision count and resolution plan
3. Schema drift summary
4. Number of fallback patterns fixed
5. Any issues encountered

**Do NOT proceed to Phase 2 until user confirms.**
```

---

## PROMPT 4: Canonical Model Unification - Phase 2-3 (Schema & Migration)

```
# SPEC EXECUTION: Canonical Model Unification - Phase 2-3

Execute tasks 9-17 from:
#File .kiro/specs/canonical-model-unification/tasks.md

## PREREQUISITE

Phase 0-1 (tasks 1-8) must be complete. User must confirm:
- [ ] Orphan records resolved or documented
- [ ] Collision resolution plan approved
- [ ] Auth hardening verified

## ⚠️ CRITICAL: This phase involves schema changes and data migrations.

## RED-HAT MITIGATIONS (Apply These First)

### Before Schema Changes

1. **Verify orphan resolution**:
   - All orphaned customerId values must be resolved
   - Either: delete orphans, reassign to placeholder client, or create missing clients

2. **Verify collision resolution**:
   - All vendor-client collisions must have resolution plan
   - Either: merge (same entity) or rename (different entity)

3. **Create database backup**:
   - Ensure backup exists before any migration
   - Document backup location and timestamp

### Before Migration

4. **Test on staging first**:
   - If staging environment exists, run migration there first
   - Verify application functionality after migration

## EXECUTION RULES

1. Execute Phase 2 tasks (9-13) FIRST - schema foundation
2. Execute Phase 3 tasks (14-17) SECOND - vendor migration
3. Run `pnpm db:generate` after any schema changes
4. Run `pnpm test` after tasks 13 and 17
5. Run `pnpm typecheck` after each major task
6. Commit after each phase with message: `db: [description]`
7. **STOP after task 17** and report status before continuing

## TASK-SPECIFIC CORRECTIONS

### Task 9.1 (supplierProfiles Table)
- Create table with these columns:
  - id (primary key)
  - clientId (FK to clients.id, unique)
  - contactName, contactEmail, contactPhone
  - paymentTerms, supplierNotes
  - legacyVendorId (for migration tracking)
  - createdAt, updatedAt
- Add indexes on clientId and legacyVendorId

### Task 10.1-10.5 (Add FK Constraints)
- **CRITICAL**: Only add FK if orphan records are resolved
- Add constraints in this order:
  1. invoices.customerId → clients.id
  2. invoices.createdBy → users.id
  3. invoiceLineItems columns
  4. sales.customerId → clients.id
  5. sales.createdBy → users.id
- Use `onDelete: 'restrict'` for most FKs
- Use `onDelete: 'cascade'` only for child records (line items)

### Task 11.1-11.5 (Payments/Bills FKs)
- payments.vendorId should reference clients.id (as supplier)
- Document this clearly in schema comments
- Add comment: `// References clients.id for supplier (not vendors.id)`

### Task 12.1 (Add Indexes)
- Add index for EVERY new FK column
- Naming convention: `idx_{table}_{column}`
- Example: `idx_invoices_customer_id`

### Task 14.1 (VendorMappingService)
- Create `server/services/vendorMappingService.ts`
- Implement interface:
  - getClientIdForVendor(vendorId): Promise<number | null>
  - getSupplierByLegacyVendorId(vendorId): Promise<SupplierProfile | null>
  - migrateVendorToClient(vendorId): Promise<Client>
  - isVendorMigrated(vendorId): Promise<boolean>

### Task 14.2 (Migration Script)
- Create `scripts/migrate-vendors-to-clients.ts`
- For each vendor:
  1. Check for collision with existing client
  2. If collision: merge or rename based on resolution plan
  3. Create client with isSeller=true
  4. Generate unique teriCode (use vendor ID as suffix)
  5. Create supplierProfile with vendor fields
  6. Store legacyVendorId mapping
- Add dry-run mode: `--dry-run` flag
- Add production confirmation: require `--confirm-production` for prod

### Task 15.1-15.3 (Execute Migration)
- Run on staging FIRST
- Verify all vendors migrated
- Verify supplier profiles created
- Verify legacy mapping populated
- Run orphan detection again to verify no new orphans
- Only run on production with explicit confirmation

### Task 16.1-16.4 (Update FK References)
- Add supplierClientId column alongside vendorId
- Backfill from vendor mapping
- Update application code to use new column
- Keep vendorId for backward compatibility during transition

## SUCCESS CRITERIA

- [ ] supplierProfiles table created
- [ ] All FK constraints added (no orphan errors)
- [ ] All FK indexes added
- [ ] VendorMappingService implemented
- [ ] Migration script created with dry-run mode
- [ ] Migration tested on staging (if available)
- [ ] Migration run on production (with confirmation)
- [ ] FK references updated to use clients.id
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm db:generate` produces no new migrations

**⚠️ STOP HERE AND REPORT STATUS**

When complete, provide:
1. Number of vendors migrated
2. Number of collisions resolved
3. Any migration errors
4. FK constraint status
5. Any issues encountered

**Do NOT proceed to Phase 4 until user confirms.**
```

---

## PROMPT 5: Canonical Model Unification - Phase 4-7 (Normalization & Docs)

```
# SPEC EXECUTION: Canonical Model Unification - Phase 4-7

Execute tasks 18-28 from:
#File .kiro/specs/canonical-model-unification/tasks.md

## PREREQUISITE

Phase 2-3 (tasks 9-17) must be complete. User must confirm:
- [ ] Vendor migration successful
- [ ] FK constraints added without errors
- [ ] Application still functional

## EXECUTION RULES

1. Execute Phase 4 tasks (18-20) - column normalization
2. Execute Phase 5 tasks (21-22) - VIP portal security
3. Execute Phase 6 tasks (23-24) - schema drift prevention
4. Execute Phase 7 tasks (25-28) - documentation
5. Run `pnpm test` after tasks 20, 22, 24, and 28
6. Run `pnpm typecheck` after each major task
7. Commit after each phase with message: `refactor: [description]` or `docs: [description]`

## TASK-SPECIFIC CORRECTIONS

### Task 18.1 (Add clientId Alias)
- Add clientId column to invoices, sales, payments
- Create trigger to sync customerId ↔ clientId
- Both columns should have same value during transition
- Example trigger:
  ```sql
  CREATE TRIGGER sync_client_id BEFORE INSERT ON invoices
  FOR EACH ROW SET NEW.clientId = NEW.customerId;
  ```

### Task 18.2 (Update Application Code)
- Search for all `customerId` usage in:
  - server/routers/
  - server/services/
  - client/src/
- Replace with `clientId`
- Update tRPC input/output schemas

### Task 18.4 (Remove customerId)
- **ONLY after verifying no code uses customerId**
- Drop trigger first
- Then drop column
- This is a breaking change - ensure all code updated

### Task 19.1 (Document vendorId Pattern)
- Add schema comments for vendorId columns
- Document which reference clients.id vs vendors.id
- Example:
  ```typescript
  vendorId: int("vendor_id")
    .references(() => clients.id) // References clients.id for supplier
    // NOTE: Named vendorId for historical reasons, but references clients table
  ```

### Task 21.1 (vipPortalProcedure)
- Create in `server/_core/trpc.ts`
- Verify session token from header: `x-vip-session-token`
- Resolve to clientId
- Set actorId for audit: `vip:${clientId}`
- Throw UNAUTHORIZED if session invalid or expired

### Task 21.2 (Update VIP Portal Routers)
- Search for VIP portal routers in `server/routers/`
- Convert mutations to use vipPortalProcedure
- Keep queries as publicProcedure if appropriate

### Task 23.1 (CI Schema Validation)
- Create `.github/workflows/schema-validation.yml`
- Run schema drift detection on PR
- Block merge if drift detected
- Example:
  ```yaml
  - name: Check Schema Drift
    run: pnpm schema:validate
  ```

### Task 24.1 (Naming Convention Standard)
- Document in `docs/protocols/NAMING_CONVENTIONS.md`
- Database columns: snake_case
- TypeScript properties: camelCase
- Drizzle handles conversion automatically

### Task 25.1 (Canonical Dictionary)
- Create `docs/protocols/CANONICAL_DICTIONARY.md`
- Include:
  - Term definitions (Counterparty, Customer, Supplier, etc.)
  - Table mappings
  - ID field rules
  - Write authorization rules
- Use content from design.md as starting point

### Task 26.1 (Deprecate vendors Table)
- Add deprecation comment in schema
- Add console warning on vendor queries:
  ```typescript
  console.warn('DEPRECATED: vendors table is deprecated. Use clients with isSeller=true');
  ```
- Do NOT delete table yet

### Task 27.1-27.3 (Final Validation)
- Run full data integrity check
- Run security audit (no public mutations, no fallback patterns)
- Generate validation report

## SUCCESS CRITERIA

- [ ] customerId renamed to clientId (with transition period)
- [ ] vendorId columns documented
- [ ] vipPortalProcedure middleware created
- [ ] VIP portal routers secured
- [ ] CI schema validation workflow created
- [ ] Naming convention documented
- [ ] Canonical dictionary created
- [ ] vendors table deprecated (not deleted)
- [ ] Final validation report generated
- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes

When complete, provide:
1. Summary of all changes across all phases
2. Final validation report
3. Any remaining issues or technical debt
4. Recommendations for future work
```

---

## 📊 Execution Summary

| Prompt | Spec | Tasks | Est. Time | Risk |
|--------|------|-------|-----------|------|
| 1 | Data Completeness Fix | 1-13 | 2-3 hours | 🟢 Low |
| 2 | Orphan Feature Linkage | 1-11 | 2 hours | 🟢 Low |
| 3 | Canonical Model (Phase 0-1) | 1-8 | 2 hours | 🔴 High |
| 4 | Canonical Model (Phase 2-3) | 9-17 | 2-3 hours | 🔴 High |
| 5 | Canonical Model (Phase 4-7) | 18-28 | 2-3 hours | 🟡 Medium |

**Total Estimated Time**: 10-13 hours

---

## 🛑 Checkpoint Protocol

After each prompt completes:

1. **Review the summary** provided by the agent
2. **Verify tests pass**: `pnpm test && pnpm typecheck`
3. **Check deployment** (if applicable): `./scripts/watch-deploy.sh`
4. **Confirm before next prompt**: Only proceed if previous prompt succeeded

If any prompt fails:
- Do NOT proceed to next prompt
- Fix issues in current prompt first
- Re-run failed tasks if needed

---

## 🔄 Rollback Procedures

### Spec 1 Rollback (Data Completeness)
```bash
# Revert seeder changes
git revert <commit-hash>
# Re-run seed with original seeders
pnpm seed:new --clean
```

### Spec 2 Rollback (Orphan Linkage)
```bash
# Revert UI changes
git revert <commit-hash>
# Remove /quotes route and nav entry
```

### Spec 3 Rollback (Canonical Model)
```bash
# Phase 1: Revert auth changes
git revert <auth-commits>

# Phase 2-3: Revert schema changes
# Run rollback migration
pnpm db:rollback

# Phase 4: Rename columns back
# Run column rename migration
```

---

**This execution plan is designed for maximum safety and traceability. Follow the prompts in order, verify at each checkpoint, and do not skip the red-hat mitigations.**
