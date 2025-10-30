# QA Audit Fixes - Quick Reference

**Generated:** October 30, 2025
**For:** AI Developer implementing fixes

---

## 📋 Summary

| Issue | Files | Effort | Priority | Guide |
|-------|-------|--------|----------|-------|
| **TypeScript Errors** | 52 errors across 20+ files | 2-3 days | 🔴 CRITICAL | [TYPESCRIPT_ERRORS.md](./TYPESCRIPT_ERRORS.md) |
| **Auth Context** | 7 hardcoded userIds | 1 day | 🔴 CRITICAL | [AUTH_CONTEXT_FIXES.md](./AUTH_CONTEXT_FIXES.md) |
| **Console Logging** | 572 console.* calls | 2 days | 🟡 HIGH | [LOGGING_CLEANUP.md](./LOGGING_CLEANUP.md) |
| **Type Safety** | 691 uses of `any` | 1-2 weeks | 🟡 HIGH | [TYPE_SAFETY.md](./TYPE_SAFETY.md) |
| **TODO Items** | 40+ incomplete features | 2-4 weeks | 🟡 MEDIUM | [TODO_COMPLETION.md](./TODO_COMPLETION.md) |

**Total Estimated Effort:** 5-8 weeks (can be parallelized)

---

## 🎯 Recommended Fix Order

### Week 1: Critical Blockers
```
Day 1-3: Fix TypeScript Errors
  ├─ Start: Fix import paths (quick wins)
  ├─ Then: API type mismatches
  ├─ Then: Database types
  └─ Then: Null safety issues
  Goal: 0 TypeScript errors, build passes

Day 4-5: Authentication Context
  ├─ Create auth context provider
  ├─ Add session verification endpoint
  ├─ Replace all hardcoded userId: 1
  └─ Test login/logout flow
  Goal: Proper auth throughout app
```

### Week 2: Code Quality
```
Day 1-3: Console Logging Cleanup
  ├─ Create client logger
  ├─ Replace server console.* → logger.*
  ├─ Replace client console.* → logger.*
  └─ Remove debug statements
  Goal: Structured logging everywhere

Day 4-5: Start Type Safety (High Priority Files)
  ├─ Create extended schema types
  ├─ Fix router types
  └─ Fix database query types
  Goal: Core business logic type-safe
```

### Week 3-4: Type Safety Completion
```
Continue replacing `any` with proper types:
  ├─ Week 3: Components and pages
  ├─ Week 4: Utilities and remaining files
  └─ Enable stricter TypeScript settings
  Goal: <50 remaining `any` uses
```

### Week 5+: Feature Completion (Optional/Staggered)
```
Complete TODO items by priority:
  ├─ Accounting integration (invoice creation)
  ├─ Dashboard calculations
  ├─ COGS management
  └─ Misc improvements
  Goal: All features complete
```

---

## 🚀 Quick Start Commands

### 1. Check Current State
```bash
# TypeScript errors
pnpm run check

# Run tests
pnpm test

# Build
pnpm build
```

### 2. Search for Issues
```bash
# Find all console.log
grep -r "console\." --include="*.ts" --include="*.tsx"

# Find all hardcoded userId
grep -r "userId: 1" --include="*.ts" --include="*.tsx"

# Find all any types
grep -r ": any" --include="*.ts" --include="*.tsx"

# Find all TODOs
grep -r "TODO" --include="*.ts" --include="*.tsx"
```

### 3. Verify Fixes
```bash
# After each fix category
pnpm run check && pnpm test && pnpm build
```

---

## 📁 Key Files to Review

### Before Starting
- [ ] `/docs/QA_AUDIT_REPORT.md` - Full audit report
- [ ] `/docs/PROJECT_CONTEXT.md` - System overview
- [ ] `/docs/DEVELOPMENT_PROTOCOLS.md` - Coding standards
- [ ] `/docs/HANDOFF_CONTEXT.md` - Current system state

### Fix Guides (This Directory)
- [ ] `TYPESCRIPT_ERRORS.md` - Detailed TypeScript fix guide
- [ ] `AUTH_CONTEXT_FIXES.md` - Authentication implementation
- [ ] `LOGGING_CLEANUP.md` - Logging cleanup guide
- [ ] `TYPE_SAFETY.md` - Type safety improvements
- [ ] `TODO_COMPLETION.md` - Feature completion guide

---

## 🔍 Critical File Locations

### TypeScript Errors - Top Files
```
client/src/components/data-cards/DataCardGrid.tsx:29
client/src/components/inventory/BatchDetailDrawer.tsx:277,280,286,290
client/src/components/inventory/StrainInput.tsx:52,61,83
server/dataCardMetricsDb.ts:493,523
server/inventoryDb.ts:689
server/routers/admin.ts:44,63,68,78,101,106,116,121,126
server/routers/adminMigrations.ts:1,2
server/routers/adminQuickFix.ts:1,2
server/routers/adminSchemaPush.ts:1,2
server/routers/inventory.ts:308,327,341,359,371
server/services/strainService.ts:13,16,115,123,186
server/strainMatcher.ts:455,473
```

### Hardcoded User IDs
```
client/src/components/inventory/ClientInterestWidget.tsx:42
client/src/components/needs/ClientNeedsTab.tsx:70,91
client/src/components/dashboard/widgets-v2/TemplateSelector.tsx:30
```

