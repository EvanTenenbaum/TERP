# Roadmap System - Reality Check

**Date:** November 13, 2025  
**Purpose:** Verify system solves original problem without over-engineering

---

## 🎯 ORIGINAL GOAL (Your Request)

> "I want to be able to deploy agents just by telling them to visit the roadmap in TERP and find and execute the prompt associated with [task id]."

**Core Requirements:**

1. Agent gets simple instruction: "Execute ST-XXX from TERP roadmap"
2. Agent finds everything they need in one place
3. No separate prompt files to hunt for
4. System ensures protocol compliance automatically

**Your Concerns:**

- "If it's ever forgotten or not followed it will cause confusion"
- "What is a realistic number of agents we can deploy at once?"
- "Make sure everything is still related back to the original goals"
- "I'm concerned thing has gotten so bloated it might not actually do the thing it's supposed to do"

---

## ❌ WHAT WE BUILT (Current V2 System)

### Architecture

```
MASTER_ROADMAP.md (metadata only)
  ↓
docs/prompts/ST-XXX.md (separate prompt files)
  ↓
scripts/roadmap.ts (600+ lines, complex validation)
  ↓
Templates, hooks, CI/CD checks
```

### Deployment Flow

```
You: "Run next batch"
  ↓
pnpm roadmap next-batch
  ↓
Outputs: Agent 1: https://github.com/.../docs/prompts/ST-005.md
  ↓
Agent: Clicks link, reads prompt, executes
```

---

## 🚨 PROBLEM: We Over-Engineered This

### Bloat Analysis

| Component             | Lines     | Necessary? | Complexity    |
| --------------------- | --------- | ---------- | ------------- |
| roadmap.ts script     | 600+      | ❓ Maybe   | High          |
| Separate prompt files | N/A       | ❌ NO      | Medium        |
| Template system       | 100+      | ❓ Maybe   | Medium        |
| Validation logic      | 200+      | ✅ YES     | High          |
| Capacity calculation  | 150+      | ✅ YES     | Medium        |
| Pre-commit hooks      | 50+       | ✅ YES     | Low           |
| **TOTAL**             | **1000+** |            | **Very High** |

### Does It Solve Original Goal?

**Original:** "Agent visits roadmap, finds prompt, executes"

**Current:** "Agent gets GitHub URL → clicks → reads separate file → executes"

**Verdict:** ❌ **NO** - We added an extra step (separate prompt file)

---

## ✅ WHAT WE SHOULD HAVE BUILT

### Simple Architecture

```
MASTER_ROADMAP.md (contains EVERYTHING)
  ├─ Task metadata
  ├─ Objectives
  ├─ Deliverables
  └─ EMBEDDED PROMPT (in collapsible section)
```

### Deployment Flow

```
You: "Execute ST-005 from TERP roadmap"
  ↓
Agent: Opens https://github.com/.../MASTER_ROADMAP.md#st-005
  ↓
Agent: Reads task section (all info in one place)
  ↓
Agent: Expands embedded prompt
  ↓
Agent: Executes
```

**Difference:** One step, not two. No separate files.

---

## 🎯 SIMPLIFIED SYSTEM (What We Actually Need)

### 1. Roadmap Structure (Embedded Prompts)

```markdown
### ST-005: Add Missing Database Indexes

**Status:** 📋 Ready
**Priority:** 🔴 HIGH
**Estimate:** 4-6h
**Module:** `server/db/schema/`
**Dependencies:** None

**Objectives:**

- Audit all foreign keys for missing indexes
- Add indexes to improve query performance
- Measure performance improvements

**Deliverables:**

- [ ] Index audit report
- [ ] Migration file with new indexes
- [ ] Performance benchmark results
- [ ] All tests passing

<details>
<summary>🤖 AGENT PROMPT - Click to execute this task</summary>

# ST-005: Add Missing Database Indexes

## Quick Start

\`\`\`bash
git clone https://github.com/EvanTenenbaum/TERP.git
cd TERP
pnpm install
\`\`\`

## Implementation Guide

### Phase 1: Audit (1h)

1. List all tables: \`pnpm drizzle-kit introspect\`
2. Find foreign keys without indexes
3. Create audit report

### Phase 2: Add Indexes (2h)

\`\`\`typescript
// server/db/schema/example.ts
export const orders = pgTable('orders', {
clientId: integer('client_id').references(() => clients.id),
}, (table) => ({
// Add index
clientIdIdx: index('orders_client_id_idx').on(table.clientId),
}));
\`\`\`

### Phase 3: Test (1h)

\`\`\`bash
pnpm test
pnpm check
\`\`\`

### Phase 4: Benchmark (1h)

- Measure query performance before/after
- Document improvements

## Completion

- Update status to ✅ Complete
- Archive session file
- Push to GitHub

</details>

---
```

### 2. Simple Validation Script (200 lines max)

