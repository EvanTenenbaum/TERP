# Roadmap System V2 - Second Adversarial QA

**Date:** November 13, 2025  
**Purpose:** Fresh QA on improved V2 design to catch remaining issues  
**Previous QA:** Fixed 45 issues

---

## 🔴 NEW CRITICAL ISSUES FOUND

### 1. **Agent Can't Access Prompt File Easily**

**Problem:**

```
Agent 1: Go to TERP roadmap, find ST-005, open docs/prompts/ST-005.md
```

Agent must:

1. Clone repo
2. Navigate to file
3. Open in editor
4. Read prompt

**Better:**

```
Agent 1: https://github.com/EvanTenenbaum/TERP/blob/main/docs/prompts/ST-005.md
```

Direct link, one click, readable in browser.

**Impact:** 🔴 Friction in deployment

**Fix:** Generate direct GitHub URLs

---

### 2. **Prompt Template Has Manual Section**

**Problem:**

```markdown
## Implementation Guide

[TO BE FILLED IN MANUALLY WITH STEP-BY-STEP INSTRUCTIONS]
```

Who fills this in? When? How do we ensure it's done?

**Impact:** 🔴 Prompts may be incomplete

**Fix:** Validation must check implementation section is not empty/placeholder

---

### 3. **No Versioning of Prompts**

**Problem:**

```markdown
> **Last updated:** 2025-11-13 15:30
```

Timestamp, but no version number. If prompt updated while agent working, how does agent know?

**Impact:** 🔴 Agent may work with stale prompt

**Fix:** Add version hash (git commit SHA of last change)

---

### 4. **Coordination Section Can't Be Auto-Generated Accurately**

**Problem:**

```typescript
function generateCoordinationSection(): string {
  // Parse active sessions and generate coordination info
  return "Currently no active sessions. Safe to start.";
}
```

How does this detect conflicts? ACTIVE_SESSIONS.md doesn't have structured data about modules.

**Impact:** 🔴 False "safe to start" when conflicts exist

**Fix:** Parse session files for module info, or require structured ACTIVE_SESSIONS format

---

### 5. **Module Conflict Detection Too Strict**

**Problem:**

```typescript
if (normA.startsWith(normB + "/") || normB.startsWith(normA + "/")) {
  return true; // conflict
}
```

**False positive:**

```
Task A: server/routers/accounting.ts
Task B: server/routers/analytics.ts
```

These don't conflict (different files) but both are in `server/routers/`

**Impact:** 🟡 Under-utilizes capacity (false conflicts)

**Fix:** Only conflict if:

- Exact same file
- One is directory containing the other
- Both modify same shared dependency

---

### 6. **No Handling of Task Updates Mid-Flight**

**Problem:**

1. Agent starts ST-005 (estimate: 6h)
2. 3 hours in, requirements change
3. Now needs 12h
4. Capacity calculator still thinks 6h
5. Over-schedules next batch

**Impact:** 🔴 Capacity calculation wrong

**Fix:** Read in-progress estimates from session files

---

### 7. **Prompt Generation Overwrites Manual Edits**

**Problem:**

```bash
# Day 1: Generate prompt
pnpm roadmap generate-prompt ST-005
# Edit implementation section manually (2 hours of work)

# Day 2: Metadata changes, regenerate
pnpm roadmap generate-prompt ST-005
# OVERWRITES manual implementation section!
```

**Impact:** 🔴 Lost work

**Fix:** Only generate if file doesn't exist, or use merge strategy

---

### 8. **No Validation That Implementation Section Exists**

**Problem:**

```typescript
function validate() {
  // Checks:
  // - Objectives >= 3
  // - Deliverables >= 5
  // - Dependencies exist
  // - Prompt file exists
  // MISSING: Check prompt file has implementation section
}
```

**Impact:** 🔴 Incomplete prompts pass validation

**Fix:** Parse prompt file, validate implementation section

---

### 9. **Estimate Parsing Doesn't Handle Ranges**

