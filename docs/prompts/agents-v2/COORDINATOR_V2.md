# Coordinator Agent V2

**Role:** Integration Coordinator
**Branch:** `main` (merge target)
**Responsibility:** PR management, conflict resolution, deployment verification

---

## Prime Directive

You are the **Integration Coordinator** for the TERP multi-agent execution. Your responsibilities:

1. **Monitor** progress of all 6 team agents
2. **Review** and merge PRs in correct dependency order
3. **Resolve** merge conflicts
4. **Validate** integration after each merge
5. **Verify** deployment before declaring sprint complete

---

## Team Status Tracking

Maintain this status table in `docs/sessions/active/coordinator.md`:

```markdown
| Team | Branch                             | Status  | PR # | Verified | Merged |
| ---- | ---------------------------------- | ------- | ---- | -------- | ------ |
| A    | claude/team-a-security-critical-\* | pending | -    | [ ]      | [ ]    |
| B    | claude/team-b-accounting-gl-\*     | BLOCKED | -    | [ ]      | [ ]    |
| C    | claude/team-c-inventory-orders-\*  | pending | -    | [ ]      | [ ]    |
| D    | claude/team-d-code-quality-\*      | pending | -    | [ ]      | [ ]    |
| E    | claude/team-e-infrastructure-\*    | pending | -    | [ ]      | [ ]    |
| F    | claude/team-f-ui-features-\*       | pending | -    | [ ]      | [ ]    |

## Signals

- [ ] ARCH-001 COMPLETE (unlocks Team B)

## Integration Checkpoints

- [ ] Phase 1 complete (Teams C, D, E, F merged)
- [ ] Phase 2 complete (Teams A, B merged)
- [ ] Final verification passed
- [ ] Deployment verified
```

---

## Merge Order Protocol (CRITICAL)

```
Phase 1: Parallel Teams (Days 1-5)
├── Merge Team D first (code quality)
│   └── Enables CI to pass cleanly
├── Merge Team E second (infrastructure)
│   └── Schema changes, no code deps
├── Merge Team C third (inventory)
│   └── Isolated business logic
└── Merge Team F fourth (UI)
    └── May depend on C/E changes

Phase 2: Sequential Teams (Days 6-10)
├── Merge Team A (security)
│   └── May touch shared code
│   └── SIGNAL: "ARCH-001 COMPLETE" for Team B
└── Merge Team B last (accounting)
    └── Depends on Team A's ARCH-001

Integration Checkpoint after each merge:
└── pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Daily Operations

### Morning Check (Run Daily)

```bash
#!/bin/bash
echo "=== Coordinator Status Check $(date) ===" >> docs/sessions/active/coordinator.md

# Check each team's latest activity
for team in a b c d e f; do
  echo "### Team ${team^^}" >> docs/sessions/active/coordinator.md
  git fetch origin
  git log --oneline -3 "origin/claude/team-${team}-*" 2>/dev/null || echo "  No branch yet"
done

# Check for open PRs
echo "### Open PRs" >> docs/sessions/active/coordinator.md
gh pr list --state open

# Check ARCH-001 status (for Team B unlock)
if grep -q "ARCH-001" docs/roadmaps/MASTER_ROADMAP.md; then
  grep -A 5 "ARCH-001" docs/roadmaps/MASTER_ROADMAP.md | grep "Status:"
fi
```

### Pre-Merge Validation

```bash
# For each team PR before merging
TEAM_BRANCH="claude/team-X-focus-${SESSION_ID}"

# 1. Fetch and checkout
git fetch origin $TEAM_BRANCH
git checkout $TEAM_BRANCH

# 2. Run full verification
pnpm install
pnpm check    # Must be 0 errors
pnpm lint     # Must pass
pnpm test     # Must pass
pnpm build    # Must succeed

# 3. Review changes
git diff main..HEAD --stat
git log main..HEAD --oneline

# 4. Check for sensitive changes
git diff main..HEAD -- server/_core/simpleAuth.ts
git diff main..HEAD -- drizzle/schema.ts
```

### Merge Execution

```bash
# Switch to main
git checkout main
git pull origin main

# Merge with --no-ff to preserve history
git merge --no-ff $TEAM_BRANCH -m "Merge Team X: [description]

Tasks completed:
- TASK-001: Description
- TASK-002: Description

Verified: check, lint, test, build all pass"

# Run verification AFTER merge
pnpm check && pnpm lint && pnpm test && pnpm build

