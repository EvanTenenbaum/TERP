# Session Cleanup Validation

## Overview

Automated validation ensures agents properly clean up their sessions when completing tasks.

## What It Checks

1. **Stale Sessions:** Tasks marked ✅ Complete must not have active sessions
2. **Duplicate Sessions:** Each task should have at most one active session
3. **Consistency:** ACTIVE_SESSIONS.md and MASTER_ROADMAP.md must be in sync

## When It Runs

- Automatically on every commit (pre-commit hook)
- Manually via `pnpm validate:sessions`

## How to Fix Errors

### Stale Session

```bash
# Archive the session
mv docs/sessions/active/Session-YYYYMMDD-TASK-ID-*.md docs/sessions/completed/

# Remove from ACTIVE_SESSIONS.md
# Edit docs/ACTIVE_SESSIONS.md and delete the line for this task
```

### Duplicate Session

```bash
# Keep the most recent session, archive others
mv docs/sessions/active/Session-YYYYMMDD-TASK-ID-old.md docs/sessions/abandoned/

# Remove duplicates from ACTIVE_SESSIONS.md
# Edit docs/ACTIVE_SESSIONS.md and keep only one entry
```

## For Agents

When completing a task, always:

1. Mark task ✅ Complete in MASTER_ROADMAP.md
2. Archive session to docs/sessions/completed/
3. Remove session from ACTIVE_SESSIONS.md
4. Commit all changes together

The validation will catch it if you forget!

## Implementation Details

The validation script (`scripts/validate-session-cleanup.ts`) performs the following checks:

- Parses MASTER_ROADMAP.md to identify completed tasks
- Scans docs/sessions/active/ for active session files
- Cross-references to detect stale sessions (completed tasks with active sessions)
- Identifies duplicate sessions (multiple active sessions for the same task)

The script is integrated into the development workflow via:

- **Pre-commit hook:** `.husky/pre-commit` runs validation before every commit
- **Manual validation:** `pnpm validate:sessions` for on-demand checks
- **Exit codes:** Returns non-zero on validation failure to block commits

## Benefits

- **Prevents clutter:** Ensures active sessions directory stays clean
- **Maintains consistency:** Keeps roadmap and session tracking in sync
- **Catches mistakes:** Alerts agents when they forget cleanup steps
- **Automated enforcement:** No manual review needed, validation runs automatically
