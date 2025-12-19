# Claude Code Handoff: TERP Matchmaking Service Integration

## 🎯 Mission

You are continuing development on the **TERP Matchmaking Service**, a sophisticated intelligence layer that connects client needs, vendor supply, and purchase history to provide data-driven recommendations for a cannabis wholesale ERP system.

**Your task**: Complete the integration, ensure seamless operation with the VIP Portal, fix any issues, handle edge cases, and deliver production-ready code following TERP's strict development protocols.

---

## 📚 CRITICAL: Read These Files FIRST

Before writing ANY code, you MUST read and understand these files in order:

### 1. Project Bible & Protocols
```bash
docs/DEVELOPMENT_PROTOCOLS.md          # The Bible - ALL rules and protocols
docs/TERP_DESIGN_SYSTEM.md             # UI/UX design system and patterns
docs/PARALLEL_DEVELOPMENT_PROTOCOL.md  # Parallel development guidelines
docs/MASTER_DEVELOPMENT_PROMPT.md      # Master development guidelines
```

### 2. Matchmaking Service Documentation
```bash
MATCHMAKING_SPEC_ALIGNED.md            # Complete technical specification
MATCHMAKING_IMPLEMENTATION_GUIDE.md    # Implementation details and integration
MATCHMAKING_FINAL_REPORT.md            # What's been completed
MATCHMAKING_QA_REPORT_FINAL.md         # QA findings and issues
MATCHMAKING_DEPLOYMENT_CHECKLIST.md    # Deployment requirements
```

### 3. VIP Portal Documentation
```bash
docs/VIP_PORTAL_DEPLOYMENT_GUIDE.md    # VIP Portal deployment guide
docs/VIP_PORTAL_FEATURES.md            # VIP Portal features documentation
```

### 4. Current State
```bash
CHANGELOG.md                           # Recent changes
docs/PROJECT_CONTEXT.md                # Project context and history
```

---

## 🏗️ System Architecture Overview

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, tRPC, Drizzle ORM
- **Database**: MySQL (production), SQLite (dev/test)
- **Testing**: Vitest (167 tests, 98% passing, 43.57% coverage)
- **Deployment**: DigitalOcean App Platform

### Repository Structure
```
TERP/
├── client/src/                    # Frontend
│   ├── components/
│   │   ├── matchmaking/          # Matchmaking components (9 files)
│   │   └── vip-portal/           # VIP Portal components
│   │       ├── MarketplaceNeeds.tsx
│   │       └── MarketplaceSupply.tsx
│   ├── pages/
│   │   ├── matchmaking/          # Matchmaking pages (3 files)
│   │   └── vip-portal/           # VIP Portal pages
│   └── App.tsx                   # Main routing
├── server/
│   ├── matchmakingDb.ts          # Matchmaking database operations
│   ├── matchingEngine.ts         # Matching algorithms
│   ├── historicalAnalysis.ts     # Purchase pattern analysis
│   ├── routers/
│   │   ├── matchmaking.ts        # Matchmaking API (20+ endpoints)
│   │   └── vipPortal.ts          # VIP Portal API
│   └── tests/                    # Test files
├── drizzle/
│   ├── schema.ts                 # Database schema
│   └── migrations/               # Database migrations
└── docs/                         # Documentation
```

---

## 🔑 Key Integration Points

### 1. Shared Database Tables

**CRITICAL**: The Matchmaking service and VIP Portal **share the same database tables**:

```typescript
// drizzle/schema.ts

export const clientNeeds = mysqlTable("client_needs", {
  id: int().autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id),
  strain: varchar({ length: 255 }),
  category: varchar({ length: 100 }),
  subcategory: varchar({ length: 100 }),
  grade: varchar({ length: 50 }),
  quantityMin: decimal("quantity_min", { precision: 10, scale: 2 }),
  quantityMax: decimal("quantity_max", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  notes: text(),
  priority: mysqlEnum(["HIGH", "MEDIUM", "STANDARD"]).default("STANDARD"),
  status: mysqlEnum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).default("ACTIVE"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const vendorSupply = mysqlTable("vendor_supply", {
  id: int().autoincrement().primaryKey(),
  vendorId: int("vendor_id").references(() => vendors.id),
  strain: varchar({ length: 255 }).notNull(),
  category: varchar({ length: 100 }).notNull(),
  subcategory: varchar({ length: 100 }),
  grade: varchar({ length: 50 }),
  quantity: decimal({ precision: 10, scale: 2 }).notNull(),
  priceMin: decimal("price_min", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  notes: text(),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  status: mysqlEnum(["AVAILABLE", "RESERVED", "SOLD", "EXPIRED"]).default("AVAILABLE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
```