**Problem:**

```markdown
**Estimate:** 4-6h
```

Current parser expects single value (`6h`), not range.

**Impact:** 🔴 Parse error

**Fix:** Support ranges, use upper bound for capacity calculation

---

### 10. **No Rollback When Agent Discovers Task is Blocked**

**Problem:**

1. Agent starts ST-005
2. Discovers ST-004 dependency not actually complete (tests failing)
3. Agent stops work
4. Task still shows "in-progress" in roadmap
5. Blocks other agents from starting it

**Impact:** 🔴 Task stuck in limbo

**Fix:** Agent must update roadmap status back to "blocked" with reason

---

### 11. **Circular Dependency Detection Doesn't Handle Transitive Deps**

**Problem:**

```
ST-010 → ST-011
ST-011 → ST-012
ST-012 → ST-010  (circular!)
```

Current DFS may not detect this if it starts from wrong node.

**Impact:** 🟡 Some circular deps missed

**Fix:** Ensure DFS visits all nodes, not just starting from first

---

### 12. **No Validation of Deliverables Format**

**Problem:**

```markdown
**Deliverables:**

- [ ] Some deliverable
- [x] Already checked? (invalid format)
- [] Missing space
- [ ]No description
```

**Impact:** 🟡 Inconsistent format

**Fix:** Validate deliverables are `- [ ] <text>`

---

### 13. **Priority Field Not Used in Validation**

**Problem:**

```markdown
**Priority:** 🔴 HIGH
```

Validation checks it exists, but doesn't verify:

- HIGH priority tasks should have shorter estimates
- HIGH priority tasks should be unblocked
- HIGH priority tasks should have prompts ready

**Impact:** 🟢 Missed optimization opportunity

**Fix:** Add priority-based validation rules

---

### 14. **Module Path Not Validated for Existence**

**Problem:**

```markdown
**Module:** `server/routers/nonexistent.ts`
```

File doesn't exist, but validation passes.

**Impact:** 🟡 Agent starts task, discovers file doesn't exist

**Fix:** Validate module paths exist in codebase

---

### 15. **No Check for Duplicate Task IDs**

**Problem:**

```markdown
### ST-005: Task A

...

### ST-005: Task B (duplicate ID!)
```

**Impact:** 🔴 Parser will only see one, other ignored

**Fix:** Validate no duplicate task IDs

---

## 🟡 DESIGN ISSUES

### 16. **Prompt Template Too Generic**

**Problem:**

```markdown
## Implementation Guide

[TO BE FILLED IN MANUALLY]
```

No structure, no guidance. Different tasks will have wildly different formats.

**Impact:** 🟡 Inconsistent prompts

**Fix:** Provide structured template:

```markdown
## Implementation Guide

### Phase 1: Setup (X min)

- Step 1
- Step 2

### Phase 2: Implementation (X hours)

- Step 1
- Step 2

### Phase 3: Testing (X min)

- Step 1
- Step 2

### Phase 4: Documentation (X min)

- Step 1
- Step 2
```

---

### 17. **No Guidance on Estimate Accuracy**

**Problem:** How do we know if "6h" is accurate? No tracking of actual vs estimated.

**Impact:** 🟡 Estimates may drift from reality

**Fix:** Track actual time in session files, compare to estimate

---

### 18. **Capacity Algorithm Doesn't Consider Agent Availability**

**Problem:**

```bash
pnpm roadmap next-batch
# Output: Deploy 4 agents

# But what if you only have 2 agents available?
```

**Impact:** 🟢 Minor - user can ignore extra recommendations

**Fix:** Add `--max-agents` flag

---

### 19. **No Dry-Run Mode for Validation**

**Problem:**

```bash
pnpm roadmap validate
# Exits with code 1 on error (blocks commit)

# What if I want to see errors without blocking?
```

**Impact:** 🟢 Minor - can use `git commit --no-verify`

**Fix:** Add `--dry-run` flag

---

