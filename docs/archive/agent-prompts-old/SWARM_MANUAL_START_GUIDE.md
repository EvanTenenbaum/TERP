# Swarm Manual Start & "Work Until" Guide

**Purpose:** Manual swarm agent execution with "work until" capability  
**Last Updated:** November 21, 2025

---

## 🚀 Manual Execution

### Local Command Line

```bash
# Execute specific tasks
pnpm swarm execute --batch=BUG-002,BUG-003

# Auto-select recommended tasks
pnpm swarm execute --auto

# Work until a specific phase is complete
pnpm swarm execute --until-phase="Phase 2.5"

# Work until a specific task is complete
pnpm swarm execute --until-task=BUG-007
```

### GitHub Actions Workflow

**Workflow:** `.github/workflows/swarm-auto-start.yml` (renamed to "Swarm Manual Start")

**How to use:**

1. **Go to GitHub Actions:**
   - Navigate to: https://github.com/EvanTenenbaum/TERP/actions
   - Select "Swarm Manual Start" workflow
   - Click "Run workflow"

2. **Choose execution mode:**

   **Mode: Auto**
   - Executes recommended high-priority tasks
   - No additional inputs needed

   **Mode: Batch**
   - Executes specific tasks
   - Input: `batch_tasks` = "BUG-002,BUG-003,BUG-004"

   **Mode: Until Phase**
   - Works through all tasks until phase is complete
   - Input: `target_phase` = "Phase 2.5" or "Phase 3"

   **Mode: Until Task**
   - Works through all tasks until specific task is complete
   - Input: `target_task` = "BUG-007" or "WF-004"

3. **Click "Run workflow"**

---

## 📋 "Work Until" Feature

### How It Works

When you use `--until-phase` or `--until-task`:

1. **Scans the roadmap** for all pending tasks
2. **Filters tasks** up to the target phase/task
3. **Executes in batches** of 3 tasks at a time
4. **Continues** until target is reached or all tasks complete
5. **Stops automatically** when target task is marked complete

### Examples

**Work through Phase 2.5:**

```bash
pnpm swarm execute --until-phase="Phase 2.5"
```

This will:

- Find all tasks in Phase 2.5 (BUG-002 through ST-019)
- Execute them in batches of 3
- Continue until all Phase 2.5 tasks are complete

**Work until BUG-007 is done:**

```bash
pnpm swarm execute --until-task=BUG-007
```

This will:

- Find all pending tasks up to and including BUG-007
- Execute them in order
- Stop when BUG-007 is marked complete

### Phase Names

Common phase names in the roadmap:

- `Phase 2.5: Critical Workflow Fixes`
- `Phase 3: Workflow Integration & Completion`
- `Phase 3.5: Refactoring`

You can use partial matches like:

- `"Phase 2.5"`
- `"Phase 3"`
- `"Critical Workflow Fixes"`

---

## 🔧 Manual Commands Reference

### Basic Execution

```bash
# Execute specific tasks
pnpm swarm execute --batch=BUG-002,BUG-003

# Auto-select recommended
pnpm swarm execute --auto
```

### Work Until Commands

```bash
# Work until phase
pnpm swarm execute --until-phase="Phase 2.5"

# Work until task
pnpm swarm execute --until-task=BUG-007

# Work until workflow task
pnpm swarm execute --until-task=WF-004
```

### Status Commands

```bash
# Check current status
pnpm swarm status

# View status report
pnpm swarm:status

# View as JSON
pnpm swarm:status:json
```

---

## 📊 Monitoring

### Check Progress

While "work until" is running:

1. **View active sessions:**

   ```bash
   cat docs/ACTIVE_SESSIONS.md
   ```

2. **Check agent branches:**

   ```bash
   git branch -a | grep "agent/"
   ```

3. **View latest commits:**

   ```bash
   git log --oneline --all --since="1 hour ago"
   ```

4. **Check status report:**
   ```bash
   cat docs/swarm-status-latest.md
   ```

### GitHub Actions

- View workflow runs: https://github.com/EvanTenenbaum/TERP/actions
- Check execution logs for each batch
- See completion status and any errors

---

## 🎯 Use Cases

### Complete a Phase

```bash
# Complete all tasks in Phase 2.5
pnpm swarm execute --until-phase="Phase 2.5"
```

### Complete Up to a Task

```bash
# Work through all tasks until BUG-007 is done
pnpm swarm execute --until-task=BUG-007
```

### Execute Specific Batch

```bash
# Just run these 3 tasks
pnpm swarm execute --batch=BUG-002,BUG-003,BUG-007
```

### Let System Choose

```bash
# Auto-select recommended high-priority tasks
pnpm swarm execute --auto
```

---

## ⚙️ Configuration

### Batch Size

Default batch size is 3 tasks. To change, edit `scripts/manager.ts`:

```typescript
const batchSize = 3; // Change this value
```

### Timeout

Each agent has a 90-second timeout. To change, edit `scripts/manager.ts`:

```typescript
const AI_TIMEOUT_MS = 90000; // Change this value
```

---

## 🚨 Troubleshooting

### "Target phase not found"

- Check phase name spelling
- Use partial match (e.g., "Phase 2.5" instead of full name)
- Verify phase exists in roadmap

### "Target task not found"

- Check task ID spelling (e.g., "BUG-007" not "bug-007")
- Verify task exists in roadmap
- Check if task is already complete

### Work Until Not Stopping

- Check if target task is actually being marked complete
- Verify roadmap is being updated correctly
- Check for task ID mismatches

### Too Many Tasks Executing

- Use `--batch` mode for specific tasks
- Check roadmap for task dependencies
- Review task priorities

---

## 📝 Best Practices

1. **Start Small:**
   - Test with `--batch` mode first
   - Then try `--until-task` for a single task
   - Finally use `--until-phase` for full phases

2. **Monitor Progress:**
   - Check status regularly during execution
   - Review completed tasks in roadmap
   - Watch for errors or timeouts

3. **Use Appropriate Mode:**
   - `--batch` for specific urgent tasks
   - `--until-task` for milestone completion
   - `--until-phase` for phase completion
   - `--auto` for general progress

4. **Check Dependencies:**
   - Some tasks depend on others
   - Review roadmap for dependency chains
   - Execute dependencies first if needed

---

## 🔗 Related Files

- **Swarm Manager:** `scripts/manager.ts`
- **Status Monitor:** `scripts/swarm-status-monitor.ts`
- **Manual Start Workflow:** `.github/workflows/swarm-auto-start.yml`
- **Status Monitor Workflow:** `.github/workflows/swarm-status-monitor.yml`
- **Monitoring Guide:** `docs/AGENT_MONITORING_GUIDE.md`
- **Latest Status:** `docs/swarm-status-latest.md`

---

**Last Updated:** November 21, 2025
