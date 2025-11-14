# TERP Roadmap System - GitHub-Native Design V3.1 (IMPROVED)

**Date:** 2025-11-13  
**Version:** 3.1 (Incorporates Expert QA Fixes)  
**Constraint:** Must work for ANY AI agent (Claude.ai, ChatGPT, Cursor, etc.) using ONLY GitHub

**Changes from V3.0:**

- ✅ Fixed all 10 critical issues from expert QA
- ✅ Added prompt versioning and validation
- ✅ Added automated conflict detection
- ✅ Made GitHub Actions required
- ✅ Added deprecation mechanism
- ✅ Added rollback procedure
- ✅ Added session lifecycle management
- ✅ Added security safeguards
- ✅ Added circular dependency detection
- ✅ Improved active session tracking

---

## 🎯 Core Principle

**Everything lives in GitHub. Zero external dependencies.**

Any AI agent can:

1. Clone `https://github.com/EvanTenenbaum/TERP`
2. Read `.claude/AGENT_ONBOARDING.md`
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

**Last Updated:** 2025-11-13  
**Total Tasks:** 50  
**Active Tasks:** 5  
**Completed Tasks:** 15

## 📖 How to Use This Roadmap (FOR AI AGENTS)

### If user says: "Work on next task from TERP roadmap"

1. Read this file completely
2. Find "🚀 Ready for Deployment" section
3. Look for highest priority task marked `status: ready`
4. Check `docs/ACTIVE_SESSIONS.md` for conflicts (see below)
5. Click the prompt link (e.g., `docs/prompts/ST-005.md`)
6. Follow that prompt exactly

### If user says: "Add [description] to TERP roadmap"

1. ⛔ STOP - Do NOT manually edit this file
2. Read `docs/HOW_TO_ADD_TASK.md`
3. Follow the checklist exactly
4. Use the template at `docs/templates/TASK_TEMPLATE.md`
5. Submit PR for review (do not push to main)

### Before Starting ANY Task

1. Read `docs/ACTIVE_SESSIONS.md`
2. Check if any active sessions touch the same modules
3. If conflict exists:
   - STOP
   - Notify user
   - Wait for other agent to finish
   - OR choose different task

---

## 🚀 Ready for Deployment

### ST-005: Add Missing Database Indexes

**Status:** ready  
**Priority:** HIGH  
**Estimate:** 4-6h  
**Module:** `server/db/schema/`  
**Dependencies:** None  
**Prompt:** [📄 docs/prompts/ST-005.md](../prompts/ST-005.md)  
**Prompt Version:** 1.0  
**Prompt Last Validated:** 2025-11-13

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

**Tags:** database, performance, indexes

---

## 🏗️ In Progress

### ST-014: Test Infrastructure Improvements

**Status:** in-progress  
**Priority:** HIGH  
**Estimate:** 8-10h  
**Module:** `server/**/*.test.ts`  
**Dependencies:** None  
**Assigned To:** Session-2025-11-13-001  
**Started:** 2025-11-13  
**Session File:** [docs/sessions/active/Session-2025-11-13-001.md](../sessions/active/Session-2025-11-13-001.md)

---

## ✅ Completed

### ST-001: Initial Database Schema

**Status:** complete  
**Completed:** 2025-10-15  
**Actual Time:** 6h  
**Report:** [📄 docs/completion-reports/ST-001-COMPLETION-REPORT.md](../completion-reports/ST-001-COMPLETION-REPORT.md)  
**PR:** #42

---

## 🗑️ Deprecated

### ST-042: Implement GraphQL API

**Status:** deprecated  
**Deprecated Date:** 2025-10-20  
**Reason:** Switched to tRPC instead  
**Replaced By:** ST-055
```

**Key Features:**

- ✅ Human-readable (any agent can parse)
- ✅ Self-documenting (instructions at top)
- ✅ Prompt versioning tracked
- ✅ Active sessions linked
- ✅ Completion reports linked
- ✅ Deprecation mechanism
- ✅ Tags for searchability
- ✅ No special tools required

---

### Layer 2: Prompts (Self-Contained Instructions)

**Location:** `docs/prompts/ST-XXX.md`

**NEW: Prompt Versioning**

- Every prompt has version number
- Every prompt has "Last Validated" date
- Prompts updated when codebase changes
- GitHub Actions validates prompts match roadmap

**Structure:**

````markdown
# ST-005: Add Missing Database Indexes

<!-- METADATA (for validation) -->
<!-- TASK_ID: ST-005 -->
<!-- TASK_TITLE: Add Missing Database Indexes -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-13 -->
<!-- VALIDATED_BY: Session-2025-11-13-001 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** ST-005  
**Estimated Time:** 4-6 hours  
**Module:** `server/db/schema/`

⚠️ **SECURITY WARNING**

- NEVER include real secrets in this prompt
- Use placeholders like: `YOUR_API_KEY_HERE`
- Secrets belong in `.env` file only

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Development](#phase-3-development)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
The TERP database currently lacks indexes on many foreign key columns, causing slow queries on large datasets.

**Goal:**
Audit all foreign key relationships and add missing indexes to improve query performance.

**Success Criteria:**

- All foreign keys have corresponding indexes
- Query performance improved by >50% on key operations
- All tests passing
- Documentation updated

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-[DATE]-[NUMBER].md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in:
   - Task ID: ST-005
   - Module: `server/db/schema/`
   - Estimated completion: [DATE]

**Example:**

```bash
cp docs/templates/SESSION_TEMPLATE.md docs/sessions/active/Session-2025-11-13-002.md
# Edit file with your details
```
````

### Step 1.2: Check for Module Conflicts ⚠️ CRITICAL

**Read:** `docs/ACTIVE_SESSIONS.md`

**Look for:**

- Any other session working on `server/db/schema/`
- Any other session touching database migrations

**If conflict exists:**

1. ⛔ STOP immediately
2. Notify user: "Another agent is working on [module]. Wait or choose different task?"
3. DO NOT proceed until conflict resolved

**If no conflict:**

1. Update `docs/ACTIVE_SESSIONS.md`
2. Add your session to the list
3. Commit and push immediately

**Example ACTIVE_SESSIONS.md:**

```markdown
# Active Sessions

