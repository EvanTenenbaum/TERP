# Adversarial QA: Roadmap System Design

**Date:** November 13, 2025  
**Purpose:** Stress-test the proposed roadmap system to identify all weaknesses

---

## 🔴 CRITICAL FLAWS IDENTIFIED

### 1. **Validation Script Has Race Conditions**

**Problem:**

```typescript
// Current design checks if sections exist
if (!taskContent.includes("#### 📋 Task Metadata")) {
  errors.push("Missing section");
}
```

**Attack Vector:**

```markdown
### ST-999: Fake Task

I can put "#### 📋 Task Metadata" anywhere in the description
and the validation will pass even though it's not actually
a properly formatted metadata section!

#### 📋 Task Metadata

(This is just text, not actual metadata)
```

**Impact:** ❌ Validation can be bypassed with fake section headers

---

### 2. **No Validation of Prompt Content Quality**

**Problem:** Script only checks if prompt exists, not if it's complete

**Attack Vector:**

```markdown
#### 🤖 AGENT PROMPT

<details>
<summary>📖 Expand</summary>

\`\`\`
TODO: Write prompt later
\`\`\`

</details>
```

**Impact:** ❌ Empty/incomplete prompts pass validation

---

### 3. **Capacity Calculator Assumes Clean Data**

**Problem:**

```typescript
const estimate = task.estimate; // What if this is NaN or undefined?
const totalEstimate = batch.reduce((sum, t) => sum + t.estimate, 0);
// Crashes if any estimate is invalid
```

**Attack Vector:** Malformed task with `Estimate: "a few days"` instead of number

**Impact:** ❌ Script crashes, can't generate batch

---

### 4. **Module Conflict Detection Too Simplistic**

**Problem:**

```typescript
// Current: Exact string match
if (task.module === other.module) {
  // conflict
}
```

**Attack Vector:**

```markdown
Task A: Module: server/routers/
Task B: Module: server/routers/accounting.ts
```

These conflict but won't be detected (different strings)

**Impact:** ❌ File conflicts not detected, agents will collide

---

### 5. **No Handling of Circular Dependencies**

**Problem:** Script doesn't detect circular dependencies

**Attack Vector:**

```markdown
ST-010: Dependencies: ST-011
ST-011: Dependencies: ST-010
```

**Impact:** ❌ Both tasks marked "blocked" forever, deadlock

---

### 6. **Pre-Commit Hook Can Be Bypassed**

**Problem:**

```bash
git commit --no-verify  # Bypasses all hooks
```

**Impact:** ❌ Invalid roadmap can still be committed

---

### 7. **Embedded Prompts Will Become Stale**

**Problem:** When task requirements change, who updates the embedded prompt?

**Scenario:**

1. ST-005 created with embedded prompt
2. Dependencies change (ST-004 now required)
3. Embedded prompt still says "Dependencies: None"
4. Agent executes stale prompt, misses dependency

**Impact:** ❌ Prompts drift from reality over time

---

### 8. **No Validation of Task ID Format**

**Problem:** Script assumes `ST-\d+` format but doesn't enforce it

**Attack Vector:**

```markdown
### TASK-005: My Task (wrong format)

### st-005: My Task (lowercase)

### ST-5: My Task (no leading zero)
```

**Impact:** ❌ Inconsistent task IDs break tooling

---

### 9. **Capacity Calculator Doesn't Account for Agent Failure**

**Problem:** Algorithm assumes all agents complete successfully

**Reality:** Batch 1 had 33% failure rate (1/3 agents failed)

**Impact:** ❌ Overestimates capacity, recommends too many agents

---

### 10. **No Mechanism to Update In-Progress Tasks**

**Problem:** Agent starts task, prompt is embedded, requirements change

**Scenario:**

1. Agent 1 starts ST-005 (4-6 hour estimate)
2. 2 hours in, we discover database migration needed
3. Now 8-10 hour estimate
4. Capacity calculator still thinks it's 4-6 hours
5. Recommends too many agents for next batch