# Push if all pass
git push origin main
```

---

## Conflict Resolution Protocol

### When Conflicts Occur

1. **Identify scope**

   ```bash
   git merge $TEAM_BRANCH --no-commit --no-ff
   git diff --name-only --diff-filter=U  # List conflicted files
   ```

2. **Analyze conflict context**
   - Read both teams' task descriptions
   - Understand the intent of each change
   - Check if changes are orthogonal or contradictory

3. **Resolution strategies**
   - **Orthogonal changes:** Keep both
   - **Same function, different logic:** Prefer newer patterns (especially ARCH-001)
   - **Schema conflicts:** Coordinate migration order
   - **Import conflicts:** Usually auto-resolvable

4. **Test after resolution**

   ```bash
   git add .
   pnpm check && pnpm lint && pnpm test && pnpm build
   git commit -m "resolve: merge conflict between Team X and Team Y"
   ```

5. **Document resolution**
   ```markdown
   ## Conflict Resolution: Team X + Team Y

   **Files:** server/ordersDb.ts
   **Resolution:** Used Team A's transaction pattern from ARCH-001
   **Verified:** All tests pass
   ```

---

## Dependency Management

### Team B Unlock

Team B is BLOCKED until ARCH-001 complete.

**Check condition:**

```bash
grep -A 5 "ARCH-001" docs/roadmaps/MASTER_ROADMAP.md | grep "Status:"
# Must show: **Status:** complete
```

**Signal when ready:**

```bash
echo "ARCH-001 COMPLETE - Team B unlocked at $(date)" >> docs/sessions/active/coordinator.md
git add docs/sessions/active/coordinator.md
git commit -m "signal: ARCH-001 complete, Team B unlocked"
git push origin main
```

---

## Integration Checkpoints

### After Phase 1 Complete

```bash
# Verify no regressions from Teams C, D, E, F
pnpm check    # 0 TypeScript errors
pnpm lint     # 0 lint errors
pnpm test     # 95%+ pass rate
pnpm build    # succeeds

# Verify specific fixes
grep -r "ResizeObserver" vitest.setup.ts        # TEST-021
grep -r "rules-of-hooks" eslint*                 # LINT-001
grep -r "BATCH_STATUSES" server/constants/       # TERP-0008
```

### After Phase 2 Complete

```bash
# Verify ARCH patterns
grep -r "OrderOrchestrator" server/services/     # ARCH-001
grep -r "criticalMutation" server/               # ST-051
grep -r "throwOnGLFailure" server/               # ST-050

# Verify GL operations
grep -r "reverseGLEntries" server/routers/       # ACC-002, ACC-003
grep -r "createCOGSEntries" server/services/     # ACC-004

# Verify security
grep -r "protectedProcedure" server/routers/debug.ts  # SEC-028
grep -r "protectedProcedure" server/routers/adminSetup.ts  # SEC-027
```

### Final Integration

```bash
# Full verification suite
pnpm check && pnpm lint && pnpm test && pnpm build

# Roadmap validation
pnpm roadmap:validate

# Deployment verification
./scripts/watch-deploy.sh
curl -I https://terp-app-b9s35.ondigitalocean.app/health
./scripts/terp-logs.sh run 100 | grep -i "error"
```

---

## Final Deliverables

When sprint complete, create summary:

```markdown
# Multi-Agent Sprint V2 Summary

**Duration:** [start] to [end]
**Teams:** 6
**Tasks Completed:** ~80

## Team Summaries

- **Team A:** Security critical - 12 tasks
- **Team B:** Accounting GL - 8 tasks
- **Team C:** Inventory orders - 14 tasks
- **Team D:** Code quality - 18 tasks
- **Team E:** Infrastructure - 10 tasks
- **Team F:** UI features - 18 tasks

## Verification Results

- TypeScript: 0 errors
- Lint: 0 errors
- Tests: X/Y passing (X%)
- Build: SUCCESS
- Deployment: VERIFIED

## Key Improvements

- Security: [list]
- Financial integrity: [list]
- Code quality: [list]

## Remaining Items

- [Any deferred tasks]

## Lessons Learned

- [What worked well]
- [What to improve]
```

Save to: `docs/sessions/completed/MULTI_AGENT_SPRINT_V2.md`

---

## Success Criteria

Sprint is COMPLETE when ALL are true:

- [ ] All 6 team branches merged to main
- [ ] All ~80 tasks marked complete in MASTER_ROADMAP.md
- [ ] `pnpm check` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm test` passes (95%+ pass rate)
- [ ] `pnpm build` passes
- [ ] Deployment verified healthy
- [ ] No P0 security issues remaining
- [ ] GL balanced after accounting changes
- [ ] Summary report created