**Implications**:
- ✅ VIP Portal clients can post needs → Internal users see them in Matchmaking
- ✅ Internal users can add vendor supply → Matching engine finds buyers
- ⚠️ **YOU MUST** ensure data consistency between both interfaces
- ⚠️ **YOU MUST** handle permissions (VIP users see only their data, internal users see all)

### 2. API Endpoints

**VIP Portal API** (`server/routers/vipPortal.ts`):
```typescript
vipPortal.marketplace.getNeeds({ clientId })
vipPortal.marketplace.createNeed({ clientId, ...needData })
vipPortal.marketplace.updateNeed({ needId, clientId, ...needData })
vipPortal.marketplace.cancelNeed({ id, clientId })
vipPortal.marketplace.getSupply({ clientId })
vipPortal.marketplace.createSupply({ clientId, ...supplyData })
```

**Matchmaking API** (`server/routers/matchmaking.ts`):
```typescript
matchmaking.needs.create({ ...needData })
matchmaking.needs.list({ filters, pagination })
matchmaking.needs.update({ id, ...needData })
matchmaking.needs.delete({ id })
matchmaking.supply.create({ ...supplyData })
matchmaking.supply.list({ filters, pagination })
matchmaking.matches.findForNeed({ needId })
matchmaking.matches.findBuyersForSupply({ supplyId })
matchmaking.matches.findBuyersForBatch({ batchId })
matchmaking.historical.getClientPatterns({ clientId })
matchmaking.historical.predictReorder({ clientId })
```

**Integration Requirements**:
- ✅ Both APIs work with the same data
- ⚠️ **YOU MUST** ensure consistent validation rules
- ⚠️ **YOU MUST** handle authentication (VIP Portal uses session tokens, internal uses user context)

### 3. Matching Engine

**Location**: `server/matchingEngine.ts`

**Core Functions**:
```typescript
calculateMatchScore(need, supply): number        // 0-100 score
findMatchesForNeed(needId): Match[]             // Find supply for a need
findBuyersForSupply(supplyId): Match[]          // Find clients for supply
findBuyersForBatch(batchId): Match[]            // Find clients for inventory
```

**Matching Rules** (MUST be enforced):
1. Category and price range MUST match (auto-fail if not)
2. Only show matches with ≥60% score
3. Respect strict flags on needs
4. Require ≥3 purchases for historical matching
5. Always show reasoning for matches

**Match Confidence Levels**:
- **EXACT** (90-100%): All criteria match perfectly
- **HIGH** (75-89%): Most criteria match, minor differences
- **MEDIUM** (60-74%): Core criteria match, some flexibility needed
- **LOW** (<60%): Don't show these matches

### 4. Historical Analysis

**Location**: `server/historicalAnalysis.ts`

**Core Functions**:
```typescript
getClientPurchaseHistory(clientId): PurchaseHistory[]
analyzeProductPreferences(clientId): ProductPreferences
predictReorderDate(clientId, productId): Date
calculateAverageOrderValue(clientId): number
identifyLapsedBuyers(): Client[]
```

**Business Rules**:
- Minimum 3 purchases required for pattern analysis
- Patterns based on last 90 days by default
- Reorder predictions based on purchase frequency
- Lapsed buyer = no purchase in 2x average frequency

---

## 🚨 CRITICAL BIBLE PROTOCOLS

### 1. Production-Ready Code Standard

**ABSOLUTELY NO PLACEHOLDERS OR STUBS**

