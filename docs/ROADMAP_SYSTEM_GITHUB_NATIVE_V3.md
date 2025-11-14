# TERP Roadmap System V3 - GitHub-Native Design

**Date:** 2025-11-13  
**Version:** 3.0 (Platform-Agnostic)  
**Constraint:** Must work for ANY AI agent (Claude.ai, ChatGPT, Cursor, etc.) using ONLY GitHub

---

## 🎯 Core Principle

**Everything lives in GitHub. Zero external dependencies.**

Any AI agent can:

1. Clone `https://github.com/EvanTenenbaum/TERP`
2. Read `docs/ROADMAP_AGENT_GUIDE.md`
3. Follow documented workflows
4. Execute tasks using roadmap system

**No Manus-specific tools. No sandbox assumptions. Pure GitHub + documentation.**

---

## 🏗️ System Architecture

### Layer 1: Documentation (The Source of Truth)

**Location:** `docs/roadmaps/MASTER_ROADMAP.md`

**Structure:**

```markdown
# TERP Master Roadmap

## 📖 How to Use This Roadmap (FOR AI AGENTS)

### If user says: "Work on next task from TERP roadmap"

1. Read this file completely
2. Find "🚀 Ready for Deployment" section
3. Look for highest priority task marked `status: ready`
4. Click the prompt link (e.g., `docs/prompts/ST-005.md`)
5. Follow that prompt exactly

### If user says: "Add [description] to TERP roadmap"

1. STOP - Do NOT manually edit this file
2. Read `docs/HOW_TO_ADD_TASK.md`
3. Follow the checklist exactly
4. Use the template at `docs/templates/TASK_TEMPLATE.md`
5. Submit PR for review (do not push to main)

---

## 🚀 Ready for Deployment

### ST-005: Add Missing Database Indexes

**Status:** ready  
**Priority:** HIGH  
**Estimate:** 4-6h  
**Module:** `server/db/schema/`  
**Dependencies:** None  
**Prompt:** [📄 docs/prompts/ST-005.md](../prompts/ST-005.md)

**Quick Summary:**
Audit all foreign keys and add missing indexes for performance.

**Objectives:**

- Audit all foreign key relationships
- Add indexes for frequently queried columns
- Measure query performance improvements

**Deliverables:**

- [ ] Index audit report
- [ ] Migration files for new indexes
- [ ] Performance benchmark results
- [ ] Updated schema documentation
- [ ] Tests verifying indexes exist

---

### ST-007: Implement System-Wide Pagination

...
```

**Key Features:**

- ✅ Human-readable (any agent can parse)
- ✅ Self-documenting (instructions at top)
- ✅ No special tools required
- ✅ Works in any text editor
- ✅ GitHub renders markdown beautifully

---

### Layer 2: Prompts (Self-Contained Instructions)

**Location:** `docs/prompts/ST-XXX.md`

**Structure:**

````markdown
# ST-005: Add Missing Database Indexes

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** ST-005  
**Estimate:** 4-6 hours  
**Priority:** HIGH

---

## 🎯 Your Mission

Add database indexes to improve query performance for foreign key relationships.

---

## 📋 Prerequisites

**Before starting, verify:**

- [ ] You have cloned the TERP repository
- [ ] You have read `docs/ROADMAP_AGENT_GUIDE.md`
- [ ] No other agent is working on database schema (check `docs/ACTIVE_SESSIONS.md`)
- [ ] You understand the 4-phase workflow

---

## 🚀 Phase 1: Pre-Flight Check (15 min)

### Step 1.1: Register Your Session

