---
inclusion: always
---

# 🤝 TERP Agent Coordination

**Version**: 2.0  
**Last Updated**: 2025-12-02  
**Status**: MANDATORY

Multiple AI agents may work simultaneously on TERP. This document ensures they don't conflict.

---

## Core Coordination Principles

### 1. GitHub is the Single Source of Truth

- Your local changes are invisible until pushed
- Other agents' changes are invisible until you pull
- **Always pull before starting work**
- **Always push after completing work**

### 2. Session Registration is Mandatory

Before working on any task:
1. Create session file in `docs/sessions/active/`
2. Register in `docs/ACTIVE_SESSIONS.md`
3. Commit and push registration
4. **First to push wins**

### 3. File Ownership During Sessions

- If another agent has a session on files you need, **STOP**
- Wait for them to finish or work on different task
- Never edit files another agent is actively working on

### 4. Frequent Synchronization

- Pull before each phase
- Push after each phase
- Update session file regularly
- Commit small, atomic changes

---

## Session Management

### Checking Active Sessions

```bash
# View all active sessions
cat docs/ACTIVE_SESSIONS.md

# Check specific task
grep "TASK-ID" docs/ACTIVE_SESSIONS.md

# List active session files
ls docs/sessions/active/
```


### Registering Your Session

```bash
# 1. Generate unique session ID
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"

# 2. Create session file
cat > docs/sessions/active/$SESSION_ID.md << EOF
# Session: TASK-ID - Task Title

**Status**: In Progress
**Started**: $(date)
**Agent Type**: [Implementation/PM/QA/etc.]
**Files**: [List files you'll be editing]

## Progress
- [ ] Phase 1
- [ ] Phase 2

## Notes
[Your notes]
EOF

# 3. Register in active sessions
echo "- $SESSION_ID: TASK-ID - [Files: file1.ts, file2.ts]" >> docs/ACTIVE_SESSIONS.md

# 4. Commit and push IMMEDIATELY
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID for TASK-ID"
git push origin main

# 5. Check if push succeeded
# If rejected, another agent registered first - check for conflicts
```

### Detecting Conflicts

```bash
# After pulling, check if another agent is working on same files
cat docs/ACTIVE_SESSIONS.md

# Look for sessions mentioning files you need
# Example: "Files: server/routers/calendar.ts"

# If conflict detected:
# Option 1: Wait (check back in 30 minutes)
# Option 2: Work on different task
# Option 3: Coordinate with user
```

### Updating Session Progress

```bash
# Update your session file regularly
# Edit docs/sessions/active/$SESSION_ID.md

# Mark completed items
- [x] Phase 1 - Database schema
- [ ] Phase 2 - API endpoints

# Add notes about progress
## Notes
- Completed calendar_events table
- Added indexes on foreign keys
- Next: Implement tRPC router

# Commit and push updates
git add docs/sessions/active/$SESSION_ID.md
git commit -m "chore: update session progress"
git push origin main
```

### Completing Your Session

```bash
# 1. Archive session file
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 2. Remove from active sessions
# Edit docs/ACTIVE_SESSIONS.md and remove your line

# 3. Commit
git add docs/sessions/completed/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: complete and archive session $SESSION_ID"
git push origin main
```

---

## Conflict Resolution Strategies

### Strategy 1: Time-Based Coordination

**Stagger your work**:
- Agent A: Works on Task 1 (0-2 hours)
- Agent B: Works on Task 2 (0-2 hours)
- Both push, no conflicts

### Strategy 2: Module-Based Coordination

**Work on different modules**:
- Agent A: Calendar module
- Agent B: Inventory module
- Minimal file overlap

### Strategy 3: Layer-Based Coordination

**Work on different layers**:
- Agent A: Database schema + migrations
- Agent B: API endpoints (after A finishes)
- Agent C: UI components (after B finishes)

### Strategy 4: Sequential Phases

**Work in phases**:
1. Agent A: Phase 1 (foundation)
2. Agent A pushes, Agent B pulls
3. Agent B: Phase 2 (builds on Phase 1)
4. Agent B pushes, Agent C pulls
5. Agent C: Phase 3 (final integration)

---

## Synchronization Protocol

### Before Starting Each Phase

```bash
# 1. Pull latest
git pull --rebase origin main

# 2. Check for conflicts in your files
git status

# 3. If conflicts, resolve them
# (see 02-workflows.md for conflict resolution)

# 4. Verify your session is still active
cat docs/ACTIVE_SESSIONS.md | grep "$SESSION_ID"

# 5. Proceed with work
```

### After Completing Each Phase

```bash
# 1. Run tests
pnpm test

# 2. Check diagnostics
# Kiro: getDiagnostics(["file.ts"])
# External: pnpm typecheck

# 3. Commit changes
git add .
git commit -m "feat(TASK-ID): complete phase X"

# 4. Pull and rebase
git pull --rebase origin main

# 5. Resolve any conflicts
# (if another agent pushed while you were working)

# 6. Push
git push origin main

# 7. Update session file
# Mark phase complete

# 8. Push session update
git add docs/sessions/active/$SESSION_ID.md
git commit -m "chore: mark phase X complete"
git push origin main
```

---

## Roadmap Coordination

### Reading the Roadmap

```bash
# Check current roadmap state
cat docs/roadmaps/MASTER_ROADMAP.md

# Look for:
# - Tasks marked [~] (in progress by another agent)
# - Tasks marked [ ] (available)
# - Tasks marked [x] (completed)
```

### Claiming a Task

