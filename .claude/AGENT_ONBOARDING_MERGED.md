# 🚀 TERP Agent Onboarding - COMPLETE GUIDE
## MANDATORY Reading for All Development Agents

**Purpose:** Ensure every agent/engineer builds production-quality code in alignment with TERP's workflow system
**Time Required:** 20 minutes
**Last Updated:** November 12, 2025

---

## 🚨 PART 1: CRITICAL RULES - NO EXCEPTIONS

### 1. Security Requirements (BLOCKING)
Before making ANY code changes, review:
- `CODE_QA_EXECUTIVE_SUMMARY.md` - Security section
- **NEVER** use `publicProcedure` for admin/financial endpoints
- **ALWAYS** use `adminProcedure` for admin operations
- **NEVER** hardcode credentials or secrets
- **ALWAYS** validate user authorization before data access

### 2. Code Quality Standards (ENFORCED)
- ❌ **NO `any` types** - Define proper interfaces
- ❌ **NO files over 500 lines** - Split into modules
- ❌ **NO N+1 queries** - Batch database operations
- ❌ **NO placeholders, TODOs, stubs** - Only production-ready code
- ✅ **ALWAYS add pagination** to list endpoints
- ✅ **ALWAYS use TRPCError** for error handling
- ✅ **ALWAYS write tests** for new routers/services (TDD)

### 3. Mandatory Checks Before Committing
```bash
# 1. Type check passes
pnpm check

# 2. Tests pass
pnpm test

# 3. Pre-commit hooks pass (will auto-check):
# - No `any` types
# - No files over 500 lines
# - No TODO/FIXME/console.log
# - No placeholders or stubs
```

---

## 📚 PART 2: Required Reading (15 minutes)

### Phase 1: Code Quality & Security (7 minutes)

**1. CODE_QA_EXECUTIVE_SUMMARY.md (5 min)**
```
Location: CODE_QA_EXECUTIVE_SUMMARY.md
```
- Critical findings and priorities
- Security vulnerabilities to avoid
- Current phase work:
  - Phase 1 (Week 1): Security fixes
  - Phase 2 (Weeks 2-4): Performance & quality
  - Phase 3 (Weeks 5-7): Technical debt

**2. Architecture Patterns (2 min)**
```
Router (thin) → Service (business logic) → Repository (data access)

✅ GOOD:
router → service.createOrder() → orderRepo.save()

❌ BAD:
router → db.insert() directly
router → 70 lines of business logic
```

### Phase 2: Workflow & Process (8 minutes)

**3. QUICK_REFERENCE.md (2 minutes)** ⭐
```
Location: docs/QUICK_REFERENCE.md
```
- 2-minute overview of entire system
- 15 real-world examples
- Essential commands

**4. MASTER_ROADMAP.md (3 minutes)**
```
Location: docs/roadmaps/MASTER_ROADMAP.md
```
- **THE ONLY ROADMAP** that matters (single source of truth)
- Current sprint priorities
- Backlog items
- What NOT to build

**5. DEVELOPMENT_PROTOCOLS.md - Section 16 (2 minutes)**
```
Location: docs/DEVELOPMENT_PROTOCOLS.md#16-status-updates--github-sync-protocol-mandatory
```
- GitHub sync protocol (MANDATORY)
- Status update requirements every 30 minutes
- Retry/rollback procedures

**6. CLAUDE_WORKFLOW.md - Skim Key Sections (1 minute)**
```
Location: docs/CLAUDE_WORKFLOW.md
```
- Sections 1-3 (Quick Start, SSOT, Parallel Development)
- Session IDs and branch naming
- Status tracking

---

## 🎯 PART 3: Your Workflow (Required for EVERY Session)

### At Start of EVERY Session