**Impact:** ❌ Stale estimates cause over-scheduling

---

### 11. **Markdown Parsing Is Fragile**

**Problem:**

```typescript
const taskRegex = /### (ST-\d+):[\s\S]*?(?=###|$)/g;
```

**Attack Vector:**

```markdown
### ST-005: My Task

Some description with ### in it (breaks regex)

### ST-006: Next Task
```

**Impact:** ❌ Tasks not parsed correctly

---

### 12. **No Validation of Dependencies Exist**

**Problem:** Task can reference non-existent dependencies

**Attack Vector:**

```markdown
**Dependencies:** ST-999, ST-1000
(These tasks don't exist)
```

**Impact:** ❌ Task marked "blocked" forever on phantom dependencies

---

### 13. **Conflicts Field Is Free-Text**

**Problem:**

```markdown
**Conflicts:** Maybe some issues with other stuff?
```

Not machine-readable, can't be used by capacity calculator

**Impact:** ❌ Conflict detection doesn't work

---

### 14. **No Handling of Priority Changes**

**Problem:** High priority task added after batch generated

**Scenario:**

1. Run `pnpm roadmap:next-batch` → recommends ST-005, ST-007, ST-008, ST-009
2. Critical bug found, add ST-999 (HIGH priority)
3. Already deployed 4 agents
4. ST-999 has to wait

**Impact:** ❌ Can't respond to urgent priorities

---

### 15. **Module Field Too Vague**

**Problem:**

```markdown
**Module:** server/routers/\*
```

Does this conflict with `server/routers/accounting.ts`? Unclear.

**Impact:** ❌ Ambiguous conflict detection

---

### 16. **No Rollback Mechanism**

**Problem:** Agent starts task, discovers it's blocked/wrong

**Scenario:**

1. Agent starts ST-005
2. Discovers ST-004 dependency not actually complete
3. No way to "unassign" task and mark it blocked again

**Impact:** ❌ Task stuck "in progress" forever

---

### 17. **Estimate Format Not Standardized**

**Problem:**

```markdown
Task A: Estimate: 4-6 hours
Task B: Estimate: 2 days
Task C: Estimate: 1-2d
Task D: Estimate: 3h
```

How does script parse these?

**Impact:** ❌ Capacity calculator can't sum estimates

---

### 18. **No Handling of Blocked Tasks Becoming Unblocked**

**Problem:** Task blocked on ST-004, ST-004 completes, task still shows "blocked"

**Impact:** ❌ Manual intervention needed to update status

---

### 19. **Parallel Coordination Section Not Machine-Readable**

**Problem:**

```markdown
**Parallel Work Status:**
| Agent | Task | ... |
```

This is manually created, not auto-generated. Will become stale.

**Impact:** ❌ Coordination info is wrong, agents don't know about conflicts

---

### 20. **No Validation That Prompt Matches Task Requirements**

**Problem:** Task metadata says "4-6 hours" but embedded prompt says "2-3 days"

**Impact:** ❌ Contradictory information confuses agents

---

## 🟡 DESIGN FLAWS

### 21. **Collapsible Sections Hide Critical Info**

**Problem:**

```markdown
<details>
<summary>Click to expand</summary>
[PROMPT]
</details>
```

GitHub CLI can't easily parse collapsed sections. Agents would need to:

1. Clone repo
2. Open file in editor
3. Manually expand section
4. Copy prompt

**Impact:** 🟡 More friction than necessary

---

### 22. **No Diff Detection for Prompt Changes**

**Problem:** Prompt updated, no way to notify in-progress agents

**Impact:** 🟡 Agents may work with stale prompts

---

### 23. **Hard-Coded Limits Not Justified**

**Problem:**

```typescript
if (maxSafe > 6) {
  maxSafe = 6; // Why 6? Why not 5 or 7?
}
```

