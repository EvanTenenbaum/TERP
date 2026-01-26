# Deep Systemic Analysis: Why TERP Bugs Keep Happening

**Analysis Date:** 2026-01-26
**Analyst:** Claude (Opus 4.5)
**Scope:** Codebase archaeology, workflow analysis, protocol compliance audit
**Branch:** `claude/analyze-qa-bug-patterns-rBBoh`

---

## Executive Summary

After analyzing 97 bug fixes, 41 skipped tests, protocol documents, and commit history, this report identifies **seven systemic failures** that enable bugs to persist despite extensive documentation and verification protocols.

The core finding: **TERP has excellent written protocols but weak enforcement mechanisms**. The gap between documented best practices and actual behavior is where bugs thrive.

---

## Part 1: The Illusion of Success

### The "99.6% Pass" Paradox

The sprint release report (`docs/sprint-reports/2026-01-25-release.md`) declared:

```
Status: SUCCESS
Unit Tests: ✅ 99.6% (2273 passed, 9 failed)
```

Yet within 24 hours of this "SUCCESS" report:
- 1 CRITICAL security vulnerability discovered (SQL injection)
- 1 emergency schema fix required (POST-001)
- 4 frontend QA bugs logged (BUG-103 to BUG-106)
- 7+ backend bugs documented (BUG-501 to BUG-513)
- 12 seeder defects logged (SEED-001 to SEED-012)

**The Definition of Done explicitly states:**
> "A task is NOT complete until ALL pass: ... ✅ `pnpm test` - All tests pass"

But 9 failing tests was acceptable for "SUCCESS".

### Why This Matters

1. **Metric gaming:** 99.6% sounds good, but 9 failures = 9 known issues deployed
2. **Normalization of deviance:** Each "acceptable" failure makes the next easier to accept
3. **False confidence:** "SUCCESS" status prevents deeper investigation
4. **Post-release burden:** "Success" pushes problems downstream to production

### The Post-Release Bug Wave

Commits after the "SUCCESS" release:

```
54f43d1 fix(schema): Align mysqlEnum names with column names
159e2be fix(security): CRITICAL - Prevent SQL injection via lockTimeout
dc3396b fix: comprehensive bug fixes from Sprint Team C deep QA
86d9bee fix(reliability): Deep QA fixes - validation, race conditions
fd26aa0 fix: resolve P0 blockers from Sprint Team C QA audit
da6ce5c fix: additional P0/P1 fixes from deep QA audit
fe0986d fix(seed): Comprehensive fixes for all seeder QA defects
371ed93 fix: comprehensive fixes for P0/P1 issues from QA audit
```

**30+ bug fix commits after "SUCCESS"** - This is not success. This is a pattern of declaring victory prematurely.

---

## Part 2: The Feedback Loop Gap

### Protocol Documents Don't Learn

The POST-001 bug was a perfect learning opportunity:

**The Bug:**
```typescript
// WRONG - caused "Unknown column" errors
export const unitTypeCategoryEnum = mysqlEnum("unitTypeCategory", [...]);

// CORRECT - column name must match database
export const unitTypeCategoryEnum = mysqlEnum("category", [...]);
```

**The Fix Commit:**
```
54f43d1 fix(schema): Align mysqlEnum names with column names to prevent seeding errors
```

**What Should Have Happened:**
- CLAUDE.md updated with mysqlEnum naming rule
- New agents prevented from making same mistake

**What Actually Happened:**
```bash
$ grep -i "mysqlEnum" CLAUDE.md
# (no results)
```

The lesson was learned by ONE agent but not propagated to the system.

### The Documentation vs. Reality Gap

| Protocol Says | Reality Shows |
|--------------|---------------|
| "NEVER use the `vendors` table" | 38 active uses of `vendors.` in server code |
| "NEVER use fallback user IDs" | 10 instances of `createdBy: input.createdBy` |
| "All tests must pass" | 9 failures acceptable for "SUCCESS" |
| "Soft deletes only" | `db.delete(vendors)` in production code |
| "Use getAuthenticatedUserId(ctx)" | Pattern used 269 times, but old pattern still exists |

