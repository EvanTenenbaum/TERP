---
name: roadmap-management
description: "Roadmap management protocol — Linear integration, task IDs, status transitions, estimation protocol, session lifecycle, wave-based development, and execution roadmap templates"
---

# TERP Roadmap Management

## Source of Truth

> Status note (2026-04-06): Before using this skill for tracker work, read `docs/agent-context/START_HERE.md`. Use `docs/agent-context/state.json` for machine-readable startup truth and freshness.

**Linear** is the primary source of truth. GitHub roadmap (`docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`) is a backup.

- **Linear Project:** https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d
- **Sync script:** `python3 scripts/sync_linear_to_github_roadmap.py`
- **Docs:** `docs/LINEAR_INTEGRATION.md`, `docs/LINEAR_ROADMAP_SYNC.md`

## Before Starting ANY Work

1. Read `docs/agent-context/START_HERE.md` — confirm current direction, freshness, and what not to trust
2. Use `docs/agent-context/state.json` if you need machine-readable startup truth
3. Use Linear as the live tracker and treat `docs/roadmaps/MASTER_ROADMAP.md` as backup/historical context only
4. Do not rely on `docs/ACTIVE_SESSIONS.md` for live conflict truth; it is a legacy snapshot
5. Create session file in `docs/sessions/active/` only if the active lane still uses that workflow
6. Select autonomy mode (SAFE/STRICT/RED)

## Task ID Formats

| Prefix        | Use For                  | Example                      |
| ------------- | ------------------------ | ---------------------------- |
| `ST-XXX`      | Stabilization, tech debt | ST-015: Fix memory leak      |
| `BUG-XXX`     | Bug fixes                | BUG-027: Login timeout       |
| `FEATURE-XXX` | New features             | FEATURE-006: Export CSV      |
| `QA-XXX`      | Quality assurance        | QA-003: E2E coverage         |
| `DATA-XXX`    | Data tasks, seeding      | DATA-012: Seed invoices      |
| `INFRA-XXX`   | Infrastructure           | INFRA-014: SSL renewal       |
| `PERF-XXX`    | Performance              | PERF-004: Query optimization |

## Required Task Fields

| Field            | Valid Values                                                    |
| ---------------- | --------------------------------------------------------------- |
| **Status**       | `ready`, `in-progress`, `complete`, `blocked` (exact lowercase) |
| **Priority**     | `HIGH`, `MEDIUM`, `LOW` (exact uppercase)                       |
| **Estimate**     | `4h`, `8h`, `16h`, `1d`, `2d`, `1w`                             |
| **Module**       | File or directory path (for conflict detection)                 |
| **Dependencies** | Task IDs or `None`                                              |

## Status Transitions

```
ready → in-progress    (claim task)
in-progress → complete (work finished + verified)
in-progress → blocked  (dependency found)
in-progress → ready    (abandon task)
blocked → ready        (blocker resolved)
```

## Completing a Task

```markdown
**Status:** complete
**Completed:** 2026-03-04
**Key Commits:** `abc1234`, `def5678`
**Actual Time:** 6h
```

## Estimation Protocol

Never guess. Derive from atomic operations:

| Operation                     | Time      |
| ----------------------------- | --------- |
| Edit existing file (≤100 LOC) | 5-10 min  |
| Edit existing file (>100 LOC) | 10-20 min |
| Create new small file         | 10-15 min |
| Modify shared abstraction     | 15-25 min |
| Add/update unit test          | 5-10 min  |
| Add/update integration test   | 10-20 min |
| Repo-wide scan/search         | 2-3 min   |
| Manual verification step      | 5 min     |

### Converting to Roadmap Format

| Calculated Time | Roadmap Value             |
| --------------- | ------------------------- |
| < 4 hours       | `4h`                      |
| 4-8 hours       | `8h`                      |
| 8-16 hours      | `16h`                     |
| 16-24 hours     | `1d`                      |
| 24-48 hours     | `2d`                      |
| > 48 hours      | `1w` (consider splitting) |

## Session Management

### Starting

```bash
git pull origin main
cat docs/ACTIVE_SESSIONS.md                    # Check for conflicts
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Register in ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID"
```

### Completing

```bash
# Update roadmap status to complete
# Archive: mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/
# Remove from ACTIVE_SESSIONS.md
git commit -m "chore: complete TASK-ID and archive session"
```

## Wave-Based Development (Manus Agents)

### Phase 0: Wave Planning

Pull latest roadmap, analyze and propose a wave (4-6 related tasks).

### Phase 1: Roadmap Claim

Change `[ ]` to `[🔄]` in roadmap. Commit: `roadmap: claim WAVE-[ID] ([task list])`

### Phase 2: Development

Per task: gather context → plan → implement → verify → iterate until all checks pass.

### Phase 3: Post-Merge QA

Wait for staging deploy → health check → error monitoring → live browser verification.

### Phase 4: Wave Completion

Update `[🔄]` to `[x]`. Commit: `roadmap: complete WAVE-[ID] ([task list]) ✓`

## Execution Roadmaps (Complex Tasks)

For tasks with 5+ files, multi-phase, or 16h+ estimates, create `docs/roadmaps/{TASK-ID}-execution-plan.md`:

```markdown
# {TASK-ID} Execution Plan

## Implementation Steps

### Phase 1: {Name}

| Step | File                  | Change       | Est |
| ---- | --------------------- | ------------ | --- |
| 1.1  | server/routers/foo.ts | Add endpoint | 15m |

## Verification Checklist

- [ ] pnpm check passes
- [ ] pnpm test passes

## Rollback Plan

{How to undo}
```

## Common Roadmap Mistakes

```markdown
# WRONG # CORRECT

**Status:** ✅ COMPLETE **Status:** complete
**Priority:** P0 (CRITICAL) **Priority:** HIGH
**Estimate:** 3 days **Estimate:** 2d

- [x] Implement feature - [ ] Implement feature
```