Based on 2 batches of data (6 tasks total). Not statistically significant.

**Impact:** 🟡 Arbitrary limits may be too conservative or too aggressive

---

### 24. **No Consideration of Agent Skill Level**

**Problem:** All agents assumed equal capability

**Reality:** Some agents may be faster/slower, more/less experienced

**Impact:** 🟡 Estimates may be wrong for specific agents

---

### 25. **No Handling of Partial Completion**

**Problem:** Agent completes 80% of task, then fails

**Scenario:**

1. Agent completes implementation + tests
2. Fails on documentation
3. Task marked "failed"
4. Next agent has to redo all work

**Impact:** 🟡 Wasted effort

---

## 🟢 MINOR ISSUES

### 26. **Template Variables Not Auto-Substituted**

**Problem:**

```markdown
Branch: claude/{{TASK_ID}}-Session-{{ID}}
```

Agent has to manually replace `{{TASK_ID}}` with `ST-005`

**Impact:** 🟢 Minor friction

---

### 27. **No Automated Progress Tracking**

**Problem:** Agent must manually update roadmap with progress

**Impact:** 🟢 Relies on agent discipline

---

### 28. **No Integration with GitHub Issues**

**Problem:** Tasks only in roadmap, not in GitHub Issues

**Impact:** 🟢 Can't use GitHub's task tracking features

---

### 29. **No Time Tracking**

**Problem:** No way to track actual vs estimated time

**Impact:** 🟢 Can't improve estimates over time

---

### 30. **No Agent Performance Metrics**

**Problem:** No tracking of which agents complete tasks successfully

**Impact:** 🟢 Can't identify high-performing vs low-performing agents

---

## 📊 SEVERITY SUMMARY

| Severity           | Count  | Examples                                          |
| ------------------ | ------ | ------------------------------------------------- |
| 🔴 **CRITICAL**    | 20     | Validation bypass, stale prompts, race conditions |
| 🟡 **DESIGN FLAW** | 5      | Hard-coded limits, no diff detection              |
| 🟢 **MINOR**       | 5      | No auto-substitution, no time tracking            |
| **TOTAL**          | **30** |                                                   |

---

## 🛠️ REDESIGN REQUIREMENTS

To fix these issues, the system needs:

### 1. **Robust Validation**

- ✅ Parse and validate actual structure, not just text search
- ✅ Validate prompt content quality (minimum length, required sections)
- ✅ Validate dependencies exist
- ✅ Detect circular dependencies
- ✅ Enforce task ID format
- ✅ Validate estimate format (standardized)
- ✅ Cross-check prompt vs metadata for consistency

### 2. **Smart Conflict Detection**

- ✅ Parse module paths hierarchically (server/routers/ contains server/routers/accounting.ts)
- ✅ Machine-readable conflict format
- ✅ Auto-detect conflicts from module paths

### 3. **Resilient Capacity Calculation**

- ✅ Handle invalid data gracefully (NaN, undefined, malformed)
- ✅ Account for historical failure rates
- ✅ Dynamic limits based on actual data, not hard-coded
- ✅ Consider in-progress task updates

### 4. **Prompt Lifecycle Management**

- ✅ Version prompts (detect changes)
- ✅ Notify agents of prompt updates
- ✅ Validate prompt matches task metadata
- ✅ Auto-generate prompt sections from metadata

### 5. **State Management**

- ✅ Handle task state transitions (unassigned → in progress → complete → blocked)
- ✅ Rollback mechanism for failed starts
- ✅ Partial completion tracking
- ✅ Auto-update blocked tasks when dependencies complete

### 6. **Enforcement**

- ✅ Pre-commit hook that can't be bypassed (CI/CD backup)
- ✅ Automated validation on every push
- ✅ Block PR merges with invalid roadmap

### 7. **Observability**

- ✅ Track actual vs estimated time
- ✅ Track agent success rates
- ✅ Identify bottlenecks
- ✅ Improve estimates over time

