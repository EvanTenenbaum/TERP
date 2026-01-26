# Copy-Paste Agent Prompts - Strict Protocol Enforcement

**Instructions:** Copy each prompt below and paste into a new Manus session. Each prompt includes full protocol enforcement.

**Total Agents:** 8  
**Total Tasks:** 19 (16 remaining + 3 new)  
**Estimated Completion:** 2-3 days with parallel execution

---

## Agent 01: Database Performance & Batch Logic

**Priority:** P0 + P1 (High Priority)  
**Tasks:** 3  
**Estimated Time:** 12-16 hours  
**Conflict Risk:** None

````
You are Agent-01 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-005:** Add Missing Database Indexes (P1, 4-6h)
  - Audit drizzle/schema.ts for missing indexes on foreign keys
  - Add indexes to improve query performance (target: 60-80% improvement)
  - Create migration file with rollback support

- **ST-015:** Benchmark Critical Paths (P1, 2-3h)
  - Create benchmark script for 15 critical API endpoints
  - Measure baseline performance (response time, P95, P99)
  - Document in docs/performance-baseline.md

- **ST-017:** Implement Batch Status Transition Logic (P0, 4-6h)
  - Add status transition validation in server/routers/batches.ts
  - Prevent invalid transitions (COMPLETED → PENDING, etc.)
  - Create audit trail for all status changes
  - Write comprehensive test suite (15+ test cases)

## ⚠️ MANDATORY PROTOCOL

### PHASE 1: Pre-Flight (15 min)
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
cat docs/DEVELOPMENT_PROTOCOLS.md
cat docs/CLAUDE_WORKFLOW.md
cat docs/roadmaps/MASTER_ROADMAP.md
SESSION_ID="Session-$(date +%Y%m%d)-db-performance-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt
git pull origin main
````

### PHASE 2: Registration (10 min - MANDATORY BEFORE WORK)

```bash
SESSION_ID=$(cat /tmp/session_id.txt)
cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# Database Performance & Batch Logic - Agent 01
**Session ID:** ${SESSION_ID}
**Agent:** Agent-01
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress

## Tasks
- [ ] ST-005: Add Missing Database Indexes
- [ ] ST-015: Benchmark Critical Paths
- [ ] ST-017: Implement Batch Status Transition Logic

## Progress
Starting work...
EOF

echo "- Agent-01: ${SESSION_ID} - Database Performance (ST-005, ST-015, ST-017)" >> docs/ACTIVE_SESSIONS.md

# Update roadmap - mark tasks in progress
# Edit docs/roadmaps/MASTER_ROADMAP.md for ST-005, ST-015, ST-017
# Change status to: 🟡 In Progress (Agent-01, ${SESSION_ID})

git checkout -b "agent-01/db-performance-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
git commit -m "Register Agent-01: Database Performance (ST-005, ST-015, ST-017)"
git push origin "agent-01/db-performance-${SESSION_ID}"
```

### PHASE 3: Implementation

**ST-005: Database Indexes**

```bash
# Create migration
cat > drizzle/0038_add_missing_indexes.sql << 'SQL'
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
SQL

# Update schema.ts with index definitions
# Add to each table's second parameter

git add drizzle/
git commit -m "ST-005: Add database indexes for foreign keys"
git push origin "agent-01/db-performance-${SESSION_ID}"
```

**ST-015: Benchmarks**

```bash
# Create benchmark script
cat > scripts/benchmark-api.ts << 'TS'
import { performance } from 'perf_hooks';

const endpoints = [
  'clients.list',
  'orders.list',
  'inventory.list',
  'batches.getById',
  'dashboard.getMetrics',
  // Add 10 more
];

async function benchmark() {
  // Measure each endpoint
  // Calculate avg, P95, P99
  // Write to docs/performance-baseline.md
}

benchmark();
TS

pnpm tsx scripts/benchmark-api.ts

git add scripts/ docs/performance-baseline.md
git commit -m "ST-015: Add performance baseline benchmarks"
git push origin "agent-01/db-performance-${SESSION_ID}"
```