1. Create file: `docs/sessions/active/Session-[DATE]-ST-005-[YOUR-ID].md`
2. Copy template from `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your details
4. Commit and push to GitHub

### Step 1.2: Check for Conflicts

1. Read `docs/ACTIVE_SESSIONS.md`
2. Verify no other agent working on `server/db/schema/`
3. If conflict exists, STOP and notify user

### Step 1.3: Create Branch

```bash
git checkout -b claude/ST-005-db-indexes-Session-[YOUR-ID]
git push -u origin claude/ST-005-db-indexes-Session-[YOUR-ID]
```
````

---

## 🔨 Phase 2: Session Startup (15 min)

### Step 2.1: Update MASTER_ROADMAP

1. Open `docs/roadmaps/MASTER_ROADMAP.md`
2. Find ST-005
3. Change `status: ready` to `status: in-progress`
4. Add `assigned-to: [YOUR-SESSION-ID]`
5. Commit: "chore: Mark ST-005 as in-progress"
6. Push to GitHub

### Step 2.2: Update ACTIVE_SESSIONS

1. Open `docs/ACTIVE_SESSIONS.md`
2. Add entry:
   ```markdown
   - **ST-005** - Add DB Indexes - Session-[YOUR-ID] - `server/db/schema/`
   ```
3. Commit and push

---

## 💻 Phase 3: Development (3-5 hours)

### Step 3.1: Audit Foreign Keys (1 hour)

**Instructions:**

1. List all tables in `server/db/schema/`
2. For each table, identify foreign key columns
3. Check if index exists for each FK
4. Document missing indexes

**Commands:**

```bash
cd server/db/schema
grep -r "references(" *.ts > fk_audit.txt
```

**Deliverable:** Create `docs/ST-005-INDEX-AUDIT.md` with findings

### Step 3.2: Write Tests (TDD) (1 hour)

**Create:** `server/db/schema/indexes.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { db } from "../index";

