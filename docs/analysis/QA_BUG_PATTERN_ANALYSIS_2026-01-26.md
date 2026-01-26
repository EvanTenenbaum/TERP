# Deep Analysis: QA Bug Patterns in TERP Development

**Analysis Date:** 2026-01-26
**Scope:** 97 bug fix commits (7 days), 35+ in last 48 hours
**Analyst:** Claude (Opus 4.5)
**Branch:** `claude/analyze-qa-bug-patterns-rBBoh`

---

## Part 1: Beyond Surface Patterns - Systemic Root Causes

The bug patterns in TERP are not random. They emerge from **structural gaps between how agents think and how the system actually works**. This analysis identifies the deeper "why" behind recurring bugs.

---

## The Five Fundamental Failure Modes

### Failure Mode 1: The Naming Convention Trap

**Surface Pattern:** 15% of bugs are schema/column name mismatches
**Deeper Analysis:**

The TERP codebase operates across three naming paradigms that don't align:

| Layer | Convention | Example |
|-------|------------|---------|
| TypeScript | camelCase | `unitTypeCategory` |
| MySQL Columns | snake_case | `unit_type_category` |
| Drizzle Enum First Arg | Column name | Must match DB column |

**Why Agents Fail:**
1. **IDE Betrayal:** TypeScript autocomplete shows camelCase property names, not DB column names
2. **Drizzle's Hidden Contract:** The first arg to `mysqlEnum("name", [...])` must be the **database column name**, not the TypeScript name - but this isn't obvious from reading the code
3. **Implicit Translation:** Drizzle automatically converts between camelCase (code) and snake_case (DB), creating an illusion of interchangeability
4. **Error Message Opacity:** When this fails, MySQL returns "Unknown column 'unitTypeCategory'" but doesn't explain why the code's property name doesn't work

**The POST-001 Example Dissected:**
```typescript
// What agent wrote (looks correct):
export const unitTypeCategoryEnum = mysqlEnum("unitTypeCategory", [...]);

// What Drizzle actually needs:
export const unitTypeCategoryEnum = mysqlEnum("category", [...]);

// The confusion: The VARIABLE is named unitTypeCategoryEnum
// The DATABASE COLUMN is named "category"
// The agent assumed the first arg should match the variable name
```

**Why This Keeps Happening:**
- No linter rule catches this
- TypeScript compilation succeeds
- The error only appears at runtime when hitting the database
- Agents copy existing enum patterns without checking if the convention was followed correctly

**Structural Solution Needed:**
A custom ESLint rule that validates `mysqlEnum` first arguments against actual column names in migration files.

---

### Failure Mode 2: The Feature Tunnel

**Surface Pattern:** 12% of bugs are missing routes/pages
**Deeper Analysis:**

Agents operate in a "feature tunnel" - they see the task ("add Reports to navigation") but not the complete implementation chain:

```
Task: "Add Reports link to Finance menu"
    ↓
Agent sees: Navigation config file
    ↓
Agent does: Adds nav item { label: "Reports", href: "/accounting/reports" }
    ↓
Agent assumes: The route exists (because there's a pattern)
    ↓
Reality: No route in router.tsx, no ReportsPage.tsx
```

**The Cognitive Error:** Agents conflate "adding a reference" with "implementing the feature"

**Why Agents Fail:**
1. **Task Scope Narrowing:** When given "add X to navigation," agents interpret this literally rather than holistically
2. **Pattern Matching Gone Wrong:** Agents see other nav items pointing to `/accounting/*` routes and assume consistency
3. **Verification Bias:** Clicking the link in dev mode often shows a generic 404 page, which agents may dismiss as "will be fixed later"
4. **Separation of Concerns Backfires:** The navigation config, route definitions, and page components are in separate files, making incomplete implementations easy

**The BUG-105/106 Pattern:**
```
Finance Menu exists → "/accounting/invoices" works
Agent sees: "/accounting/reports" in menu
Agent assumes: Similar pattern must exist
Reality: The menu item was added speculatively, the page was never created
```