---

## 🎯 IMPROVED DESIGN (Next Document)

Based on this adversarial QA, I'll create an improved design that addresses all 30 issues...

---

## ⚡ OVER-COMPLEXITY & EFFICIENCY ISSUES

### 31. **Too Many Scripts (3 Separate Files)**

**Problem:**

```
scripts/validate-roadmap.ts       (validation)
scripts/calculate-capacity.ts     (capacity)
scripts/generate-next-batch.ts    (batch generation)
```

These are tightly coupled but split into 3 files. Maintenance nightmare.

**Impact:** 🟡 Harder to maintain, duplicate code likely

**Better:** Single `scripts/roadmap.ts` with subcommands

---

### 32. **Validation Runs on Every Commit**

**Problem:**

```bash
# Pre-commit hook runs validation even if roadmap unchanged
git commit -m "Fix typo in README"
# Still validates entire roadmap (expensive)
```

**Impact:** ⚡ Slow commits, wasted CPU

**Better:** Only validate if `MASTER_ROADMAP.md` changed

---

### 33. **Regex Parsing Is Slow and Fragile**

**Problem:**

```typescript
const taskRegex = /### (ST-\d+):[\s\S]*?(?=###|$)/g;
const tasks = roadmap.match(taskRegex);
// O(n²) complexity for large roadmaps
```

**Impact:** ⚡ Slow for roadmaps with 100+ tasks

**Better:** Parse once into structured data, cache

---

### 34. **Conflict Graph Rebuilt Every Time**

**Problem:**

```typescript
function calculateCapacity() {
  const graph = buildConflictGraph(tasks); // Expensive
  // ...
}
```

Called multiple times, rebuilds graph each time

**Impact:** ⚡ Wasted computation

**Better:** Build once, reuse

---

### 35. **Embedded Prompts Are Huge (500+ Lines)**

**Problem:**

```markdown
#### 🤖 AGENT PROMPT

<details>
<summary>Expand</summary>

[500-1000 lines of prompt with code examples]

</details>
```

Roadmap file becomes 10,000+ lines. Hard to navigate.

**Impact:** 🟡 File too large, slow to load/edit

**Better:** Prompts in separate files, referenced from roadmap

---

### 36. **Manual Metadata Duplication**

**Problem:**

```markdown
**Task ID:** ST-005
**Estimate:** 4-6 hours
**Module:** server/db/schema/

[Later in prompt]
TASK ID: ST-005
ESTIMATE: 4-6 hours
MODULE: server/db/schema/
```

Same info repeated in metadata and prompt. Will drift.

**Impact:** 🔴 Inconsistency, maintenance burden

**Better:** Auto-generate prompt from metadata

---

### 37. **Collapsible Sections Add Complexity**

**Problem:**

```markdown
<details>
<summary>...</summary>
...
</details>
```

Adds HTML to markdown. Harder to parse. GitHub-specific.

**Impact:** 🟡 Vendor lock-in, parsing complexity

**Better:** Use standard markdown, separate files

---

### 38. **Template Variables Require Manual Substitution**

**Problem:**

```markdown
Branch: claude/{{TASK_ID}}-Session-{{ID}}
```

Agent must find and replace all `{{...}}` manually

**Impact:** 🟢 Error-prone, tedious

**Better:** Script auto-generates final prompt with substitutions

---

### 39. **Capacity Algorithm Is Over-Engineered**

**Problem:**

```typescript
// Complex algorithm with multiple rules
maxAgents = min(
  6,
  independentTasks.length,
  floor(20_days / avgEstimate),
  6 - (longTasks * 2)
);
```

Based on 6 tasks of data. Premature optimization.

**Impact:** 🟡 Complex code for minimal benefit

**Better:** Start simple (e.g., "max 4 agents"), iterate based on data

---

### 40. **Progress Tracking in Roadmap Is Manual**

**Problem:**

