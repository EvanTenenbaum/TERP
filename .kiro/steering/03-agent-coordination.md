---
inclusion: always
---
# Agent Coordination (Streamlined)

## Simple Rules

### Before Starting
1. Pull latest: git pull origin main
2. Check for conflicts in files you plan to edit

### While Working  
1. Commit frequently (small, atomic commits)
2. Push after each logical unit of work
3. Use clear commit messages

### If Conflicts Occur
1. Pull with rebase: git pull --rebase origin main
2. Resolve conflicts
3. Push: git push origin main

## Session Files (Optional)

Session files in docs/sessions/active/ are optional coordination aids.
They help track who is working on what, but do NOT block other agents.

**There is NO exclusive file ownership.** Multiple agents can work on the same files.
Git handles merges. If conflicts occur, resolve them.

## Best Practices

**DO:**
- Pull before starting work
- Push frequently  
- Use clear commit messages

**DO NOT:**
- Wait for permission to edit files
- Block on session registration
- Overthink coordination

Keep it simple. Git handles the rest.