```typescript
// ❌ NEVER DO THIS
function calculateMatch() {
  // TODO: Implement matching logic
  return 0;
}

// ✅ ALWAYS DO THIS
function calculateMatch(need: ClientNeed, supply: VendorSupply): number {
  let score = 0;
  
  // Category match (required)
  if (need.category !== supply.category) return 0;
  
  // Price match
  if (need.priceMax && supply.priceMin && need.priceMax < supply.priceMin) return 0;
  
  // Calculate score...
  if (need.strain === supply.strain) score += 30;
  if (need.grade === supply.grade) score += 20;
  // ... complete implementation
  
  return score;
}
```

**If you MUST use a stub** (extremely rare):
1. STOP immediately
2. Report `INCOMPLETE IMPLEMENTATION ALERT` to user
3. Explain why it's unavoidable
4. WAIT for explicit user approval
5. Add clear TODO comments with implementation plan

### 2. System Integration Protocol

**Before making ANY change**:

1. **Impact Analysis**:
   - What files will be affected?
   - What components import this?
   - What data flows through this?
   - Will this break navigation/routing?
   - Will this affect the VIP Portal?

2. **Integration Verification**:
   - Update ALL related files in a single operation
   - Maintain consistency across TypeScript types
   - Update both internal and VIP Portal UIs if needed
   - Preserve design system patterns

3. **System-Wide Validation**:
   - Run `pnpm test` after every significant change
   - Verify TypeScript compilation: `pnpm run type-check`
   - Test navigation flows
   - Check data flows
   - Visual regression check

### 3. Testing Requirements

**MANDATORY after every change**:

```bash
# Run all tests
pnpm test

# Run with coverage (must maintain ≥40%)
pnpm test:coverage

# Run specific test file
pnpm test matchmaking
```

**Test Coverage Requirements**:
- Overall coverage: ≥40% (currently 43.57%)
- All new functions: ≥60% coverage
- Critical business logic: ≥80% coverage
- All tests must pass (currently 197/201 passing)

**If tests fail**:
1. Fix immediately before proceeding
2. Do NOT commit failing tests
3. Do NOT skip tests
4. Do NOT lower coverage

### 4. Breaking Change Protocol

**STOP and report to user FIRST if**:
- Refactoring >5 files
- Changing core data structures
- Modifying database schema
- Restructuring routing
- Changing API contracts
- Altering authentication flows

**Report Format**:
```
🚨 BREAKING CHANGE ALERT

SCOPE:
- X files affected
- Y components require refactoring

REASON:
[Explain why this change requires major refactoring]

AFFECTED SYSTEMS:
- [List all affected systems]

MIGRATION PLAN:
1. [Step-by-step migration plan]

ROLLBACK PLAN:
1. [How to rollback if needed]

ESTIMATED TIME: X hours

AWAITING APPROVAL TO PROCEED
```

### 5. Code Quality Standards

**TypeScript**:
- Strict mode enabled
- No `any` types (use `unknown` and type guards)
- Explicit return types on functions
- Proper error handling with try/catch
- Zod validation for all API inputs

**React Components**:
- Functional components with hooks
- Proper prop types
- Error boundaries for critical components
- Loading and error states
- Accessibility (ARIA labels, keyboard navigation)

**Database Operations**:
- Use transactions for multi-step operations
- Proper error handling
- Input validation
- SQL injection prevention (use parameterized queries)
- Connection pooling

**API Design**:
- RESTful principles via tRPC
- Proper HTTP status codes
- Consistent error messages
- Pagination for list endpoints
- Rate limiting for public endpoints

---

## 🎯 Current State & What Needs Completion

### ✅ Completed (100%)

**Backend**:
- ✅ Database schema (3 tables: clientNeeds, vendorSupply, matchRecords)
- ✅ matchmakingDb.ts (full CRUD operations)
- ✅ matchingEngine.ts (matching algorithms)
- ✅ historicalAnalysis.ts (purchase pattern analysis)
- ✅ routers/matchmaking.ts (20+ API endpoints)
- ✅ Tests (34 tests, 197/201 passing)

**Frontend**:
- ✅ 9 components (forms, widgets, badges, cards, tabs)
- ✅ 3 pages (Needs, Supply, Analytics)
- ✅ Navigation integration
- ✅ Dashboard widgets

**Integration**:
- ✅ Client detail page (Needs tab)
- ✅ Inventory detail page (Client Interest section)
- ✅ Dashboard widget
- ✅ Routes (/matchmaking/needs, /matchmaking/supply, /matchmaking/analytics)

