# Full TERP Audit

Run all audit checks in sequence. Use this for comprehensive system verification.

## Execution Order

1. **Schema Audit** - Forbidden patterns, enum alignment
2. **Inventory Audit** - Known $0 bugs, filter issues  
3. **Golden Flows Audit** - Critical business path verification

## Pre-Flight

```bash
git pull origin main
pnpm check
pnpm lint
pnpm test
pnpm build
```

If any fail, STOP and fix before proceeding.

## Run All Audits

Execute each audit command in sequence:

```
/project:audit/schema
/project:audit/inventory
/project:audit/golden-flows
```

## Consolidated Report Format

```
═══════════════════════════════════════════════════════
TERP FULL AUDIT REPORT
═══════════════════════════════════════════════════════
Date: [ISO 8601]
Branch: [branch name]
Commit: [short hash]

PRE-FLIGHT STATUS
-----------------
TypeScript:  ✅ PASS / ❌ FAIL
Lint:        ✅ PASS / ❌ FAIL
Tests:       ✅ PASS / ❌ FAIL (X/Y passing)
Build:       ✅ PASS / ❌ FAIL

═══════════════════════════════════════════════════════
CRITICAL FINDINGS (P0 - BLOCK DEPLOYMENT)
═══════════════════════════════════════════════════════
[List all P0 issues from all audits]

═══════════════════════════════════════════════════════
HIGH PRIORITY (P1 - FIX THIS WEEK)
═══════════════════════════════════════════════════════
[List all P1 issues]

═══════════════════════════════════════════════════════
MEDIUM PRIORITY (P2 - FIX THIS SPRINT)
═══════════════════════════════════════════════════════
[List all P2 issues]

═══════════════════════════════════════════════════════
AUDIT SUMMARIES
═══════════════════════════════════════════════════════

SCHEMA AUDIT
------------
[Summary from schema audit]

INVENTORY AUDIT
---------------
[Summary from inventory audit]

GOLDEN FLOWS AUDIT
------------------
[Summary from golden flows audit]

═══════════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════════
1. [Most critical action]
2. [Second priority]
3. [Third priority]

═══════════════════════════════════════════════════════
```

## Post-Audit Actions

### If P0 Issues Found:

1. Create GitHub issue for each P0
2. Do NOT deploy until resolved
3. Tag issues with `audit:p0` label

### If All Clear:

```bash
echo "[$(date -Iseconds)] FULL AUDIT PASSED - Ready for deployment" >> .claude/audit-history.log
```

## Recurring Audit Schedule

Recommendation: Run full audit:
- Before any release
- After major refactors
- Weekly during active development
- When bugs recur despite fixes