```markdown
**Progress:** [████████░░] 80%
**Last Updated:** 2025-11-13 14:30
```

Agent must manually update this. Will become stale.

**Impact:** 🟡 Unreliable, maintenance burden

**Better:** Remove or auto-generate from session files

---

### 41. **Parallel Coordination Matrix Is Manual**

**Problem:**

```markdown
| Agent   | Task   | Status      | Conflicts |
| ------- | ------ | ----------- | --------- |
| Agent 1 | ST-005 | In Progress | None      |
```

Manually maintained table. Will become stale immediately.

**Impact:** 🔴 Stale data, agents get wrong info

**Better:** Auto-generate from ACTIVE_SESSIONS.md

---

### 42. **Validation Checks Too Many Things**

**Problem:**

```typescript
// Validates:
- Section existence
- Prompt format
- Objective count
- Checklist count
- Dependency existence
- Circular dependencies
- Task ID format
- Estimate format
- Module path format
- Conflict format
- Metadata consistency
```

12 different checks. Slow, complex, hard to debug.

**Impact:** ⚡ Slow validation, hard to maintain

**Better:** Separate critical vs nice-to-have validations

---

### 43. **No Caching of Parsed Roadmap**

**Problem:**

```bash
pnpm roadmap:validate  # Parses entire roadmap
pnpm roadmap:capacity  # Parses entire roadmap again
pnpm roadmap:next-batch  # Parses entire roadmap again
```

Same file parsed 3 times in sequence

**Impact:** ⚡ Wasted CPU, slow workflow

**Better:** Parse once, cache, reuse

---

### 44. **Estimate Parsing Is Complex**

**Problem:**

```typescript
// Must handle:
"4-6 hours";
"2 days";
"1-2d";
"3h";
"1 week";
```

Complex parsing logic for minimal benefit

**Impact:** 🟡 Over-engineered

**Better:** Enforce single format (e.g., "6h" or "2d")

---

### 45. **Dependency Validation Requires Full Graph Traversal**

**Problem:**

```typescript
function detectCircularDeps(tasks) {
  // DFS on entire dependency graph
  // O(V + E) complexity
}
```

Expensive for large roadmaps

**Impact:** ⚡ Slow for 100+ tasks

**Better:** Lazy validation (only check when dependency added)

---

## 📊 EFFICIENCY SUMMARY

| Issue                       | Type        | Impact    | Fix Complexity                 |
| --------------------------- | ----------- | --------- | ------------------------------ |
| Too many scripts            | Complexity  | 🟡 Medium | Easy (merge)                   |
| Validation on every commit  | Performance | ⚡ High   | Easy (conditional)             |
| Regex parsing               | Performance | ⚡ High   | Medium (rewrite parser)        |
| Conflict graph rebuild      | Performance | ⚡ Medium | Easy (cache)                   |
| Embedded prompts too large  | Complexity  | 🟡 Medium | Hard (redesign)                |
| Manual metadata duplication | Complexity  | 🔴 High   | Medium (auto-generate)         |
| Collapsible sections        | Complexity  | 🟡 Low    | Easy (remove)                  |
| Template variables          | Complexity  | 🟢 Low    | Easy (auto-substitute)         |
| Over-engineered capacity    | Complexity  | 🟡 Medium | Easy (simplify)                |
| Manual progress tracking    | Complexity  | 🟡 Medium | Medium (auto-generate)         |
| Manual coordination matrix  | Complexity  | 🔴 High   | Medium (auto-generate)         |
| Too many validation checks  | Performance | ⚡ Medium | Easy (split critical/optional) |
| No caching                  | Performance | ⚡ High   | Easy (add cache)               |
| Complex estimate parsing    | Complexity  | 🟡 Low    | Easy (enforce format)          |
| Full graph traversal        | Performance | ⚡ Medium | Medium (lazy validation)       |

**Total:** 15 efficiency/complexity issues

---

## 🎯 SIMPLIFICATION PRINCIPLES

