# Agent Monitoring Guide

**Purpose:** How to monitor the status of agents currently executing tasks via the swarm manager.

**Last Updated:** November 21, 2025

---

## 🎯 Quick Status Check

### 1. Check Swarm Manager Status

```bash
# Get current roadmap status and recommended tasks
npm run swarm status
# or
pnpm swarm status
# or
npx tsx scripts/manager.ts status
```

**Output:**
```json
{
  "phase": "Phase 2.5: Critical Workflow Fixes",
  "pending": ["BUG-002", "BUG-003", "BUG-004", "BUG-005", "BUG-006", "BUG-007", "ST-019"],
  "recommended": ["BUG-002", "BUG-003", "BUG-007"]
}
```

This shows:
- Current phase
- All pending tasks
- Recommended high-priority tasks

---

## 📊 Active Agent Monitoring

### 2. Check Active Sessions

**View active session files:**
```bash
# List all active session files
ls -la docs/sessions/active/

# View a specific session
cat docs/sessions/active/Session-20251121-BUG-003-*.md

# Count active sessions
ls docs/sessions/active/*.md 2>/dev/null | wc -l
```

**View aggregated active sessions:**
```bash
# Check the aggregated sessions file
cat docs/ACTIVE_SESSIONS.md

# Or view with less
less docs/ACTIVE_SESSIONS.md
```

The `ACTIVE_SESSIONS.md` file shows:
- Session ID
- Task being worked on
- Branch name
- Module affected
- Current status
- Start time
- ETA

---

### 3. Check Git Branches

**View agent branches:**
```bash
# List all agent branches
git branch -a | grep "agent/"

# View recent commits on agent branches
git log --oneline --all --grep="agent/" --since="1 hour ago"

# Check if branches are pushed
git branch -r | grep "agent/"
```

**Check branch activity:**
```bash
# See which branches have recent activity
for branch in $(git branch -a | grep "agent/" | sed 's/remotes\/origin\///'); do
  echo "=== $branch ==="
  git log --oneline -5 $branch 2>/dev/null || echo "Branch not found locally"
done
```

---

### 4. Monitor Execution in Real-Time

**While agents are executing:**

The swarm manager shows real-time output during execution:

```bash
npm run swarm execute --auto
# or
npm run swarm execute --batch=BUG-002,BUG-003
```

**Output includes:**
- Task IDs being executed
- Branch names created
- Execution status (success/timeout/error)
- Commit messages
- Branch push status

**Example output:**
```
🚀 Executing 3 agent(s) in parallel...

📊 Execution Results:
==================================================

BUG-002: SUCCESS
  Message: Agent execution completed successfully
  Branch: agent/BUG-002

BUG-003: IN PROGRESS
  Message: Agent is currently working...
  Branch: agent/BUG-003

BUG-007: TIMEOUT
  Message: Agent execution exceeded 90 second timeout
```

---

## 🔍 Detailed Monitoring Methods

### 5. Check Session File Contents

**Read session file for detailed progress:**
```bash
# Find session file for a specific task
find docs/sessions/active -name "*BUG-003*" -type f

# View session file
cat docs/sessions/active/Session-20251121-BUG-003-*.md
```

Session files typically contain:
- Task ID and title
- Current phase (Pre-Flight, Development, Completion)
- Progress checklist
- Notes and findings
- Files modified
- Commits made

---

### 6. Check for Stale Sessions

**Run health check:**
```bash
# Check for stale sessions (older than 4 hours)
./scripts/health-check.sh

# Or manually check
find docs/sessions/active -name "*.md" -mtime +0.16
```

**Stale session indicators:**
- Session file not updated in 4+ hours
- No recent commits on agent branch
- Branch exists but no activity

---

### 7. Monitor via GitHub

**Check GitHub for agent branches:**
```bash
# View branches on GitHub
# Navigate to: https://github.com/EvanTenenbaum/TERP/branches

# Or use GitHub CLI
gh repo view EvanTenenbaum/TERP --json defaultBranchRef
gh api repos/EvanTenenbaum/TERP/branches | jq '.[] | select(.name | startswith("agent/"))'
```

