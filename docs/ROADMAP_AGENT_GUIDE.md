# Roadmap Agent Guide (Current)

This repository’s **single source of truth** for execution work is:

- `docs/roadmaps/MASTER_ROADMAP.md`

## Operational Protocol (Required)

### Before starting work

1. Read `docs/roadmaps/MASTER_ROADMAP.md`
2. Ensure there is a roadmap task for the work you’re about to do
3. Create a session file under `docs/sessions/active/`
4. Confirm no conflicts in `docs/ACTIVE_SESSIONS.md`
5. Select verification mode per `.kiro/steering/08-adaptive-qa-protocol.md`

### When adding tasks

Follow:

- `docs/HOW_TO_ADD_TASK.md`
- `docs/templates/TASK_TEMPLATE.md`

### When updating tasks (in-progress / complete)

1. Update the task entry in `docs/roadmaps/MASTER_ROADMAP.md`
2. Add **Key Commits** and completion notes when relevant
3. Archive the session to `docs/sessions/completed/`
4. Regenerate sessions index: `./scripts/aggregate-sessions.sh`

### Validation (MANDATORY before committing roadmap/session changes)

Run:

- `pnpm roadmap:validate`
- `pnpm validate:sessions`

If validation fails, **do not commit** until fixed.

## Reference

- Initiative → roadmap workflow: `docs/protocols/INITIATIVE_TO_ROADMAP_WORKFLOW.md`