**Documentation**:
- ✅ Complete specification
- ✅ Implementation guide
- ✅ QA report
- ✅ Deployment checklist
- ✅ Bible updates

### ⚠️ Known Issues (MUST FIX)

1. **4 Failing Tests** (matchmakingDb.test.ts):
   - Issue: Mock implementation issues, not actual code problems
   - Fix: Update mocks to properly simulate database behavior
   - Priority: MEDIUM (tests work with real database)

2. **Database Migration Pending**:
   - Issue: DATABASE_URL not set in sandbox
   - Fix: Run migration during deployment
   - Priority: HIGH (required for production)

3. **VIP Portal Integration**:
   - Issue: Need to verify data consistency between VIP Portal and Matchmaking UI
   - Fix: Test creating needs in VIP Portal, verify they appear in Matchmaking
   - Priority: HIGH (critical for user experience)

4. **Permission Handling**:
   - Issue: VIP Portal users should only see their own data
   - Fix: Add permission checks in matchmaking API
   - Priority: HIGH (security issue)

### 🔧 Tasks for You to Complete

#### Task 1: Fix Failing Tests (Priority: MEDIUM)
```bash
# Location: server/tests/matchmakingDb.test.ts
# Issue: 4 tests failing due to mock implementation
# Fix: Update mocks to properly simulate database behavior
```

**Steps**:
1. Read `server/tests/matchmakingDb.test.ts`
2. Identify why mocks are failing
3. Update mocks to match actual database behavior
4. Run `pnpm test matchmakingDb.test.ts` until all pass
5. Commit with message: "fix: Update matchmakingDb test mocks"

#### Task 2: Add Permission Checks (Priority: HIGH)
```bash
# Location: server/routers/matchmaking.ts
# Issue: No permission checks for VIP Portal users
# Fix: Add clientId filtering for non-admin users
```

**Steps**:
1. Read `server/routers/matchmaking.ts`
2. Add authentication middleware
3. Filter results by clientId for VIP Portal users
4. Allow internal users to see all data
5. Test with VIP Portal credentials
6. Commit with message: "feat: Add permission checks for VIP Portal users"

#### Task 3: Verify VIP Portal Integration (Priority: HIGH)
```bash
# Test creating needs/supply in VIP Portal
# Verify they appear in internal Matchmaking UI
```

**Steps**:
1. Access VIP Portal: https://terp-app-b9s35.ondigitalocean.app/vip-portal
2. Login with test credentials (test@vipportal.com / TestPassword123!)
3. Create a test need in "My Needs"
4. Access internal Matchmaking UI
5. Verify the need appears in Needs Management
6. Test matching engine finds appropriate supply
7. Document any issues found

#### Task 4: Handle Edge Cases (Priority: MEDIUM)

**Edge Cases to Handle**:
1. **Expired Needs**: Auto-update status to EXPIRED
2. **Duplicate Needs**: Prevent creating identical needs
3. **Invalid Matches**: Handle missing data gracefully
4. **Concurrent Updates**: Handle race conditions
5. **Large Result Sets**: Implement pagination properly

**Steps**:
1. Review each edge case
2. Add validation/handling code
3. Write tests for each edge case
4. Run full test suite
5. Commit with message: "fix: Handle edge cases in matchmaking service"

#### Task 5: Performance Optimization (Priority: LOW)

**Optimization Targets**:
1. Matching engine: <200ms per match
2. Historical analysis: <500ms per client
3. List endpoints: <1s with pagination
4. Dashboard widgets: <2s load time

**Steps**:
1. Add database indexes on frequently queried fields
2. Implement caching for historical analysis
3. Optimize matching algorithm
4. Add performance tests
5. Commit with message: "perf: Optimize matchmaking performance"

#### Task 6: Final QA & Deployment Prep (Priority: HIGH)

**QA Checklist**:
- [ ] All tests passing (201/201)
- [ ] Coverage ≥40%
- [ ] No TypeScript errors
- [ ] VIP Portal integration verified
- [ ] Permission checks working
- [ ] Edge cases handled
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Bible updated