**Last Updated:** 2025-11-13T10:30:00Z

## Session-2025-11-13-002

**Task:** ST-005  
**Module:** `server/db/schema/`  
**Started:** 2025-11-13T10:00:00Z  
**Expected Completion:** 2025-11-14  
**Status:** active

---

## Session-2025-11-13-001

**Task:** ST-014  
**Module:** `server/**/*.test.ts`  
**Started:** 2025-11-13T08:00:00Z  
**Expected Completion:** 2025-11-15  
**Status:** active
```

### Step 1.3: Verify Environment

Run these commands:

```bash
node --version    # Should be v22.13.0
pnpm --version    # Should be installed
git status        # Should be clean
```

If any fail, see [Troubleshooting](#troubleshooting).

### Step 1.4: Clone Repository (if needed)

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
```

---

## Phase 2: Session Startup

**Objective:** Set up workspace and update roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b ST-005-database-indexes
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

**Change:**

```markdown
**Status:** ready
```

**To:**

```markdown
**Status:** in-progress  
**Assigned To:** Session-2025-11-13-002  
**Started:** 2025-11-13  
**Session File:** [docs/sessions/active/Session-2025-11-13-002.md](../sessions/active/Session-2025-11-13-002.md)
```

**Commit:**

```bash
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "ST-005: Start work on database indexes"
git push origin ST-005-database-indexes
```

### Step 2.3: Update Session File Progress

**File:** `docs/sessions/active/Session-2025-11-13-002.md`

**Add:**

```markdown
## Progress

- [x] Phase 1: Pre-Flight Check
- [x] Phase 2: Session Startup
- [ ] Phase 3: Development
- [ ] Phase 4: Completion

**Last Updated:** 2025-11-13T10:45:00Z
```

---

## Phase 3: Development

**Objective:** Complete the task following TDD.

### Step 3.1: Audit Foreign Keys

**File to create:** `docs/database-index-audit.md`

**Process:**

1. List all tables in `server/db/schema/`
2. For each table, identify foreign key columns
3. Check if index exists
4. Document missing indexes

**Example:**

```markdown
# Database Index Audit - ST-005

## orders table

**Foreign Keys:**

- `userId` → `users.id` ❌ No index
- `restaurantId` → `restaurants.id` ✅ Has index

**Recommendation:** Add index on `userId`
```

### Step 3.2: Write Tests FIRST (TDD)

**File:** `server/db/schema/indexes.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { db } from "../db";
import { sql } from "drizzle-orm";

describe("Database Indexes", () => {
  it("should have index on orders.userId", async () => {
    const result = await db.execute(sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'orders' 
      AND indexname LIKE '%userId%'
    `);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  // More tests for each index...
});
```

**Run tests (should fail):**

```bash
pnpm test server/db/schema/indexes.test.ts
```

### Step 3.3: Create Migration

**Command:**

```bash
pnpm db:generate
```

**File created:** `server/db/migrations/0012_add_missing_indexes.sql`

**Content:**

```sql
-- Add index on orders.userId
CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId);

-- Add index on orders.restaurantId (if missing)
CREATE INDEX IF NOT EXISTS idx_orders_restaurantId ON orders(restaurantId);

-- More indexes...
```

### Step 3.4: Run Migration

```bash
pnpm db:migrate
```

### Step 3.5: Verify Tests Pass

```bash
pnpm test server/db/schema/indexes.test.ts
```

All tests should now pass ✅

### Step 3.6: Benchmark Performance

**File:** `docs/database-performance-benchmark.md`

**Process:**

1. Run slow query before indexes
2. Measure time
3. Add indexes
4. Run same query
5. Measure improvement

**Example:**

```markdown
# Performance Benchmark - ST-005

## Query: Get all orders for user

**Before indexes:**

- Time: 450ms
- Rows scanned: 100,000

**After indexes:**

- Time: 12ms
- Rows scanned: 150

**Improvement:** 97.3% faster ✅
```

### Step 3.7: Update Documentation

**File:** `server/db/schema/README.md`

Add section:

```markdown
## Indexes

All foreign key columns have indexes for performance:

- `orders.userId` → `idx_orders_userId`
- `orders.restaurantId` → `idx_orders_restaurantId`
  ...
```

### Step 3.8: Run Full Test Suite

```bash
pnpm test
pnpm check
```

All must pass ✅

### Step 3.9: Commit Frequently

```bash
git add .
git commit -m "ST-005: Add index audit report"
git push

# Later...
git add .
git commit -m "ST-005: Add migration for missing indexes"
git push

