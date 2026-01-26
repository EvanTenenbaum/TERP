# Cleanup and Simplification Plan

**Goal:** Reduce complexity, consolidate documentation, and make good behavior automatic.

---

## Current State (The Problem)

| Category | Count | Problem |
|----------|-------|---------|
| GitHub Workflows | 31 | Many redundant, unclear which are used |
| Skipped Tests | 43 | Technical debt pretending to be tests |
| Protocol Docs | 10 | Duplicates CLAUDE.md content |
| Steering Docs | 14 | More duplication, unclear authority |
| Roadmap Files | 5+ | Multiple roadmaps, unclear which is active |

**Core Issue:** Too many places to look, too many rules to remember, too much ceremony.

---

## Target State (The Solution)

### 1. Single Source of Truth: CLAUDE.md

Everything an agent needs should be in CLAUDE.md. Other docs should be:
- **Deleted** if redundant
- **Demoted** to reference-only (not instructions)

### 2. Workflows: Consolidate to 5

| Keep | Purpose |
|------|---------|
| `pr-check.yml` | TypeScript + lint + tests on every PR |
| `deploy.yml` | Deploy to production on main push |
| `nightly.yml` | Schema validation, coverage, cleanup |
| `manual.yml` | Manual triggers for specific tasks |
| `release.yml` | Version bumps, release notes |

**Delete the rest** (or archive if uncertain).

### 3. Tests: Fix or Delete

For each of the 43 skipped tests:
- If the bug is fixed → unskip
- If the test is obsolete → delete
- If the bug is real → create task OR delete test

**No middle ground.** Skipped tests are clutter.

### 4. Roadmap: Make It Self-Enforcing

**Current workflow (manual):**
1. Agent reads task from roadmap
2. Agent updates status to in-progress
3. Agent creates session file
4. Agent works
5. Agent marks complete
6. Agent archives session

**Problem:** Steps 2, 3, 5, 6 are often forgotten.

**Better workflow (automated):**
```bash
# Start work (one command does it all)
pnpm start-task BUG-123

# Creates session file
# Updates roadmap status
# Creates branch
# Outputs task context

# Finish work (one command does it all)
pnpm complete-task BUG-123

# Verifies tests pass
# Updates roadmap status
# Archives session
# Prompts for commit message
```

The scripts enforce the workflow. Agents don't need to remember.

---

## Execution Plan

### Phase 1: Delete Skipped Tests (Today)

```bash
# For each skipped test file, either:
# 1. Remove the .skip and verify it passes
# 2. Delete the entire test if obsolete
# 3. Create a BUG task if it's a real issue
```

### Phase 2: Consolidate Workflows (Today)

1. Identify which workflows are actually triggered
2. Merge redundant ones
3. Delete unused ones
4. Document remaining 5 in CLAUDE.md

### Phase 3: Consolidate Docs (Today)

1. Review each doc in `.kiro/steering/` and `docs/protocols/`
2. If content is in CLAUDE.md → delete the doc
3. If content is missing from CLAUDE.md → move it there, then delete
4. Keep only true reference docs (dictionary, architecture diagrams)

### Phase 4: Create Task Scripts (Today)

Create `scripts/start-task.ts` and `scripts/complete-task.ts` that:
- Automate session/roadmap management
- Run verification before completion
- Make the right workflow the easy workflow

---

## What Gets Deleted

### Workflows to Delete (21)
- add-secrets.yml (manual - use CLI)
- bootstrap-secrets.yml (one-time setup)
- bundle-size.yml (nice-to-have, not essential)
- copilot-setup-steps.yml (GitHub Copilot specific)
- coverage.yml (merge into nightly)
- daily-qa.yml (merge into nightly)
- deploy-dashboard-pages.yml (separate app)
- deploy-watchdog.yml (merge into deploy)
- docs-generate.yml (manual)
- execute-natural-commands.yml (unused)
- fix-lockfile-now.yml (use sync-lockfile)
- mega-qa-cloud.yml (merge into nightly)
- mobile-issue-commands.yml (unused)
- morning-summary.yml (noise)
- qa-initial-audit.yml (one-time)
- set-secrets.yml (use CLI)
- slack-bot-deploy.yml (separate)
- swarm-auto-start.yml (unused)
- swarm-status-monitor.yml (unused)
- update-dashboard.yml (merge into deploy)
- update-lockfile.yml (use sync-lockfile)

### Docs to Delete
- `.kiro/steering/` - Most duplicates CLAUDE.md
- `docs/protocols/` - Most duplicates CLAUDE.md
- Keep only: CANONICAL_DICTIONARY.md (reference)

### Tests to Delete
- Any test with `.skip` that hasn't been fixed in 30+ days
- Any test that tests deprecated functionality

---

## The New Simple Structure

```
TERP/
├── CLAUDE.md                    # THE source of truth
├── .husky/
│   └── pre-commit               # Security pattern checks
├── .github/workflows/
│   ├── pr-check.yml             # PR validation
│   ├── deploy.yml               # Production deploy
│   ├── nightly.yml              # Scheduled tasks
│   └── release.yml              # Release management
├── scripts/
│   ├── start-task.ts            # Start working on a task
│   └── complete-task.ts         # Complete a task
└── docs/
    ├── roadmaps/
    │   └── MASTER_ROADMAP.md    # THE roadmap
    └── reference/
        └── DICTIONARY.md        # Term definitions only
```

**That's it.** No steering docs, no protocol docs, no scattered instructions.

---

## Measuring Success

| Metric | Before | After |
|--------|--------|-------|
| Workflows | 31 | 5 |
| Skipped tests | 43 | 0 |
| Instruction docs | 24+ | 1 (CLAUDE.md) |
| Steps to start task | 6+ manual | 1 command |
| Steps to complete task | 4+ manual | 1 command |

**If it's not in CLAUDE.md, it doesn't exist.**
**If there's no script for it, it won't happen.**
