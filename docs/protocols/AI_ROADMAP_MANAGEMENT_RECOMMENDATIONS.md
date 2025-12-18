# AI-Native Roadmap Management: Recommendations

**Version**: 1.0  
**Created**: December 17, 2025  
**Based On**: Comprehensive roadmap audit experience and best practices research

---

## Executive Summary

After conducting a thorough audit of the TERP roadmap (5,589 lines, 98 tasks), several systemic issues were identified that affect AI agent effectiveness. This document provides actionable recommendations to improve roadmap management for AI-native workflows.

### Key Issues Identified

1. **Duplicate Tasks**: Same issues logged with different IDs (BUG-010/BUG-019, etc.)
2. **Missing Commit Evidence**: Tasks marked complete without proof
3. **Inconsistent Status Tracking**: Tasks left in wrong states
4. **Large Monolithic File**: 5,589 lines makes auditing difficult
5. **Format Validation Gaps**: Agents make format errors that break validation
6. **Stale Task Detection**: No automated way to find abandoned tasks

---

## Recommendation 1: Automated Duplicate Detection

### Problem

During the audit, I found 4 duplicate task pairs that had accumulated over time:

- BUG-010 → BUG-019 (Global Search Bar 404)
- BUG-014 → BUG-020 (Todo Lists 404)
- BUG-015 → BUG-021 (Command Palette)
- BUG-016 → BUG-022 (Theme Toggle)

### Solution

Add duplicate detection to the validation script.

```typescript
// Add to scripts/roadmap.ts

interface DuplicateCandidate {
  taskA: string;
  taskB: string;
  similarity: number;
  reason: string;
}

function detectDuplicates(tasks: Task[]): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const taskA = tasks[i];
      const taskB = tasks[j];

      // Skip if both complete (historical duplicates are fine)
      if (taskA.status === "complete" && taskB.status === "complete") continue;

      // Check title similarity (Levenshtein or simple word overlap)
      const titleSimilarity = calculateSimilarity(taskA.title, taskB.title);

      // Check module overlap
      const sameModule = taskA.module === taskB.module;

      // Check objective overlap
      const objectiveOverlap = calculateObjectiveOverlap(
        taskA.objectives,
        taskB.objectives
      );

      if (titleSimilarity > 0.7 || (sameModule && objectiveOverlap > 0.5)) {
        candidates.push({
          taskA: taskA.id,
          taskB: taskB.id,
          similarity: Math.max(titleSimilarity, objectiveOverlap),
          reason:
            titleSimilarity > 0.7
              ? "Similar titles"
              : "Same module with overlapping objectives",
        });
      }
    }
  }

  return candidates;
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union; // Jaccard similarity
}

function calculateObjectiveOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map(o => o.toLowerCase()));
  const setB = new Set(b.map(o => o.toLowerCase()));
  const intersection = [...setA].filter(o => setB.has(o)).length;
  return intersection / Math.min(a.length, b.length);
}
```

### CLI Command

```bash
pnpm roadmap duplicates  # List potential duplicates
```

---

## Recommendation 2: Commit Evidence Requirements

### Problem

Tasks were marked complete without commit evidence, making it impossible to verify work was done.

### Solution

Require commit evidence for task completion.

#### A. Add to Task Schema

```markdown
### ST-XXX: Task Title

**Status:** complete
**Completed:** 2025-12-17
**Key Commits:** `abc1234`, `def5678`
**Actual Time:** 6h
```

#### B. Validation Rule

```typescript
// Add to validation
if (task.status === "complete") {
  if (!task.keyCommits || task.keyCommits.length === 0) {
    warnings.push({
      taskId: task.id,
      line: task.lineNumber,
      warning: "Complete task missing Key Commits field",
    });
  }

  if (!task.completedDate) {
    warnings.push({
      taskId: task.id,
      line: task.lineNumber,
      warning: "Complete task missing Completed date",
    });
  }
}
```

#### C. Commit Verification (Optional)

```typescript
async function verifyCommits(commits: string[]): Promise<boolean> {
  for (const hash of commits) {
    try {
      execSync(`git cat-file -t ${hash}`, { encoding: "utf-8" });
    } catch {
      return false; // Commit doesn't exist
    }
  }
  return true;
}
```

---

## Recommendation 3: Pre-Commit Validation Hook

### Problem

