# Execute Roadmap Wave: Parallel Implementation + QA

## Prerequisites Check

Before proceeding, verify:
1. You are in the TERP repository root directory
2. Run `pwd` to confirm you're in the right place
3. Run `pnpm --version` to confirm pnpm is available

If any prerequisite fails, STOP and report to user.

## Phase 1: Fetch Current State & Select Tasks

Use the Task tool to fetch these files in parallel:

"I need to fetch the current roadmap state. Please retrieve these files simultaneously:
1. docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md
2. docs/ACTIVE_SESSIONS.md
3. List all open pull requests"

After fetching, extract:
- All tasks with `status: ready` in the current phase
- Their task IDs, spec file paths (from the task entry), and module paths

### Conflict Detection (CRITICAL)

Before selecting tasks for parallel execution:

1. List the `module` field for each ready task
2. Check for overlapping file paths
3. If two tasks share ANY file path, they CANNOT run in parallel

Group tasks into:
- **Parallel batch**: Tasks with no file overlaps (max 4)
- **Sequential queue**: Tasks that conflict with batch or each other

Report the grouping to user before proceeding.

## Phase 2: Parallel Implementation

For each task in the parallel batch, explicitly invoke the implementation agent:

"Use the **terp-implementer** agent to implement [TASK_ID].

Context for the agent:
- Task ID: [TASK_ID]
- Spec file: [exact path from task entry, e.g., docs/golden-flows/specs/GF-001-order-creation.md]
- Acceptance criteria: [copy from roadmap]
- Mode: [SAFE/STRICT/RED based on task type]
- Working directory: [output of pwd]

The agent should return: branch name, files modified, verification output, and self-assessment."

Wait for ALL implementation agents to complete before Phase 3.

### If Any Implementation Agent Fails

- Document which task failed and why
- Continue with successful tasks
- Report failures to user at end

## Phase 3: QA Review (Sequential)

For EACH successfully completed branch:

"Use the **terp-qa-reviewer** agent to review [TASK_ID].

Context for the agent:
- Task ID: [TASK_ID]
- Branch name: [from Phase 2 output]
- Spec file: [path]
- Mode: [SAFE/STRICT/RED]
- Files changed: [list from Phase 2]
- Implementation self-assessment: [paste from Phase 2]
- Working directory: [pwd output]

The agent must complete all 5 lenses and return a verdict."

**IMPORTANT**: Run QA reviews ONE AT A TIME. Each needs full context.

## Phase 4: Remediation (If Needed)

For each NO_SHIP verdict with P0/P1 issues:

### Cycle 1

"Use the **terp-implementer** agent to fix QA issues for [TASK_ID].

Context:
- Branch: [existing branch name]  
- Issues to fix: [paste FULL issue details including WHERE, EVIDENCE, and FIX sections]
- Working directory: [pwd]

Fix ONLY the listed issues. Run verification. Commit with: fix([scope]): address QA-XXX"

Then re-run QA (lighter pass):

"Use the **terp-qa-reviewer** agent to verify fixes for [TASK_ID].

Focus on:
- Confirming the specific issues [QA-XXX, QA-YYY] are resolved
- Quick regression check on related code
- Verification commands pass

This is a focused re-review, not a full 5-lens pass."

### Cycle 2 (if still NO_SHIP)

Repeat Cycle 1 once more.

### After Cycle 2 (if still NO_SHIP)

**ESCALATE TO USER**:
```
ESCALATION: [TASK_ID] failed QA after 2 remediation cycles

Remaining issues:
[list]

Recommend:
- Manual developer review
- Task may need spec clarification
- Consider splitting into smaller tasks
```

Do NOT continue to PR creation for this task.

## Phase 5: PR Creation

For each task with SHIP or SHIP_WITH_CONDITIONS verdict:

```bash
# First, ensure branch is pushed
cd [repo root]
git push -u origin [branch-name]
```

Then create PR using GitHub CLI (if available) or note for user:

```bash
# If gh CLI installed:
gh pr create --title "type(scope): [TASK_ID] description" \
  --body "## Summary
[brief description]

## Acceptance Criteria
[from spec]

## Verification
\`\`\`
[paste verification output]
\`\`\`

## QA Verdict
[SHIP/SHIP_WITH_CONDITIONS]
[any conditions noted]

## Checklist
- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build passes
"
```

If gh CLI not available, output the PR details for user to create manually.

### Update Active Sessions

Note the PR number and update ACTIVE_SESSIONS.md to reflect work completed.

## Phase 6: Report

```
═══════════════════════════════════════════════════════════════
WAVE EXECUTION REPORT
═══════════════════════════════════════════════════════════════
Timestamp: [current time]
Working Directory: [pwd]

PARALLEL BATCH:
[list tasks that could run in parallel]

SEQUENTIAL QUEUE (conflicts):
[list tasks that need sequential execution]

RESULTS:
├── ✅ PRs Created: 
│   └── #[N] [TASK_ID] — [one-line summary]
│
├── 🔄 In Remediation:
│   └── [TASK_ID] — [what's blocking, which cycle]
│
├── ❌ Escalated (failed 2 cycles):
│   └── [TASK_ID] — [summary of remaining issues]
│
└── ⏸️ Not Started (in sequential queue):
    └── [TASK_ID] — [will run next wave]

QA SUMMARY:
├── Total issues found: X
├── P0 Blockers: X found, Y fixed
├── P1 Major: X found, Y fixed  
└── P2/P3 Shipped with notes: X

NEXT ACTIONS:
1. [specific next step]
2. [specific next step]

DECISIONS NEEDED FROM EVAN:
- [if any]
═══════════════════════════════════════════════════════════════
```