**Why QA Catches This Late:**
- Dev build compiles successfully
- TypeScript doesn't validate route existence
- Navigation renders correctly (the link works, just 404s)
- Unit tests don't test full navigation flows

**Structural Solution Needed:**
A build-time validator that checks every `href` in navigation configs has a corresponding route and component.

---

### Failure Mode 3: The Security Convenience Trap

**Surface Pattern:** 10% of bugs are actor attribution failures
**Deeper Analysis:**

The `|| 1` fallback pattern is seductive because it:
1. Makes TypeScript happy (handles null case)
2. Makes development easier (no need for auth in local dev)
3. Follows a pattern visible elsewhere in the codebase

**The Psychological Trap:**
```typescript
// Agent sees this pattern in existing code
const userId = ctx.user?.id || 1;

// Agent thinks: "This handles the null case safely"
// Agent doesn't think: "This is a security vulnerability"
```

**Why Agents Fail:**
1. **Pattern Imitation:** Existing code teaches patterns, good and bad
2. **TypeScript's Misleading Safety:** `|| 1` satisfies the type system, creating false confidence
3. **Local Development Blindness:** In dev, `ctx.user` might always be populated, masking the issue
4. **Implicit Trust:** Agents trust that accepted values (`input.createdBy`) are safe because they came through the API

**The Deeper Problem:**
The codebase has **two authentication patterns** that look similar but have different security implications:

```typescript
// SAFE: Fails if user not authenticated
const userId = getAuthenticatedUserId(ctx);

// UNSAFE: Silent fallback to admin (id=1)
const userId = ctx.user?.id || 1;

// UNSAFE: Trusts client-provided value
const createdBy = input.createdBy;
```

The `getAuthenticatedUserId(ctx)` helper exists specifically to prevent this, but:
- It's not mandatory (no architectural enforcement)
- The unsafe pattern compiles and runs
- No linter catches `|| 1` specifically

**Why This Is Hard to Eradicate:**
- Agents are pattern-matching machines
- The unsafe pattern exists in multiple files
- Fixing it requires finding ALL instances, not just the one being worked on
- The fix might break local development (need proper auth setup)

**Structural Solution Needed:**
1. Remove ALL `|| 1` instances from codebase permanently
2. Add ESLint rule banning `ctx.user?.id ||`
3. Make `getAuthenticatedUserId(ctx)` the ONLY way to get user ID (factory method pattern)

---

### Failure Mode 4: The Concurrent Blindness

**Surface Pattern:** 8% of bugs are race conditions
**Deeper Analysis:**

JavaScript's async/await syntax creates a dangerous illusion:

```typescript
// This LOOKS sequential and safe:
const allocated = await getAllocated(batchId);
const returned = await getReturned(batchId);
if (returned > allocated) throw Error("Over-return");

// Reality: Between line 1 and line 2, another request could:
// - Increase allocations
// - Process a concurrent return
// - Invalidate the check entirely
```

**The Cognitive Gap:**
Agents think in **single-request terms**. Each request seems isolated. The mental model is:

```
Request A: Check → Validate → Execute
```

But in production with multiple instances:

```
Request A: Check    →    Validate    →    Execute
Request B:     Check    →    Validate    →    Execute
                         ^^^^^^^^^
                    Both pass validation!
                    Both execute the same operation!
```

**Why Agents Fail:**
1. **Sequential Code Thinking:** async/await looks like synchronous code, hiding concurrency
2. **Local Development Isolation:** Running one local server means no concurrent requests
3. **Test Isolation:** Unit tests run operations one at a time
4. **Missing Mental Model:** Most agents don't default to thinking about concurrent access

**The Specific Patterns That Fail:**
1. **Check-then-act:** `if (canDo()) { do(); }` - condition can become false between check and act
2. **Read-modify-write:** `x = getValue(); x++; setValue(x);` - another write can interleave
3. **Counter incrementing:** Rate limiting counters, sequence numbers, inventory counts