**ST-017: Batch Status Validation**

```typescript
// In server/routers/batches.ts
const VALID_TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Add validation to updateStatus procedure
// Create audit trail table/logic
// Write 15+ test cases in batches.test.ts

git add server/routers/batches.ts server/routers/batches.test.ts
git commit -m "ST-017: Implement batch status transition validation"
git push origin "agent-01/db-performance-${SESSION_ID}"
```

### PHASE 4: Testing (MANDATORY)

```bash
pnpm run check  # MUST show ZERO errors
pnpm test       # ALL tests MUST pass

# Manual testing
pnpm dev
# Test batch status transitions in browser
# Verify invalid transitions are blocked
# Check audit trail is created

# Create test report
cat > docs/testing/Agent-01-Test-Report.md << 'EOF'
# Test Report - Agent 01
**Session:** [SESSION_ID]
**Date:** $(date +%Y-%m-%d)

## Tests Run
- [x] TypeScript: ZERO errors
- [x] All tests: PASSING
- [x] Manual testing: COMPLETE
- [x] Performance: 60-80% improvement verified

## Sign-off
All tests passed. Ready for deployment.
EOF
```

### PHASE 5: Documentation

```bash
# Update CHANGELOG.md (add to top)
# Update session file with progress

git add CHANGELOG.md docs/testing/
git commit -m "ST-005, ST-015, ST-017: Add documentation"
git push origin "agent-01/db-performance-${SESSION_ID}"
```

### PHASE 6: Merge to Main

```bash
git checkout main
git pull origin main
git merge "agent-01/db-performance-${SESSION_ID}"
pnpm run check && pnpm test  # Re-verify
git push origin main
```

### PHASE 7: Deployment Verification (MANDATORY)

```bash
# Wait 5-10 minutes for Digital Ocean deployment
curl -I https://terp-app.ondigitalocean.app/

# Test in production browser
# Verify batch status transitions work
# Verify performance improvements
```

### PHASE 8: Completion (ONLY AFTER DEPLOYMENT VERIFIED)

```bash
# Update roadmap: ST-005, ST-015, ST-017 to ✅ Complete (2025-11-XX)
# Update session file: Status to ✅ Complete
# Archive session: mv docs/sessions/active/${SESSION_ID}.md docs/sessions/completed/
# Remove from ACTIVE_SESSIONS.md

git add docs/roadmaps/ docs/sessions/ docs/ACTIVE_SESSIONS.md
git commit -m "Complete Agent-01: Database Performance

- ST-005: Database indexes (60-80% performance improvement)
- ST-015: Performance baseline documented
- ST-017: Batch status validation implemented

All tests passing, deployment verified."
git push origin main
```

## ✅ COMPLETION CHECKLIST

- [ ] All 3 tasks functionally complete
- [ ] TypeScript: ZERO errors
- [ ] All tests: PASSING
- [ ] Deployed and verified in production
- [ ] Roadmap updated to ✅ complete
- [ ] Session archived
- [ ] Removed from ACTIVE_SESSIONS.md

**Files:** drizzle/schema.ts, server/routers/batches.ts, scripts/benchmark-api.ts  
**Conflict Risk:** None

```

---

## Agent 02: Monitoring & Observability

**Priority:** P1 (High Priority)
**Tasks:** 2
**Estimated Time:** 3-5 days
**Conflict Risk:** None

```

You are Agent-02 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-008:** Implement Error Tracking (Sentry) (P1, 1-2 days)
  - Set up Sentry account and project
  - Install @sentry/react and @sentry/node
  - Create sentry.client.config.ts and sentry.server.config.ts
  - Add error boundaries to React components
  - Configure source maps for production
