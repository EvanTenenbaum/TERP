# Integrated Roadmap Execution System

**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## 🎯 Overview

The Integrated Roadmap Execution System seamlessly connects roadmap updates, prompt generation, strategic agent execution planning, and real-time status monitoring into a unified workflow.

### Key Features

- **Automatic Prompt Generation**: When roadmap is updated, prompts are automatically generated for new tasks
- **Strategic Execution Planning**: Analyzes roadmap to determine optimal execution order and parallelization
- **Natural Language Commands**: Use simple commands like "execute phase 2.5" or "go"
- **Real-Time Status Monitoring**: Track agent progress and identify stuck agents
- **Integrated Workflow**: Everything works together - no duplicate systems

---

## 🚀 Quick Start

### 1. Update Roadmap

When you add tasks to the roadmap:

```bash
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Add your tasks following the template
```

### 2. Generate Prompts

Automatically generate prompts for specific phases:

```bash
# Via command line
pnpm roadmap:generate-prompts --phases="Phase 2.5,Phase 3"

# Or via natural language (in .github/AGENT_COMMANDS.md)
# Add: "generate prompts for phase 2.5 and phase 3"
```

### 3. Create Execution Plan

Analyze the roadmap and create a strategic execution plan:

```bash
# Via command line
pnpm roadmap:plan --phases="Phase 2.5"

# Or via natural language
# Add: "execute phase 2.5"
```

This will:
- Analyze task dependencies
- Determine which tasks can run in parallel
- Group tasks into optimal batches
- Save plan to `.github/EXECUTION_PLAN.md`

### 4. Execute

Start the agents:

```bash
# Via command line
pnpm roadmap:execute --phases="Phase 2.5"

# Or via natural language
# Add: "go"
```

The system will:
- Generate prompts (if missing)
- Create execution plan
- Execute tasks in strategic batches
- Monitor progress

---

## 📋 Natural Language Commands

Add commands to `.github/AGENT_COMMANDS.md`:

### Generate Prompts

```
generate prompts for phase 2.5
create prompts for phase 2.5 and phase 3
```

### Execute Phases

```
execute phase 2.5
run phase 2.5
work through phase 2.5
```

### Start Execution

```
go
execute now
start execution
```

### Monitor Status

```
status
show agent status
what's the status?
```

---

## 🔍 Status Monitoring

### Real-Time Status

```bash
# Get current status
pnpm swarm:status

# JSON output
pnpm swarm:status:json
```

### Status Report Includes

- **Active Agents**: Currently working agents with their tasks
- **Stale Agents**: Agents that haven't updated in 4+ hours
- **Pending Tasks**: Tasks waiting to be executed
- **Recommended Tasks**: Next batch of tasks ready to run
- **Completed Today**: Tasks completed in the last 24 hours

### Automated Monitoring

The system automatically:
- Generates status reports every 4 minutes (via GitHub Actions)
- Saves reports to `docs/swarm-status-latest.md`
- Identifies stale agents (no activity for 4+ hours)

---

## 🎯 Strategic Execution Planning

The system automatically analyzes:

### 1. Task Dependencies

- Identifies which tasks depend on others
- Ensures dependencies are completed first
- Detects circular dependencies

### 2. Module Conflicts

- Groups tasks by module
- Prevents parallel execution of tasks touching the same files
- Maximizes parallelization safely

### 3. Priority Ordering

- Executes high-priority tasks first
- Balances priority with dependencies

### 4. Batch Optimization

- Groups tasks into optimal batches (max 4 per batch)
- Ensures no conflicts within a batch
- Estimates time per batch

---

## 📊 Execution Plan Format

The execution plan (`.github/EXECUTION_PLAN.md`) includes:

```markdown
# Execution Plan

**Generated:** 2025-11-21T10:00:00Z
**Phases:** Phase 2.5
**Total Tasks:** 7
**Total Estimated Time:** 24 hours

## Execution Batches

### Batch 1

**Tasks:** BUG-003, BUG-004
**Parallel:** Yes
**Estimated Time:** 8 hours

- BUG-003: Order Creator Connectivity
- BUG-004: Purchase/Intake Modal Data Loss
```

---

## 🔄 Complete Workflow Example

### Scenario: Execute Phase 2.5

