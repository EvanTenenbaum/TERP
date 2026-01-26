# Enforcement Audit: What's Actually Enforced vs. Just Documented

**Audit Date:** 2026-01-26
**Question:** "How did we really enforce all this?"
**Answer:** Mostly we didn't. Here's the proof.

---

## Executive Summary

| Category | Documented Rules | Actually Enforced | Enforcement Rate |
|----------|-----------------|-------------------|------------------|
| Security Patterns | 5 | 0 | 0% |
| Schema Validation | 3 | 0 | 0% |
| Code Quality | 8 | 3 | 37.5% |
| Testing | 4 | 1 (partial) | 25% |
| Workflow | 6 | 2 | 33% |
| **TOTAL** | **26** | **6** | **23%** |

**Only 23% of documented rules have actual enforcement mechanisms.**

---

## Part 1: What IS Enforced (The 23%)

### 1. TypeScript Compilation ✅ ENFORCED

**Mechanism:** Build fails if types are wrong
**Location:** `pnpm build`, `pnpm check`
**CI:** Runs on every push to main

```yaml
# .github/workflows/merge.yml - Line 329-332
- name: Fail if any test failed
  if: steps.schema.outputs.status == 'failed' ...
  run: exit 1
```

### 2. ESLint `no-array-index-key` ✅ ENFORCED

**Mechanism:** ESLint error on `key={index}`
**Location:** `eslint.config.js` line 96

```javascript
'react/no-array-index-key': 'error',  // Prevent key={index} anti-pattern
```

### 3. ESLint `no-unused-vars` ✅ ENFORCED

**Mechanism:** ESLint error on unused variables
**Location:** `eslint.config.js` line 78

```javascript
'@typescript-eslint/no-unused-vars': ['error', {...}],
```

### 4. Branch Name Format ✅ ENFORCED

**Mechanism:** Pre-push hook blocks invalid branch names
**Location:** `.husky/pre-push` line 33-37

```bash
if [[ ! "$CURRENT_BRANCH" =~ $BRANCH_NAME_REGEX ]]; then
  echo "❌ PUSH BLOCKED: Invalid branch name format"
  exit 1
fi
```

### 5. React Hooks Rules ✅ ENFORCED

**Mechanism:** ESLint error on hooks violations
**Location:** `eslint.config.js` line 97

```javascript
'react-hooks/rules-of-hooks': 'error',
```

### 6. Main Branch CI Tests ✅ ENFORCED (Post-Merge)

**Mechanism:** CI fails on test failures AFTER merge to main
**Location:** `.github/workflows/merge.yml`
**Problem:** This runs AFTER code is merged, not before

---

## Part 2: What's Just Warnings (Not Enforced)

### 1. Pre-Merge Quality Gate ⚠️ WARNING ONLY

**File:** `.github/workflows/pre-merge.yml`
**Evidence:** Line 114

```javascript
// Note: We are no longer failing the build (core.setFailed) to avoid blocking merges.
// The warnings above serve as the quality gate feedback.
```

**Result:** PRs can merge with warnings. No blocking.

### 2. Schema Change Without Migration ⚠️ WARNING ONLY

**File:** `.husky/pre-commit`
**Evidence:** Lines 6-14

```bash
if git diff --cached --name-only | grep -q "drizzle/schema.ts"; then
  if ! git diff --cached --name-only | grep -q "drizzle/migrations/"; then
    echo "⚠️  WARNING: drizzle/schema.ts changed but no migration file found!"
    # No exit 1 - just a warning
  fi
fi
```

**Result:** Schema changes commit without migrations.

### 3. `@typescript-eslint/no-explicit-any` ⚠️ WARNING ONLY

**File:** `eslint.config.js` line 75

```javascript
'@typescript-eslint/no-explicit-any': 'warn',  // warn, not error
```

**Result:** `any` types are allowed with just warnings.

### 4. `@typescript-eslint/no-non-null-assertion` ⚠️ WARNING ONLY

**File:** `eslint.config.js` line 88

```javascript
'@typescript-eslint/no-non-null-assertion': 'warn',
```

**Result:** `!` assertions allowed with warnings.

### 5. `react-hooks/exhaustive-deps` ⚠️ WARNING ONLY

**File:** `eslint.config.js` line 98

```javascript
'react-hooks/exhaustive-deps': 'warn',
```

