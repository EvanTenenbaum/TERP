---
inclusion: always
---

# Agent Coordination (Mandatory)

## Before Starting

1. **Pull latest**: `git pull origin main`
2. **Check active sessions**: `cat docs/ACTIVE_SESSIONS.md`
3. **Register your session** in `docs/sessions/active/`
4. **Confirm file ownership**: Do **not** edit files another agent is actively working on

## While Working

1. **Commit frequently** (small, atomic commits)
2. **Push after each logical unit of work**
3. **Update your session file** with progress and touched files

## Conflict Rules

If another agent is working on the same files:

1. **Stop immediately**
2. Coordinate via session notes or pick a different task
3. Only proceed once the conflict is resolved

## If Conflicts Occur in Git

```bash
git pull --rebase origin main
# resolve conflicts
git add <resolved-files>
git rebase --continue
git push
```

## Non-Negotiables

- **Session registration is mandatory**
- **No parallel edits to the same files**
- **Status must be visible** to other agents via sessions + roadmap