- **ST-009:** Implement API Monitoring (P1, 2-3 days)
  - Choose monitoring solution (Datadog or New Relic)
  - Install monitoring SDK
  - Add instrumentation to tRPC procedures
  - Set up dashboards for key metrics
  - Configure alerts for performance issues

## ⚠️ MANDATORY PROTOCOL

### PHASE 1: Pre-Flight (15 min)

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
cat docs/DEVELOPMENT_PROTOCOLS.md
cat docs/CLAUDE_WORKFLOW.md
cat docs/roadmaps/MASTER_ROADMAP.md
SESSION_ID="Session-$(date +%Y%m%d)-monitoring-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt
git pull origin main
```

### PHASE 2: Registration (10 min - MANDATORY)

```bash
SESSION_ID=$(cat /tmp/session_id.txt)
cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# Monitoring & Observability - Agent 02
**Session ID:** ${SESSION_ID}
**Agent:** Agent-02
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress

## Tasks
- [ ] ST-008: Implement Error Tracking (Sentry)
- [ ] ST-009: Implement API Monitoring

## Progress
Starting monitoring implementation...
EOF

echo "- Agent-02: ${SESSION_ID} - Monitoring (ST-008, ST-009)" >> docs/ACTIVE_SESSIONS.md

# Update roadmap for ST-008, ST-009 to 🟡 In Progress

git checkout -b "agent-02/monitoring-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
git commit -m "Register Agent-02: Monitoring (ST-008, ST-009)"
git push origin "agent-02/monitoring-${SESSION_ID}"
```

### PHASE 3: Implementation

**ST-008: Sentry Setup**

```bash
# Install Sentry
pnpm add @sentry/react @sentry/node

# Create config files
cat > sentry.client.config.ts << 'TS'
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
TS

cat > sentry.server.config.ts << 'TS'
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
TS

# Add ErrorBoundary to main App component
# Add Sentry.captureException to error handlers

git add sentry.*.config.ts src/ server/
git commit -m "ST-008: Implement Sentry error tracking"
git push origin "agent-02/monitoring-${SESSION_ID}"
```

**ST-009: API Monitoring**

```bash
# Install monitoring SDK (example: Datadog)
pnpm add dd-trace

# Add instrumentation to server/index.ts
# Add middleware to tRPC procedures
# Create monitoring dashboard config

git add server/ docs/monitoring/
git commit -m "ST-009: Implement API monitoring with Datadog"
git push origin "agent-02/monitoring-${SESSION_ID}"
```

### PHASE 4: Testing (MANDATORY)

```bash
pnpm run check
pnpm test

# Test error tracking
# Trigger test error, verify in Sentry dashboard
# Test API monitoring, verify metrics appear

cat > docs/testing/Agent-02-Test-Report.md << 'EOF'
# Test Report - Agent 02
**Session:** [SESSION_ID]

## Tests Run
- [x] TypeScript: ZERO errors
- [x] Sentry captures errors: VERIFIED
- [x] API monitoring active: VERIFIED
- [x] Dashboards configured: COMPLETE

## Sign-off
All monitoring systems operational.
EOF
```

### PHASE 5-8: Follow standard protocol

(Same as Agent 01: Documentation, Merge, Deployment, Completion)

## ✅ COMPLETION CHECKLIST

- [ ] Sentry configured and capturing errors
- [ ] API monitoring active with dashboards
- [ ] All tests passing
- [ ] Deployed and verified
- [ ] Roadmap updated
- [ ] Session archived

**Files:** sentry.\*.config.ts, server/index.ts, src/App.tsx  
**Conflict Risk:** None (new integrations)

```

---

## Agent 03: Testing Infrastructure

**Priority:** P1 (High Priority)
**Tasks:** 1
**Estimated Time:** 2-3 days
**Conflict Risk:** None