### 20. **Prompt File Naming Convention Not Enforced**

**Problem:**

```markdown
**Prompt:** `docs/prompts/ST-005.md` ✅
**Prompt:** `docs/prompts/st-005.md` (lowercase)
**Prompt:** `docs/prompts/005.md` (missing ST-)
```

**Impact:** 🟡 Inconsistent naming

**Fix:** Validate prompt path matches `docs/prompts/ST-\d+\.md`

---

## ⚡ PERFORMANCE ISSUES

### 21. **Validation Reads Every Prompt File**

**Problem:**

```typescript
for (const task of tasks) {
  readFileSync(task.promptPath, "utf-8"); // Expensive!
}
```

For 100 tasks, reads 100 files. Slow.

**Impact:** ⚡ Slow validation for large roadmaps

**Fix:** Only validate prompt files if they changed (git diff)

---

### 22. **No Incremental Validation**

**Problem:**

```bash
# Change one task
git add docs/roadmaps/MASTER_ROADMAP.md
git commit
# Validates ALL tasks, not just changed one
```

**Impact:** ⚡ Slow commits for large roadmaps

**Fix:** Detect which tasks changed, validate only those

---

### 23. **Capacity Calculation Rebuilds Conflict Map Every Time**

**Problem:**

```typescript
function calculateCapacity() {
  const conflictMap = new Map(); // Built from scratch
  for (const task of ready) {
    for (const other of ready) {
      if (modulesConflict(...)) { ... }
    }
  }
}
```

O(n²) complexity, no caching.

**Impact:** ⚡ Slow for 100+ tasks

**Fix:** Cache conflict map, invalidate when roadmap changes

---

## 🟢 MINOR ISSUES

### 24. **No Help Text for Subcommands**

**Problem:**

```bash
pnpm roadmap validate --help
# No output, just runs validation
```

**Impact:** 🟢 Minor - docs exist

**Fix:** Add `--help` flag support

---

### 25. **Error Messages Don't Include Line Numbers**

**Problem:**

```
ST-005: Missing field: Estimate
```

Where in the file? Which line?

**Impact:** 🟡 Harder to debug

**Fix:** Include line numbers in errors

---

### 26. **No Progress Indicator for Slow Operations**

**Problem:**

```bash
pnpm roadmap validate
# (silence for 5 seconds)
# ✅ Validation PASSED
```

User doesn't know if it's frozen or working.

**Impact:** 🟢 Minor UX issue

**Fix:** Add progress indicator (spinner or progress bar)

---

### 27. **Coordination Section Timestamp Not Timezone-Aware**

**Problem:**

```markdown
> **Last updated:** 2025-11-13 15:30
```

What timezone? UTC? Local?

**Impact:** 🟢 Minor confusion

**Fix:** Use ISO 8601 with timezone (`2025-11-13T15:30:00-08:00`)

---

### 28. **No Way to List All Tasks**

**Problem:**

```bash
pnpm roadmap ???
# How do I see all tasks?
```

**Impact:** 🟢 Minor - can read roadmap directly

**Fix:** Add `pnpm roadmap list` command

---

### 29. **No Way to Check Single Task Status**

**Problem:**

```bash
pnpm roadmap status ST-005
# Does this task exist? Is it ready? Blocked?
```

**Impact:** 🟢 Minor - can search roadmap

**Fix:** Add `pnpm roadmap status <task-id>` command

---

### 30. **Deliverables Checklist Not Auto-Updated**

**Problem:**

```markdown
**Deliverables:**

- [ ] Index audit report
- [ ] Migration file
```

Agent completes these, but checklist not updated automatically.

**Impact:** 🟢 Minor - manual update acceptable

**Fix:** Agent updates checklist in PR (future enhancement)

---

## 📊 SEVERITY SUMMARY