**Why This Is Architecturally Hard:**
- TERP runs on multiple instances (horizontal scaling)
- In-memory state (rate limit maps) doesn't sync across instances
- The `withTransaction()` wrapper exists but isn't mandatory
- `SELECT FOR UPDATE` is the solution but requires explicit knowledge

**The Fix Pattern That Works:**
```typescript
// ATOMIC: Single query does check and lock
const result = await db.execute(sql`
  SELECT onHandQty
  FROM batches
  WHERE id = ${batchId}
  FOR UPDATE
`);
// Now we have exclusive access to this row until transaction commits
```

**Structural Solution Needed:**
1. Make `criticalMutation()` wrapper mandatory for inventory/financial operations
2. Document which operations require transactions in route signatures
3. Add integration tests that explicitly test concurrent scenarios

---

### Failure Mode 5: The Precision Illusion

**Surface Pattern:** 7% of bugs are floating point errors
**Deeper Analysis:**

JavaScript's number type creates a precision illusion:

```typescript
// This looks fine:
const total = 19.99 * 3;  // Expect: 59.97
console.log(total);       // Actual: 59.97000000000001

// Now compare:
if (total === 59.97) { ... }  // FALSE! Never matches

// Or worse, accumulated error in financial calculations:
let sum = 0;
for (let i = 0; i < 1000; i++) {
  sum += 0.01;  // Adding 1 cent 1000 times
}
console.log(sum);  // Expect: 10.00, Actual: 9.999999999999831
```

**Why Agents Fail:**
1. **Invisible Problem:** The error is in the 15th decimal place initially
2. **Works in Testing:** Small test cases don't accumulate enough error
3. **Familiar Syntax:** `price * quantity` looks like math class
4. **Delayed Manifestation:** Errors appear in reports, not immediate operations

**The COGS Bug Example:**
```typescript
// BUG-505: Intermediate rounding caused bias
const costPerUnit = totalCost / quantity;  // Loses precision
const roundedCost = Math.round(costPerUnit * 100) / 100;  // Early rounding
const totalCOGS = roundedCost * soldQuantity;  // Error compounds

// FIX: Keep full precision until final display
const costCents = Math.round(totalCost * 100);
const totalCOGSCents = Math.round(costCents * soldQuantity / quantity);
const displayCOGS = totalCOGSCents / 100;  // Only round at end
```

**The MySQL Complication:**
TERP has VARCHAR columns storing numeric values (legacy from early development). This adds string parsing to the precision problem:

```typescript
// Bad: VARCHAR "19.99" → parse → float → precision loss
// Good: DECIMAL(10,2) → exact decimal representation
```

**Why This Persists:**
- DI-007 (migrate VARCHAR to DECIMAL) is marked complete but technical debt remains
- New code can still introduce floating point math
- No linter catches `price * quantity` without integer scaling

**Structural Solution Needed:**
1. Create `Money` type that enforces cents-based operations
2. Ban raw arithmetic on price/cost fields via ESLint
3. Complete VARCHAR → DECIMAL migration for all financial columns

---

## Part 2: Process and Workflow Gaps

### Gap 1: No Schema Validation in Build

**Current State:**
```
Code references column X → TypeScript compiles → Build succeeds →
Runtime error: "Unknown column X"
```

**Needed State:**
```
Code references column X → Build-time schema check →
Build FAILS if column doesn't exist
```

### Gap 2: No Route Coverage Verification

**Current State:**
```
Nav config has href="/foo" → Build succeeds →
Runtime 404 when clicking link
```

**Needed State:**
```
Nav config has href="/foo" → Build-time route check →
Build FAILS if route not defined
```

### Gap 3: No Security Pattern Linting

**Current State:**
```
Agent writes `ctx.user?.id || 1` → TypeScript compiles →
Security vulnerability in production
```

**Needed State:**
```
Agent writes `ctx.user?.id || 1` → ESLint error →
Must use getAuthenticatedUserId(ctx)
```

### Gap 4: No Concurrent Access Testing

**Current State:**
```
Unit test runs one request → Passes →
Race condition in production with concurrent requests
```

**Needed State:**
```
Integration test simulates concurrent requests →
Fails if race condition possible
```