```

You are Agent-03 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-011:** Add E2E Tests (P1, 2-3 days)
  - Set up Playwright for E2E testing
  - Write 20-30 critical user flow tests
  - Test authentication, CRUD operations, workflows
  - Configure CI to run E2E tests
  - Document test scenarios

## ⚠️ MANDATORY PROTOCOL

### PHASE 1: Pre-Flight (15 min)

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
cat docs/DEVELOPMENT_PROTOCOLS.md
cat docs/CLAUDE_WORKFLOW.md
cat docs/roadmaps/MASTER_ROADMAP.md
SESSION_ID="Session-$(date +%Y%m%d)-e2e-tests-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt
git pull origin main
```

### PHASE 2: Registration (10 min - MANDATORY)

```bash
SESSION_ID=$(cat /tmp/session_id.txt)
cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# E2E Testing Infrastructure - Agent 03
**Session ID:** ${SESSION_ID}
**Agent:** Agent-03
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress

## Tasks
- [ ] ST-011: Add E2E Tests

## Progress
Setting up Playwright and E2E test suite...
EOF

echo "- Agent-03: ${SESSION_ID} - E2E Tests (ST-011)" >> docs/ACTIVE_SESSIONS.md

# Update roadmap ST-011 to 🟡 In Progress

git checkout -b "agent-03/e2e-tests-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
git commit -m "Register Agent-03: E2E Tests (ST-011)"
git push origin "agent-03/e2e-tests-${SESSION_ID}"
```

### PHASE 3: Implementation

```bash
# Install Playwright
pnpm add -D @playwright/test
pnpm exec playwright install

# Create test directory
mkdir -p tests/e2e

# Write critical user flow tests
cat > tests/e2e/auth.spec.ts << 'TS'
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  // Add 5-10 more auth tests
});
TS

# Create tests for:
# - CRUD operations (clients, orders, inventory)
# - Workflows (batch creation, status transitions)
# - Dashboard interactions
# - Search functionality

# Add playwright config
cat > playwright.config.ts << 'TS'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
});
TS

git add tests/e2e/ playwright.config.ts
git commit -m "ST-011: Add comprehensive E2E test suite (30 tests)"
git push origin "agent-03/e2e-tests-${SESSION_ID}"
```

### PHASE 4: Testing (MANDATORY)

```bash
pnpm run check
pnpm test

# Run E2E tests
pnpm exec playwright test

# All E2E tests MUST pass

cat > docs/testing/Agent-03-Test-Report.md << 'EOF'
# Test Report - Agent 03
**Session:** [SESSION_ID]

## Tests Run
- [x] TypeScript: ZERO errors
- [x] E2E tests: 30/30 PASSING
- [x] Critical flows covered: COMPLETE

## Test Coverage
- Authentication: 10 tests
- CRUD operations: 12 tests
- Workflows: 8 tests

## Sign-off
E2E test suite operational.
EOF
```

### PHASE 5-8: Follow standard protocol

## ✅ COMPLETION CHECKLIST

- [ ] Playwright configured
- [ ] 30+ E2E tests written and passing
- [ ] All critical flows covered
- [ ] Deployed and verified
- [ ] Roadmap updated
- [ ] Session archived

**Files:** tests/e2e/\*.spec.ts, playwright.config.ts  
**Conflict Risk:** None (new files)

```

---

## Agent 04: API Security & Performance

**Priority:** P1-P2
**Tasks:** 2
**Estimated Time:** 1-2 days
**Conflict Risk:** Low

```

You are Agent-04 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-012:** Add API Rate Limiting (P2, 1-2 days)
  - Install rate limiting middleware
  - Configure limits per endpoint (e.g., 100 req/min)
  - Add rate limit headers to responses
  - Test rate limiting behavior
- **ST-007:** Implement System-Wide Pagination (P2, 2-3 days)
  - Add pagination to all list endpoints
  - Standardize pagination parameters (page, limit)
  - Update UI components to use pagination
  - Test with large datasets

## ⚠️ MANDATORY PROTOCOL