### Why Documentation Doesn't Fix Behavior

1. **No enforcement:** CLAUDE.md is advisory, not enforced
2. **Search vs. read:** Agents don't re-read protocols before every task
3. **Pattern matching:** Agents copy existing code, good and bad
4. **Recency bias:** New code patterns don't override old memories
5. **Update lag:** Lessons learned don't propagate back to docs

---

## Part 3: The Skipped Test Debt

### 41 Skipped Tests = 41 Known Unknowns

```bash
$ grep -r "skip(" --include="*.test.ts*" /home/user/TERP | wc -l
41
```

These aren't forgotten tests. They're documented bugs:

```typescript
it.skip("[BUG PROP-BUG-001] calculateAvailableQty returns NaN for adversarial inputs", () => {
it.skip("[BUG PROP-BUG-002] Result has no leading/trailing whitespace", () => {
it.skip("[BUG PROP-BUG-003] Is idempotent", () => {
describe.skip("requirePermission (TEST-020: mock hoisting issue)", () => {
```

### The Skipped Test Economy

Skipped tests become:
1. **Accepted debt:** "We know about this, we'll fix it later"
2. **Invisible problems:** CI passes, nobody sees the `skip`
3. **Permission to ship:** "Tests pass" (because broken ones are skipped)
4. **Forgotten bugs:** The BUG-XXX references may never be fixed

### Skipped Test Categories

| Category | Count | Impact |
|----------|-------|--------|
| RBAC/Permissions | 12 | Security testing gaps |
| Property tests (BUG-*) | 4 | Known calculation bugs |
| Database-required | 8 | Missing integration coverage |
| Mock infrastructure | 5 | Tests can't run properly |
| Calendar/financials | 9 | Business logic untested |
| Other | 3 | Various gaps |

---

## Part 4: The Schema Naming Trap

### Inconsistency Breeds Bugs

The same schema file (`drizzle/schema.ts`) uses both patterns:

**camelCase (wrong for column references):**
```typescript
export const batchStatusEnum = mysqlEnum("batchStatus", [...]);
export const paymentTermsEnum = mysqlEnum("paymentTerms", [...]);
export const creditLimitSourceEnum = mysqlEnum("creditLimitSource", [...]);
```

**snake_case (correct):**
```typescript
mysqlEnum("ownership_type", [...])
mysqlEnum("preferred_payment_method", [...])
mysqlEnum("transaction_type", [...])
```

### The Cognitive Trap

An agent sees both patterns and concludes:
> "Both conventions work, so I'll use whichever matches my TypeScript variable name"

But Drizzle ORM has a hidden contract:
> The first argument to `mysqlEnum()` must match the **database column name**, not the TypeScript property name.

### Why This Keeps Happening

1. **Mixed patterns:** Codebase teaches both good and bad
2. **No linter rule:** ESLint doesn't validate mysqlEnum arguments
3. **Late failure:** Error appears at runtime, not compile time
4. **Error message opacity:** "Unknown column" doesn't explain WHY
5. **IDE betrayal:** Autocomplete shows TypeScript names, not DB columns

---

## Part 5: The Deprecated Systems Problem

### 38 Active Uses of Deprecated `vendors` Table

CLAUDE.md explicitly states:
> "**Never use the `vendors` table** - Use `clients` with `isSeller=true`"

Yet a search reveals 38 active uses:

```typescript
// server/inventoryDb.ts
.leftJoin(vendors, eq(lots.vendorId, vendors.id))

// server/services/vendorMappingService.ts
const vendor = await db.query.vendors.findFirst({

// server/routers/vendors.ts (still exists!)
console.warn('[DEPRECATED] vendors.getAll - use clients.list...');
```