---

## Part 3: Cognitive Patterns That Lead to Bugs

### Pattern A: Copy-Paste Without Context

Agents find similar code and modify it without understanding why it was written that way.

**Example:** An agent sees `createdBy: 1` in a seed file (valid for seeding) and uses it in production code (security vulnerability).

**Mitigation:** Before copying code, ask: "What context made this pattern appropriate there? Does that context apply here?"

### Pattern B: Type System Overconfidence

TypeScript compilation becomes a proxy for correctness. If it compiles, it works.

**Example:** `const userId = ctx.user?.id || 1` compiles cleanly. TypeScript doesn't know `|| 1` is semantically wrong.

**Mitigation:** TypeScript validates types, not business logic. Always question: "Could this compile but be logically wrong?"

### Pattern C: Local Dev Blindness

What works in local development may fail in production due to:
- Missing environment variables
- Single-instance assumptions
- Auth bypasses in dev mode
- Missing database data

**Example:** QA Role Switcher works in dev (intended), but shouldn't be visible in prod (BUG-103).

**Mitigation:** Test production builds locally. Verify environment-specific behavior explicitly.

### Pattern D: Happy Path Thinking

Agents implement the success case thoroughly but neglect edge cases.

**Example:** Order confirmation assumes inventory is available (BUG-402). What if it was just sold to someone else?

**Mitigation:** For every operation, ask: "What could go wrong between when we check and when we act?"

### Pattern E: Implicit Trust in Existing Code

Agents assume existing patterns are correct because they're in the codebase.

**Example:** Seeing `|| 1` fallback used elsewhere and replicating it.

**Mitigation:** Question patterns, especially in security-sensitive areas. The codebase teaches both good and bad patterns.

---

## Part 4: Prioritized Action Items

### Immediate (Pre-Commit)

1. **Add to CLAUDE.md - Mandatory Checks:**
   ```markdown
   Before committing to security-sensitive files (routers, mutations):
   - Search for `|| 1` or `|| 0` fallback patterns
   - Search for `input.createdBy` or `input.userId`
   - Verify all user IDs come from getAuthenticatedUserId(ctx)
   ```

2. **Add to CLAUDE.md - Schema Operations:**
   ```markdown
   When modifying enums or schema:
   - Check mysqlEnum first argument matches DATABASE column name (snake_case)
   - Run `pnpm seed:all-defaults` locally before committing
   - Column name in mysqlEnum is NOT the TypeScript property name
   ```

3. **Add to CLAUDE.md - Route Additions:**
   ```markdown
   When adding navigation links:
   - Verify route exists in client/src/router.tsx
   - Verify page component exists in client/src/pages/
   - Test BOTH: clicking the link AND direct URL navigation
   - A broken link is worse than no link
   ```

### Short-Term (Tooling)

1. **ESLint Rules to Add:**
   - Ban `ctx.user?.id ||` pattern
   - Warn on `input.createdBy` or `input.userId` in mutations
   - Ban array index as React key (`key={index}`)

2. **Build-Time Validations:**
   - Route existence check for navigation hrefs
   - Schema column validation for enum arguments

3. **Test Infrastructure:**
   - Add concurrent request simulation to critical path tests
   - Add production build smoke test to CI

### Long-Term (Architecture)

1. **Type-Safe User Context:**
   - Make `ctx.user` non-optional after auth middleware
   - Remove ability to bypass auth except in test utilities

2. **Money Type:**
   - Create `Money` type that enforces cents-based arithmetic
   - Lint against raw arithmetic on price/cost fields

3. **Transaction Enforcement:**
   - Make `criticalMutation()` wrapper required for inventory/financial operations
   - Add architectural tests that verify transaction coverage

---

## Part 5: Bug Pattern Quick Reference Card

