# Self-Contained Roadmap System - Complete Design

**Date:** November 13, 2025  
**Purpose:** Enforce protocol compliance + Calculate safe parallel agent capacity

---

## 🎯 System Goals

1. **100% Protocol Compliance** - Every task follows exact structure (enforced automatically)
2. **Safe Capacity Calculation** - System tells you how many agents can run safely
3. **Simple Deployment** - One-line prompt per agent

---

## 1️⃣ Protocol Enforcement System

### A. Required Task Structure (Enforced)

Every task in MASTER_ROADMAP.md MUST have these sections:

```markdown
### [TASK_ID]: [Title] [Status] [Priority]

#### 📋 Task Metadata

- **Task ID:** [TASK_ID]
- **Status:** Unassigned | In Progress | Complete | Blocked
- **Priority:** 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW
- **Estimate:** [X hours/days]
- **Module:** [Files/directories affected]
- **Dependencies:** [List of task IDs or "None"]
- **Conflicts:** [Potential file/module conflicts or "None"]

#### 🎯 Objectives

[Bullet list of clear, measurable goals]

#### 🤖 AGENT PROMPT

<details>
<summary>📖 Expand to view executable prompt</summary>

\`\`\`
[COMPLETE SELF-CONTAINED PROMPT]
Must include:

- Repository URL
- Task requirements
- Implementation steps with code examples
- Test requirements
- Deliverables checklist
- Protocol compliance instructions
- Parallel coordination notes
\`\`\`
</details>

#### ✅ Completion Checklist

- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Session archived
```

### B. Validation Script

**File:** `scripts/validate-roadmap.ts`

````typescript
import { readFileSync } from "fs";

interface TaskValidation {
  taskId: string;
  valid: boolean;
  errors: string[];
}

const REQUIRED_SECTIONS = [
  "#### 📋 Task Metadata",
  "- **Task ID:**",
  "- **Status:**",
  "- **Priority:**",
  "- **Estimate:**",
  "- **Module:**",
  "- **Dependencies:**",
  "- **Conflicts:**",
  "#### 🎯 Objectives",
  "#### 🤖 AGENT PROMPT",
  "#### ✅ Completion Checklist",
];