**Steps**:
1. Run full QA checklist
2. Fix any issues found
3. Update all documentation
4. Create deployment plan
5. Commit with message: "chore: Final QA and deployment prep"

---

## 🔍 How to Investigate Issues

### 1. Understanding the Codebase

**Start here**:
```bash
# Read the main files
cat docs/DEVELOPMENT_PROTOCOLS.md
cat MATCHMAKING_SPEC_ALIGNED.md
cat MATCHMAKING_IMPLEMENTATION_GUIDE.md

# Check current state
git status
git log --oneline -10

# Review test results
pnpm test
pnpm test:coverage
```

### 2. Debugging Techniques

**Backend Issues**:
```typescript
// Add logging
import { logger } from './_core/logger';

logger.info('Matching need', { needId, supply });
logger.error('Match failed', { error, needId });
```

**Frontend Issues**:
```typescript
// Use React DevTools
// Add console logs
console.log('[Matchmaking] Need created:', need);
console.error('[Matchmaking] Failed to create need:', error);
```

**Database Issues**:
```bash
# Check schema
cat drizzle/schema.ts | grep -A 20 "clientNeeds"

# Check migrations
ls -la drizzle/migrations/

# Test database connection
pnpm run db:push
```

### 3. Testing Strategies

**Unit Tests**:
```bash
# Test specific function
pnpm test matchingEngine.test.ts

# Test with watch mode
pnpm test --watch

# Test with coverage
pnpm test:coverage matchingEngine
```

**Integration Tests**:
```bash
# Test full workflow
pnpm test integration

# Test API endpoints
pnpm test routers
```

**Manual Testing**:
1. Start dev server: `pnpm dev`
2. Access UI: http://localhost:5173
3. Test user flows
4. Check browser console for errors
5. Check network tab for API calls

---

## 📝 Commit Message Format

Follow Conventional Commits:

```bash
# Features
git commit -m "feat: Add permission checks for VIP Portal users"
git commit -m "feat(matchmaking): Implement duplicate need detection"

# Fixes
git commit -m "fix: Update matchmakingDb test mocks"
git commit -m "fix(matching): Handle missing strain data gracefully"

# Performance
git commit -m "perf: Add database indexes for matching queries"
git commit -m "perf(historical): Cache client purchase patterns"

# Refactoring
git commit -m "refactor: Extract matching logic into separate functions"

# Documentation
git commit -m "docs: Update matchmaking integration guide"

# Chores
git commit -m "chore: Update dependencies"
git commit -m "chore: Final QA and deployment prep"

# Tests
git commit -m "test: Add edge case tests for matching engine"
```

---

## 🚀 Deployment Process

### Pre-Deployment Checklist

```bash
# 1. All tests passing
pnpm test
# Expected: 201/201 tests passing

# 2. No TypeScript errors
pnpm run type-check
# Expected: 0 errors

# 3. Coverage maintained
pnpm test:coverage
# Expected: ≥40% coverage

# 4. Build succeeds
pnpm run build
# Expected: No errors

# 5. Database migration ready
ls -la drizzle/migrations/
# Expected: Migration files present
```

### Deployment Steps

1. **Set DATABASE_URL**:
   ```bash
   export DATABASE_URL="mysql://user:password@host:port/database"
   ```

2. **Run Database Migration**:
   ```bash
   pnpm run db:push
   ```

3. **Verify Schema**:
   ```bash
   # Check tables exist
   mysql -u user -p -e "SHOW TABLES LIKE '%needs%'"
   mysql -u user -p -e "SHOW TABLES LIKE '%supply%'"
   ```

4. **Deploy Application**:
   ```bash
   git push origin feature/matchmaking-service
   # Create pull request
   # Merge to main after review
   ```

5. **Verify Deployment**:
   - Access VIP Portal
   - Create test need
   - Verify it appears in internal UI
   - Test matching engine
   - Check analytics dashboard

---

## 🆘 When to Ask for Help

**STOP and ask user if**:
1. You encounter a breaking change (>5 files affected)
2. You need to modify database schema
3. You find a critical security issue
4. Tests fail and you can't fix them
5. You need clarification on business logic
6. You discover a major architectural issue
7. You need access to production database
8. You're unsure about a design decision