| Pattern | Signal | Fix |
|---------|--------|-----|
| Schema mismatch | "Unknown column" at runtime | Check mysqlEnum first arg = DB column name |
| Missing route | 404 on nav click | Create route + page + test |
| Actor attribution | `\|\| 1` or `input.createdBy` | Use `getAuthenticatedUserId(ctx)` |
| SQL injection | User input in `sql.raw()` | Validate + parameterize |
| Race condition | Concurrent failures | `SELECT FOR UPDATE` + transactions |
| Precision error | Financial discrepancies | Integer cents, round once at end |
| Env leak | Debug UI in prod | `import.meta.env.DEV` checks |
| Validation gap | Invalid input accepted | Zod schemas + business rules |
| State pollution | Modal shows stale data | Clear state on close |
| Test flake | Works locally, fails in CI | Mock setup, async handling |

---

## Part 6: Parallel Agent Coordination - Quality Impact Analysis

### The Parallel Sprint Model

TERP uses a 5-team parallel sprint model:

```
Team D (Schema) → Team A (Stability) → Team C (Backend) → Team B (Frontend) → Team E (Integration)
```

Each team has **file ownership boundaries**:
- Team A: `server/*.ts` (excluding routers), test infra
- Team B: `client/src/pages/*.tsx`, navigation
- Team C: `server/routers/*.ts`, services
- Team D: `drizzle/**`, `scripts/seed/**`
- Team E: Work surfaces, `server/_core/**`

### Coordination Issues Identified

#### Issue 1: Schema Dependencies Create Cascade Failures

**Pattern:** Team D creates schema (Day 1) → Teams A, B, C depend on it → Schema bug discovered post-merge

**POST-001 Example:**
```
Timeline:
Day 1: Team D creates mysqlEnum with wrong first argument
Day 2-4: Teams A, C write code assuming schema is correct
Day 5: PRs merged to staging
Day 6: Integration - seeders fail with "Unknown column"
Day 7: Emergency fix in PR #304
```

**Root Cause:** No cross-team validation checkpoint. Team D's schema was merged before any integration test caught the naming mismatch.

**Impact:**
- All dependent teams built on broken foundation
- Single schema bug rippled across entire sprint
- Required hotfix after "complete" integration

#### Issue 2: File Ownership Gaps

The ownership matrix has gaps:

| File | Ambiguity |
|------|-----------|
| `version.json` | Who owns build artifacts? (13 version.json updates in last 7 days) |
| `MASTER_ROADMAP.md` | Multiple teams need to update task statuses |
| Shared types/schemas | Team D owns schema, but Team C needs types from it |

**Observed Pattern:** Version file conflicts are auto-resolved ("accept incoming"), but this masks coordination issues.

#### Issue 3: Cross-Team Code Assumptions

**Pattern:** Teams make assumptions about how other teams implemented features.

**Examples found:**
- Team B (Frontend) assumed Team C's API would return `matchScore`, but Team C named it `confidence` (FE-BUG-006)
- Team B's `VendorSupplyPage` called a mutation that Team C hadn't secured yet (BUG-491)
- Team E's inventory locking used `lockTimeout` that wasn't validated (SQL injection discovered after merge)

**Root Cause:** Teams work in parallel without continuous integration. Assumptions about interfaces only get tested at merge time.

#### Issue 4: QA Timing Creates Batch Discoveries

When 5 teams merge at once, QA discovers bugs in batches rather than incrementally:

```
Jan 25 Sprint Integration:
- 4 frontend QA bugs discovered (BUG-103 to BUG-106)
- 7 backend bugs documented (BUG-501 to BUG-513)
- 3 test infrastructure issues (TEST-INFRA-07 to 09)
- 1 security vulnerability (SQL injection)

All found AFTER teams marked their work "complete"
```

**Impact:**
- Large remediation batches
- Harder to attribute bugs to specific teams
- Integration coordinator becomes bottleneck

#### Issue 5: Context Loss Across Team Boundaries

**Pattern:** Each team has incomplete context about the overall system.

**Examples:**
- Team A fixed TypeScript errors without knowing Team C would change the same files
- Team B added nav links to pages Team C hadn't implemented yet
- Team D created seeders for schema Team C would later modify

**Root Cause:** The ownership model creates silos. Teams optimize locally without global visibility.