### Why Deprecated Systems Persist

1. **Working code:** Existing code uses vendors; it works; don't touch it
2. **Migration incomplete:** Party model migration started but not finished
3. **Pattern propagation:** New code copies old patterns
4. **No breaking change:** Deprecated doesn't mean removed
5. **Inconsistent enforcement:** Some files updated, others not

### The vendors.ts Router Paradox

The router still exists and is actively used:
```typescript
// server/routers/vendors.ts
console.warn('[DEPRECATED] vendors.getAll...');
// But the endpoint still works and returns data
```

Deprecation warnings don't prevent usage - they just log complaints.

---

## Part 6: Security Pattern Inconsistency

### Two Coexisting Patterns

**Correct Pattern (269 uses):**
```typescript
import { getAuthenticatedUserId } from "../_core/trpc";
const userId = getAuthenticatedUserId(ctx);
```

**Incorrect Pattern (10 uses still in code):**
```typescript
createdBy: input.createdBy,  // Trusts client-provided value
createdBy: input.userId,     // Trusts client-provided value
```

### The Security Split

| File | Pattern | Risk |
|------|---------|------|
| `server/inventoryIntakeService.ts:282` | `input.userId` | Actor spoofing |
| `server/inventoryDb.ts:1607` | `input.createdBy` | Audit trail manipulation |
| `server/ordersDb.ts:273,333,372,380` | `input.createdBy` | Order attribution fraud |
| `server/services/payablesService.ts:130` | `input.createdBy` | Payment manipulation |

### Why The Bad Pattern Persists

1. **Legacy code:** These are older files not yet updated
2. **Works in tests:** Tests provide valid input, masking the vulnerability
3. **No linter rule:** ESLint doesn't flag `input.createdBy`
4. **Gradual migration:** 269 correct uses, but 10 remain
5. **No audit:** No systematic scan for security patterns

---

## Part 7: The Verification Theater

### What CLAUDE.md Prescribes

```markdown
### Definition of Done (8 Criteria)

A task is NOT complete until ALL pass:

1. ✅ `pnpm check` - No TypeScript errors
2. ✅ `pnpm lint` - No linting errors
3. ✅ `pnpm test` - All tests pass
4. ✅ `pnpm build` - Build succeeds
5. ✅ `pnpm roadmap:validate` - Roadmap valid (if modified)
6. ✅ E2E tests pass (if applicable)
7. ✅ Deployment verified (if pushed to main)
8. ✅ No new errors in production logs
```

### What Actually Gets Verified

Based on commit messages and reports:

| Criterion | Actually Verified? | Evidence |
|-----------|-------------------|----------|
| TypeScript | ✅ Yes | Build fails otherwise |
| Lint | ⚠️ Sometimes | Lint warnings often ignored |
| Tests | ⚠️ 99.6% acceptable | 9 failures = SUCCESS |
| Build | ✅ Yes | Deploy fails otherwise |
| Roadmap | ⚠️ Sometimes | Validation not always run |
| E2E tests | ❌ Rarely | Not in CI for every PR |
| Deployment | ⚠️ Cursory | Health check ≠ functional test |
| Production logs | ❌ Rarely | No systematic log review |

### Why Verification Becomes Theater

1. **Automation gaps:** Some checks aren't automated in CI
2. **Time pressure:** Agents want to complete tasks
3. **Subjective thresholds:** "99.6% is close enough"
4. **Partial verification:** Check 3 of 8, call it done
5. **Trust in green:** If CI passes, ship it

---

## Part 8: The Root Cause Synthesis

All seven systemic failures share common characteristics:

### Pattern 1: Written Rules Without Enforcement

| Rule | Enforcement Mechanism |
|------|----------------------|
| Don't use vendors table | None (just documentation) |
| Use getAuthenticatedUserId | None (just documentation) |
| All tests must pass | Ignored when inconvenient |
| mysqlEnum naming | None (discovered at runtime) |
| Soft deletes only | None (hard delete compiles) |