```typescript
// scripts/roadmap-validate.ts
function validate() {
  const tasks = parseRoadmap();

  for (const task of tasks) {
    // Check required fields exist
    if (!task.status) errors.push("Missing status");
    if (!task.estimate) errors.push("Missing estimate");
    if (!task.module) errors.push("Missing module");

    // Check embedded prompt exists
    if (!task.hasEmbeddedPrompt) errors.push("Missing embedded prompt");

    // Check objectives >= 3
    if (task.objectives.length < 3) errors.push("Need 3+ objectives");

    // Check deliverables >= 5
    if (task.deliverables.length < 5) errors.push("Need 5+ deliverables");
  }

  return errors;
}
```

### 3. Simple Capacity Calculator (100 lines max)

```typescript
// scripts/roadmap-capacity.ts
function calculateCapacity() {
  const ready = tasks.filter(t => t.status === "ready");

  // Rule: Max 4 agents
  // Rule: No module conflicts
  // Rule: Max 1 long task (>2 days)

  const batch = selectNonConflicting(ready, 4);

  return {
    maxAgents: batch.length,
    tasks: batch,
  };
}
```

### 4. Simple Deployment Command

```bash
pnpm roadmap next-batch

# Output:
# ✅ Deploy 4 agents:
#
# Agent 1: https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md#st-005
# Agent 2: https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md#st-008
# Agent 3: https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md#st-009
# Agent 4: https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md#st-007
```

---

## 📊 Comparison

| Aspect                  | V2 (Current)                   | Simplified                | Winner        |
| ----------------------- | ------------------------------ | ------------------------- | ------------- |
| **Files to maintain**   | 2 per task (roadmap + prompt)  | 1 per task (roadmap only) | ✅ Simplified |
| **Agent steps**         | 2 (get URL → open prompt file) | 1 (open roadmap section)  | ✅ Simplified |
| **Lines of code**       | 1000+                          | 300                       | ✅ Simplified |
| **Complexity**          | High                           | Low                       | ✅ Simplified |
| **Sync issues**         | Possible (2 files)             | Impossible (1 file)       | ✅ Simplified |
| **GitHub URL**          | Points to separate file        | Points to roadmap section | ✅ Simplified |
| **Validation**          | Complex (600 lines)            | Simple (200 lines)        | ✅ Simplified |
| **Meets original goal** | ❌ No (extra step)             | ✅ Yes (one step)         | ✅ Simplified |

---

## 🎯 RECOMMENDATION

**SCRAP V2. Build Simplified System Instead.**

### Why?

1. **Solves original problem** - Agent gets one URL, finds everything
2. **Simpler** - 70% less code
3. **Faster** - No separate file generation
4. **Maintainable** - One source of truth
5. **No sync issues** - Prompt embedded in roadmap

### What to Keep from V2?

- ✅ Validation logic (check required fields)
- ✅ Capacity calculation (conflict detection)
- ✅ Pre-commit hooks (enforce compliance)
- ✅ GitHub URL generation

### What to Remove from V2?

- ❌ Separate prompt files (`docs/prompts/*.md`)
- ❌ Prompt generation script
- ❌ Template system
- ❌ Version hashing (not needed if embedded)
- ❌ Coordination section auto-generation (too complex)

---

## 🚀 Implementation Plan (Simplified)

### Phase 1: Update Roadmap Format (1 hour)

1. Take ST-005 from roadmap
2. Add `<details>` section with embedded prompt
3. Test that GitHub renders it correctly
4. Repeat for ST-007, ST-008, ST-009

### Phase 2: Simple Scripts (1 hour)

1. `scripts/roadmap-validate.ts` (200 lines)
   - Parse roadmap
   - Check required fields
   - Check embedded prompts exist
   - Validate no conflicts

2. `scripts/roadmap-next-batch.ts` (100 lines)
   - Find ready tasks
   - Check conflicts
   - Output GitHub URLs with #anchors

### Phase 3: Pre-commit Hook (15 min)

```bash
# .husky/pre-commit
if git diff --cached | grep -q "MASTER_ROADMAP.md"; then
  pnpm roadmap:validate || exit 1
fi
```

### Phase 4: Test (15 min)

1. Run `pnpm roadmap:validate`
2. Run `pnpm roadmap:next-batch`
3. Click generated URL
4. Verify prompt is visible in roadmap

**Total time: 2.5 hours** (vs 3.5 hours for V2)

---

## ✅ FINAL VERDICT

**Current V2 System:**

- ❌ Over-engineered (1000+ lines)
- ❌ Doesn't solve original problem (extra step)
- ❌ Maintenance burden (2 files per task)
- ❌ Sync issues possible

**Simplified System:**

- ✅ Solves original problem (one URL, one place)
- ✅ Simple (300 lines)
- ✅ Easy to maintain (one file)
- ✅ No sync issues

**Recommendation:** **Build Simplified System**

---

## 🎯 What You Should Tell Me

**Option A:** "Yes, scrap V2. Build the simplified system with embedded prompts."

**Option B:** "No, keep V2 but simplify it (remove X, Y, Z)."

**Option C:** "Actually, the separate prompt files are fine. Continue with V2."

---

**My strong recommendation:** Option A. The simplified system is what you originally asked for, and it's 70% simpler.