### PHASE 1-2: Standard Pre-Flight and Registration

```bash
gh repo clone EvanTenenbaum/TERP && cd TERP
cat docs/DEVELOPMENT_PROTOCOLS.md
cat docs/CLAUDE_WORKFLOW.md
SESSION_ID="Session-$(date +%Y%m%d)-api-security-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt

# Create session file, register, update roadmap, push
# (Follow Agent 01 pattern)
```

### PHASE 3: Implementation

**ST-012: Rate Limiting**

```bash
pnpm add express-rate-limit

# Add to server/index.ts
# Configure per-endpoint limits
# Add rate limit headers

git add server/
git commit -m "ST-012: Add API rate limiting"
git push origin "agent-04/api-security-${SESSION_ID}"
```

**ST-007: Pagination**

```typescript
// Update all list procedures to accept pagination
// Example in server/routers/clients.ts:
list: protectedProcedure
  .input(z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
  }))
  .query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.limit;
    const items = await ctx.db.query.clients.findMany({
      limit: input.limit,
      offset,
    });
    const total = await ctx.db.select({ count: count() }).from(clients);
    return { items, total: total[0].count, page: input.page };
  });

// Update UI components to use pagination
// Add pagination controls

git add server/routers/ src/components/
git commit -m "ST-007: Implement system-wide pagination"
git push origin "agent-04/api-security-${SESSION_ID}"
```

### PHASE 4-8: Standard Testing, Documentation, Deployment

## ✅ COMPLETION CHECKLIST

- [ ] Rate limiting active on all endpoints
- [ ] Pagination implemented system-wide
- [ ] All tests passing
- [ ] Deployed and verified
- [ ] Roadmap updated
- [ ] Session archived

**Files:** server/index.ts, server/routers/\*.ts, src/components/  
**Conflict Risk:** Low (middleware + router updates)

```

---

## Agent 05: Data Integrity & Refactoring

**Priority:** P2
**Tasks:** 2
**Estimated Time:** 2-3 days
**Conflict Risk:** Low

```

You are Agent-05 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **ST-013:** Standardize Soft Deletes (P2, 1-2 days)
  - Add deletedAt column to all tables
  - Create soft delete utility functions
  - Update all delete operations to use soft delete
  - Add restore functionality
- **RF-001:** Consolidate Orders Router (P2, 1-2 days)
  - Merge duplicate order-related routers
  - Standardize procedure names
  - Remove redundant code
  - Update imports across codebase

## ⚠️ MANDATORY PROTOCOL

### PHASE 1-2: Standard Pre-Flight and Registration

```bash
gh repo clone EvanTenenbaum/TERP && cd TERP
cat docs/DEVELOPMENT_PROTOCOLS.md
SESSION_ID="Session-$(date +%Y%m%d)-data-integrity-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt

# Register session, update roadmap
```

### PHASE 3: Implementation

**ST-013: Soft Deletes**

```sql
-- Migration: Add deletedAt to all tables
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP;
-- Add to all tables

-- Update schema.ts
deletedAt: timestamp('deleted_at'),

-- Create utility functions
export function softDelete(table, id) {
  return db.update(table)
    .set({ deletedAt: new Date() })
    .where(eq(table.id, id));
}

-- Update all delete procedures to use softDelete
```

**RF-001: Consolidate Routers**

```bash
# Identify duplicate routers
# Merge into single orders.ts router
# Update all imports
# Remove old files

git add server/routers/
git commit -m "RF-001: Consolidate orders router"
```

### PHASE 4-8: Standard Testing, Documentation, Deployment

## ✅ COMPLETION CHECKLIST

- [ ] Soft deletes implemented system-wide
- [ ] Orders router consolidated
- [ ] All tests passing
- [ ] Roadmap updated
- [ ] Session archived

**Files:** drizzle/schema.ts, server/routers/orders.ts  
**Conflict Risk:** Low