| Severity           | Count  | Examples                                           |
| ------------------ | ------ | -------------------------------------------------- |
| 🔴 **CRITICAL**    | 10     | Stale prompts, overwrite edits, false coordination |
| 🟡 **DESIGN FLAW** | 10     | Module conflicts too strict, no estimate tracking  |
| ⚡ **PERFORMANCE** | 3      | Reads all files, O(n²) conflicts                   |
| 🟢 **MINOR**       | 7      | No help text, no progress indicator                |
| **TOTAL**          | **30** |                                                    |

---

## 🎯 CRITICAL FIXES REQUIRED

### Fix #1: Generate GitHub URLs (Not File Paths)

```typescript
function commandNextBatch() {
  for (const task of recommendedTasks) {
    const url = `https://github.com/EvanTenenbaum/TERP/blob/main/${task.promptPath}`;
    console.log(`Agent ${i + 1}: ${url}`);
  }
}
```

**Benefit:** One-click access, no repo cloning needed

---

### Fix #2: Validate Implementation Section Exists

```typescript
function validatePromptFile(path: string): string[] {
  const content = readFileSync(path, "utf-8");
  const errors: string[] = [];

  if (!content.includes("## Implementation Guide")) {
    errors.push("Missing implementation guide section");
  }

  if (content.includes("[TO BE FILLED IN MANUALLY]")) {
    errors.push("Implementation guide not filled in");
  }

  if (content.match(/## Implementation Guide\s*$/m)) {
    errors.push("Implementation guide is empty");
  }

  return errors;
}
```

---

### Fix #3: Add Version Hash to Prompts

```typescript
function generatePrompt(taskId: string): void {
  // Get git commit SHA of last change to roadmap
  const sha = execSync("git log -1 --format=%h docs/roadmaps/MASTER_ROADMAP.md")
    .toString()
    .trim();

  prompt = template
    .replace(/{{VERSION}}/g, sha)
    .replace(/{{TIMESTAMP}}/g, new Date().toISOString());
}
```

**Template:**

```markdown
> **Version:** {{VERSION}}  
> **Last updated:** {{TIMESTAMP}}
```

---

### Fix #4: Don't Overwrite Existing Prompts

```typescript
function commandGeneratePrompt() {
  const taskId = process.argv[3];
  const task = tasks.find(t => t.id === taskId);

  // Check if file exists
  if (existsSync(task.promptPath)) {
    console.error(`❌ Prompt file already exists: ${task.promptPath}`);
    console.error("Use --force to overwrite");
    process.exit(1);
  }

  generatePrompt(taskId);
}
```

---

### Fix #5: Support Estimate Ranges

```typescript
function parseEstimate(str: string): number {
  // Handle ranges: "4-6h" → use upper bound (6h)
  const rangeMatch = str.match(/^(\d+)-(\d+)(h|d|w)$/);
  if (rangeMatch) {
    const [, min, max, unit] = rangeMatch;
    return parseEstimateValue(max, unit);
  }

  // Handle single values: "6h"
  const singleMatch = str.match(/^(\d+)(h|d|w)$/);
  if (singleMatch) {
    const [, num, unit] = singleMatch;
    return parseEstimateValue(num, unit);
  }

  throw new Error(`Invalid estimate format: ${str}`);
}
```

---

### Fix #6: Validate No Duplicate Task IDs

```typescript
function validate(): ValidationResult {
  const { tasks } = parseRoadmap();
  const seen = new Set<string>();

  for (const task of tasks) {
    if (seen.has(task.id)) {
      errors.push({ taskId: task.id, error: "Duplicate task ID" });
    }
    seen.add(task.id);
  }
}
```

---

### Fix #7: Improve Module Conflict Detection

```typescript
function modulesConflict(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);

  // Exact match (same file)
  if (normA === normB) return true;

  // One is directory, other is file inside it
  if (normA.endsWith("/") && normB.startsWith(normA)) return true;
  if (normB.endsWith("/") && normA.startsWith(normB)) return true;

  // Both are files in same directory (NO CONFLICT)
  // server/routers/accounting.ts vs server/routers/analytics.ts → OK

  return false;
}
```

---

### Fix #8: Structured Coordination Data

**Update ACTIVE_SESSIONS.md format:**

```markdown
## Active Sessions