describe("Database Indexes", () => {
  it("should have index on orders.clientId", async () => {
    const indexes = await db.execute(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'orders' AND indexname LIKE '%clientId%'
    `);
    expect(indexes.rows.length).toBeGreaterThan(0);
  });

  // Add test for each missing index
});
```

**Run tests (should fail):**

```bash
pnpm test server/db/schema/indexes.test.ts
```

### Step 3.3: Create Migration (1 hour)

**Create:** `server/db/migrations/YYYY-MM-DD-add-missing-indexes.ts`

```typescript
export async function up(db: Database) {
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_orders_client_id 
    ON orders(client_id);
    
    CREATE INDEX IF NOT EXISTS idx_inventory_strain_id 
    ON inventory(strain_id);
    
    -- Add all missing indexes
  `);
}

export async function down(db: Database) {
  await db.execute(`
    DROP INDEX IF EXISTS idx_orders_client_id;
    DROP INDEX IF EXISTS idx_inventory_strain_id;
  `);
}
```

### Step 3.4: Run Migration (30 min)

```bash
pnpm db:migrate
```

**Verify tests now pass:**

```bash
pnpm test server/db/schema/indexes.test.ts
```

### Step 3.5: Benchmark Performance (1 hour)

**Create:** `server/db/benchmarks/index-performance.ts`

```typescript
// Measure query time before/after indexes
const before = performance.now();
await db.query.orders.findMany({ where: eq(orders.clientId, 123) });
const after = performance.now();
console.log(`Query time: ${after - before}ms`);
```

**Document results** in `docs/ST-005-PERFORMANCE-RESULTS.md`

### Step 3.6: Update Documentation (30 min)

**Update:** `server/db/README.md`

Add section:

```markdown
## Database Indexes

All foreign keys have corresponding indexes for performance:

- `orders.client_id` → `idx_orders_client_id`
- `inventory.strain_id` → `idx_inventory_strain_id`
  ...
```

---

## ✅ Phase 4: Completion (30 min)

### Step 4.1: Verify All Deliverables

- [ ] `docs/ST-005-INDEX-AUDIT.md` created
- [ ] `server/db/schema/indexes.test.ts` created (all passing)
- [ ] Migration file created and run
- [ ] `docs/ST-005-PERFORMANCE-RESULTS.md` created
- [ ] `server/db/README.md` updated
- [ ] All tests passing: `pnpm test`
- [ ] No TypeScript errors: `pnpm check`

### Step 4.2: Create Completion Report

**Create:** `docs/ST-005-COMPLETION-REPORT.md`

```markdown
# ST-005 Completion Report

**Task:** Add Missing Database Indexes  
**Status:** ✅ COMPLETE  
**Time:** X hours

## Summary

Added 12 missing indexes for foreign key columns.

## Results

- Average query time improved by 85%
- All tests passing (15/15)
- Zero TypeScript errors

## Files Changed

- server/db/schema/\*.ts (12 files)
- server/db/migrations/2025-11-13-add-indexes.ts
- docs/ST-005-\*.md (3 files)
```

### Step 4.3: Update Roadmap

1. Open `docs/roadmaps/MASTER_ROADMAP.md`
2. Find ST-005
3. Change `status: in-progress` to `status: complete`
4. Add `completed-date: 2025-11-13`
5. Commit: "feat: Complete ST-005 - Add database indexes"

### Step 4.4: Archive Session

```bash
mv docs/sessions/active/Session-[YOUR-ID].md docs/sessions/completed/
```

Update session file with completion details.

### Step 4.5: Update ACTIVE_SESSIONS

Remove your entry from `docs/ACTIVE_SESSIONS.md`

### Step 4.6: Push and Create PR

```bash
git add -A
git commit -m "feat: Complete ST-005 - Add missing database indexes

- Added 12 indexes for foreign keys
- 85% query performance improvement
- All tests passing (15/15)
- Zero TypeScript errors

Closes #ST-005"

git push origin claude/ST-005-db-indexes-Session-[YOUR-ID]
```

**Create Pull Request on GitHub:**

- Title: "feat: Complete ST-005 - Add database indexes"
- Description: Link to completion report
- Request review from user

### Step 4.7: Notify User

**Message user:**

```
✅ ST-005 COMPLETE

I've finished adding database indexes. Here's what I did:

📊 Results:
- 12 indexes added
- 85% query performance improvement
- All tests passing (15/15)
- Zero TypeScript errors

📁 Files:
- Completion report: docs/ST-005-COMPLETION-REPORT.md
- Pull request: [link]

Ready for your review!
```

---

## 🚨 Important Rules

### DO:

- ✅ Follow this prompt exactly
- ✅ Complete all 4 phases in order
- ✅ Run all tests before committing
- ✅ Update documentation
- ✅ Create PR (don't push to main)
- ✅ Notify user when complete

### DON'T:

- ❌ Skip any phase
- ❌ Push directly to main
- ❌ Leave TODO comments
- ❌ Use `any` types
- ❌ Create files >500 lines
- ❌ Commit failing tests

---

## 🆘 If You Get Stuck

1. **Read the docs:**
   - `docs/ROADMAP_AGENT_GUIDE.md`
   - `docs/DEVELOPMENT_PROTOCOLS.md`
   - `docs/CLAUDE_WORKFLOW.md`

2. **Check for help:**
   - `docs/TROUBLESHOOTING.md`
   - `docs/FAQ.md`

3. **Ask the user:**
   - Explain what you tried
   - Show error messages
   - Ask specific questions

---

## 📚 Related Documentation

- [Agent Onboarding](docs/ROADMAP_AGENT_GUIDE.md)
- [Development Protocols](../DEVELOPMENT_PROTOCOLS.md)
- [4-Phase Workflow](../CLAUDE_WORKFLOW.md)
- [Database Schema Guide](../../server/db/README.md)

---

**Good luck! 🚀**

````

**Key Features:**
- ✅ Completely self-contained
- ✅ Step-by-step instructions
- ✅ Code examples included
- ✅ No external tools required
- ✅ Works for any AI agent
- ✅ Enforces 4-phase workflow
- ✅ Includes all protocols

---

### Layer 3: Enforcement (GitHub-Native)

**No pre-commit hooks. No CI/CD required. Pure documentation + GitHub features.**

#### Enforcement Mechanism 1: Documentation Clarity

**`docs/ROADMAP_AGENT_GUIDE.md`** (First thing agents read):

```markdown
# 🚨 CRITICAL: Read This First

## If user says: "Work on TERP task"
1. Go to `docs/roadmaps/MASTER_ROADMAP.md`
2. Find task marked `status: ready`
3. Click prompt link
4. Follow prompt EXACTLY

## If user says: "Add task to TERP roadmap"
1. STOP - Do NOT edit MASTER_ROADMAP.md directly
2. Read `docs/HOW_TO_ADD_TASK.md`
3. Follow checklist
4. Submit PR (never push to main)

## Rules (NEVER BREAK THESE)
- ❌ NEVER push to main (always create PR)
- ❌ NEVER skip phases in 4-phase workflow
- ❌ NEVER leave TODO/FIXME comments
- ❌ NEVER use `any` types
- ❌ NEVER create files >500 lines
- ❌ NEVER commit failing tests

**Why these rules exist:** [link to explanation]
````

#### Enforcement Mechanism 2: GitHub Branch Protection

**Settings → Branches → main:**

- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale reviews
- ✅ Require status checks (GitHub Actions)
- ✅ Require conversation resolution
- ✅ Do not allow bypassing

**Result:** Impossible to push to main directly.

#### Enforcement Mechanism 3: GitHub Actions (Optional but Recommended)

**`.github/workflows/validate-roadmap.yml`:**

```yaml
name: Validate Roadmap

on:
  pull_request:
    paths:
      - "docs/roadmaps/MASTER_ROADMAP.md"
      - "docs/prompts/*.md"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm roadmap validate
      - name: Check for TODOs
        run: |
          if git diff origin/main | grep -i "TODO\|FIXME"; then
            echo "❌ Found TODO/FIXME in changes"
            exit 1
          fi
```

**Result:** PRs with invalid roadmaps blocked automatically.

#### Enforcement Mechanism 4: Templates

**`docs/templates/TASK_TEMPLATE.md`:**

```markdown
### ST-XXX: [Task Title]

**Status:** ready  
**Priority:** [HIGH|MEDIUM|LOW]  
**Estimate:** [Xh-Yh or Xd-Yd]  
**Module:** `path/to/module`  
**Dependencies:** [ST-XXX, ST-YYY] or None  
**Prompt:** [📄 docs/prompts/ST-XXX.md](../prompts/ST-XXX.md)

**Quick Summary:**
[One sentence description]

**Objectives:**

- [Objective 1]
- [Objective 2]
- [Objective 3]

**Deliverables:**

- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]
- [ ] [Deliverable 4]
- [ ] [Deliverable 5]
```

**Agent copies this, fills in blanks, submits PR.**

---

### Layer 4: Workflows (Documented Processes)

**`docs/HOW_TO_ADD_TASK.md`:**

```markdown
# How to Add a Task to the Roadmap

## ✅ Checklist (Complete ALL steps)

### Step 1: Find Next Task ID

- [ ] Open `docs/roadmaps/MASTER_ROADMAP.md`
- [ ] Find highest ST-XXX number
- [ ] Your task ID = ST-[XXX+1]

### Step 2: Copy Template

- [ ] Open `docs/templates/TASK_TEMPLATE.md`
- [ ] Copy entire content
- [ ] Paste into MASTER_ROADMAP.md in "Ready for Deployment" section

### Step 3: Fill Template

- [ ] Replace ST-XXX with your task ID
- [ ] Fill in title (10-100 characters)
- [ ] Set priority (HIGH/MEDIUM/LOW)
- [ ] Set estimate (realistic: 1h-4w)
- [ ] Set module path
- [ ] List dependencies (or "None")
- [ ] Write 1-sentence summary
- [ ] Write 3+ objectives
- [ ] Write 5+ deliverables

### Step 4: Create Prompt File

- [ ] Copy `docs/templates/PROMPT_TEMPLATE.md`
- [ ] Save as `docs/prompts/ST-XXX.md`
- [ ] Fill in all sections
- [ ] Include step-by-step instructions
- [ ] Include code examples
- [ ] Include all 4 phases

### Step 5: Validate

- [ ] Read your task definition - does it make sense?
- [ ] Read your prompt - could another agent follow it?
- [ ] Check dependencies exist
- [ ] Check no duplicate task ID
- [ ] Check estimate is reasonable

### Step 6: Submit PR

- [ ] Create branch: `add-task-ST-XXX`
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Create Pull Request
- [ ] Title: "roadmap: Add ST-XXX - [Task Title]"
- [ ] Request review from user

### Step 7: Wait for Approval

- [ ] User reviews
- [ ] User approves or requests changes
- [ ] Make changes if needed
- [ ] User merges to main

## ❌ Common Mistakes

**DON'T:**

- ❌ Push directly to main
- ❌ Skip validation steps
- ❌ Copy existing task without changing details
- ❌ Leave placeholders like "[TODO]"
- ❌ Create task without prompt file
- ❌ Create prompt without implementation guide

**DO:**

- ✅ Follow checklist exactly
- ✅ Be thorough in prompt instructions
- ✅ Include code examples
- ✅ Test that another agent could follow your prompt
```

---

## 📊 How Agents Use the System

### Scenario 1: User says "Work on next TERP task"

**Agent workflow:**

1. Clone repo (if not already)
2. Read `docs/ROADMAP_AGENT_GUIDE.md`
3. Navigate to `docs/roadmaps/MASTER_ROADMAP.md`
4. Find "Ready for Deployment" section
5. Look for highest priority `status: ready` task
6. Click prompt link (e.g., `docs/prompts/ST-005.md`)
7. Read entire prompt
8. Follow Phase 1: Pre-Flight Check
9. Follow Phase 2: Session Startup
10. Follow Phase 3: Development
11. Follow Phase 4: Completion
12. Create PR
13. Notify user

**No special tools needed. Just GitHub + following instructions.**

### Scenario 2: User says "Add [description] to TERP roadmap"

**Agent workflow:**

1. Read `docs/ROADMAP_AGENT_GUIDE.md`
2. See "STOP - Do NOT edit directly"
3. Navigate to `docs/HOW_TO_ADD_TASK.md`
4. Follow checklist step-by-step
5. Copy template
6. Fill in details
7. Create prompt file
8. Validate
9. Create PR
10. Wait for user approval

**No wizard needed. Just documentation + templates.**

### Scenario 3: User says "What's the next batch of tasks?"

**Agent workflow:**

1. Read `docs/roadmaps/MASTER_ROADMAP.md`
2. Find "Ready for Deployment" section
3. List all tasks with `status: ready`
4. Sort by priority (HIGH > MEDIUM > LOW)
5. Check dependencies (skip blocked tasks)
6. Check module conflicts (group by module)
7. Recommend 3-4 tasks that can run in parallel
8. Provide links to prompts

**No capacity script needed. Agent reads and reasons.**

---

## 🎯 Advantages of GitHub-Native Approach

### ✅ Platform Agnostic

- Works with ANY AI agent
- No Manus-specific tools
- No sandbox assumptions
- Pure GitHub + markdown

### ✅ Human Readable

- User can read roadmap on GitHub
- User can review PRs easily
- User can edit if needed
- No special tools to understand system

### ✅ Version Controlled

- All changes tracked in git
- Easy to rollback
- Clear history
- Blame shows who added what

### ✅ Self-Documenting

- Instructions in the files themselves
- Templates show exact format
- Examples embedded in prompts
- No external documentation needed

### ✅ Low Maintenance

- No scripts to maintain
- No CI/CD complexity
- No pre-commit hooks
- Just markdown files

### ✅ Scalable

- Works for 10 tasks or 1000 tasks
- Works for 1 agent or 100 agents
- No performance issues
- No tooling bottlenecks

---

## 🔒 Enforcement Summary

| Mechanism                    | How It Works                            | Effectiveness                    |
| ---------------------------- | --------------------------------------- | -------------------------------- |
| **Documentation**            | Clear instructions at top of every file | 🟢 HIGH - Agents read first      |
| **Templates**                | Copy-paste format, hard to get wrong    | 🟢 HIGH - Reduces errors         |
| **GitHub Branch Protection** | Can't push to main                      | 🟢 HIGH - Technically enforced   |
| **PR Review**                | User approves all changes               | 🟢 HIGH - Human verification     |
| **GitHub Actions**           | Auto-validate on PR                     | 🟡 MEDIUM - Optional but helpful |
| **Session Files**            | Track who's working on what             | 🟡 MEDIUM - Prevents conflicts   |

**Result:** Multi-layer enforcement without complex tooling.

---

## 📁 Complete File Structure

```
TERP/
├── .claude/
│   └── AGENT_ONBOARDING.md          ← First thing agents read
├── .github/
│   └── workflows/
│       └── validate-roadmap.yml      ← Optional validation
├── docs/
│   ├── roadmaps/
│   │   └── MASTER_ROADMAP.md         ← Source of truth
│   ├── prompts/
│   │   ├── ST-005.md                 ← Self-contained instructions
│   │   ├── ST-007.md
│   │   └── ...
│   ├── templates/
│   │   ├── TASK_TEMPLATE.md          ← Copy this to add task
│   │   ├── PROMPT_TEMPLATE.md        ← Copy this for prompt
│   │   └── SESSION_TEMPLATE.md       ← Copy this for session
│   ├── sessions/
│   │   ├── active/                   ← Current work
│   │   └── completed/                ← Archived sessions
│   ├── HOW_TO_ADD_TASK.md            ← Step-by-step guide
│   ├── HOW_TO_WORK_ON_TASK.md        ← Step-by-step guide
│   ├── ACTIVE_SESSIONS.md            ← Who's working on what
│   ├── DEVELOPMENT_PROTOCOLS.md      ← Rules and standards
│   └── TROUBLESHOOTING.md            ← Common issues
├── scripts/
│   └── roadmap.ts                    ← Optional helper (not required)
└── README.md                         ← Points to onboarding
```

---

## 🚀 Implementation Checklist

- [ ] Create all template files
- [ ] Update AGENT_ONBOARDING.md with clear instructions
- [ ] Create HOW_TO_ADD_TASK.md guide
- [ ] Create HOW_TO_WORK_ON_TASK.md guide
- [ ] Migrate existing tasks to new format
- [ ] Create prompt files for ready tasks
- [ ] Set up GitHub branch protection
- [ ] Create GitHub Actions workflow (optional)
- [ ] Test with different AI agents
- [ ] Document edge cases

---

**Status:** Design complete, ready for expert QA