```

---

## Agent 06: Code Quality

**Priority:** P1-P2
**Tasks:** 2
**Estimated Time:** 1-2 days
**Conflict Risk:** Medium

```

You are Agent-06 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **RF-003:** Systematically Fix `any` Types (P1, 8-12h)
  - Find all `any` types in codebase
  - Replace with proper TypeScript types
  - Ensure zero TypeScript errors
  - Document type definitions
- **RF-006:** Remove Unused Dependencies (P2, 2-4h)
  - Audit package.json for unused packages
  - Remove unused dependencies
  - Test application still works
  - Update documentation

## ⚠️ MANDATORY PROTOCOL

### PHASE 1-2: Standard Pre-Flight and Registration

```bash
gh repo clone EvanTenenbaum/TERP && cd TERP
SESSION_ID="Session-$(date +%Y%m%d)-code-quality-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt

# Register session
```

### PHASE 3: Implementation

**RF-003: Fix `any` Types**

```bash
# Find all `any` types
grep -r ": any" src/ server/ --exclude="*.test.ts"

# Replace with proper types
# Example:
# Before: const data: any = ...
# After: const data: Client[] = ...

# Commit frequently (every 10-20 fixes)
git add src/ server/
git commit -m "RF-003: Fix any types in [module]"
```

**RF-006: Remove Dependencies**

```bash
# Find unused packages
pnpm exec depcheck

# Remove unused
pnpm remove [unused-package]

# Test application
pnpm run check && pnpm test && pnpm dev

git add package.json pnpm-lock.yaml
git commit -m "RF-006: Remove unused dependencies"
```

### PHASE 4-8: Standard Testing, Documentation, Deployment

## ✅ COMPLETION CHECKLIST

- [ ] Zero `any` types in codebase
- [ ] Unused dependencies removed
- [ ] TypeScript: ZERO errors
- [ ] All tests passing
- [ ] Roadmap updated
- [ ] Session archived

**Files:** Multiple .ts/.tsx files, package.json  
**Conflict Risk:** Medium (touches many files - commit frequently)

```

---

## Agent 07: Refactoring & Optimization

**Priority:** P2
**Tasks:** 1
**Estimated Time:** 1-2 days
**Conflict Risk:** Low

```

You are Agent-07 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **RF-005:** Refactor Oversized Files (P2, 1-2 days)
  - Identify files >500 lines
  - Split into smaller, focused modules
  - Maintain functionality and tests
  - Update imports across codebase

## ⚠️ MANDATORY PROTOCOL

### PHASE 1-2: Standard Pre-Flight and Registration

```bash
gh repo clone EvanTenenbaum/TERP && cd TERP
SESSION_ID="Session-$(date +%Y%m%d)-refactoring-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt

# Register session
```

### PHASE 3: Implementation

```bash
# Find oversized files
find src/ server/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20

# Split large files
# Example: Split server/routers/orders.ts (800 lines)
# Into: orders/list.ts, orders/create.ts, orders/update.ts, orders/delete.ts

# Update imports
# Ensure all tests still pass

git add server/ src/
git commit -m "RF-005: Refactor oversized files"
```

### PHASE 4-8: Standard Testing, Documentation, Deployment

## ✅ COMPLETION CHECKLIST

- [ ] All files <500 lines
- [ ] Functionality preserved
- [ ] All tests passing
- [ ] Roadmap updated
- [ ] Session archived

**Files:** Multiple large files split into modules  
**Conflict Risk:** Low

```

---

## Agent 08: Continuous Improvement

**Priority:** P2
**Tasks:** 3
**Estimated Time:** 2-3 days
**Conflict Risk:** None

```

You are Agent-08 working on the TERP project. You MUST follow all protocols exactly as specified.

## 📋 YOUR TASKS

- **CI-001:** Convert TODOs to Backlog Tickets (P2, 1 day)
  - Find all TODO comments in codebase
  - Create GitHub issues for each
  - Link issues in code comments
  - Remove completed TODOs