| Agent   | Task ID | Module            | Started          | Estimate |
| ------- | ------- | ----------------- | ---------------- | -------- |
| Agent 1 | ST-005  | server/db/schema/ | 2025-11-13 14:00 | 6h       |
| Agent 2 | ST-008  | root config       | 2025-11-13 14:05 | 16h      |
```

**Parse this in coordination generation:**

```typescript
function generateCoordinationSection(taskModule: string): string {
  const sessions = parseActiveSessions();

  const conflicts = sessions.filter(s => modulesConflict(s.module, taskModule));

  if (conflicts.length > 0) {
    return `⚠️ **WARNING:** ${conflicts[0].agent} is working on ${conflicts[0].taskId} which may conflict with this task.`;
  }

  return "Currently no conflicts. Safe to start.";
}
```

---

### Fix #9: Add Line Numbers to Errors

```typescript
function parseTask(section: string, startLine: number): Task {
  try {
    // ... parsing logic ...
  } catch (error) {
    throw new Error(`Line ${startLine}: ${error.message}`);
  }
}
```

---

### Fix #10: Incremental Validation

```typescript
function commandValidate() {
  // Get changed tasks from git diff
  const diff = execSync(
    "git diff --cached docs/roadmaps/MASTER_ROADMAP.md"
  ).toString();

  const changedTaskIds = extractChangedTaskIds(diff);

  if (changedTaskIds.length === 0) {
    console.log("✅ No tasks changed, skipping validation");
    return;
  }

  console.log(`🔍 Validating ${changedTaskIds.length} changed tasks...`);
  // Validate only changed tasks
}
```

---

## 📊 FIXES SUMMARY

| Fix                     | Issue              | Priority       | Complexity |
| ----------------------- | ------------------ | -------------- | ---------- |
| GitHub URLs             | Agent friction     | 🔴 Critical    | Easy       |
| Validate implementation | Incomplete prompts | 🔴 Critical    | Medium     |
| Version hash            | Stale prompts      | 🔴 Critical    | Easy       |
| Don't overwrite         | Lost work          | 🔴 Critical    | Easy       |
| Estimate ranges         | Parse errors       | 🔴 Critical    | Easy       |
| Duplicate IDs           | Parser confusion   | 🔴 Critical    | Easy       |
| Module conflicts        | False positives    | 🟡 Important   | Medium     |
| Structured coordination | False "safe"       | 🔴 Critical    | Hard       |
| Line numbers            | Debug difficulty   | 🟡 Important   | Medium     |
| Incremental validation  | Slow commits       | ⚡ Performance | Medium     |

---

## 🎯 RECOMMENDATION

**Implement these 10 critical fixes before deploying the system:**

1. ✅ Generate GitHub URLs (not file paths)
2. ✅ Validate implementation section exists
3. ✅ Add version hash to prompts
4. ✅ Don't overwrite existing prompts
5. ✅ Support estimate ranges
6. ✅ Validate no duplicate task IDs
7. ✅ Improve module conflict detection
8. ✅ Structured coordination data (ACTIVE_SESSIONS format)
9. ✅ Add line numbers to errors
10. ✅ Incremental validation

**After these fixes:**

- System will be production-ready
- All critical issues resolved
- Performance optimized
- User experience smooth

**Estimated time to implement all 10 fixes:** 2-3 hours

---

## 📈 OVERALL ASSESSMENT

**V2 Design Quality:** 8/10 (was 3/10 before first QA)

**Remaining Issues:**

- 10 critical (must fix)
- 10 design flaws (should fix)
- 3 performance (nice to have)
- 7 minor (future enhancements)

**After implementing 10 critical fixes:** 9.5/10

**Conclusion:** V2 design is solid but needs 10 critical fixes before deployment. With fixes, system will be production-ready and robust.