**Result:** Missing deps in hooks just warn.

### 6. Test Coverage Below 80% ⚠️ WARNING ONLY

**File:** `.github/workflows/merge.yml` line 119-122

```bash
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "status=warning" >> $GITHUB_OUTPUT  # Warning, not failure
fi
```

**Result:** Low coverage doesn't block merge.

---

## Part 3: What's NOT Enforced At All (77% of Rules)

### Security Rules (0% Enforced)

| Rule | CLAUDE.md Says | Enforcement | Impact |
|------|---------------|-------------|--------|
| No `\|\| 1` fallback | "FORBIDDEN" | None | 10 instances found |
| Use `getAuthenticatedUserId(ctx)` | Required | None | 10 `input.createdBy` found |
| No `vendors` table | "NEVER use" | None | 38 active uses |
| Soft deletes only | "NEVER hard delete" | None | `db.delete()` in code |
| No secrets in code | Required | None | Manual review only |

### Schema Rules (0% Enforced)

| Rule | CLAUDE.md Says | Enforcement | Impact |
|------|---------------|-------------|--------|
| mysqlEnum naming | Not mentioned | None | POST-001 bug |
| Column name matching | Not mentioned | None | Runtime errors |
| Run seeders after changes | Mentioned | None | Schema/seeder drift |

### Testing Rules (25% Enforced)

| Rule | CLAUDE.md Says | Enforcement | Impact |
|------|---------------|-------------|--------|
| All tests must pass | "Definition of Done" | Partial (post-merge) | 99.6% = SUCCESS |
| E2E tests required | Required | Manual only | Not in PR CI |
| No skipped tests | Not mentioned | None | 41 skipped tests |
| Verify deployment | Required | None | Manual only |

### Workflow Rules (33% Enforced)

| Rule | CLAUDE.md Says | Enforcement | Impact |
|------|---------------|-------------|--------|
| Pull before push | Required | None | Merge conflicts |
| Register session | Required | None | Agent collisions |
| Update roadmap | Required | None | Stale statuses |
| Create completion report | Required | None | Missing docs |

---

## Part 4: The Enforcement Gap Analysis

### Why Documentation Fails Without Enforcement

```
CLAUDE.md says:                    Codebase shows:
─────────────────────────────────────────────────────────
"NEVER use vendors table"    →    38 active uses
"NEVER use || 1 fallback"    →    Pattern was in code
"All tests must pass"        →    99.6% = SUCCESS
"Use getAuthenticatedUserId" →    10 input.createdBy uses
"Soft deletes only"          →    db.delete() exists
```

### The Enforcement Pyramid

```
                    ┌─────────────────┐
                    │   ENFORCED      │  ← TypeScript, ESLint errors
                    │   (23%)         │     Build/CI failures
                    ├─────────────────┤
                    │   WARNED        │  ← ESLint warnings
                    │   (15%)         │     Pre-commit messages
                    ├─────────────────┤
                    │   DOCUMENTED    │  ← CLAUDE.md rules
                    │   (62%)         │     Protocol docs
                    └─────────────────┘     No enforcement at all
```

---

## Part 5: What Would Real Enforcement Look Like?

### Security Enforcement (Currently 0%)

```javascript
// eslint-rules/no-fallback-user.js (DOES NOT EXIST)
// Would catch: ctx.user?.id || 1

// eslint-rules/no-input-actor.js (DOES NOT EXIST)
// Would catch: input.createdBy, input.userId

// eslint-rules/no-deprecated-table.js (DOES NOT EXIST)
// Would catch: vendors., vendorId
```

### Schema Enforcement (Currently 0%)

```javascript
// eslint-rules/mysql-enum-naming.js (DOES NOT EXIST)
// Would catch: mysqlEnum("camelCase", [...])
// Would require: mysqlEnum("snake_case", [...])

// scripts/validate-schema.ts (DOES NOT EXIST)
// Would run: on pre-commit
// Would check: enum names match column names
```

### Testing Enforcement (Currently 25%)

```yaml
# .github/workflows/pr-check.yml (DOES NOT EXIST for tests)
# Would run: on every PR
# Would require: 100% test pass (not 99.6%)
# Would block: PRs with skipped tests
```

### Workflow Enforcement (Currently 33%)