**Check recent commits:**
```bash
# View recent commits from agents
git log --oneline --all --since="2 hours ago" | grep -i "agent\|bug-\|fix"
```

---

## 🚨 Troubleshooting

### Agent Appears Stuck

**Check if agent is actually working:**
```bash
# 1. Check session file last modified time
stat docs/sessions/active/Session-*.md

# 2. Check for recent commits
git log --oneline --all --since="30 minutes ago"

# 3. Check branch activity
git log --oneline agent/BUG-003 --since="30 minutes ago"
```

**If agent is stuck:**
1. Check session file for error messages
2. Verify branch exists and has commits
3. Check if agent hit timeout (90 seconds)
4. Review execution results from swarm manager

---

### Multiple Agents on Same Task

**Check for conflicts:**
```bash
# Check ACTIVE_SESSIONS.md for duplicate tasks
grep -i "BUG-003" docs/ACTIVE_SESSIONS.md

# Check for multiple session files for same task
ls docs/sessions/active/*BUG-003*
```

**Resolution:**
- First agent to push session registration wins
- Other agents should detect conflict and stop
- Manually clean up duplicate sessions if needed

---

### Agent Completed but Session Not Archived

**Check completion status:**
```bash
# Check if task is marked complete in roadmap
grep -A 5 "BUG-003" docs/roadmaps/MASTER_ROADMAP.md | grep "\[x\]"

# Check if session file still exists
ls docs/sessions/active/*BUG-003*

# Check if session is in completed folder
ls docs/sessions/completed/*BUG-003*
```

**Clean up:**
```bash
# Move session to completed
mv docs/sessions/active/Session-*-BUG-003-*.md docs/sessions/completed/

# Update ACTIVE_SESSIONS.md
# Remove session entry manually
```

---

## 📈 Monitoring Dashboard (Manual)

### Create a Status Summary

```bash
#!/bin/bash
# Quick status summary script

echo "=== Agent Status Summary ==="
echo ""

echo "Active Sessions:"
ls docs/sessions/active/*.md 2>/dev/null | wc -l
echo ""

echo "Active Agent Branches:"
git branch -a | grep "agent/" | wc -l
echo ""

echo "Recent Agent Commits (last hour):"
git log --oneline --all --since="1 hour ago" | grep -i "agent\|bug-\|fix" | head -10
echo ""

echo "Pending Tasks:"
npm run swarm status 2>/dev/null | jq -r '.pending[]' | head -10
```

Save as `scripts/agent-status.sh` and run:
```bash
chmod +x scripts/agent-status.sh
./scripts/agent-status.sh
```

---

## 🔔 Automated Monitoring

### Watch for Changes

**Monitor session files:**
```bash
# Watch for new session files
watch -n 5 'ls -lt docs/sessions/active/ | head -10'

# Watch for git activity
watch -n 10 'git log --oneline --all --since="10 minutes ago" | head -5'
```

**Monitor ACTIVE_SESSIONS.md:**
```bash
# Watch for changes to active sessions
watch -n 5 'tail -20 docs/ACTIVE_SESSIONS.md'
```

---

## 📝 Best Practices

1. **Check status before starting new agents:**
   ```bash
   npm run swarm status
   ```

2. **Monitor during execution:**
   - Keep terminal open to see real-time output
   - Watch for timeout/error messages

3. **Verify completion:**
   - Check roadmap for task completion
   - Verify session archived
   - Check branch merged to main

4. **Clean up stale sessions:**
   - Run health check regularly
   - Archive completed sessions
   - Remove old agent branches

---

## 🛠️ Quick Reference Commands

```bash
# Status
npm run swarm status

# Active sessions
ls docs/sessions/active/
cat docs/ACTIVE_SESSIONS.md

# Agent branches
git branch -a | grep "agent/"

# Recent activity
git log --oneline --all --since="1 hour ago"

# Health check
./scripts/health-check.sh

# Stale sessions
find docs/sessions/active -mtime +0.16
```

---

**Last Updated:** November 21, 2025