**Insight:** Documentation is not enforcement. Rules need tooling.

### Pattern 2: Gradual Migration Stalls

| Migration | Started | Completed |
|-----------|---------|-----------|
| vendors → clients | Yes | No (38 uses remain) |
| input.createdBy → ctx | Yes | No (10 uses remain) |
| camelCase → snake_case enums | Partially | No (mixed patterns) |
| Skipped tests → Fixed tests | No | 41 tests remain skipped |

**Insight:** Incomplete migrations create dangerous inconsistency.

### Pattern 3: Metrics Over Outcomes

| Metric | Optimized? | Outcome Optimized? |
|--------|------------|-------------------|
| Test pass rate (99.6%) | Yes | No (9 known failures shipped) |
| "SUCCESS" status | Yes | No (30+ fixes after) |
| Code coverage | Yes | No (skipped tests don't count) |
| PR merge speed | Yes | No (bugs discovered later) |

**Insight:** Metrics become goals, outcomes become secondary.

### Pattern 4: Pattern Propagation Over Protocol

When agents write code, they:
1. Search for similar code in the codebase
2. Copy and modify the pattern they find
3. NOT re-read CLAUDE.md for every operation

If the codebase contains bad patterns, bad patterns propagate.

**Insight:** The codebase teaches more than documentation does.

### Pattern 5: Local Optimization Over Global Consistency

| Team | Local Goal | Global Impact |
|------|------------|---------------|
| Team D | Finish schema | Schema bugs cascade to all teams |
| Team B | Add nav links | 404 pages for unimplemented routes |
| Team C | Secure mutations | Frontend still calls insecure endpoints |

**Insight:** Parallel work without integration creates inconsistency.

---

## Part 9: The Bug Lifecycle

A typical TERP bug follows this lifecycle:

```
1. BAD PATTERN EXISTS IN CODEBASE
   ↓
2. Agent searches for similar code
   ↓
3. Agent copies bad pattern (looks correct)
   ↓
4. TypeScript compiles (types are correct)
   ↓
5. Tests pass (99.6% is acceptable)
   ↓
6. PR merged, release declared SUCCESS
   ↓
7. Production error or QA discovery
   ↓
8. Bug fix created (fixes this instance)
   ↓
9. Lesson NOT propagated to docs/tooling
   ↓
10. Return to step 1 (bad pattern still exists)
```

**The loop never closes.** Fixes are local, not systemic.

---

## Part 10: Concrete Remediation Plan

### Immediate (Within 24 Hours)

#### 1. Close the Feedback Loop

Create `scripts/post-bug-checklist.sh`:
```bash
#!/bin/bash
echo "Bug fixed. Before closing:"
echo "1. [ ] Search codebase for same pattern: grep -r 'PATTERN'"
echo "2. [ ] Update CLAUDE.md if new anti-pattern found"
echo "3. [ ] Add ESLint rule if catchable"
echo "4. [ ] Add test for regression"
echo "5. [ ] Create task to fix remaining instances"
```

#### 2. Update CLAUDE.md with mysqlEnum Rule

Add to Section 4 (Development Standards):
```markdown
### Drizzle Schema

- **mysqlEnum naming:** First argument must match database column name (usually snake_case), NOT the TypeScript variable name
  ```typescript
  // WRONG - uses TypeScript name
  export const unitTypeCategoryEnum = mysqlEnum("unitTypeCategory", [...]);

  // CORRECT - uses database column name
  export const unitTypeCategoryEnum = mysqlEnum("category", [...]);
  ```
- Run `pnpm seed:all-defaults` after any schema changes
```

#### 3. Remove Remaining Security Vulnerabilities

Fix these 10 instances of `input.createdBy`:
```
server/inventoryIntakeService.ts:282
server/inventoryDb.ts:1607
server/ordersDb.ts:273,333,372,380,1203
server/services/payablesService.ts:130
```

### Short-Term (Within 1 Week)

#### 4. Add ESLint Rules

Create `eslint-rules/no-input-actor.js`:
```javascript
// Ban input.createdBy, input.userId in mutations
// Force use of getAuthenticatedUserId(ctx)
```

Create `eslint-rules/no-fallback-user.js`:
```javascript
// Ban ctx.user?.id || CONSTANT patterns
```

#### 5. Enforce Test Pass Rate

Update CI to fail on ANY test failures:
```yaml
# .github/workflows/test.yml
- run: pnpm test
  env:
    CI_STRICT: true  # Fail on any test failure
```

#### 6. Complete Deprecated System Migration

Create task: "Remove all 38 vendors table uses"
- Estimate: 16h
- Priority: HIGH
- Impact: Removes bad pattern from codebase

#### 7. Fix or Delete Skipped Tests

For each of 41 skipped tests:
- If bug is fixed: unskip and verify
- If test is obsolete: delete
- If bug is real: create roadmap task
- Track: "41 → 0 skipped tests"

### Medium-Term (Within 1 Month)

#### 8. Schema Consistency Migration

Standardize all mysqlEnum first arguments to snake_case.

#### 9. Automated Pattern Detection

Create nightly job that searches for:
- `|| 1` fallback patterns
- `input.createdBy` usage
- `vendors.` table usage
- Other anti-patterns

Report violations to Slack/Discord.

#### 10. Integration Test Gates

Block parallel team merges until:
- Schema team's seeders pass
- API contracts match frontend expectations
- Cross-team integration tests pass

### Long-Term (Within 3 Months)

#### 11. Type-Safe User Context

Refactor to make bad patterns impossible:
```typescript
// Make ctx.user non-optional after auth middleware
type AuthenticatedContext = { user: { id: number; role: string } };

// Can't do ctx.user?.id || 1 because ctx.user is not optional
```

#### 12. Generated API Contracts

Frontend types generated from backend schemas:
- No assumption mismatches
- Build breaks on interface drift

#### 13. Continuous QA Per PR

Every PR gets:
- Full test suite (no skipped allowed)
- E2E smoke test
- Seeder verification
- Production build test

---

## Part 11: Success Metrics

Track these to know if remediation is working:

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Skipped tests | 41 | 0 | 30 days |
| vendors table uses | 38 | 0 | 14 days |
| input.createdBy uses | 10 | 0 | 7 days |
| Post-release bug fixes | 30+ | < 5 | Per release |
| Test pass rate for "SUCCESS" | 99.6% | 100% | Immediate |
| CLAUDE.md last updated | Unknown | Within 24h of any bug | Ongoing |

---

## Conclusion

TERP's bugs are not random. They emerge from systemic failures:

1. **Excellent documentation with no enforcement**
2. **Incomplete migrations creating inconsistent patterns**
3. **Metrics optimized over outcomes**
4. **Pattern propagation outweighing protocol**
5. **Local optimization over global consistency**
6. **Verification theater instead of real verification**
7. **Feedback loops that don't close**

The solution is not more documentation. The solution is:

1. **Enforce rules with tooling** (ESLint, CI gates)
2. **Complete migrations** (remove bad patterns entirely)
3. **Close feedback loops** (bugs → docs → tooling)
4. **Measure outcomes** (post-release bugs, not pass rate)
5. **Integrate continuously** (not in batches)

**The goal is to make wrong things hard and right things easy.**

Currently, wrong things are easy (bad patterns exist, compile, and ship) and right things are optional (documentation nobody re-reads).

Flip that, and bugs stop propagating.

---

*Analysis based on full codebase audit, commit history, and protocol compliance review.*
*Commit range: 4a1e4f2...9da49be + codebase grep analysis*