```bash
# .husky/pre-commit (COULD check for)
# - vendors table usage: grep -r "vendors\." server/
# - fallback patterns: grep -r "|| 1" server/
# - input.createdBy: grep -r "input.createdBy" server/

# Currently only checks: schema changes (warning only)
```

---

## Part 6: The Real Answer

### "How did we really enforce all this?"

**We didn't.**

- **CLAUDE.md** is 3000+ lines of rules
- **Pre-commit hook** is 18 lines (mostly a warning)
- **Pre-push hook** only checks branch names
- **Pre-merge workflow** explicitly doesn't block
- **ESLint** catches 3 of 26 documented patterns
- **CI** runs tests AFTER merge to main

### The Enforcement Reality

```
Documentation Coverage:  ████████████████████  100%
Actual Enforcement:      ████░░░░░░░░░░░░░░░░   23%
Enforcement Gap:         ░░░░████████████████   77%
```

### Why This Matters

Every bug in the analysis traces back to this gap:

| Bug Pattern | Documented? | Enforced? | Result |
|-------------|-------------|-----------|--------|
| POST-001 (mysqlEnum) | No | No | Runtime error |
| vendors table usage | Yes | No | 38 violations |
| input.createdBy | Yes | No | 10 vulnerabilities |
| 99.6% = SUCCESS | No | No | Bugs shipped |
| Skipped tests | No | No | 41 known unknowns |

---

## Part 7: Recommended Enforcement Actions

### Immediate (Can Implement Today)

1. **Change warnings to errors:**
   ```javascript
   // eslint.config.js
   '@typescript-eslint/no-explicit-any': 'error',  // was 'warn'
   '@typescript-eslint/no-non-null-assertion': 'error',  // was 'warn'
   ```

2. **Update pre-commit to block on violations:**
   ```bash
   # .husky/pre-commit - add exit 1 for schema warning
   if ! git diff --cached --name-only | grep -q "drizzle/migrations/"; then
     echo "❌ BLOCKED: Schema changed without migration"
     exit 1  # Add this line
   fi
   ```

3. **Add grep-based pattern detection:**
   ```bash
   # .husky/pre-commit - add security checks
   if grep -r "|| 1\b" --include="*.ts" server/; then
     echo "❌ BLOCKED: Fallback user ID pattern detected"
     exit 1
   fi
   ```

### Short-term (This Week)

4. **Create custom ESLint rules** for:
   - `no-fallback-user`: Ban `|| 1`, `|| 0` in user context
   - `no-input-actor`: Ban `input.createdBy`, `input.userId`
   - `no-deprecated-table`: Ban `vendors.`, `vendorId`

5. **Add PR-level test enforcement:**
   ```yaml
   # .github/workflows/pr-tests.yml (NEW)
   on: pull_request
   jobs:
     test:
       - run: pnpm test
         # Fail on ANY test failure
   ```

6. **Enable pre-merge blocking:**
   ```javascript
   // .github/workflows/pre-merge.yml - remove this comment:
   // Note: We are no longer failing the build
   // ADD:
   core.setFailed('Quality gate failed');
   ```

### Medium-term (This Month)

7. **Schema validation script** that checks:
   - mysqlEnum first arg matches column name
   - All enums use snake_case
   - Seeders pass before PR merge

8. **Deprecated usage scanner** that runs nightly:
   - Count vendors table uses
   - Count input.createdBy uses
   - Report to Slack/Discord

9. **Zero-skip-test policy:**
   - CI fails if any test is skipped
   - Must fix or delete, no skip allowed

---

## Conclusion

The question was: **"How did we really enforce all this?"**

The answer is: **We wrote extensive documentation but only enforced 23% of it.**

The bugs we found are the predictable result:
- Rules without tooling become suggestions
- Suggestions get ignored under time pressure
- Ignored rules breed more violations
- Violations become "the way things are done"

**The fix isn't more documentation. It's more enforcement.**

Every rule in CLAUDE.md should have a corresponding:
- ESLint rule (if code pattern)
- CI check (if build/test requirement)
- Pre-commit hook (if must-not-commit pattern)
- PR blocker (if must-not-merge requirement)

Until then, CLAUDE.md is a wishlist, not a protocol.

---

*Audit based on: .husky/*, .github/workflows/*, eslint.config.js, CLAUDE.md, and codebase grep analysis*