```bash
# 1. Find available task in roadmap
# Status should be "ready", not "in-progress"

# 2. Update task status to "in-progress"
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Change **Status:** ready to **Status:** in-progress

# 3. Validate roadmap
pnpm roadmap:validate

# 4. Commit and push
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "roadmap: claim TASK-ID"
git push origin main

# 5. If push rejected, another agent claimed it first
# Choose different task
```

### Updating Task Progress

```bash
# Update roadmap with progress
# Edit docs/roadmaps/MASTER_ROADMAP.md

# Add progress notes
**Progress:** 
- [x] Database schema complete
- [x] API endpoints complete
- [ ] UI components in progress

# Commit and push
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "roadmap: update TASK-ID progress"
git push origin main
```

---

## Communication Patterns

### Implicit Communication (via Git)

**Session files** tell other agents:
- What you're working on
- Which files you're editing
- Your progress
- When you'll be done (estimated)

**Commit messages** tell other agents:
- What changed
- Why it changed
- Which task it relates to

**Roadmap updates** tell other agents:
- Task status
- Progress percentage
- Blockers or issues

### Explicit Communication (via User)

When you need to coordinate directly:

```
"I'm working on TASK-123 which requires changes to calendar.ts.
I see another agent (Session-20251202-TASK-456-abc123) is also 
working on calendar.ts. Should I:
1. Wait for them to finish
2. Work on a different task
3. Coordinate to split the work?"
```

---

## Conflict Scenarios and Solutions

### Scenario 1: Same File, Different Functions

**Problem**: Both agents need to edit `server/routers/calendar.ts`

**Solution**:
- Agent A: Works on `list` and `create` endpoints
- Agent B: Works on `update` and `delete` endpoints
- Both push, Git merges automatically (different sections)

### Scenario 2: Same File, Same Function

**Problem**: Both agents need to modify `calculateDiscount()`

**Solution**:
- Agent A: Registers session first, works on it
- Agent B: Sees active session, works on different task
- Agent B: Returns after Agent A completes

### Scenario 3: Dependent Tasks

**Problem**: Task B depends on Task A completion

**Solution**:
- Agent A: Completes Task A, pushes
- Agent B: Waits, pulls, then starts Task B
- Sequential execution

### Scenario 4: Roadmap Conflicts

**Problem**: Both agents update roadmap simultaneously

**Solution**:
```bash
# Pull with rebase
git pull --rebase origin main

# Resolve conflicts (prefer additive merges)
# Keep both agents' changes when possible

# Mark resolved
git add docs/roadmaps/MASTER_ROADMAP.md
git rebase --continue
git push origin main
```

---

## Monitoring Other Agents

### Check Agent Activity

```bash
# See all active agents
cat docs/ACTIVE_SESSIONS.md

# See recent commits from agents
git log --oneline --since="1 hour ago"

# See what files are being modified
git log --oneline --name-only --since="1 hour ago"
```

### Detect Stale Sessions

```bash
# Find sessions older than 4 hours
find docs/sessions/active -name "*.md" -mtime +0.16

# If found, check if agent is still working
git log --oneline --since="4 hours ago" | grep "TASK-ID"

# If no recent activity, session may be stale
# Report to user for cleanup
```

---

## Best Practices for Multi-Agent Work

### DO ✅

- Register session before starting work
- Push frequently (after each phase)
- Pull before each phase
- Update session file with progress
- Check active sessions before claiming task
- Commit small, atomic changes
- Use clear commit messages
- Archive session when done
- Validate roadmap before committing

### DON'T ❌

- Start work without registering session
- Edit files another agent is working on
- Go hours without pushing
- Skip pulling before phases
- Leave sessions unarchived
- Make large, monolithic commits
- Use vague commit messages
- Forget to update roadmap

---

## Emergency Coordination

### Another Agent's Session is Blocking You

```bash
# 1. Check session file for details
cat docs/sessions/active/Session-*-TASK-ID-*.md

# 2. Check recent activity
git log --oneline --since="1 hour ago" | grep "TASK-ID"

# 3. If no recent activity (> 2 hours):
#    Report to user: "Session X appears stale, no activity for 2+ hours"

# 4. If recent activity:
#    Work on different task or wait
```

### You Need to Take Over a Stale Session

```bash
# ONLY with user approval:

# 1. Archive the stale session
mv docs/sessions/active/Session-OLD.md docs/sessions/abandoned/

# 2. Create your new session
# (follow normal session registration)

# 3. Document takeover
echo "Took over from Session-OLD due to inactivity" >> docs/sessions/active/$SESSION_ID.md

# 4. Commit
git add docs/sessions/active/$SESSION_ID.md docs/sessions/abandoned/Session-OLD.md
git commit -m "chore: take over stale session for TASK-ID"
git push origin main
```

---

## Coordination Tools

### Session Health Check

```bash
# Run health check script
./scripts/health-check.sh

# Shows:
# - Active sessions
# - Stale sessions (> 4 hours)
# - Orphaned sessions (no recent commits)
```

### Capacity Check

```bash
# Check how many agents can work simultaneously
pnpm roadmap:capacity

# Shows:
# - Available tasks
# - Tasks in progress
# - Recommended parallelism level
```

---

## Summary

**Key Coordination Rules**:

1. **Register before work**: Session file + ACTIVE_SESSIONS.md
2. **Push first wins**: First to push claims the task
3. **Pull frequently**: Before each phase
4. **Push frequently**: After each phase
5. **Check before claiming**: Review active sessions
6. **Respect ownership**: Don't edit others' files
7. **Communicate implicitly**: Via commits and session files
8. **Communicate explicitly**: Via user when needed

**Follow these rules and multiple agents can work harmoniously without conflicts.**