function validateTask(taskContent: string, taskId: string): TaskValidation {
  const errors: string[] = [];

  // Check all required sections exist
  for (const section of REQUIRED_SECTIONS) {
    if (!taskContent.includes(section)) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Check prompt has code block
  if (!taskContent.match(/```[\s\S]*?```/)) {
    errors.push("Agent prompt must be in code block");
  }

  // Check has at least 3 objectives
  const objectives = taskContent.match(/^- .+$/gm) || [];
  if (objectives.length < 3) {
    errors.push("Must have at least 3 objectives");
  }

  // Check has at least 5 completion items
  const checklistItems = taskContent.match(/^- \[ \] .+$/gm) || [];
  if (checklistItems.length < 5) {
    errors.push("Must have at least 5 completion checklist items");
  }

  return {
    taskId,
    valid: errors.length === 0,
    errors,
  };
}

function validateRoadmap(): void {
  const roadmap = readFileSync("docs/roadmaps/MASTER_ROADMAP.md", "utf-8");

  // Extract all tasks (ST-XXX format)
  const taskRegex = /### (ST-\d+):[\s\S]*?(?=###|$)/g;
  const tasks = roadmap.match(taskRegex) || [];

  const results: TaskValidation[] = [];

  for (const task of tasks) {
    const taskIdMatch = task.match(/ST-\d+/);
    if (!taskIdMatch) continue;

    const taskId = taskIdMatch[0];
    results.push(validateTask(task, taskId));
  }

  // Report results
  const invalid = results.filter(r => !r.valid);

  if (invalid.length > 0) {
    console.error("❌ Roadmap validation FAILED\n");
    for (const result of invalid) {
      console.error(`${result.taskId}:`);
      result.errors.forEach(err => console.error(`  - ${err}`));
      console.error("");
    }
    process.exit(1);
  }

  console.log(
    `✅ Roadmap validation PASSED (${results.length} tasks validated)`
  );
}

validateRoadmap();
````

### C. Pre-Commit Hook Integration

**File:** `.husky/pre-commit` (update)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Existing checks...
pnpm lint-staged

# NEW: Validate roadmap if MASTER_ROADMAP.md changed
if git diff --cached --name-only | grep -q "MASTER_ROADMAP.md"; then
  echo "🔍 Validating MASTER_ROADMAP.md..."
  pnpm roadmap:validate || exit 1
fi
```

**File:** `package.json` (update)

```json
{
  "scripts": {
    "roadmap:validate": "tsx scripts/validate-roadmap.ts",
    "roadmap:capacity": "tsx scripts/calculate-capacity.ts",
    "roadmap:next-batch": "tsx scripts/generate-next-batch.ts"
  }
}
```

### D. Enforcement Guarantees

✅ **Cannot commit invalid roadmap** - Pre-commit hook blocks  
✅ **Cannot push invalid roadmap** - CI/CD validates  
✅ **Cannot merge PR with invalid roadmap** - GitHub Actions check  
✅ **Visual feedback** - Script shows exactly what's missing

---

## 2️⃣ Safe Capacity Calculation System

### A. Conflict Analysis Algorithm

**File:** `scripts/calculate-capacity.ts`

```typescript
interface Task {
  id: string;
  module: string;
  conflicts: string[];
  dependencies: string[];
  estimate: number; // in hours
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface CapacityAnalysis {
  maxSafeAgents: number;
  recommendedBatch: Task[];
  reasoning: string[];
  warnings: string[];
}

function calculateSafeCapacity(availableTasks: Task[]): CapacityAnalysis {
  const reasoning: string[] = [];
  const warnings: string[] = [];

  // Step 1: Filter out tasks with unmet dependencies
  const ready = availableTasks.filter(task => {
    const depsComplete = task.dependencies.every(dep => isTaskComplete(dep));
    if (!depsComplete) {
      reasoning.push(`${task.id}: Blocked by dependencies`);
    }
    return depsComplete;
  });

  reasoning.push(`${ready.length} tasks ready (dependencies met)`);

  // Step 2: Build conflict graph
  const conflictGraph = buildConflictGraph(ready);

  // Step 3: Find maximum independent set (tasks with no conflicts)
  const batch: Task[] = [];
  const modules = new Set<string>();

  // Sort by priority (HIGH > MEDIUM > LOW)
  const sorted = ready.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  for (const task of sorted) {
    // Check if this task conflicts with any in batch
    const hasConflict = batch.some(
      t => conflictGraph.get(task.id)?.has(t.id) || modules.has(task.module)
    );

    if (!hasConflict) {
      batch.push(task);
      modules.add(task.module);
      reasoning.push(`${task.id}: Added to batch (no conflicts)`);
    } else {
      reasoning.push(`${task.id}: Skipped (conflicts with batch)`);
    }
  }

  // Step 4: Apply safety limits
  let maxSafe = batch.length;

  // Rule 1: Never exceed 6 agents (empirical limit)
  if (maxSafe > 6) {
    warnings.push("Capping at 6 agents (max safe parallel limit)");
    maxSafe = 6;
  }

  // Rule 2: If any task >2 days, reduce batch size
  const longTasks = batch.filter(t => t.estimate > 16); // >2 days
  if (longTasks.length > 0) {
    warnings.push(`${longTasks.length} tasks >2 days - reducing batch`);
    maxSafe = Math.min(maxSafe, 4);
  }

  // Rule 3: If total estimate >20 days, reduce batch
  const totalEstimate = batch.reduce((sum, t) => sum + t.estimate, 0);
  if (totalEstimate > 160) {
    // >20 days total
    warnings.push("Total estimate >20 days - reducing batch");
    maxSafe = Math.min(maxSafe, 3);
  }

  return {
    maxSafeAgents: maxSafe,
    recommendedBatch: batch.slice(0, maxSafe),
    reasoning,
    warnings,
  };
}

function buildConflictGraph(tasks: Task[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const task of tasks) {
    graph.set(task.id, new Set());

    // Add explicit conflicts
    for (const conflictId of task.conflicts) {
      graph.get(task.id)!.add(conflictId);
    }

    // Add implicit conflicts (same module)
    for (const other of tasks) {
      if (task.id !== other.id && task.module === other.module) {
        graph.get(task.id)!.add(other.id);
      }
    }
  }

  return graph;
}
```

### B. Capacity Rules (Empirical)

Based on Batch 1 & 2 results:

| Scenario                | Max Agents | Reasoning                  |
| ----------------------- | ---------- | -------------------------- |
| **All tasks <1 day**    | 6          | Low coordination overhead  |
| **1-2 tasks >2 days**   | 4          | Medium coordination needed |
| **Any task >4 days**    | 3          | High coordination needed   |
| **Same module**         | 1          | Direct file conflicts      |
| **Related modules**     | 2-3        | Potential conflicts        |
| **Independent modules** | 6          | No conflicts               |

**Safety Formula:**

```
maxAgents = min(
  6,  // Hard limit
  independentTasks.length,
  floor(20_days / avgTaskEstimate),  // Total capacity
  6 - (longTasks.length * 2)  // Penalty for long tasks
)
```

### C. Output Format

**Command:** `pnpm roadmap:capacity`

**Output:**

```
🔍 Analyzing TERP Roadmap Capacity...

📊 Available Tasks: 12
✅ Ready (dependencies met): 8
⏳ Blocked (waiting on dependencies): 4

🎯 Recommended Next Batch: 4 agents

Agent 1: ST-005 (Database Indexes) - 6h - 🟡 MEDIUM
  Module: server/db/schema/
  Conflicts: None

Agent 2: ST-008 (Error Tracking) - 2d - 🟡 MEDIUM
  Module: config/, src/_app.tsx
  Conflicts: None

Agent 3: ST-009 (API Monitoring) - 3d - 🟡 MEDIUM
  Module: server/_core/middleware/
  Conflicts: Minor with ST-007 (coordinate on commits)

Agent 4: ST-007 (Pagination) - 4d - 🟡 MEDIUM
  Module: server/routers/*
  Conflicts: Minor with ST-005, ST-009

⚠️  Warnings:
- ST-007 is >3 days - will complete last
- ST-009 and ST-007 may touch middleware - coordinate

✅ Safe to deploy 4 agents in parallel
📈 Estimated completion: 4 days (longest task)
🔄 Next batch available: After ST-005 completes (~6h)
```

---

## 3️⃣ Simple Deployment System

### A. Batch Generation Script

**File:** `scripts/generate-next-batch.ts`

```typescript
function generateNextBatch(): void {
  const analysis = calculateSafeCapacity(getAvailableTasks());

  console.log(`\n🚀 NEXT BATCH: ${analysis.maxSafeAgents} Agents\n`);
  console.log("Copy each prompt below to deploy agents:\n");
  console.log("─".repeat(60));

  analysis.recommendedBatch.forEach((task, index) => {
    console.log(`\n**Agent ${index + 1}:**`);
    console.log(
      `Go to TERP roadmap, find ${task.id}, execute the embedded prompt`
    );
    console.log("");
  });

  console.log("─".repeat(60));
  console.log(`\n✅ Deploy all ${analysis.maxSafeAgents} agents now\n`);
}
```

**Command:** `pnpm roadmap:next-batch`

**Output:**

```
🚀 NEXT BATCH: 4 Agents

Copy each prompt below to deploy agents:

────────────────────────────────────────────────────────────

**Agent 1:**
Go to TERP roadmap, find ST-005, execute the embedded prompt

**Agent 2:**
Go to TERP roadmap, find ST-008, execute the embedded prompt

**Agent 3:**
Go to TERP roadmap, find ST-009, execute the embedded prompt

**Agent 4:**
Go to TERP roadmap, find ST-007, execute the embedded prompt

────────────────────────────────────────────────────────────

✅ Deploy all 4 agents now
```

### B. Ultra-Simple Agent Prompt

**What you send to each agent:**

```
Go to TERP roadmap, find ST-005, execute the embedded prompt
```

**What the agent does:**

1. Clone https://github.com/EvanTenenbaum/TERP
2. Open docs/roadmaps/MASTER_ROADMAP.md
3. Search for "ST-005"
4. Expand the "🤖 AGENT PROMPT" section
5. Execute everything in that code block

**That's it!** No separate files, no confusion.

---

## 4️⃣ Workflow Integration

### A. Your Deployment Workflow

```bash
# 1. Check capacity
pnpm roadmap:capacity

# Output: "✅ Safe to deploy 4 agents"

# 2. Generate prompts
pnpm roadmap:next-batch

# Output: Simple one-line prompt for each agent

# 3. Deploy agents
# Copy each prompt to new agent conversation

# 4. Monitor progress
# Agents update ACTIVE_SESSIONS.md and roadmap status

# 5. When batch completes, repeat
pnpm roadmap:next-batch
```

### B. Agent Workflow (Automated)

```
Agent receives: "Go to TERP roadmap, find ST-005, execute the embedded prompt"

Agent executes:
1. Clone repo
2. Find ST-005 in roadmap
3. Read full context (dependencies, conflicts, progress)
4. Expand embedded prompt
5. Execute prompt (has everything needed)
6. Update roadmap status as progresses
7. Report completion
```

---

## 5️⃣ Safety Mechanisms

### A. Pre-Flight Checks (Automated)

Before recommending batch, system checks:

```typescript
const safetyChecks = [
  {
    name: "No blocking dependencies",
    check: () => allDependenciesMet(batch),
  },
  {
    name: "No direct file conflicts",
    check: () => noModuleOverlap(batch),
  },
  {
    name: "Total estimate reasonable",
    check: () => totalEstimate(batch) < 30 * 8, // <30 days
  },
  {
    name: "No more than 1 long task (>4d)",
    check: () => batch.filter(t => t.estimate > 32).length <= 1,
  },
  {
    name: "Batch size within limits",
    check: () => batch.length <= 6,
  },
];

const allPassed = safetyChecks.every(check => check.check());
if (!allPassed) {
  throw new Error("Safety checks failed - cannot recommend batch");
}
```

### B. Conflict Detection

**Types of conflicts detected:**

1. **Direct conflicts** - Same file/module
   - **Action:** Never in same batch
2. **Indirect conflicts** - Related modules (e.g., middleware + routers)
   - **Action:** Allow but warn to coordinate
3. **Dependency conflicts** - Task B depends on Task A
   - **Action:** Task B waits for next batch

### C. Empirical Limits

Based on Batch 1 & 2 data:

| Metric               | Limit   | Reason                       |
| -------------------- | ------- | ---------------------------- |
| Max agents           | 6       | Coordination overhead        |
| Max per module       | 1       | File conflicts               |
| Max long tasks (>4d) | 1       | Completion time spread       |
| Total estimate       | 30 days | Reasonable completion window |

---

## 6️⃣ Template System

### A. Task Template

**File:** `docs/templates/TASK_TEMPLATE.md`

```markdown
### ST-XXX: [Task Title] ⬜ UNASSIGNED

#### 📋 Task Metadata

- **Task ID:** ST-XXX
- **Status:** Unassigned
- **Priority:** 🟡 MEDIUM
- **Estimate:** X hours/days
- **Module:** path/to/files/
- **Dependencies:** ST-YYY, ST-ZZZ (or "None")
- **Conflicts:** Potential conflicts (or "None")

#### 🎯 Objectives

- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

#### 🤖 AGENT PROMPT

<details>
<summary>📖 Expand to view executable prompt</summary>

\`\`\`
You are executing ST-XXX: [Task Title] from the TERP Master Roadmap.

REPOSITORY: https://github.com/EvanTenenbaum/TERP
TASK ID: ST-XXX
MODULE: path/to/files/

QUICK START:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read protocols: docs/ROADMAP_AGENT_GUIDE.md
3. Create session: docs/sessions/active/Session-[ID]-ST-XXX.md
4. Create branch: claude/ST-XXX-[description]-Session-[ID]
5. Update roadmap: Mark ST-XXX "In Progress"

TASK REQUIREMENTS:
[Detailed requirements from roadmap]

IMPLEMENTATION STEPS:
Step 1: [First step with code example]
Step 2: [Second step with code example]
...

DELIVERABLES:

- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] Tests passing
- [ ] Documentation complete

COMPLETION CRITERIA:

- All tests passing (pnpm test)
- Zero TypeScript errors (pnpm check)
- Documentation complete
- Merged to main
- Session archived
\`\`\`
</details>

#### ✅ Completion Checklist

- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Documentation complete
- [ ] Session archived
```

### B. Adding New Tasks

```bash
# 1. Copy template
cp docs/templates/TASK_TEMPLATE.md /tmp/new-task.md

# 2. Fill in all sections
# (Use template as guide)

# 3. Add to MASTER_ROADMAP.md

# 4. Validate
pnpm roadmap:validate

# 5. Commit
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "roadmap: Add ST-XXX task"

# Pre-commit hook automatically validates!
```

---

## 7️⃣ Migration Plan

### Phase 1: Setup (1 hour)

- [ ] Create `scripts/validate-roadmap.ts`
- [ ] Create `scripts/calculate-capacity.ts`
- [ ] Create `scripts/generate-next-batch.ts`
- [ ] Update `package.json` scripts
- [ ] Update `.husky/pre-commit` hook
- [ ] Create `docs/templates/TASK_TEMPLATE.md`

### Phase 2: Migrate Next Batch (2 hours)

- [ ] Update ST-005 with embedded prompt
- [ ] Update ST-007 with embedded prompt
- [ ] Update ST-008 with embedded prompt
- [ ] Update ST-009 with embedded prompt
- [ ] Validate: `pnpm roadmap:validate`

### Phase 3: Test System (30 min)

- [ ] Run: `pnpm roadmap:capacity`
- [ ] Run: `pnpm roadmap:next-batch`
- [ ] Verify output matches expectations
- [ ] Test pre-commit hook

### Phase 4: Deploy Batch 3 (Use new system!)

- [ ] Run: `pnpm roadmap:next-batch`
- [ ] Copy simple prompts to 4 agents
- [ ] Monitor agent progress
- [ ] Verify system works end-to-end

### Phase 5: Backfill (Optional)

- [ ] Add embedded prompts to completed tasks (ST-001 through ST-006)
- [ ] Add embedded prompts to remaining tasks (ST-010+)

---

## 8️⃣ Benefits Summary

### For You (User)

✅ **Simple deployment:** One command gives you all prompts  
✅ **Safe capacity:** System tells you max agents without risk  
✅ **No manual calculation:** Automated conflict detection  
✅ **Quality guarantee:** Invalid tasks blocked by pre-commit hook

### For Agents

✅ **Single source of truth:** Everything in one place  
✅ **Full context:** See dependencies, conflicts, progress  
✅ **Self-contained:** No hunting for separate files  
✅ **Clear instructions:** Step-by-step with code examples

### For Codebase

✅ **Enforced standards:** Every task follows exact structure  
✅ **Version controlled:** Prompts tracked with tasks  
✅ **Automated validation:** Catch errors before commit  
✅ **Scalable:** Works for 10 tasks or 1000 tasks

---

## 9️⃣ Example Output

### Command: `pnpm roadmap:next-batch`

```
🔍 Analyzing TERP Roadmap...

📊 Status:
- Total tasks: 25
- Complete: 6 ✅
- In progress: 0 ⏳
- Ready: 8 📋
- Blocked: 11 🚫

🎯 Recommended Batch: 4 agents (safe capacity)

Reasoning:
✓ 8 tasks ready (dependencies met)
✓ 4 tasks have no conflicts
✓ Total estimate: 15.5 days (within limits)
✓ 1 long task (ST-007: 4d) - acceptable
✓ All modules independent

⚠️  Coordination needed:
- ST-009 + ST-007: Both may touch middleware (minor)

────────────────────────────────────────────────────────────

🚀 DEPLOY THESE 4 AGENTS NOW:

Agent 1: Go to TERP roadmap, find ST-005, execute the embedded prompt
Agent 2: Go to TERP roadmap, find ST-008, execute the embedded prompt
Agent 3: Go to TERP roadmap, find ST-009, execute the embedded prompt
Agent 4: Go to TERP roadmap, find ST-007, execute the embedded prompt

────────────────────────────────────────────────────────────

✅ Safe to deploy all 4 agents in parallel
📈 Estimated completion: 4 days (ST-007 is longest)
🔄 Next batch available: After ST-005 completes (~6 hours)
```

---

## 🎯 Summary

**This system provides:**

1. **100% Enforcement** - Pre-commit hook blocks invalid tasks
2. **Safe Capacity** - Algorithm calculates max agents without risk
3. **Simple Deployment** - One-line prompt per agent
4. **Single Source of Truth** - Roadmap contains everything
5. **Automated Validation** - Catch errors before they cause problems

**Your workflow becomes:**

```bash
pnpm roadmap:next-batch  # Get prompts
# Copy to agents
# Done!
```

**Agent workflow becomes:**

```
"Go to TERP roadmap, find ST-XXX, execute the embedded prompt"
# Everything needed is in that one place
```

---

**Ready to implement?** This gives you:

- Guaranteed protocol compliance
- Safe parallel capacity
- Ultra-simple deployment
- No manual coordination needed