Agents commit roadmap changes without running validation, introducing format errors.

### Solution

Add a git pre-commit hook that validates roadmap changes.

```bash
#!/bin/bash
# .husky/pre-commit (add to existing)

# Check if roadmap was modified
if git diff --cached --name-only | grep -q "docs/roadmaps/MASTER_ROADMAP.md"; then
  echo "🔍 Validating roadmap changes..."

  if ! pnpm roadmap:validate --incremental; then
    echo "❌ Roadmap validation failed. Fix errors before committing."
    exit 1
  fi

  echo "✅ Roadmap validation passed"
fi
```

---

## Recommendation 4: Task Lifecycle State Machine

### Problem

Tasks get stuck in invalid states (e.g., `in-progress` for weeks without updates).

### Solution

Implement a formal state machine with transition rules.

```
                    ┌─────────────┐
                    │   ready     │
                    └──────┬──────┘
                           │ claim
                           ▼
                    ┌─────────────┐
         ┌─────────│ in-progress │─────────┐
         │         └──────┬──────┘         │
         │ block          │ complete       │ abandon
         ▼                ▼                ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   blocked   │  │  complete   │  │   ready     │
  └─────────────┘  └─────────────┘  └─────────────┘
         │
         │ unblock
         ▼
  ┌─────────────┐
  │   ready     │
  └─────────────┘
```

### Validation Rules

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  ready: ["in-progress"],
  "in-progress": ["complete", "blocked", "ready"], // ready = abandoned
  blocked: ["ready"],
  complete: [], // Terminal state
};

function validateStatusTransition(
  taskId: string,
  oldStatus: string,
  newStatus: string
): boolean {
  const allowed = VALID_TRANSITIONS[oldStatus] || [];
  return allowed.includes(newStatus);
}
```

### Stale Task Detection

```typescript
function detectStaleTasks(tasks: Task[]): Task[] {
  const stale: Task[] = [];
  const now = Date.now();
  const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const task of tasks) {
    if (task.status === "in-progress") {
      // Check last commit touching this task's module
      const lastActivity = getLastActivityDate(task.module);
      if (now - lastActivity > STALE_THRESHOLD) {
        stale.push(task);
      }
    }
  }

  return stale;
}
```

### CLI Command

```bash
pnpm roadmap stale  # List tasks in-progress for >7 days
```

---

## Recommendation 5: Structured Notes Field

### Problem

Important context gets lost when tasks are updated. No history of what was tried.

### Solution

Add a structured Notes section with timestamps.

```markdown
### ST-XXX: Task Title

**Status:** in-progress

**Notes:**

- [2025-12-17 10:30] Started work, found additional complexity in auth module
- [2025-12-17 14:00] Blocked by missing API endpoint, created BUG-027
- [2025-12-18 09:00] Unblocked, continuing implementation
```

### Agent Protocol

```markdown
## When Updating Task Status

1. **Always add a note** explaining the status change
2. **Include timestamp** in ISO format or human-readable
3. **Reference related tasks** if blocked/unblocked
4. **Document decisions** that affect implementation
```

---

## Recommendation 6: Task ID Reservation System

### Problem

Multiple agents creating tasks simultaneously can cause ID collisions.

### Solution

Implement a simple ID reservation system.

#### Option A: Sequential Counter File

```bash
# docs/roadmaps/.next-ids.json
{
  "ST": 15,
  "BUG": 28,
  "QA": 6,
  "DATA": 12,
  "FEATURE": 5
}
```

```typescript
function reserveTaskId(prefix: string): string {
  const idsFile = "docs/roadmaps/.next-ids.json";
  const ids = JSON.parse(readFileSync(idsFile, "utf-8"));
  const nextId = ids[prefix] || 1;
  ids[prefix] = nextId + 1;
  writeFileSync(idsFile, JSON.stringify(ids, null, 2));
  return `${prefix}-${String(nextId).padStart(3, "0")}`;
}
```

#### Option B: Git-Based Locking

```bash
# Reserve ID by creating a placeholder commit
git commit --allow-empty -m "reserve: ST-015"
```

---

## Recommendation 7: Periodic Audit Automation

### Problem

Manual audits are time-consuming and easy to forget.

### Solution

Create an automated weekly audit script.

```typescript
// scripts/roadmap-audit.ts