### High-Value Files for Type Safety
```
server/matchingEngineEnhanced.ts
server/ordersDb.ts
server/clientNeedsDbEnhanced.ts
server/pricingEngine.ts
server/needsMatchingService.ts
```

---

## 💡 Quick Tips

### TypeScript Fixes
- Start with import path errors (quick wins)
- Use `as const` for literal types
- Create extended types for joined queries
- Enable `noImplicitAny` first, other strict flags later

### Auth Context
- Backend auth (`simpleAuth.ts`) already works - don't touch it
- Just need to expose it to frontend
- Use `useAuth()` hook pattern
- Replace `publicProcedure` with `protectedProcedure` where auth needed

### Logging
- Server logger (`logger.ts`) already configured
- Just need to replace console.* calls
- Pattern: `logger.info({ context }, 'message')`
- Remove debug console.log entirely

### Type Safety
- Use existing schema types as foundation
- Create extended types for complex queries
- Use `unknown` instead of `any` when truly unknown
- Test after each file

---

## ⚠️ Common Pitfalls

### 1. TypeScript
❌ **Don't:** Cast everything to `any`
✅ **Do:** Define proper types or use `unknown` with guards

### 2. Authentication
❌ **Don't:** Add fallback to `userId: 1` "temporarily"
✅ **Do:** Fail fast with clear error if no user

### 3. Logging
❌ **Don't:** Mix console.* and logger.*
✅ **Do:** Use logger.* everywhere consistently

### 4. Type Safety
❌ **Don't:** Try to fix all 691 at once
✅ **Do:** Fix high-value files first, iterate

### 5. Testing
❌ **Don't:** Wait until all fixes done to test
✅ **Do:** Test after each category/file

---

## 📊 Progress Tracking

### Create Progress File
```markdown
# Fix Progress Tracker

## Week 1
- [ ] TypeScript Errors (0/52 fixed)
- [ ] Auth Context (0/7 files updated)

## Week 2
- [ ] Console Logging (0/572 replaced)
- [ ] Type Safety - Phase 1 (0/50 files)

## Week 3-4
- [ ] Type Safety - Phase 2 (0/100 files)

## Week 5+
- [ ] TODO Items (0/40 completed)

Last Updated: [date]
```

### Daily Checklist
```bash
# End of each day:
1. Run: pnpm run check
2. Run: pnpm test
3. Commit progress
4. Update progress tracker
5. Note any blockers
```

---

## 🆘 If You Get Stuck

### TypeScript Errors
- Check fix guide for specific error type
- Look at similar files for patterns
- Enable one strict flag at a time
- Ask owner if schema/API changed recently

### Authentication
- Backend auth works - verify endpoints exist
- Check browser network tab for session cookie
- Test with Evan / oliver credentials
- Verify JWT_SECRET in environment

### Type Safety
- Start with simpler files
- Use type inference where possible
- Check Drizzle docs for query types
- Don't be afraid to use type guards

### General
- Check git history for context
- Review test files for usage examples
- Consult project documentation
- Take breaks between categories

---

## ✅ Success Criteria

### Week 1 Complete
```
✅ pnpm run check → 0 errors
✅ pnpm test → all passing
✅ pnpm build → success
✅ No hardcoded userId: 1
✅ Login/logout works
```

### Week 2 Complete
```
✅ No console.* in src (except tests)
✅ All logs structured with context
✅ Core routers properly typed
✅ High-value files type-safe
```

### Final Complete
```
✅ Strict TypeScript enabled
✅ <50 `any` uses remaining
✅ All critical TODOs done
✅ All tests passing
✅ Production ready
```

---

## 🔗 Additional Resources

### Documentation
- Main Audit: `/docs/QA_AUDIT_REPORT.md`
- Project Context: `/docs/PROJECT_CONTEXT.md`
- Dev Protocols: `/docs/DEVELOPMENT_PROTOCOLS.md`

### Fix Guides (Detailed)
- TypeScript: `/docs/fixes/TYPESCRIPT_ERRORS.md`
- Auth: `/docs/fixes/AUTH_CONTEXT_FIXES.md`
- Logging: `/docs/fixes/LOGGING_CLEANUP.md`
- Types: `/docs/fixes/TYPE_SAFETY.md`
- TODOs: `/docs/fixes/TODO_COMPLETION.md`

### External References
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Drizzle ORM Docs: https://orm.drizzle.team/docs/overview
- tRPC Docs: https://trpc.io/docs
- React Query: https://tanstack.com/query/latest/docs/framework/react/overview

---

## 🎬 Final Notes

### Priorities
1. **Must Fix:** TypeScript errors, Auth context (Week 1)
2. **Should Fix:** Logging, Type safety (Week 2-4)
3. **Nice to Fix:** TODO items (Week 5+)

### Flexibility
- You know the system better - adjust as needed
- Can split into multiple PRs
- Can parallelize some work
- Some TODOs may be obsolete - verify first

### Quality
- Test thoroughly after each change
- Don't break existing functionality
- Keep commits focused and small
- Update tests as you fix code

### Communication
- Track progress visibly
- Note any blockers or questions
- Document decisions made
- Update this progress file

---

**Good luck! The computational reasoning is done - you've got this! 🚀**
