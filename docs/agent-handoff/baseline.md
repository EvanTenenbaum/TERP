# TERP Agent Handoff — Baseline Snapshot
> Generated: 2026-04-19 | Initiative: Universal Agent Handoff

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `.git/persistent-pm/` system | **REPLACE** | Our new system supersedes it. Archive the directory. |
| Source of truth for tasks | **Linear** | MASTER_ROADMAP.md is deprecated as a validation target |
| Fast vs full test path | **Split** | `complete-task-fast.sh` for hooks, full suite stays in CI |
| Branch protection enforcement | **Must fix** | Currently "protected" in name only — no CI required, no reviews required |

## GitHub Branch Protection (current state — broken)

- `protected: true` — yes, but toothless
- Required approving reviews: **0**
- Required status checks: **enforcement_level: off** (CI doesn't block merges)
- Enforce admins: **false**
- Allow force pushes: **false** (only thing that's actually enforced)
- **Action required (T-016):** Enable required CI checks + required reviews before hooks are wired

## Existing Hooks (current state)

| Hook | File | Lines | Notes |
|------|------|-------|-------|
| pre-commit | `.husky/pre-commit` | 124 | Security pattern checks only — no session validation |
| pre-push | `.husky/pre-push` | exists | Already exists — update not create |
| commit-msg | `.husky/commit-msg` | exists | Scope validation |
| post-push | `.husky/post-push` | exists | Unknown contents |

## Existing CI Workflows

- `deploy-ops-api.yml`
- `golden-flows.yml`
- `merge.yml`
- `nightly-e2e.yml`
- `nightly-schema-check.yml`
- `pre-merge.yml`
- `schema-validation.yml`
- `typescript-check.yml`
- `verify-branch.yml`
- `archived/` directory

**Gap:** No session lifecycle validation CI job exists. T-019 adds it.

## Session State (current)

- Active sessions: **0**
- Completed sessions: **188**
- `ACTIVE_SESSIONS.md`: frozen at 2026-02-04, deprecated, do not use

## Harness Scripts (current state)

| Script | Lines | Problems |
|--------|-------|---------|
| `scripts/start-task.sh` | 232 | Lock: `touch` (not atomic). Validates MASTER_ROADMAP.md not Linear. No resume detection. |
| `scripts/complete-task.sh` | 225 | Full test suite only (30-60min). No fast path. |
| `scripts/force-close-session.sh` | missing | Does not exist |
| `scripts/session-reaper.sh` | missing | Does not exist |
| `scripts/complete-task-fast.sh` | missing | Does not exist |

## context:refresh (fixed — Phase 1 complete)

- **Before fix:** Returns 0 issues (wrong query scope + stale filter)
- **After fix:** Returns 12 TERP issues scoped to Terpcorp team
- **Degraded mode:** Exits 0 with warning on API failure
- **Committed:** f8d361c0

## .git/persistent-pm/ (ARCHIVED — decision: replace)

This directory contained a parallel PM system with per-tool bootstrap files, work queue, and decision log. It is **NOT committed to git** — exists only on the Mac Mini filesystem.

**Archive action:** Move to `.git/persistent-pm-archived-20260419/` and do not reference in any new code.

The new system (`docs/agent-handoff/`) replaces all of its functionality with committed, version-controlled artifacts.

## Linear Integration (confirmed working)

- API key: valid (in `~/.codex/.env`)
- Team: Terpcorp (id: d88bb32f-ea0a-4809-aac1-fde6ec81bad3)
- Issues in queue: 12 active (TER-1073, TER-1052, TER-1139, TER-1138, TER-1137...)
- Ready to work: TER-1073, TER-1052