interface AuditReport {
  timestamp: string;
  totalTasks: number;
  byStatus: Record<string, number>;
  issues: AuditIssue[];
  recommendations: string[];
}

interface AuditIssue {
  severity: "error" | "warning" | "info";
  taskId?: string;
  message: string;
}

async function runAudit(): Promise<AuditReport> {
  const { tasks } = parseRoadmap();
  const issues: AuditIssue[] = [];

  // Check for stale tasks
  const staleTasks = detectStaleTasks(tasks);
  for (const task of staleTasks) {
    issues.push({
      severity: "warning",
      taskId: task.id,
      message: `Task in-progress for >7 days without activity`,
    });
  }

  // Check for duplicates
  const duplicates = detectDuplicates(tasks);
  for (const dup of duplicates) {
    issues.push({
      severity: "warning",
      taskId: dup.taskA,
      message: `Potential duplicate of ${dup.taskB} (${dup.reason})`,
    });
  }

  // Check for missing commit evidence
  const completedWithoutEvidence = tasks.filter(
    t => t.status === "complete" && !t.keyCommits?.length
  );
  for (const task of completedWithoutEvidence) {
    issues.push({
      severity: "info",
      taskId: task.id,
      message: "Complete task missing commit evidence",
    });
  }

  // Check for blocked tasks with no notes
  const blockedWithoutReason = tasks.filter(
    t => t.status === "blocked" && !t.notes?.length
  );
  for (const task of blockedWithoutReason) {
    issues.push({
      severity: "warning",
      taskId: task.id,
      message: "Blocked task has no explanation",
    });
  }

  return {
    timestamp: new Date().toISOString(),
    totalTasks: tasks.length,
    byStatus: countByStatus(tasks),
    issues,
    recommendations: generateRecommendations(issues),
  };
}
```

### GitHub Action for Weekly Audit

```yaml
# .github/workflows/roadmap-audit.yml
name: Weekly Roadmap Audit

on:
  schedule:
    - cron: "0 9 * * 1" # Every Monday at 9am
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm roadmap:audit
      - name: Create Issue if Problems Found
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Weekly Roadmap Audit Found Issues',
              body: 'Run `pnpm roadmap:audit` locally for details.'
            })
```

---

## Recommendation 8: Consolidation Protocol

### Problem

Completed tasks accumulate, making the roadmap unwieldy (5,589 lines).

### Solution

Implement a quarterly consolidation protocol.

````markdown
## Quarterly Consolidation Protocol

### When

- First week of each quarter
- Or when roadmap exceeds 6,000 lines

### Process

1. **Archive Completed Tasks**
   - Move tasks with `status: complete` older than 90 days to archive
   - Location: `docs/roadmaps/archive/YYYY-QX-completed.md`
   - Keep summary statistics in main roadmap

2. **Consolidate Duplicate Entries**
   - Run `pnpm roadmap duplicates`
   - Merge or link related tasks
   - Update references

3. **Clean Up Abandoned Tasks**
   - Tasks `blocked` for >60 days without updates → archive or delete
   - Tasks `in-progress` for >30 days without commits → reset to `ready`

4. **Update Statistics**
   - Refresh the Statistics section
   - Update version number

### Archive Format

```markdown
# Completed Tasks Archive - Q4 2025

## Summary

- Tasks Completed: 45
- Total Time: 180h
- Key Achievements: [list]

## Tasks

[Full task entries for reference]
```
````

---

## Recommendation 9: Agent-Specific Guidance

### Problem

Agents make the same mistakes repeatedly (format errors, missing fields).

### Solution

Add explicit guidance to steering files.

#### Add to `.kiro/steering/terp-master-protocol.md`:

````markdown
## Common Roadmap Mistakes to Avoid

### ❌ Wrong Deliverable Format

```markdown
# WRONG - checked boxes

- [x] Implement feature

# CORRECT - unchecked boxes only

- [ ] Implement feature
```
````

### ❌ Wrong Status Format

```markdown
# WRONG - with emoji or extra text

**Status:** ✅ COMPLETE
**Status:** ready (waiting for review)

# CORRECT - exact values only

**Status:** complete
**Status:** ready
```

### ❌ Missing Commit Evidence

```markdown
# WRONG - no evidence

**Status:** complete

# CORRECT - with evidence