# Later...
git add .
git commit -m "ST-005: Add performance benchmarks"
git push
```

---

## Phase 4: Completion

**Objective:** Finalize work and submit for review.

### Step 4.1: Verify All Deliverables

**From roadmap:**

- [x] Index audit report → `docs/database-index-audit.md`
- [x] Migration files → `server/db/migrations/0012_add_missing_indexes.sql`
- [x] Performance benchmark → `docs/database-performance-benchmark.md`
- [x] Updated schema documentation → `server/db/schema/README.md`
- [x] Tests verifying indexes → `server/db/schema/indexes.test.ts`

### Step 4.2: Create Completion Report

**File:** `docs/completion-reports/ST-005-COMPLETION-REPORT.md`

**Template:** `docs/templates/COMPLETION_REPORT_TEMPLATE.md`

**Content:**

```markdown
# ST-005: Add Missing Database Indexes - Completion Report

**Completed:** 2025-11-13  
**Session:** Session-2025-11-13-002  
**Estimated Time:** 4-6h  
**Actual Time:** 5h  
**Variance:** Within estimate ✅

## Summary

Successfully audited all foreign key relationships and added 8 missing indexes. Query performance improved by 97% on key operations.

## Deliverables

- ✅ Index audit report: `docs/database-index-audit.md`
- ✅ Migration files: `server/db/migrations/0012_add_missing_indexes.sql`
- ✅ Performance benchmark: `docs/database-performance-benchmark.md`
- ✅ Updated schema docs: `server/db/schema/README.md`
- ✅ Tests: `server/db/schema/indexes.test.ts`

## Test Results

- Total tests: 8 new tests
- Passing: 8/8 (100%)
- Coverage: 100% of new code

## Performance Impact

- Query speed: +97.3%
- Database load: -85%
- User experience: Significantly improved

## Challenges

- None significant

## Recommendations

- Monitor query performance over next week
- Consider adding indexes to other frequently queried columns

## Files Changed

- `server/db/schema/indexes.test.ts` (new)
- `server/db/migrations/0012_add_missing_indexes.sql` (new)
- `docs/database-index-audit.md` (new)
- `docs/database-performance-benchmark.md` (new)
- `server/db/schema/README.md` (updated)

**PR:** #123
```

### Step 4.3: Update Roadmap to Complete

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

**Move task from "In Progress" to "Completed":**

```markdown
## ✅ Completed

### ST-005: Add Missing Database Indexes

**Status:** complete  
**Completed:** 2025-11-13  
**Actual Time:** 5h  
**Report:** [📄 docs/completion-reports/ST-005-COMPLETION-REPORT.md](../completion-reports/ST-005-COMPLETION-REPORT.md)  
**PR:** #123
```

### Step 4.4: Update ACTIVE_SESSIONS.md

**File:** `docs/ACTIVE_SESSIONS.md`

**Remove your session OR mark as complete:**

```markdown
## Session-2025-11-13-002

**Task:** ST-005  
**Module:** `server/db/schema/`  
**Started:** 2025-11-13T10:00:00Z  
**Completed:** 2025-11-13T15:00:00Z  
**Status:** complete ✅
```

**Or move to:** `docs/sessions/completed/Session-2025-11-13-002.md`

### Step 4.5: Create Pull Request

```bash
git add .
git commit -m "ST-005: Complete database indexes task"
git push origin ST-005-database-indexes
```

**On GitHub:**

1. Create PR from `ST-005-database-indexes` to `main`
2. Title: "ST-005: Add Missing Database Indexes"
3. Description:

```markdown
## Task

ST-005: Add Missing Database Indexes

## Summary

Added 8 missing indexes on foreign key columns. Query performance improved by 97%.

## Deliverables

- ✅ Index audit report
- ✅ Migration files
- ✅ Performance benchmarks
- ✅ Updated documentation
- ✅ Tests (100% passing)

## Test Results

- All tests passing: 627/627
- New tests: 8/8 passing
- Coverage: 100%

## Completion Report

See: `docs/completion-reports/ST-005-COMPLETION-REPORT.md`
```

4. Request review
5. Wait for approval
6. Merge when approved

### Step 4.6: Notify User

**Message:**

```
✅ ST-005 Complete!

Added 8 database indexes. Query performance improved by 97%.

**PR:** #123 (awaiting review)
**Report:** docs/completion-reports/ST-005-COMPLETION-REPORT.md

**Next steps:**
- Wait for PR approval
- OR start next task from roadmap
```

---

## ⚡ Quick Reference

**Commands:**

```bash
# Run tests
pnpm test

# Type check
pnpm check

# Generate migration
pnpm db:generate

# Run migration
pnpm db:migrate