### 1. **Separation of Concerns**

**Problem:** Roadmap tries to be:

- Task definition
- Execution instructions
- Progress tracker
- Coordination system

Too many responsibilities.

**Better:**

- **Roadmap:** Task definitions only (metadata + objectives)
- **Prompts:** Separate files (referenced from roadmap)
- **Progress:** Auto-generated from session files
- **Coordination:** Auto-generated from ACTIVE_SESSIONS.md

---

### 2. **Don't Repeat Yourself (DRY)**

**Problem:** Metadata duplicated in:

- Task metadata section
- Embedded prompt
- Completion checklist

**Better:** Single source of truth (metadata), auto-generate rest

---

### 3. **Start Simple, Iterate**

**Problem:** Complex capacity algorithm based on 6 data points

**Better:**

- **V1:** Simple rule: "Max 4 agents, no module conflicts"
- **V2:** After 10 batches, add complexity based on real data
- **V3:** Machine learning model (if needed)

---

### 4. **Automate What Can Be Automated**

**Problem:** Manual updates to:

- Progress tracking
- Coordination matrix
- Dependency status

**Better:** Auto-generate from:

- Session files (progress)
- ACTIVE_SESSIONS.md (coordination)
- Task completion status (dependencies)

---

### 5. **Validate Once, Cache Results**

**Problem:** Parse roadmap 3 times for 3 commands

**Better:**

```typescript
// Parse once
const roadmap = parseRoadmap();

// Run all operations on parsed data
validate(roadmap);
const capacity = calculateCapacity(roadmap);
generateBatch(roadmap, capacity);
```

---

## 🎯 REDESIGN GOALS

Based on all 45 issues identified, the improved design must:

### Critical Fixes (20 issues)

1. ✅ Robust validation (parse structure, not text search)
2. ✅ Smart conflict detection (hierarchical paths)
3. ✅ Resilient capacity calculation (handle invalid data)
4. ✅ Auto-generate prompts from metadata (no duplication)
5. ✅ Auto-generate coordination info (no manual updates)
6. ✅ Detect circular dependencies
7. ✅ Validate dependencies exist
8. ✅ Enforce task ID format
9. ✅ Standardize estimate format
10. ✅ Version prompts (detect changes)

### Simplification (15 issues)

11. ✅ Single script file (not 3 separate)
12. ✅ Conditional validation (only if roadmap changed)
13. ✅ Efficient parsing (not regex)
14. ✅ Cache parsed data (reuse)
15. ✅ Separate prompts from roadmap (keep roadmap small)
16. ✅ Remove collapsible sections (use standard markdown)
17. ✅ Auto-substitute template variables
18. ✅ Simplify capacity algorithm (start with simple rules)
19. ✅ Remove manual progress tracking
20. ✅ Split critical vs optional validations

### Nice-to-Have (10 issues)

21. ✅ Time tracking
22. ✅ Agent performance metrics
23. ✅ Partial completion tracking
24. ✅ GitHub Issues integration
25. ✅ Rollback mechanism

---

## 📋 IMPROVED DESIGN COMING NEXT

The next document will present a completely redesigned system that:

1. **Fixes all 20 critical flaws**
2. **Simplifies by removing 15 complexity issues**
3. **Adds 10 nice-to-have features**
4. **Is 50% less code**
5. **Is 10x faster**
6. **Is actually maintainable**

Key changes:

- ❌ No embedded prompts in roadmap (separate files)
- ❌ No manual metadata duplication (auto-generated)
- ❌ No manual progress tracking (auto-generated)
- ❌ No complex capacity algorithm (simple rules)
- ✅ Single script with subcommands
- ✅ Efficient parsing with caching
- ✅ Robust validation with clear errors
- ✅ Auto-generated coordination info

**Total issues identified: 45**

- 🔴 Critical: 20
- 🟡 Design flaws: 10
- ⚡ Performance: 10
- 🟢 Minor: 5