### Quantified Impact of Parallel Execution

| Metric | Value | Notes |
|--------|-------|-------|
| Merge conflicts resolved | 1 documented | Plus informal resolutions |
| Version.json updates | 13 in 7 days | Coordination overhead signal |
| Post-merge bugs found | 14+ | After "complete" integration |
| Emergency PRs | 2 (#304, #305) | After "successful" merge |
| Cross-team bugs | 5+ | API mismatches, assumption failures |

### Structural Issues in Coordination Model

#### Gap 1: No Continuous Integration Across Teams

**Current:** Teams work in isolation → Merge at end → Find integration issues

**Better:** Continuous integration tests run on every cross-team change

#### Gap 2: Interface Contracts Not Enforced

**Current:** Teams assume interfaces; mismatches found at runtime

**Better:** Shared interface definitions that break builds if violated

#### Gap 3: QA Happens Too Late

**Current:** QA runs after all teams merge to staging

**Better:** Each team's PR gets QA before merge

#### Gap 4: Schema Owner Has Outsized Impact

**Current:** Team D's schema bugs cascade to all other teams

**Better:** Schema changes validated in isolation before dependent teams start

### Recommendations for Parallel Agent Coordination

#### Immediate

1. **Add schema validation checkpoint:**
   - After Team D PRs, run seeders before other teams start
   - Block dependent teams until schema passes integration

2. **Define interface contracts explicitly:**
   - API response shapes documented in shared types
   - Frontend-backend contracts tested in CI

3. **Stagger QA instead of batching:**
   - QA each team's PR individually
   - Don't wait for all teams to finish

#### Short-term

4. **Create cross-team integration tests:**
   - Tests that exercise interfaces between team domains
   - Run on every PR to staging

5. **Implement continuous staging:**
   - Instead of batch merges, merge each team as they complete
   - Find integration issues incrementally

6. **Add dependency gates:**
   - Team C can't start until Team D's schema passes validation
   - Team B can't start until Team C's APIs are tested

#### Long-term

7. **Reduce parallel breadth:**
   - 5 teams in parallel may be too many
   - Consider 2-3 teams with faster integration cycles

8. **Shared context meetings:**
   - Brief sync points during parallel work
   - Catch assumption mismatches early

9. **Automated interface compatibility:**
   - Generate frontend types from backend schemas
   - Break builds on interface drift

### Key Insight: Parallel Speed vs. Integration Quality

The 5-team parallel model optimizes for **time to feature completion** but creates:

1. **Batch integration risk** - All problems surface at once
2. **Attribution difficulty** - Harder to know which team caused a bug
3. **Context silos** - Teams don't see each other's decisions
4. **Cascade failures** - Foundation bugs (schema) ripple everywhere

**The tradeoff:** 5 agents in parallel vs. 5 agents in sequence isn't 5x faster when integration overhead is considered.

A model with **3 parallel teams + continuous integration** might actually be faster than **5 parallel teams + batch integration** because:
- Fewer integration issues
- Earlier bug discovery
- Less rework
- Better context sharing

---

## Conclusion

The bugs in TERP are not random mistakes. They emerge from:

1. **Structural gaps** between code conventions and database reality
2. **Cognitive shortcuts** that work 80% of the time but fail catastrophically
3. **Missing enforcement** - the rules exist but nothing enforces them
4. **Pattern propagation** - bad patterns in the codebase teach future bad patterns
5. **Parallel coordination overhead** - teams making assumptions about each other's work

The solution is fourfold:
1. **Educate** - This document helps agents recognize patterns
2. **Automate** - Linting and build-time checks catch what humans miss
3. **Restructure** - Make wrong things hard and right things easy
4. **Integrate continuously** - Find problems early, not at the end

**Most importantly:** Every bug fixed teaches the system. Document the fix pattern, add it to the checklist, and consider if tooling could have caught it earlier.

---

*Analysis based on commits 4a1e4f2...9da49be and documentation review.*
*Parallel sprint analysis based on PARALLEL_SPRINT_TEAMS_2026-01-25.md and merge history.*
