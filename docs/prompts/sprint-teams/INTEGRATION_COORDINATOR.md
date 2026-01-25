# Integration Coordinator

**Role:** Final integration and merge coordinator
**When to Run:** After all 5 teams have created their PRs
**Branch:** Works on `staging/integration-sprint-2026-01-25`

---

## Your Mission

You are the **Integration Coordinator**, responsible for merging all team PRs in the correct order, resolving conflicts, running integration tests, and creating the final release PR to main.

---

## CRITICAL: Prerequisites

Before starting, verify ALL 5 team PRs exist targeting staging:

```bash
gh pr list --base staging/integration-sprint-2026-01-25
```

Expected:
- Team A: Core Stability Fixes
- Team B: Frontend UX & Navigation
- Team C: Backend & API Implementations
- Team D: Data, Schema & Seeding
- Team E: Integration & Work Surfaces

**DO NOT PROCEED** if any team PR is missing.

---

## Phase 1: Merge Team PRs (In Order)

### Merge Order (CRITICAL - Follow Exactly)

```
1. Team D (schema/data)     - No dependencies, provides foundation
2. Team A (stability)       - TypeScript must pass for others
3. Team C (backend)         - APIs needed by frontend
4. Team B (frontend)        - UI needs APIs
5. Team E (integration)     - Depends on everything
```

### For Each Team PR

```bash
# 1. Start fresh on staging
git checkout staging/integration-sprint-2026-01-25
git pull origin staging/integration-sprint-2026-01-25

# 2. Find the PR number
gh pr list --base staging/integration-sprint-2026-01-25

# 3. Review the PR
gh pr view <PR-NUMBER>
gh pr diff <PR-NUMBER>

# 4. Merge the PR
gh pr merge <PR-NUMBER> --merge --delete-branch

# 5. Pull the merged changes
git pull origin staging/integration-sprint-2026-01-25

# 6. Install dependencies (in case package.json changed)
pnpm install

# 7. Verify build still works
pnpm check && pnpm build

# 8. If verification fails, DO NOT PROCEED
# Fix the issue before merging next PR
```

### Conflict Resolution

If merge conflicts occur:

```bash
# 1. Create local branch to resolve
git checkout -b fix/integration-conflict-teamX

# 2. Merge the conflicting PR locally
git fetch origin
git merge origin/<team-branch>

# 3. Resolve conflicts in editor
# Look for <<<<<<< HEAD markers

# 4. After resolving
git add .
git commit -m "fix: resolve merge conflict from Team X"

# 5. Push to staging
git checkout staging/integration-sprint-2026-01-25
git merge fix/integration-conflict-teamX
git push origin staging/integration-sprint-2026-01-25

# 6. Close the original PR as merged
gh pr close <PR-NUMBER> --comment "Merged manually after conflict resolution"
```

---

## Phase 2: Integration Testing

After ALL 5 team PRs are merged:

```bash
# Ensure you have everything
git checkout staging/integration-sprint-2026-01-25
git pull origin staging/integration-sprint-2026-01-25
pnpm install

# Run full verification suite
echo "=== TypeScript Check ===" && pnpm check
echo "=== Lint ===" && pnpm lint
echo "=== Unit Tests ===" && pnpm test
echo "=== Build ===" && pnpm build

# Run E2E tests if available
pnpm test:e2e 2>/dev/null || echo "E2E tests not configured"

# Run Golden Flow tests if available
pnpm test:golden-flows 2>/dev/null || echo "Golden Flow tests not configured"
```

### Expected Results

| Check | Expected |
|-------|----------|
| `pnpm check` | 0 errors |
| `pnpm lint` | 0 errors (warnings OK) |
| `pnpm test` | >95% pass rate |
| `pnpm build` | Success |

### If Tests Fail

1. Identify which team's code caused the failure
2. Create a fix PR targeting staging
3. Or coordinate with the team to fix their PR
4. Re-run integration tests after fix

---

## Phase 3: Create Release PR

Once all tests pass:

```bash
gh pr create \
  --base main \
  --head staging/integration-sprint-2026-01-25 \
  --title "Sprint Release: Parallel Teams 2026-01-25" \
  --body "$(cat <<'EOF'
## Sprint Summary

Parallel execution of 5 sprint teams resolving 113 tasks.

### Team Contributions

| Team | Focus | Tasks | Status |
|------|-------|-------|--------|
| Team A | Core Stability | 18 | ✅ Merged |
| Team B | Frontend UX | 25 | ✅ Merged |
| Team C | Backend API | 18 | ✅ Merged |
| Team D | Data & Schema | 16 | ✅ Merged |
| Team E | Integration | 36 | ✅ Merged |

### Integration Verification

- [x] All team PRs merged to staging
- [x] TypeScript compilation passes
- [x] Lint passes
- [x] Unit tests pass (>95%)
- [x] Build succeeds
- [x] E2E tests pass
- [x] Integration conflicts resolved

### Key Changes

**P0 Critical Fixes:**
- TypeScript errors resolved (TS-001)
- Test infrastructure fixed (TEST-INFRA-*)
- Security credential rotation (SEC-023)
- Work Surfaces QA blockers (WSQA-001..003)

**New Features:**
- Navigation accessibility (NAV-006..017)
- Hour Tracking frontend (MEET-048)
- AR/AP Summary endpoints (BE-QA-006)
- Financial Reports (BE-QA-008)
- Feature flags seeded (DATA-012)

**Reliability:**
- Critical mutation wrapper (REL-004)
- Inventory concurrency hardening (REL-006)

### Rollback Plan

If issues detected post-merge:
```bash
git revert <merge-commit-sha>
git push origin main
```

Feature flags provide additional safety:
- All Work Surfaces default to OFF
- Can disable features without rollback
EOF
)"
```

---

## Phase 4: Final Merge and Deploy

### Pre-Merge Checklist

- [ ] All integration tests pass
- [ ] PR has been reviewed
- [ ] No blocking comments
- [ ] Evan has approved (if required)

### Merge to Main

```bash
# Get PR number
gh pr list --base main

# Merge
gh pr merge <PR-NUMBER> --merge

# This triggers auto-deploy to production
```

### Post-Deploy Verification

```bash
# Wait for deployment (usually 5-10 minutes)
sleep 300

# Check deployment status
./scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# Verify health endpoint
curl -s https://terp-app-b9s35.ondigitalocean.app/health | jq .

# Check for errors in logs
./scripts/terp-logs.sh run 100 | grep -i "error"

# Run smoke test
curl -s https://terp-app-b9s35.ondigitalocean.app/api/health
```

### If Deployment Fails

```bash
# 1. Check logs for error
./scripts/terp-logs.sh run 200

# 2. If critical, revert immediately
git revert HEAD
git push origin main

# 3. Create incident report
cat > docs/incidents/2026-01-25-sprint-release.md << 'EOF'
# Incident: Sprint Release Deployment Failure

**Date:** 2026-01-25
**Severity:** [P0/P1/P2]
**Status:** [Investigating/Mitigated/Resolved]

## Timeline
- HH:MM - Deployment started
- HH:MM - Error detected
- HH:MM - Rollback initiated

## Root Cause
[To be determined]

## Resolution
[Steps taken]

## Action Items
- [ ] Item 1
- [ ] Item 2
EOF
```

---

## Verification Checklist

Before declaring success:

- [ ] All 5 team PRs merged to staging
- [ ] Integration tests pass on staging
- [ ] Release PR created and merged to main
- [ ] Production deployment successful
- [ ] Health check passes
- [ ] No errors in production logs
- [ ] Feature flags verified (Work Surfaces OFF by default)

---

## Summary Report Template

After completion, create:

```markdown
# Sprint Release Report: 2026-01-25

## Status: SUCCESS / PARTIAL / FAILED

## Metrics
- Teams Completed: 5/5
- PRs Merged: 5/5
- Integration Tests: PASS
- Production Deploy: SUCCESS
- Time to Complete: X hours

## Issues Encountered
- [List any conflicts or problems]

## Next Steps
- [Any follow-up work needed]
```

Save to: `docs/sprint-reports/2026-01-25-release.md`

---

## Questions?

Contact Evan or create an issue in the repository.
