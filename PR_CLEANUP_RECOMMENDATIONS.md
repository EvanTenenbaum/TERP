# Pull Request Cleanup Recommendations

Generated: 2026-01-19

## Summary

- **Total remote branches:** 122
- **Open PRs:** 6
- **Fully merged branches:** 2 (safe to delete)
- **Stale branches (2+ months old):** 30+

---

## Open PRs - Recommended Actions

### PR #239: E2E Testing Suite

- **Branch:** `claude/e2e-testing-suite-TDNnw`
- **Status:** 6 behind, 3 ahead main
- **Content:** Puppeteer-based E2E test runner, HTTP tests with proxy support
- **Files:** 7 files, +3,938 lines
- **Recommendation:** ✅ **MERGE** - Adds valuable complementary E2E testing (Puppeteer approach) that works alongside the curl-based tests in PR #238
- **Note:** No merge conflicts with main

### PR #235: Codebase Audit Report

- **Branch:** `codex/audit-terp-erp-codebase-for-risks`
- **Status:** 19 behind, 1 ahead main
- **Content:** Documentation - codebase audit report
- **Files:** 2 files, +202 lines (docs only)
- **Recommendation:** ✅ **MERGE** - Useful audit documentation

### PR #234: RBAC Audit Session

- **Branch:** `codex/audit-rbac-and-data-leakage-risks-in-terp`
- **Status:** 19 behind, 1 ahead main
- **Content:** Session registration for RBAC audit
- **Files:** 2 files, +16 lines (docs only)
- **Recommendation:** ⚠️ **REVIEW** - Just registers a session, check if audit was completed

### PR #233: Constraint Stack QA Tests

- **Branch:** `codex/generate-constraint-collision-qa-tests`
- **Status:** 19 behind, 1 ahead main
- **Content:** QA test prompts for constraint testing
- **Files:** 2 files, +402 lines (docs only)
- **Recommendation:** ✅ **MERGE** - Useful QA test documentation

### PR #232: Run Sheet Summary

- **Branch:** `codex/fix-crm-client-creation-sql-error`
- **Status:** 19 behind, 1 ahead main
- **Content:** Run sheet summary, roadmap updates
- **Files:** 3 files, +93/-5 lines (docs only)
- **Recommendation:** ⚠️ **REVIEW** - Title says "fix-crm" but only contains docs. Verify no actual fix needed.

### PR #231: Data Integrity Audit Session

- **Branch:** `codex/audit-terp-data-integrity-and-invariants`
- **Status:** 19 behind, 1 ahead main
- **Content:** Session registration for data integrity audit
- **Files:** 2 files, +18 lines (docs only)
- **Recommendation:** ⚠️ **REVIEW** - Just registers a session, check if audit was completed

---

## Branches to Delete (Fully Merged)

These branches have 0 commits ahead of main and can be safely deleted:

| Branch                              | Last Commit | Action                     |
| ----------------------------------- | ----------- | -------------------------- |
| `claude/execute-terp-roadmap-SeGYB` | 2026-01-18  | 🗑️ DELETE                  |
| `claude/setup-e2e-testing-zbHQf`    | 2026-01-19  | 🗑️ DELETE (after PR merge) |

---

## Duplicate/Superseded Branches

### E2E Testing (Multiple Approaches)

| Branch                                           | Status         | Action                              |
| ------------------------------------------------ | -------------- | ----------------------------------- |
| `claude/e2e-testing-suite-TDNnw`                 | Open PR #239   | ✅ MERGE                            |
| `claude/e2e-tests-digital-ocean-wxHKJ`           | Stale          | 🗑️ DELETE (superseded by #238/#239) |
| `claude/erp-e2e-test-coverage-ZDvvL`             | Stale          | ⚠️ REVIEW then delete               |
| `codex/execute-thorough-browser-based-e2e-tests` | Merged as #192 | 🗑️ DELETE                           |

### Kiro Setup (Duplicates)

| Branch                                   | Status    | Action        |
| ---------------------------------------- | --------- | ------------- |
| `claude/setup-kiro-external-agent-7VKeC` | Duplicate | 🗑️ DELETE one |
| `claude/setup-kiro-external-agent-U4Uhc` | Duplicate | 🗑️ DELETE one |

### Research User Flows (Closed PRs)

| Branch                                                       | Status         | Action    |
| ------------------------------------------------------------ | -------------- | --------- |
| `codex/research-user-flows-for-business-logic-impact`        | Original       | ⚠️ REVIEW |
| `codex/research-user-flows-for-business-logic-impact-azli69` | PR #226 closed | 🗑️ DELETE |
| `codex/research-user-flows-for-business-logic-impact-zstiye` | PR #227 closed | 🗑️ DELETE |

---

## Stale Branches (2+ Months Old)

These branches haven't been updated since September-November 2025:

### Safe to Delete (Likely Obsolete)

- `ai_main_f6170cdd3272` (Sept 2025)
- `backup-monorepo` (Oct 2025)
- `feature/expand-test-coverage` (Oct 2025)
- `p0-implementation` (Oct 2025)
- `feature/data-cards-implementation` (Oct 2025)

### Review First (May Contain Unmerged Work)

- `feature/1.1-inventory-stability-verification` (Nov 2025)
- `feature/1.2-user-roles-permissions` (Nov 2025)
- `feature/1.3-workflow-queue` (Nov 2025)
- `feat/calendar-fix-n-plus-1-query` (Nov 2025)
- `feat/calendar-phase2-improvements` (Nov 2025)

### Session Branches (Nov 2025)

These appear to be completed sessions that can likely be deleted:

- `claude/abstraction-layer-Session-20251113-*`
- `claude/st002-completion-Session-20251113-*`
- `claude/env-consolidation-Session-20251113-*`
- `claude/ST-004-outdated-refs-Session-20251113-*`
- `claude/ST-003-doc-consolidation-Session-20251113-*`
- `claude/st006-deadcode-Session-20251113-*`

---

## Quick Actions Checklist

### Immediate (No Review Needed)

- [ ] Delete `claude/execute-terp-roadmap-SeGYB`
- [ ] Delete `codex/research-user-flows-for-business-logic-impact-azli69`
- [ ] Delete `codex/research-user-flows-for-business-logic-impact-zstiye`
- [ ] Delete one of the kiro setup duplicates

### Merge PRs

- [ ] Merge PR #239 (e2e-testing-suite)
- [ ] Merge PR #235 (codebase audit)
- [ ] Merge PR #233 (constraint tests)

### Review Then Decide

- [ ] PR #234 - Check if RBAC audit completed
- [ ] PR #232 - Verify CRM fix status
- [ ] PR #231 - Check if data integrity audit completed

### Stale Branch Cleanup (After Review)

- [ ] Review feature/\* branches for unmerged work
- [ ] Archive or delete Session-\* branches from Nov 2025
- [ ] Delete backup branches if no longer needed

---

## Branch Cleanup Command Reference

```bash
# Delete a remote branch
git push origin --delete branch-name

# Delete multiple branches matching a pattern
git branch -r | grep "pattern" | sed 's/origin\///' | xargs -I{} git push origin --delete {}

# List branches that are fully merged
git branch -r --merged origin/main
```

---

## Notes

1. **Never force-delete branches with open PRs** - close the PR first
2. **Backup branches** (`backup-*`) should be reviewed before deletion
3. **gh-pages** is for GitHub Pages deployment - do not delete
4. **main** is the protected default branch