# Run full test suite
pnpm test && pnpm check
```

**Files:**

- Schema: `server/db/schema/`
- Migrations: `server/db/migrations/`
- Tests: `server/db/schema/*.test.ts`
- Docs: `docs/`

**Important Rules:**

- ✅ TDD: Write tests first
- ✅ Commit frequently (every 30-60 min)
- ✅ Push to GitHub often
- ✅ No `any` types
- ✅ Files <500 lines
- ✅ Update roadmap immediately
- ✅ Check for conflicts before starting

---

## 🆘 Troubleshooting

### Error: "pnpm: command not found"

**Solution:**

```bash
npm install -g pnpm
```

### Error: "Database connection failed"

**Solution:**

1. Check `.env` file exists
2. Verify database credentials
3. Ensure database is running

### Error: "Migration failed"

**Solution:**

1. Check migration SQL syntax
2. Verify table/column names
3. Check database logs
4. Rollback if needed: `pnpm db:rollback`

### Error: "Tests failing"

**Solution:**

1. Read error message carefully
2. Check test expectations
3. Verify database state
4. Run single test: `pnpm test path/to/test.ts`

### Error: "Module conflict detected"

**Solution:**

1. Check `docs/ACTIVE_SESSIONS.md`
2. Wait for other agent to finish
3. OR choose different task
4. Notify user of conflict

### General Errors

1. Read error message carefully
2. Check `docs/TROUBLESHOOTING.md`
3. Search GitHub issues
4. Ask user for help

---

## 📚 Additional Resources

- **Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
- **Agent Onboarding:** `.claude/AGENT_ONBOARDING.md`
- **TDD Guide:** `docs/TDD_GUIDE.md`
- **Database Docs:** `server/db/README.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`

---

**End of Prompt**

**Remember:**

1. Follow all 4 phases in order
2. Check for conflicts BEFORE starting
3. Update roadmap immediately
4. Commit and push frequently
5. Create completion report
6. Submit PR (never push to main)
7. Notify user when complete

**Good luck! 🚀**

````

**Key Improvements in V3.1:**
- ✅ Prompt versioning metadata
- ✅ Security warning about secrets
- ✅ Module conflict detection in Phase 1
- ✅ Active sessions tracking
- ✅ Progress tracking in session file
- ✅ Troubleshooting section
- ✅ Quick reference for commands
- ✅ Completion report with actual time
- ✅ Clear instructions for every step

---

### Layer 3: Enforcement (GitHub-Native)

**NEW: Required GitHub Actions**

**File:** `.github/workflows/roadmap-validation.yml`

```yaml
name: Roadmap Validation

on:
  pull_request:
    paths:
      - 'docs/roadmaps/**'
      - 'docs/prompts/**'
      - 'docs/sessions/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install -g js-yaml

      - name: Validate roadmap structure
        run: node scripts/validate-roadmap.js

      - name: Check for circular dependencies
        run: node scripts/check-circular-deps.js

      - name: Validate prompts match roadmap
        run: node scripts/validate-prompts.js

      - name: Check for secrets in prompts
        run: node scripts/check-secrets.js

      - name: Validate session files
        run: node scripts/validate-sessions.js
````

**Validation Scripts:**

**File:** `scripts/validate-roadmap.js`

```javascript
// Validates roadmap structure
// - All required fields present
// - Valid status values
// - Dependencies exist
// - Prompts linked correctly
// - No duplicate task IDs

const fs = require("fs");
const path = require("path");

const roadmapPath = "docs/roadmaps/MASTER_ROADMAP.md";
const roadmap = fs.readFileSync(roadmapPath, "utf-8");

// Parse tasks
const taskPattern = /### (ST-\d+): (.+?)\n\n\*\*Status:\*\* (\w+)/g;
const tasks = [];
let match;

while ((match = taskPattern.exec(roadmap)) !== null) {
  tasks.push({
    id: match[1],
    title: match[2],
    status: match[3],
  });
}

// Validate
const validStatuses = [
  "ready",
  "in-progress",
  "complete",
  "blocked",
  "deprecated",
];
const errors = [];

tasks.forEach(task => {
  if (!validStatuses.includes(task.status)) {
    errors.push(`${task.id}: Invalid status "${task.status}"`);
  }
});

// Check for duplicates
const ids = tasks.map(t => t.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
  errors.push(`Duplicate task IDs: ${duplicates.join(", ")}`);
}

if (errors.length > 0) {
  console.error("❌ Roadmap validation failed:");
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log("✅ Roadmap validation passed");
}
```

**File:** `scripts/check-circular-deps.js`

```javascript
// Detects circular dependencies in task graph

const fs = require("fs");

const roadmapPath = "docs/roadmaps/MASTER_ROADMAP.md";
const roadmap = fs.readFileSync(roadmapPath, "utf-8");

// Parse dependencies
const depPattern = /### (ST-\d+):.+?\n\*\*Dependencies:\*\* (.+?)\n/gs;
const graph = {};
let match;

while ((match = depPattern.exec(roadmap)) !== null) {
  const taskId = match[1];
  const deps =
    match[2] === "None" ? [] : match[2].split(",").map(s => s.trim());
  graph[taskId] = deps;
}

// DFS to detect cycles
function hasCycle(node, visited, recStack) {
  visited[node] = true;
  recStack[node] = true;

  const neighbors = graph[node] || [];
  for (const neighbor of neighbors) {
    if (!visited[neighbor]) {
      if (hasCycle(neighbor, visited, recStack)) {
        return true;
      }
    } else if (recStack[neighbor]) {
      return true;
    }
  }

  recStack[node] = false;
  return false;
}

const visited = {};
const recStack = {};
let cycleDetected = false;

for (const node in graph) {
  if (!visited[node]) {
    if (hasCycle(node, visited, recStack)) {
      console.error(`❌ Circular dependency detected involving ${node}`);
      cycleDetected = true;
    }
  }
}

if (cycleDetected) {
  process.exit(1);
} else {
  console.log("✅ No circular dependencies detected");
}
```

**File:** `scripts/validate-prompts.js`

```javascript
// Validates prompts match roadmap tasks

const fs = require("fs");
const path = require("path");

const roadmapPath = "docs/roadmaps/MASTER_ROADMAP.md";
const promptsDir = "docs/prompts";

const roadmap = fs.readFileSync(roadmapPath, "utf-8");

// Extract task IDs and titles from roadmap
const taskPattern = /### (ST-\d+): (.+?)\n/g;
const roadmapTasks = {};
let match;

while ((match = taskPattern.exec(roadmap)) !== null) {
  roadmapTasks[match[1]] = match[2];
}

// Check each prompt file
const errors = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith(".md"));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, "utf-8");

  // Extract metadata
  const idMatch = prompt.match(/<!-- TASK_ID: (ST-\d+) -->/);
  const titleMatch = prompt.match(/<!-- TASK_TITLE: (.+?) -->/);

  if (!idMatch) {
    errors.push(`${file}: Missing TASK_ID metadata`);
    return;
  }

  if (!titleMatch) {
    errors.push(`${file}: Missing TASK_TITLE metadata`);
    return;
  }

  const promptId = idMatch[1];
  const promptTitle = titleMatch[1];

  // Verify matches roadmap
  if (!roadmapTasks[promptId]) {
    errors.push(`${file}: Task ${promptId} not found in roadmap`);
  } else if (roadmapTasks[promptId] !== promptTitle) {
    errors.push(
      `${file}: Title mismatch. Prompt: "${promptTitle}", Roadmap: "${roadmapTasks[promptId]}"`
    );
  }
});

if (errors.length > 0) {
  console.error("❌ Prompt validation failed:");
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log("✅ All prompts match roadmap");
}
```

**File:** `scripts/check-secrets.js`

```javascript
// Scans prompts for potential secrets

const fs = require("fs");
const path = require("path");

const promptsDir = "docs/prompts";
const secretPatterns = [
  /api[_-]?key["\s:=]+[a-zA-Z0-9]{20,}/i,
  /secret["\s:=]+[a-zA-Z0-9]{20,}/i,
  /password["\s:=]+[^\s]{8,}/i,
  /token["\s:=]+[a-zA-Z0-9]{20,}/i,
];

const errors = [];
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith(".md"));

promptFiles.forEach(file => {
  const promptPath = path.join(promptsDir, file);
  const prompt = fs.readFileSync(promptPath, "utf-8");

  secretPatterns.forEach((pattern, index) => {
    if (pattern.test(prompt)) {
      errors.push(`${file}: Potential secret detected (pattern ${index + 1})`);
    }
  });
});

if (errors.length > 0) {
  console.error("❌ Secret scan failed:");
  errors.forEach(err => console.error(`  - ${err}`));
  console.error(
    "\n⚠️  Remove secrets and use placeholders like YOUR_API_KEY_HERE"
  );
  process.exit(1);
} else {
  console.log("✅ No secrets detected in prompts");
}
```

**File:** `scripts/validate-sessions.js`

```javascript
// Validates session files and detects stale sessions

const fs = require("fs");
const path = require("path");

const activeSessionsDir = "docs/sessions/active";

if (!fs.existsSync(activeSessionsDir)) {
  console.log("✅ No active sessions");
  process.exit(0);
}

const sessionFiles = fs
  .readdirSync(activeSessionsDir)
  .filter(f => f.endsWith(".md"));
const now = new Date();
const errors = [];
const warnings = [];

sessionFiles.forEach(file => {
  const sessionPath = path.join(activeSessionsDir, file);
  const session = fs.readFileSync(sessionPath, "utf-8");

  // Extract last updated
  const lastUpdatedMatch = session.match(/\*\*Last Updated:\*\* (.+)/);
  if (!lastUpdatedMatch) {
    errors.push(`${file}: Missing Last Updated timestamp`);
    return;
  }

  const lastUpdated = new Date(lastUpdatedMatch[1]);
  const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

  if (hoursSinceUpdate > 24) {
    warnings.push(
      `${file}: Stale session (last updated ${hoursSinceUpdate.toFixed(1)}h ago). Consider moving to abandoned/`
    );
  }
});

if (errors.length > 0) {
  console.error("❌ Session validation failed:");
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠️  Session warnings:");
  warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log("✅ Session validation passed");
```

**Branch Protection Settings:**

**Repository Settings → Branches → main:**

- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass:
  - `Roadmap Validation`
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing

**This ensures:**

- No one can push directly to main
- All changes go through PR review
- GitHub Actions must pass
- Validation catches errors automatically

---

### Layer 4: Workflows (Documented Processes)

**NEW: Enhanced Workflows**

#### Workflow 1: Adding a New Task

**File:** `docs/HOW_TO_ADD_TASK.md`

````markdown
# How to Add a Task to the Roadmap

⚠️ **NEVER edit MASTER_ROADMAP.md directly on main branch**

## Process

### Step 1: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b add-task-ST-XXX
```
````

### Step 2: Use Template

```bash
cp docs/templates/TASK_TEMPLATE.md docs/tasks/ST-XXX-draft.md
```

### Step 3: Fill Template

**Edit:** `docs/tasks/ST-XXX-draft.md`

**Required Fields:**

- Task ID (get next number from roadmap)
- Title (clear, concise)
- Status (usually "ready")
- Priority (HIGH/MEDIUM/LOW)
- Estimate (hours)
- Module (which files/folders)
- Dependencies (task IDs or "None")
- Objectives (3-5 bullet points)
- Deliverables (checkbox list)
- Tags (for searchability)

**Example:**

```markdown
### ST-051: Implement Email Notifications

**Status:** ready  
**Priority:** MEDIUM  
**Estimate:** 6-8h  
**Module:** `server/services/email/`  
**Dependencies:** ST-042, ST-045  
**Tags:** email, notifications, user-experience

**Objectives:**

- Set up email service (SendGrid or similar)
- Create email templates
- Implement notification triggers
- Add user preferences for email frequency

**Deliverables:**

- [ ] Email service integration
- [ ] Email templates (welcome, order confirmation, etc.)
- [ ] Notification trigger system
- [ ] User email preferences UI
- [ ] Tests for email sending
- [ ] Documentation
```

### Step 4: Create Prompt

```bash
cp docs/templates/PROMPT_TEMPLATE.md docs/prompts/ST-XXX.md
```

**Edit:** `docs/prompts/ST-XXX.md`

**Update metadata:**

```markdown
<!-- TASK_ID: ST-051 -->
<!-- TASK_TITLE: Implement Email Notifications -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-13 -->
```

**Fill in all sections:**

- Context
- Phase 1: Pre-Flight Check
- Phase 2: Session Startup
- Phase 3: Development (specific steps)
- Phase 4: Completion
- Quick Reference
- Troubleshooting

**Make it specific:**

- Include actual commands
- Show code examples
- List exact file paths
- Provide troubleshooting for common errors

### Step 5: Add to Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

**Add to appropriate section** (usually "🚀 Ready for Deployment"):

```markdown
### ST-051: Implement Email Notifications

**Status:** ready  
**Priority:** MEDIUM  
**Estimate:** 6-8h  
**Module:** `server/services/email/`  
**Dependencies:** ST-042, ST-045  
**Prompt:** [📄 docs/prompts/ST-051.md](../prompts/ST-051.md)  
**Prompt Version:** 1.0  
**Prompt Last Validated:** 2025-11-13

**Quick Summary:**
Set up email service and implement notification system for key user events.

**Objectives:**

- Set up email service (SendGrid or similar)
- Create email templates
- Implement notification triggers
- Add user preferences for email frequency

**Deliverables:**

- [ ] Email service integration
- [ ] Email templates (welcome, order confirmation, etc.)
- [ ] Notification trigger system
- [ ] User email preferences UI
- [ ] Tests for email sending
- [ ] Documentation

**Tags:** email, notifications, user-experience
```

### Step 6: Validate Locally (Optional)

```bash
node scripts/validate-roadmap.js
node scripts/check-circular-deps.js
node scripts/validate-prompts.js
node scripts/check-secrets.js
```

### Step 7: Commit and Push

```bash
git add docs/roadmaps/MASTER_ROADMAP.md
git add docs/prompts/ST-051.md
git add docs/tasks/ST-051-draft.md
git commit -m "Add task: ST-051 Implement Email Notifications"
git push origin add-task-ST-051
```

### Step 8: Create PR

**On GitHub:**

1. Create PR from `add-task-ST-051` to `main`
2. Title: "Add task: ST-051 Implement Email Notifications"
3. Description:

```markdown
## New Task

**ID:** ST-051  
**Title:** Implement Email Notifications  
**Priority:** MEDIUM  
**Estimate:** 6-8h

## Checklist

- [x] Used template
- [x] All required fields filled
- [x] Dependencies verified
- [x] Prompt created and complete
- [x] No circular dependencies
- [x] No secrets in prompt
- [x] Validation scripts pass
```

4. Request review
5. Wait for approval
6. Merge when approved

### Step 9: Announce

**Notify team:**
"New task added to roadmap: ST-051 (Implement Email Notifications). Ready for deployment."

---

## Checklist

Before submitting PR, verify:

- [ ] Task ID is unique (not already used)
- [ ] All required fields filled
- [ ] Dependencies exist in roadmap
- [ ] No circular dependencies
- [ ] Prompt file created
- [ ] Prompt metadata matches task
- [ ] Prompt includes all 4 phases
- [ ] Prompt has troubleshooting section
- [ ] No secrets in prompt
- [ ] Tags added for searchability
- [ ] Validation scripts pass
- [ ] PR description complete

---

## Common Mistakes

❌ **Editing roadmap directly on main**  
✅ Create branch first

❌ **Missing dependencies**  
✅ List all prerequisite tasks

❌ **Vague deliverables**  
✅ Be specific and measurable

❌ **Incomplete prompt**  
✅ Use template and fill all sections

❌ **No troubleshooting**  
✅ Add common errors and solutions

❌ **Secrets in prompt**  
✅ Use placeholders only

````

---

#### Workflow 2: Deprecating a Task

**File:** `docs/HOW_TO_DEPRECATE_TASK.md`

```markdown
# How to Deprecate a Task

When a task becomes obsolete or is replaced by a different approach.

## Process

### Step 1: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b deprecate-ST-XXX
````

### Step 2: Update Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

**Move task from current section to "🗑️ Deprecated":**

```markdown
## 🗑️ Deprecated

### ST-042: Implement GraphQL API

**Status:** deprecated  
**Deprecated Date:** 2025-11-13  
**Reason:** Switched to tRPC instead for better type safety  
**Replaced By:** ST-055  
**Original Priority:** HIGH  
**Original Estimate:** 12-16h
```

### Step 3: Archive Prompt

```bash
mkdir -p docs/prompts/deprecated
git mv docs/prompts/ST-042.md docs/prompts/deprecated/
```

### Step 4: Add Deprecation Notice to Prompt

**Edit:** `docs/prompts/deprecated/ST-042.md`

**Add at top:**

```markdown
# ⚠️ DEPRECATED

**This task has been deprecated.**

**Date:** 2025-11-13  
**Reason:** Switched to tRPC instead  
**Replaced By:** ST-055

**Do not use this prompt.**

---

# ST-042: Implement GraphQL API (DEPRECATED)

...
```

### Step 5: Commit and PR

```bash
git add docs/roadmaps/MASTER_ROADMAP.md
git add docs/prompts/deprecated/ST-042.md
git commit -m "Deprecate ST-042: GraphQL API (replaced by tRPC)"
git push origin deprecate-ST-042
```

Create PR with explanation.

````

---

#### Workflow 3: Rollback Procedure

**File:** `docs/HOW_TO_ROLLBACK.md`

```markdown
# How to Rollback a Task

When a completed task causes issues and needs to be reverted.

## Process

### Step 1: Identify Problem

**Determine:**
- Which task caused the issue
- Which PR introduced it
- What broke

### Step 2: Create Revert Branch

```bash
git checkout main
git pull origin main
git checkout -b revert-ST-XXX
````

### Step 3: Revert Commits

```bash
# Find the merge commit
git log --oneline | grep "ST-XXX"

# Revert it
git revert -m 1 <merge-commit-hash>
```

### Step 4: Update Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

**Change task status:**

```markdown
### ST-XXX: Task Title

**Status:** reverted  
**Completed:** 2025-11-10  
**Reverted:** 2025-11-13  
**Revert Reason:** Caused performance regression in production  
**Revert PR:** #456  
**Original PR:** #123
```

### Step 5: Create Revert PR

```bash
git add .
git commit -m "Revert ST-XXX: Task Title"
git push origin revert-ST-XXX
```

**PR description:**

```markdown
## Revert: ST-XXX

**Reason:** [Explain what broke]

**Impact:** [Describe the issue]

**Original PR:** #123

**Next Steps:**

- Create new task to fix properly
- OR adjust approach and retry
```

### Step 6: Create Fix Task

Add new task to roadmap:

```markdown
### ST-XXX-FIX: Fix Task Title (Revised Approach)

**Status:** ready  
**Priority:** HIGH  
**Estimate:** 4-6h  
**Module:** `same/module/`  
**Dependencies:** None  
**Replaces:** ST-XXX (reverted)

**Changes from Original:**

- Use different approach to avoid performance issue
- Add performance tests before merging
```

```

---

## 📁 Complete File Structure

```

TERP/
├── .github/
│ └── workflows/
│ └── roadmap-validation.yml # Required GitHub Actions
├── .claude/
│ └── AGENT_ONBOARDING.md # Entry point for agents
├── docs/
│ ├── roadmaps/
│ │ ├── MASTER_ROADMAP.md # Main roadmap (active tasks)
│ │ ├── COMPLETED_TASKS.md # Archive of completed tasks
│ │ └── DEPRECATED_TASKS.md # Archive of deprecated tasks
│ ├── prompts/
│ │ ├── ST-005.md # Task prompts
│ │ ├── ST-007.md
│ │ ├── ...
│ │ └── deprecated/ # Archived prompts
│ │ └── ST-042.md
│ ├── sessions/
│ │ ├── active/ # Current sessions
│ │ │ ├── Session-2025-11-13-001.md
│ │ │ └── Session-2025-11-13-002.md
│ │ ├── completed/ # Finished sessions
│ │ └── abandoned/ # Stale/abandoned sessions
│ ├── completion-reports/
│ │ ├── ST-001-COMPLETION-REPORT.md
│ │ ├── ST-005-COMPLETION-REPORT.md
│ │ └── ...
│ ├── templates/
│ │ ├── TASK_TEMPLATE.md # Template for new tasks
│ │ ├── PROMPT_TEMPLATE.md # Template for prompts
│ │ ├── SESSION_TEMPLATE.md # Template for sessions
│ │ └── COMPLETION_REPORT_TEMPLATE.md # Template for completion reports
│ ├── ACTIVE_SESSIONS.md # Current active sessions (for conflict detection)
│ ├── HOW_TO_ADD_TASK.md # Workflow documentation
│ ├── HOW_TO_DEPRECATE_TASK.md
│ ├── HOW_TO_ROLLBACK.md
│ ├── ROADMAP_SYSTEM_OVERVIEW.md # Human-friendly system guide
│ ├── TROUBLESHOOTING.md # Common issues and solutions
│ └── ROADMAP_METRICS.md # System metrics and health
├── scripts/
│ ├── validate-roadmap.js # Validation scripts
│ ├── check-circular-deps.js
│ ├── validate-prompts.js
│ ├── check-secrets.js
│ └── validate-sessions.js
└── README.md # Points agents to AGENT_ONBOARDING.md

````

---

## 🎯 How Agents Use the System

### Scenario 1: "Execute ST-005 from TERP roadmap"

**Agent process:**
1. Clone repository (if needed)
2. Read `.claude/AGENT_ONBOARDING.md`
3. Navigate to `docs/roadmaps/MASTER_ROADMAP.md`
4. Find ST-005
5. Click prompt link: `docs/prompts/ST-005.md`
6. Follow prompt Phase 1: Pre-Flight Check
   - Create session file
   - Check `ACTIVE_SESSIONS.md` for conflicts
   - Update `ACTIVE_SESSIONS.md`
7. Follow prompt Phase 2: Session Startup
   - Create branch
   - Update roadmap status to "in-progress"
8. Follow prompt Phase 3: Development
   - Write tests first (TDD)
   - Implement solution
   - Commit frequently
9. Follow prompt Phase 4: Completion
   - Create completion report
   - Update roadmap to "complete"
   - Update `ACTIVE_SESSIONS.md`
   - Create PR
   - Notify user

**Result:** Task completed following exact protocol.

---

### Scenario 2: "Add email notifications to TERP roadmap"

**Agent process:**
1. Read `.claude/AGENT_ONBOARDING.md`
2. See: "If user says: Add task to TERP roadmap"
3. Read `docs/HOW_TO_ADD_TASK.md`
4. Follow checklist:
   - Create branch
   - Use `TASK_TEMPLATE.md`
   - Fill all required fields
   - Create prompt using `PROMPT_TEMPLATE.md`
   - Add to `MASTER_ROADMAP.md`
   - Run validation scripts
   - Create PR
5. Wait for review and approval

**Result:** New task added following exact protocol.

---

### Scenario 3: "What's the next batch of tasks for parallel agents?"

**Agent process:**
1. Read `docs/roadmaps/MASTER_ROADMAP.md`
2. Find "🚀 Ready for Deployment" section
3. Filter tasks with `status: ready`
4. Sort by priority (HIGH first)
5. Read `docs/ACTIVE_SESSIONS.md`
6. Check for module conflicts
7. Recommend 3-4 tasks with:
   - No dependencies on each other
   - No module conflicts
   - Mix of priorities
   - Estimated total time: 12-24h

**Example recommendation:**
```markdown
## Recommended Batch (3 tasks, ~18h total)

1. **ST-005:** Add Missing Database Indexes (HIGH, 4-6h)
   - Module: `server/db/schema/`
   - No conflicts

2. **ST-007:** Implement System-Wide Pagination (HIGH, 6-8h)
   - Module: `server/routers/`
   - No conflicts

3. **ST-010:** Add Request Logging (MEDIUM, 4-6h)
   - Module: `server/middleware/`
   - No conflicts

**Deployment:**
- Agent 1: Execute ST-005
- Agent 2: Execute ST-007
- Agent 3: Execute ST-010

**Safety:**
- ✅ No module conflicts
- ✅ No dependencies between tasks
- ✅ All have complete prompts
- ✅ Estimated completion: 1-2 days
````

---

## ✅ Advantages of GitHub-Native Approach

### 1. **Platform Agnostic**

- Works with ANY AI agent (Claude.ai, ChatGPT, Cursor, etc.)
- No vendor lock-in
- Future-proof

### 2. **Zero Setup**

- Just clone repository
- No tools to install
- No configuration needed

### 3. **Self-Documenting**

- Instructions in the files
- Templates show format
- Examples everywhere

### 4. **Version Controlled**

- Full history in git
- Easy rollback
- Audit trail

### 5. **Collaborative**

- Multiple agents can work simultaneously
- Conflict detection built-in
- PR review ensures quality

### 6. **Low Maintenance**

- Just markdown files
- No complex scripts
- Easy to understand and modify

### 7. **Scalable**

- Works for 10 or 1000 tasks
- Works for 1 or 100 agents
- Linear complexity

### 8. **Enforceable**

- Branch protection prevents bypassing
- GitHub Actions validates automatically
- PR review catches mistakes

### 9. **Discoverable**

- Search with Ctrl+F
- Tags for categorization
- Clear file structure

### 10. **Auditable**

- Completion reports
- Session tracking
- Metrics and trends

---

## 🔒 Security Considerations

### 1. **No Secrets in Prompts**

- Validation script scans for secrets
- Prompts use placeholders only
- Real secrets in `.env` only

### 2. **Branch Protection**

- No direct pushes to main
- PR review required
- Status checks must pass

### 3. **Access Control**

- GitHub repository permissions
- Only authorized users can merge
- Audit log of all changes

---

## 📊 System Metrics (Optional)

**File:** `docs/ROADMAP_METRICS.md`

```markdown
# Roadmap Metrics

**Last Updated:** 2025-11-13

## Overview

- **Total Tasks:** 50
- **Complete:** 15 (30%)
- **In Progress:** 5 (10%)
- **Ready:** 10 (20%)
- **Blocked:** 5 (10%)
- **Deprecated:** 15 (30%)

## Performance

- **Average Completion Time:** 6.5h
- **Estimate Accuracy:** ±40%
- **Tasks Completed This Month:** 8
- **Active Agents:** 3

## Trends

- **Velocity:** 8 tasks/month (increasing)
- **Quality:** 95% first-time pass rate
- **Rework:** 5% of tasks need fixes

## Top Contributors

1. Agent-Session-2025-11-001: 5 tasks
2. Agent-Session-2025-11-002: 3 tasks
3. Agent-Session-2025-11-003: 2 tasks
```

---

## 🎯 Summary

**V3.1 GitHub-Native Roadmap System:**

1. **Layer 1:** Roadmap in markdown (source of truth)
2. **Layer 2:** Self-contained prompts (complete instructions)
3. **Layer 3:** GitHub-native enforcement (branch protection + Actions)
4. **Layer 4:** Documented workflows (how to add/deprecate/rollback)

**Key Improvements from V3.0:**

- ✅ Prompt versioning and validation
- ✅ Automated conflict detection
- ✅ Required GitHub Actions
- ✅ Deprecation mechanism
- ✅ Rollback procedure
- ✅ Session lifecycle management
- ✅ Security safeguards (secret scanning)
- ✅ Circular dependency detection
- ✅ Improved active session tracking
- ✅ Stale session detection

**Works with:**

- ✅ Claude.ai (web)
- ✅ ChatGPT (web)
- ✅ Cursor (IDE)
- ✅ Any AI agent with GitHub access

**Enforcement:**

- ✅ Documentation (awareness)
- ✅ Templates (guidance)
- ✅ Branch protection (technical block)
- ✅ PR review (human verification)
- ✅ GitHub Actions (automated validation)

**Result:** Production-ready, platform-agnostic roadmap system that lives entirely in GitHub.

---

**Ready for adversarial QA and implementation.**