- **CI-002:** Complete Incomplete Features (P2, 1-2 days)
  - Identify incomplete features (stubs, placeholders)
  - Complete or remove them
  - Update documentation
- **CI-003:** Improve Test Coverage (P2, 1-2 days)
  - Measure current test coverage
  - Identify untested code paths
  - Write tests to reach 80%+ coverage
  - Document coverage metrics

## ⚠️ MANDATORY PROTOCOL

### PHASE 1-2: Standard Pre-Flight and Registration

```bash
gh repo clone EvanTenenbaum/TERP && cd TERP
SESSION_ID="Session-$(date +%Y%m%d)-continuous-improvement-$(openssl rand -hex 4)"
echo $SESSION_ID > /tmp/session_id.txt

# Register session
```

### PHASE 3: Implementation

**CI-001: TODOs to Tickets**

```bash
# Find all TODOs
grep -rn "TODO" src/ server/ --exclude="*.test.ts"

# For each TODO:
# 1. Create GitHub issue
# 2. Update comment: TODO (#123): Description
# 3. Remove if already done

git add src/ server/
git commit -m "CI-001: Convert TODOs to GitHub issues"
```

**CI-002: Complete Features**

```bash
# Find incomplete features
grep -r "placeholder\|stub\|FIXME" src/ server/

# Complete or remove each
# Update documentation

git add src/ server/ docs/
git commit -m "CI-002: Complete incomplete features"
```

**CI-003: Test Coverage**

```bash
# Measure coverage
pnpm test --coverage

# Write tests for uncovered code
# Target: 80%+ coverage

git add tests/
git commit -m "CI-003: Improve test coverage to 80%+"
```

### PHASE 4-8: Standard Testing, Documentation, Deployment

## ✅ COMPLETION CHECKLIST

- [ ] All TODOs converted to issues
- [ ] Incomplete features completed
- [ ] Test coverage >80%
- [ ] All tests passing
- [ ] Roadmap updated
- [ ] Session archived

**Files:** Multiple files across codebase  
**Conflict Risk:** None

```

---

## 🚀 Deployment Instructions

### Deploy All 8 Agents
1. Open 8 new Manus sessions
2. Copy each agent prompt above
3. Paste into corresponding session
4. Start all agents simultaneously

### Monitor Progress
- **Active Sessions:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/ACTIVE_SESSIONS.md
- **Roadmap:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md

### Agent Priority Order
1. **Agent 01** (P0 + P1) - Database Performance - START FIRST
2. **Agent 02** (P1) - Monitoring - START SECOND
3. **Agent 03** (P1) - E2E Tests - START THIRD
4. **Agent 04** (P1-P2) - API Security
5. **Agent 05** (P2) - Data Integrity
6. **Agent 06** (P1-P2) - Code Quality
7. **Agent 07** (P2) - Refactoring
8. **Agent 08** (P2) - Continuous Improvement

---

## 📊 Summary

| Agent | Tasks | Priority | Est. Time | Conflict Risk |
|-------|-------|----------|-----------|---------------|
| 01 | ST-005, ST-015, ST-017 | P0+P1 | 12-16h | None |
| 02 | ST-008, ST-009 | P1 | 3-5 days | None |
| 03 | ST-011 | P1 | 2-3 days | None |
| 04 | ST-012, ST-007 | P1-P2 | 1-2 days | Low |
| 05 | ST-013, RF-001 | P2 | 2-3 days | Low |
| 06 | RF-003, RF-006 | P1-P2 | 1-2 days | Medium |
| 07 | RF-005 | P2 | 1-2 days | Low |
| 08 | CI-001, CI-002, CI-003 | P2 | 2-3 days | None |

**Total:** 8 agents, 16 tasks, ~2-5 days with parallel execution

---

**All prompts include strict protocol enforcement. Agents MUST follow every step or work will be rejected.**
```