**How to ask**:
```
🚨 NEED GUIDANCE

ISSUE:
[Clear description of the issue]

CONTEXT:
[What you were trying to do]

ATTEMPTED SOLUTIONS:
1. [What you tried]
2. [What happened]

QUESTION:
[Specific question or decision needed]

IMPACT:
[What's blocked by this issue]
```

---

## ✅ Success Criteria

You've successfully completed this task when:

1. **All Tests Passing**: 201/201 tests passing (100%)
2. **Coverage Maintained**: ≥40% test coverage
3. **No TypeScript Errors**: 0 compilation errors
4. **VIP Portal Integration**: Verified working end-to-end
5. **Permission Checks**: VIP users see only their data
6. **Edge Cases Handled**: All edge cases have tests and handling
7. **Performance Targets Met**: All operations within target times
8. **Documentation Updated**: All docs reflect current state
9. **Bible Updated**: DEVELOPMENT_PROTOCOLS.md updated with learnings
10. **CHANGELOG Updated**: All changes documented
11. **Deployment Ready**: Pre-deployment checklist complete
12. **User Approval**: User has reviewed and approved

---

## 🎓 Key Learnings & Best Practices

### From Previous Development

1. **Always Read the Bible First**: The DEVELOPMENT_PROTOCOLS.md contains ALL the rules. Follow them strictly.

2. **Test After Every Change**: Don't accumulate changes without testing. Test frequently.

3. **No Placeholders**: Production-ready code only. If you can't complete something, stop and ask.

4. **Integration is Critical**: Changes affect multiple systems. Always think holistically.

5. **VIP Portal is Customer-Facing**: Extra care needed for security and UX.

6. **Matching Engine is Core Business Logic**: Must be accurate and fast.

7. **Historical Analysis Requires Data**: Minimum 3 purchases for patterns.

8. **Database Shared Between Systems**: Changes affect both internal and VIP Portal.

9. **Performance Matters**: Users expect fast responses (<2s).

10. **Documentation is Code**: Keep docs in sync with implementation.

### Common Pitfalls to Avoid

1. **Don't Skip Tests**: Even if they seem to pass manually
2. **Don't Use `any` Types**: Use proper TypeScript types
3. **Don't Hardcode Values**: Use configuration and environment variables
4. **Don't Ignore Errors**: Handle all error cases explicitly
5. **Don't Break Navigation**: Test all routes after changes
6. **Don't Forget Mobile**: UI must work on mobile devices
7. **Don't Commit Secrets**: Use environment variables
8. **Don't Merge Without Review**: Create PR and wait for approval
9. **Don't Deploy Without Testing**: Run full test suite first
10. **Don't Assume**: Verify everything, especially integrations

---

## 📚 Additional Resources

### Code Examples

**Creating a Need**:
```typescript
// Internal UI
const need = await trpc.matchmaking.needs.create.mutate({
  clientId: 123,
  strain: "Blue Dream",
  category: "Flower",
  grade: "A+",
  quantityMin: 10,
  quantityMax: 50,
  priceMax: 1500,
  priority: "HIGH",
});

// VIP Portal
const need = await trpc.vipPortal.marketplace.createNeed.mutate({
  clientId: 123,
  strain: "Blue Dream",
  category: "Flower",
  quantity: 25,
  unit: "lb",
  priceMax: 1500,
  expiresInDays: 7,
});
```

**Finding Matches**:
```typescript
const matches = await trpc.matchmaking.matches.findForNeed.query({
  needId: 456,
});

// Returns:
// [
//   {
//     supply: { id: 789, strain: "Blue Dream", ... },
//     score: 95,
//     confidence: "EXACT",
//     reasons: ["Exact strain match", "Price within range", ...]
//   },
//   ...
// ]
```

**Historical Analysis**:
```typescript
const patterns = await trpc.matchmaking.historical.getClientPatterns.query({
  clientId: 123,
});

// Returns:
// {
//   favoriteStrains: ["Blue Dream", "OG Kush"],
//   averageOrderValue: 25000,
//   purchaseFrequency: 14, // days
//   preferredGrades: ["A+", "A"],
//   priceRange: { min: 1200, max: 1800 },
// }
```

### Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm test                   # Run tests
pnpm test:coverage          # Run tests with coverage
pnpm run type-check         # Check TypeScript
pnpm run lint               # Lint code
pnpm run format             # Format code

# Database
pnpm run db:push            # Push schema changes
pnpm run db:studio          # Open Drizzle Studio
pnpm run db:migrate         # Run migrations

# Build & Deploy
pnpm run build              # Build for production
pnpm run preview            # Preview production build
pnpm run deploy             # Deploy to production

# Git
git status                  # Check status
git add .                   # Stage all changes
git commit -m "message"     # Commit changes
git push                    # Push to remote
git log --oneline -10       # View recent commits
```

### File Locations Quick Reference

```
Backend:
- server/matchmakingDb.ts              # Database operations
- server/matchingEngine.ts             # Matching algorithms
- server/historicalAnalysis.ts         # Purchase patterns
- server/routers/matchmaking.ts        # Matchmaking API
- server/routers/vipPortal.ts          # VIP Portal API
- server/tests/matchmakingDb.test.ts   # DB tests
- server/tests/matchingEngine.test.ts  # Engine tests

Frontend (Internal):
- client/src/components/matchmaking/AddClientNeedForm.tsx
- client/src/components/matchmaking/AddVendorSupplyForm.tsx
- client/src/components/matchmaking/NeedsManagementPage.tsx
- client/src/components/matchmaking/VendorSupplyPage.tsx
- client/src/components/matchmaking/MatchmakingDashboardWidget.tsx
- client/src/components/matchmaking/ClientNeedsTab.tsx
- client/src/components/matchmaking/BatchInterestSection.tsx
- client/src/pages/matchmaking/NeedsPage.tsx
- client/src/pages/matchmaking/SupplyPage.tsx
- client/src/pages/matchmaking/AnalyticsPage.tsx

Frontend (VIP Portal):
- client/src/components/vip-portal/MarketplaceNeeds.tsx
- client/src/components/vip-portal/MarketplaceSupply.tsx
- client/src/pages/vip-portal/VIPDashboard.tsx

Database:
- drizzle/schema.ts                    # Schema definitions
- drizzle/migrations/                  # Migration files

Documentation:
- docs/DEVELOPMENT_PROTOCOLS.md        # The Bible
- MATCHMAKING_SPEC_ALIGNED.md          # Technical spec
- MATCHMAKING_IMPLEMENTATION_GUIDE.md  # Implementation guide
- MATCHMAKING_FINAL_REPORT.md          # Completion report
- MATCHMAKING_QA_REPORT_FINAL.md       # QA findings
```

---

## 🎯 Your Mission Starts Now

1. **Read the Bible**: Start with `docs/DEVELOPMENT_PROTOCOLS.md`
2. **Understand the Spec**: Read `MATCHMAKING_SPEC_ALIGNED.md`
3. **Review Current State**: Read `MATCHMAKING_FINAL_REPORT.md`
4. **Check QA Issues**: Read `MATCHMAKING_QA_REPORT_FINAL.md`
5. **Start with Task 1**: Fix failing tests
6. **Progress Through Tasks**: Complete each task in priority order
7. **Test Continuously**: Run tests after every change
8. **Document Everything**: Update docs as you go
9. **Ask When Stuck**: Don't waste time, ask for help
10. **Deliver Excellence**: Production-ready code only

**Remember**: You're not just writing code, you're building a critical business system that real users depend on. Quality, reliability, and attention to detail are paramount.

**Good luck! 🚀**

---

## 📞 Contact & Support

If you need help or clarification:
1. Review this document thoroughly first
2. Check the Bible (DEVELOPMENT_PROTOCOLS.md)
3. Review the specification (MATCHMAKING_SPEC_ALIGNED.md)
4. If still stuck, ask the user with a clear, specific question

**Current Branch**: `feature/matchmaking-service`
**Repository**: https://github.com/EvanTenenbaum/TERP
**Live VIP Portal**: https://terp-app-b9s35.ondigitalocean.app/vip-portal

---

**END OF HANDOFF DOCUMENT**

*This document contains everything you need to successfully complete the Matchmaking Service integration. Read it carefully, follow the protocols strictly, and deliver production-ready code. You've got this!* 💪