**Status:** complete
**Completed:** 2025-12-17
**Key Commits:** `abc1234`, `def5678`
```

### ❌ Complex Dependencies

```markdown
# WRONG - descriptions in dependencies

**Dependencies:** ST-001 (must be complete first), BUG-005

# CORRECT - IDs only

**Dependencies:** ST-001, BUG-005
```

## Pre-Commit Checklist for Roadmap Changes

Before committing ANY roadmap change:

1. [ ] Run `pnpm roadmap:validate`
2. [ ] Verify status is exact value: `ready`, `in-progress`, `complete`, `blocked`
3. [ ] Verify priority is exact value: `HIGH`, `MEDIUM`, `LOW`
4. [ ] Verify estimate format: `4h`, `8h`, `16h`, `1d`, `2d`, `1w`
5. [ ] Deliverables use `- [ ]` format (unchecked)
6. [ ] Dependencies are task IDs only (no descriptions)
7. [ ] If completing task, add `Key Commits` and `Completed` date
8. [ ] Add note explaining the change

````

---

## Recommendation 10: Structured Task Templates

### Problem
Agents create tasks with inconsistent structure.

### Solution
Provide copy-paste templates.

```markdown
## Task Templates

### New Bug Task
```markdown
### BUG-XXX: [Brief Description]

**Status:** ready
**Priority:** [HIGH|MEDIUM|LOW]
**Estimate:** [4h|8h|16h]
**Module:** [path/to/affected/code]
**Dependencies:** None
**Prompt:** docs/prompts/BUG-XXX.md

**Problem:**
[Describe the bug - what's happening vs what should happen]

**Objectives:**
- Identify root cause of the issue
- Implement fix without breaking existing functionality
- Add test coverage to prevent regression

**Deliverables:**
- [ ] Root cause identified and documented
- [ ] Fix implemented
- [ ] Unit tests added
- [ ] Manual testing completed
- [ ] No new TypeScript errors introduced

**Acceptance Criteria:**
- Bug no longer reproducible
- All existing tests pass
- No performance regression
````

### New Feature Task

```markdown
### FEATURE-XXX: [Feature Name]

**Status:** ready
**Priority:** [HIGH|MEDIUM|LOW]
**Estimate:** [8h|16h|1d|2d]
**Module:** [path/to/feature/code]
**Dependencies:** [None or task IDs]
**Prompt:** docs/prompts/FEATURE-XXX.md

**Problem:**
[What user need does this address?]

**Objectives:**

- [Specific goal 1]
- [Specific goal 2]
- [Specific goal 3]

**Deliverables:**

- [ ] Database schema changes (if any)
- [ ] Backend API endpoints
- [ ] Frontend UI components
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Documentation updated

**Acceptance Criteria:**

- Feature works as specified
- All tests pass
- Accessible (WCAG 2.1 AA)
- No performance regression
```

```

---

## Implementation Priority

| Recommendation | Effort | Impact | Priority |
|----------------|--------|--------|----------|
| 3. Pre-Commit Hook | Low | High | P0 |
| 9. Agent Guidance | Low | High | P0 |
| 2. Commit Evidence | Low | Medium | P1 |
| 1. Duplicate Detection | Medium | High | P1 |
| 4. State Machine | Medium | Medium | P1 |
| 5. Structured Notes | Low | Medium | P2 |
| 7. Audit Automation | Medium | Medium | P2 |
| 6. ID Reservation | Medium | Low | P3 |
| 8. Consolidation | High | Medium | P3 |
| 10. Templates | Low | Low | P3 |

---

## Quick Wins (Implement Today)

1. **Add pre-commit hook** for roadmap validation
2. **Update steering file** with common mistakes section
3. **Add `Key Commits` field** to completion requirements
4. **Run duplicate detection** manually during audits

---

## Summary

The current roadmap system is functional but has gaps that cause recurring issues. The recommendations above address:

- **Prevention**: Pre-commit hooks, better guidance, templates
- **Detection**: Duplicate detection, stale task detection, automated audits
- **Maintenance**: Consolidation protocol, structured notes, commit evidence

Implementing even the P0 and P1 items would significantly improve AI agent effectiveness when working with the roadmap.

---

**Next Steps:**
1. Review recommendations with team
2. Implement P0 items immediately
3. Schedule P1 items for next sprint
4. Add P2/P3 to backlog
```