**Step 1: Check Active Work (30 seconds)**
```bash
cat docs/ACTIVE_SESSIONS.md
# OR regenerate it
./scripts/aggregate-sessions.sh
```
- See what other agents are working on
- Avoid conflicts (don't work on same module!)

**Step 2: Pick Your Task (1 minute)**
```bash
cat docs/roadmaps/MASTER_ROADMAP.md
```
- Choose from "Current Sprint" section
- Check priorities: 🔴 HIGH → 🟡 MEDIUM → 🟢 LOW
- Tell user: "I'm going to work on [TASK] from the roadmap"

**Step 3: Create Your Session (automatic)**

Claude will automatically:
- Generate session ID: `Session-YYYYMMDD-task-slug-RANDOM`
- Create branch: `claude/task-slug-SESSIONID`
- Create session file: `docs/sessions/active/Session-[ID].md`
- Update ACTIVE_SESSIONS.md

---

## 📋 PART 4: During Development (TDD + Best Practices)

### 1. Write Tests First (TDD - MANDATORY)
```bash
# Copy test template
cp test-examples/pricing.test.ts test/your-feature.test.ts

# Write failing test
pnpm test your-feature.test.ts

# Write code to pass test
pnpm test your-feature.test.ts

# Refactor if needed
```

### 2. Error Handling Pattern
```typescript
// ✅ ALWAYS use TRPCError
throw new TRPCError({
  code: 'NOT_FOUND', // BAD_REQUEST, UNAUTHORIZED, INTERNAL_SERVER_ERROR
  message: 'Order not found',
  cause: error, // Include original error for logging
});

// ❌ NEVER use generic Error
throw new Error("Something went wrong");

// ❌ NEVER return success/error objects
return { success: false, error: "..." };
```

### 3. Database Query Patterns
```typescript
// ❌ N+1 PROBLEM - BLOCKED
for (const item of items) {
  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, item.batchId)
  });
}

// ✅ CORRECT - Batch load
const batchIds = items.map(i => i.batchId);
const batches = await db.query.batches.findMany({
  where: inArray(batches.id, batchIds)
});
const batchMap = new Map(batches.map(b => [b.id, b]));
```

### 4. Status Updates (Every 30 minutes)
```bash
# Update session file
echo "Status: Implementing feature X, ETA 20 min" >> docs/sessions/active/Session-[ID].md

# Commit + push immediately
git add docs/sessions/active/Session-[ID].md
git commit -m "status: [brief update]"
git push origin claude/task-slug-SESSIONID
```

---

## 🔍 PART 5: How to Find Information

### "I need to add a new API endpoint"
1. Check: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 5 (API Router Analysis)
2. Pattern: Create thin router + service + repository
3. Template: Copy from `server/routers/calendar.ts` (good example)
4. Tests: Copy pattern from `server/routers/calendar.test.ts`

### "I need to fix a security issue"
1. Check: `CODE_QA_EXECUTIVE_SUMMARY.md` → Critical Findings
2. Priority order: Fix Phase 1 security issues first
3. Pattern: Always use `protectedProcedure` or `adminProcedure`

### "I need to optimize performance"
1. Check: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 10 (Performance)
2. Common fixes:
   - N+1 queries → Batch loading
   - Post-query filtering → SQL WHERE clauses
   - Missing pagination → Add limit/offset
   - Large components → Code splitting

### "I need to refactor a large file"
1. Check: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 5 or Phase 6
2. See specific refactoring recommendations for that file
3. Pattern: Split by responsibility, extract to services

---

## ⚠️ BLOCKERS - Will Fail PR Review

These will be **automatically rejected** in code review or blocked by pre-commit hooks:

1. ❌ New `publicProcedure` for financial/admin data
2. ❌ New `any` types without TODO comment + justification
3. ❌ Files over 500 lines without approval
4. ❌ N+1 query patterns
5. ❌ Router endpoints without tests
6. ❌ Hardcoded credentials or secrets
7. ❌ Database queries without pagination (for list endpoints)
8. ❌ Console.log instead of logger
9. ❌ Generic Error instead of TRPCError
10. ❌ Dead code (commented out blocks)
11. ❌ TODO, FIXME, placeholders, or "coming soon" comments
12. ❌ Stub functions or incomplete implementations

---

## 🚫 Prohibited Actions (NEVER VIOLATE)

These actions are **STRICTLY FORBIDDEN** and will cause immediate rejection:

❌ **Write code without tests** - TDD is mandatory
❌ **Skip status updates** - Update every 30 minutes
❌ **Use `git commit --no-verify`** - Pre-commit hooks exist for a reason
❌ **Work on same module as another agent** - Check ACTIVE_SESSIONS.md first
❌ **Push directly to main** - Always use feature branches
❌ **Create TODOs or placeholder code** - Only production-ready code
❌ **Report task "done" without verifying all requirements** - Check everything first

---

## 📋 Task-Specific Guides

### Adding New Features
1. Read relevant section in QA report
2. Check MASTER_ROADMAP.md for priority
3. Check if router already exists (68 routers, many unused)
4. Follow 3-layer architecture (router → service → repository)
5. Write tests FIRST (TDD)
6. Add error boundaries (frontend)
7. Document in API_Documentation.md (if adding API)
8. Update status every 30 minutes

### Fixing Bugs
1. Check if bug is in QA report (likely already identified)
2. Write test that reproduces bug
3. Fix bug (test should pass)
4. Ensure no regressions (run full test suite)
5. Update session file with fix details

### Refactoring
1. Check QA report for specific recommendations
2. Write tests for existing behavior FIRST
3. Refactor while keeping tests green
4. Verify no performance degradation
5. Update documentation if needed

---

## ✅ Before Reporting "Done"

Check ALL of these before saying you're finished:

- [ ] All tests pass (`pnpm test`)
- [ ] Zero TypeScript errors (`pnpm check`)
- [ ] Code follows TDD (tests written first)
- [ ] Test coverage ≥ 80% for new code
- [ ] No TODO, FIXME, or placeholder comments
- [ ] All code is production-ready (no stubs)
- [ ] Session file updated with completion status
- [ ] Branch pushed to GitHub
- [ ] Status update committed
- [ ] Pre-commit hooks all pass
- [ ] No `any` types added
- [ ] No files over 500 lines
- [ ] All database queries use batch loading (no N+1)
- [ ] All list endpoints have pagination
- [ ] All errors use TRPCError
- [ ] Security requirements met (proper auth checks)

---

## 🆘 Emergency Procedures

### If You Get Blocked
1. Update session file: `Status: BLOCKED - [reason]`
2. Commit + push immediately
3. Tell user: "I'm blocked by [X], need guidance"

### If Tests Fail
1. DO NOT commit broken code
2. Fix the tests first
3. If stuck, ask user for help

### If Another Agent is Working on Same Module
1. Check ACTIVE_SESSIONS.md
2. Choose different task from MASTER_ROADMAP.md
3. Never work on same module simultaneously

### If Push Fails
1. Retry with exponential backoff (2s, 4s, 8s, 16s)
2. Up to 4 retry attempts
3. If still failing, tell user

---

## 📊 Summary Checklist

Use this as your mental checklist for EVERY session:

**Before Starting:**
- [ ] Read ACTIVE_SESSIONS.md
- [ ] Picked task from MASTER_ROADMAP.md
- [ ] Created session file
- [ ] Created feature branch

**During Development:**
- [ ] Writing tests first (TDD)
- [ ] Following architecture patterns
- [ ] Using TRPCError for errors
- [ ] Batch loading database queries
- [ ] Updating status every 30 minutes
- [ ] Committing + pushing status updates

**Before Completion:**
- [ ] All tests pass
- [ ] Zero TypeScript errors
- [ ] No prohibited patterns (TODO, any, etc.)
- [ ] Session file marked complete
- [ ] Pushed to GitHub

---

## 📞 Questions?

If you're unclear on any requirement:
1. Check the relevant documentation first
2. Search QA reports for guidance
3. Ask the user if still unclear

**DO NOT:**
- Make assumptions
- Skip requirements
- Create placeholder code "to be filled later"
- Report done without verifying everything

---

## 🎯 Your Success Criteria

You'll know you're successful when:
- ✅ Your code passes all pre-commit hooks automatically
- ✅ Your PRs are approved without major revision requests
- ✅ Your tests have ≥ 80% coverage
- ✅ Your code follows the 3-layer architecture
- ✅ You never create merge conflicts with other agents
- ✅ Your status updates are timely and accurate
- ✅ You complete tasks fully before moving on

Welcome to the team! 🚀
