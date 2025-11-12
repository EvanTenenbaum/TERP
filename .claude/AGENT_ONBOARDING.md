# AGENT ONBOARDING - READ THIS FIRST

**MANDATORY:** All AI agents working on TERP must read this document before starting any work.

## 🚨 CRITICAL RULES - NO EXCEPTIONS

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
- ✅ **ALWAYS add pagination** to list endpoints
- ✅ **ALWAYS use TRPCError** for error handling
- ✅ **ALWAYS write tests** for new routers/services

### 3. Mandatory Checks Before Committing
```bash
# 1. Type check passes
pnpm check

# 2. No new `any` types introduced
git diff | grep -c ": any" && echo "❌ BLOCKED: New 'any' types found"

# 3. Large files check
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 {print "❌ BLOCKED: " $2 " exceeds 500 lines (" $1 ")"}'

# 4. Tests exist for new routers
# If adding server/routers/foo.ts, must also add server/routers/foo.test.ts
```

## 📚 Required Reading (15 min)

### Start Here:
1. **CODE_QA_EXECUTIVE_SUMMARY.md** (5 min)
   - Critical findings and priorities
   - Security vulnerabilities to avoid

2. **Current Phase** (Check README.md for current sprint):
   - Phase 1 (Week 1): Security fixes
   - Phase 2 (Weeks 2-4): Performance & quality
   - Phase 3 (Weeks 5-7): Technical debt
   - (See executive summary for details)

3. **Architecture Patterns** (5 min):
   ```
   Router (thin) → Service (business logic) → Repository (data access)

   ✅ GOOD:
   router → service.createOrder() → orderRepo.save()

   ❌ BAD:
   router → db.insert() directly
   router → 70 lines of business logic
   ```

4. **Error Handling Pattern** (2 min):
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

5. **Database Query Patterns** (3 min):
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

## 🔍 How to Find Information

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

## ⚠️ BLOCKERS - Will Fail PR Review

These will be **automatically rejected** in code review:

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

## 📋 Task-Specific Guides

### Adding New Features
1. Read relevant section in QA report
2. Check if router already exists (68 routers, many unused)
3. Follow 3-layer architecture (router → service → repository)
4. Write tests FIRST (TDD)
5. Add error boundaries (frontend)
6. Document in API_Documentation.md

### Fixing Bugs
1. Check if bug is in QA report (likely already identified)
2. Add failing test that reproduces bug
3. Fix bug
4. Verify test passes
5. Check for similar bugs in codebase

### Performance Optimization
1. Measure first (don't optimize blindly)
2. Check QA report for known bottlenecks
3. Fix in order: Database queries → Frontend rendering → Bundle size
4. Add monitoring/logging for future detection

### Refactoring
1. Ensure test coverage exists BEFORE refactoring
2. Refactor in small, reviewable chunks
3. Keep tests passing at each step
4. Update documentation

## 🚀 Quick Start Checklist

When starting work on TERP:

- [ ] Read `CODE_QA_EXECUTIVE_SUMMARY.md` (5 min)
- [ ] Check current sprint phase (README.md or ask)
- [ ] Review relevant QA report section for your task
- [ ] Understand 3-layer architecture pattern
- [ ] Set up pre-commit hooks (see below)
- [ ] Verify you can run tests locally
- [ ] Confirm you have required environment variables

## 🔧 Development Setup

### Install Pre-commit Hooks
```bash
# Enforce quality standards automatically
pnpm run prepare

# Verify hooks are active
ls -la .git/hooks/
```

### Environment Variables Required
See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 3.2
- `DATABASE_URL` (required)
- `JWT_SECRET` (required, no defaults!)
- `BUILT_IN_FORGE_API_URL` (if using AI features)
- `BUILT_IN_FORGE_API_KEY` (if using AI features)

## 📞 When You Need Help

### Q: "Can I use `publicProcedure` for this endpoint?"
A: Ask: "Does it expose user data, financial data, or admin functions?"
   - YES → Use `protectedProcedure` or `adminProcedure`
   - NO → Only if truly public (e.g., health check)

### Q: "Is this file too large?"
A: Run: `wc -l yourfile.ts`
   - Over 500 lines → Must split
   - 300-500 lines → Consider splitting
   - Under 300 lines → Probably fine

### Q: "Should I write tests for this?"
A: YES. Always. No exceptions.

### Q: "Can I use `any` here?"
A: Only if:
   1. You add a TODO comment explaining why
   2. You create a ticket to fix it properly
   3. You can justify it in PR review

## 🎓 Learning Resources

### Good Examples in Codebase
- ✅ `server/routers/calendar.ts` - Well-structured router
- ✅ `server/services/permissionService.ts` - Good service pattern
- ✅ `server/routers/calendar.test.ts` - Good test coverage

### Bad Examples (Learn What NOT to Do)
- ❌ `server/routers/vipPortal.ts` - Too large (1,495 lines)
- ❌ `client/src/pages/ComponentShowcase.tsx` - Dead code
- ❌ `server/routers/ordersEnhancedV2.ts` - N+1 queries

## 🎯 Success Criteria

You're following the standards when:

1. ✅ Your PR passes all automated checks
2. ✅ You can explain the 3-layer architecture
3. ✅ Your code has tests with >80% coverage
4. ✅ No `any` types (or justified with TODO)
5. ✅ All endpoints have proper auth
6. ✅ Database queries are optimized
7. ✅ Files are under 500 lines
8. ✅ Error handling uses TRPCError

---

**Remember:** This codebase is recovering from technical debt. Your job is to:
1. **NOT make it worse** (follow standards above)
2. **Make it better** (fix issues from QA report when you touch code)

**Questions?** Check the QA reports first - your answer is probably there.

**Last Updated:** 2025-11-12
**Review Frequency:** Update after each sprint/phase completion