1. **User adds command to `.github/AGENT_COMMANDS.md`**:
   ```
   execute phase 2.5
   ```

2. **System parses command** (via `scripts/parse-natural-commands.ts`):
   - Detects: `execute-phases` type
   - Extracts: `target = "Phase 2.5"`

3. **System generates prompts** (via `scripts/roadmap-strategic-executor.ts`):
   - Scans roadmap for Phase 2.5 tasks
   - Generates prompts for each task
   - Saves to `docs/prompts/`

4. **System creates execution plan**:
   - Analyzes dependencies
   - Groups into batches
   - Saves plan to `.github/EXECUTION_PLAN.md`

5. **System executes**:
   - Runs Batch 1 (parallel agents)
   - Waits for completion
   - Runs Batch 2
   - Continues until all tasks complete

6. **System monitors**:
   - Tracks agent progress
   - Updates status reports
   - Identifies issues

---

## 🛠️ Technical Details

### Scripts

- **`scripts/roadmap-strategic-executor.ts`**: Core execution orchestrator
  - `generate-prompts`: Generate prompts for tasks
  - `plan`: Create execution plan
  - `execute`: Execute tasks in batches
  - `go`: Execute existing plan

- **`scripts/parse-natural-commands.ts`**: Parse natural language
  - Detects command types
  - Extracts parameters
  - Returns structured data

- **`scripts/execute-natural-commands.ts`**: Execute parsed commands
  - Routes to appropriate handler
  - Executes commands
  - Reports results

- **`scripts/swarm-status-monitor.ts`**: Status monitoring
  - Reads active sessions
  - Checks agent status
  - Generates reports

### Integration Points

1. **Roadmap System** (`scripts/roadmap.ts`):
   - Parses roadmap
   - Validates tasks
   - Calculates capacity

2. **Swarm Manager** (`scripts/manager.ts`):
   - Executes agents
   - Manages branches
   - Handles timeouts

3. **Natural Language System**:
   - `.github/AGENT_COMMANDS.md`: User commands
   - `.github/workflows/execute-natural-commands.yml`: GitHub Actions workflow

---

## 📝 Best Practices

### 1. Roadmap Updates

- Always validate after updates: `pnpm roadmap:validate`
- Use proper task IDs: `BUG-XXX`, `ST-XXX`, `WF-XXX`, etc.
- Include all required fields: Status, Priority, Module, Estimate

### 2. Execution

- Start with smaller phases to test
- Monitor status regularly
- Check for stale agents

### 3. Status Monitoring

- Review `docs/swarm-status-latest.md` regularly
- Investigate stale agents (>4 hours)
- Check for blocked tasks

---

## 🚨 Troubleshooting

### Prompts Not Generated

```bash
# Check roadmap format
pnpm roadmap:validate

# Force regenerate
pnpm roadmap:generate-prompts --phases="Phase 2.5" --force
```

### Execution Plan Empty

- Check if tasks have correct phase labels
- Verify tasks are not already complete
- Check roadmap format

### Agents Stuck

```bash
# Check status
pnpm swarm:status

# Review session files
ls -la docs/sessions/active/

# Check for git conflicts
git status
```

### Natural Language Not Parsed

- Check command format in `.github/AGENT_COMMANDS.md`
- Review parse output in workflow logs
- Use explicit format: "execute phase 2.5"

---

## 🔗 Related Documentation

- **`docs/ROADMAP_AGENT_GUIDE.md`**: Agent execution protocol
- **`docs/SWARM_MANUAL_START_GUIDE.md`**: Manual swarm control
- **`docs/NATURAL_LANGUAGE_COMMANDS_GUIDE.md`**: Natural language commands
- **`docs/AGENT_MONITORING_GUIDE.md`**: Agent monitoring

---

## ✅ Checklist

Before executing:

- [ ] Roadmap validated: `pnpm roadmap:validate`
- [ ] Prompts generated: `pnpm roadmap:generate-prompts`
- [ ] Execution plan created: `pnpm roadmap:plan`
- [ ] Status monitoring active: `pnpm swarm:status`
- [ ] No conflicts: Check `docs/ACTIVE_SESSIONS.md`

---

**Questions?** Check the troubleshooting section or review the related documentation.

