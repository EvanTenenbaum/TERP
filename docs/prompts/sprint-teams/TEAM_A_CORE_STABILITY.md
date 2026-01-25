# Sprint Team A: Core Stability

**Branch:** `claude/sprint-team-a-stability`
**Priority:** P0 - Start immediately
**Estimated Duration:** 3-4 days

---

## Your Mission

You are **Sprint Team A**, responsible for fixing the critical stability issues blocking TERP development. Your work enables all other teams to proceed. You must fix TypeScript errors, failing tests, and critical security issues.

---

## CRITICAL: Read Before Starting

1. **Read `/CLAUDE.md`** - All agent protocols apply
2. **Check `/docs/ACTIVE_SESSIONS.md`** - Ensure no conflicts
3. **Create session file** in `/docs/sessions/active/`
4. **Work on branch:** `claude/sprint-team-a-stability`

---

## Your Owned Files

You have **exclusive write access** to:

```
client/src/hooks/**/*.ts (test infrastructure)
server/*.ts (core modules, EXCLUDING server/routers/*)
server/accountingHooks.ts
server/services/returnProcessing.ts
vitest.config.ts
vitest.setup.ts
client/src/hooks/work-surface/usePerformanceMonitor.ts
```

**DO NOT MODIFY:**
- `server/routers/*.ts` (Team C owns)
- `client/src/pages/*.tsx` (Team B owns)
- `scripts/seed/**` (Team D owns)
- `drizzle/**` (Team D owns)
- `client/src/components/work-surface/**` (Team E owns)

---

## Task Execution Order

### Phase 1: P0 Critical (Days 1-2)

#### 1. PERF-001: Fix Empty Catch Blocks (15 minutes)

**File:** `client/src/hooks/work-surface/usePerformanceMonitor.ts`
**Lines:** 375, 387, 403

**Problem:** Three empty catch blocks silently swallow Performance Observer errors.

**Fix:**
```typescript
// Replace empty catch blocks:
} catch (e) {}

// With logged catch blocks:
} catch (e) {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[WebVitals] Observer not supported:', e);
  }
}
```

**Verification:**
```bash
pnpm check
pnpm test client/src/hooks/work-surface/usePerformanceMonitor.test.ts
```

---

#### 2. ACC-001: Fix Silent GL Posting Failures (8 hours)

**File:** `server/accountingHooks.ts`
**Lines:** 173, 224, 274, 323

**Problem:** GL posting failures are silently ignored. Sales complete without ledger entries.

**Fix:**
1. Make `postSaleGLEntries` throw on missing standard accounts
2. Make `postPaymentGLEntries` throw on missing accounts
3. Make `postRefundGLEntries` throw on missing accounts
4. Make `postCOGSGLEntries` throw on missing accounts
5. Add admin alert mechanism for missing standard accounts

**Pattern:**
```typescript
// BEFORE (silent failure)
const account = await findStandardAccount('sales-revenue');
if (!account) {
  logger.warn('Standard account not found');
  return; // Silent failure!
}

// AFTER (explicit failure)
const account = await findStandardAccount('sales-revenue');
if (!account) {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'GL posting failed: sales-revenue standard account not configured',
  });
}
```

**Verification:**
```bash
pnpm test server/accountingHooks.test.ts
pnpm check
```

---

#### 3. TEST-INFRA-01: Fix DOM/jsdom Test Container (4 hours)

**Files:** `vitest.setup.ts`, affected test files

**Problem:** Tests fail with "Target container is not a DOM element"

**Fix:**
```typescript
// In vitest.setup.ts, add:
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  // Create a root container for React
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
});

afterEach(() => {
  // Cleanup
  document.body.innerHTML = '';
});
```

**Verification:**
```bash
pnpm test client/src/hooks/work-surface/__tests__/useExport.test.ts
pnpm test client/src/hooks/work-surface/__tests__/usePrint.test.ts
```

---

#### 4. TEST-INFRA-02: Configure DATABASE_URL (2 hours)

**Files:** `vitest.config.ts`, test environment setup

**Problem:** Tests fail with "Database connection failed"

**Fix:**
```typescript
// In vitest.config.ts, add environment variables:
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'mysql://test:test@localhost:3306/terp_test',
      // Or mock the database adapter for unit tests
    },
  },
});
```

**Alternative:** Create database mock for unit tests:
```typescript
// test/mocks/database.ts
export const mockDb = {
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
```

---

#### 5. TEST-INFRA-03: Fix TRPC Router Initialization (4 hours)

**Files:** Test setup files

**Problem:** "No procedure found on path" errors

**Fix:**
```typescript
// Create test client with full router:
import { createTRPCProxyClient } from '@trpc/client';
import { appRouter } from '@/server/routers/_app';

const testClient = createTRPCProxyClient<typeof appRouter>({
  links: [/* test links */],
});
```

---

### Phase 2: TypeScript & Test Fixes (Days 2-3)

#### 6. TS-001: Fix 117 TypeScript Errors (16-24 hours)

Run `pnpm check` and fix errors systematically.

**Priority Order:**
1. Server-side type mismatches (breaks build)
2. Client-side type mismatches (breaks build)
3. Null/undefined handling (runtime errors)
4. Implicit any types (type safety)

**Key Files to Fix:**
| File | Errors | Primary Issues |
|------|--------|----------------|
| `clientLedger.ts` | 6 | Undefined to number |
| `cogs.ts` | 5 | Pino logger signature |
| `InvoiceToPaymentFlow.tsx` | 4 | Date types |
| `OrderCreationFlow.tsx` | 4 | Missing lineItems |
| `OrderToInvoiceFlow.tsx` | 5 | Type incompatibilities |

**DO NOT:**
- Add `any` types as workarounds
- Use `@ts-ignore` comments
- Skip files owned by other teams

---

#### 7. BUG-100: Fix 122 Failing Tests (24-40 hours)

Run `pnpm test` and fix failures.

**Strategy:**
1. Fix infrastructure issues first (TEST-INFRA-01..03)
2. Fix type-related test failures
3. Fix assertion mismatches
4. Document skipped tests with reasons

**Acceptance Criteria:**
- Test pass rate > 95%
- All skipped tests have documented reasons
- No flaky tests

---

### Phase 3: P1/P2 Tasks (Day 4)

After P0 tasks are complete:

| ID | Task | Est. |
|----|------|------|
| TEST-INFRA-04 | Create test fixtures/factories | 8h |
| TEST-INFRA-05 | Fix async element detection | 4h |
| TEST-INFRA-06 | Fix admin security test | 2h |
| TEST-QA-001 | Fix React Hook test infrastructure | 2h |
| SEC-024 | Validate Quote Email XSS | 1h |
| SEC-025 | Session Extension Limit | 1h |
| SEC-026 | Cron Leader Election race | 2h |
| DI-009 | Vendor ID Validation | 30min |
| RBAC-002 | Time Clock Permission Gate | 30min |
| QUAL-008 | Feature Flag Route Checks | 4h |
| BUG-102 | Property Test Bugs | 4h |

---

## Verification Protocol

Before creating your PR, verify:

```bash
# All must pass
pnpm check        # 0 TypeScript errors
pnpm lint         # 0 linting errors
pnpm test         # >95% pass rate
pnpm build        # Build succeeds
```

---

## Creating Your PR

When ready, create PR to staging:

```bash
gh pr create --base staging/integration-sprint-2026-01 \
  --title "Team A: Core Stability Fixes" \
  --body "$(cat <<'EOF'
## Summary
- Fixed PERF-001: Empty catch blocks
- Fixed ACC-001: Silent GL posting failures
- Fixed TEST-INFRA-01..06: Test infrastructure
- Fixed TS-001: 117 TypeScript errors
- Fixed BUG-100: 122 failing tests

## Verification
- [x] pnpm check passes (0 errors)
- [x] pnpm test passes (>95%)
- [x] pnpm build passes

## Test Results
Pass: X | Fail: 0 | Skip: X (documented)
EOF
)"
```

---

## Cross-Team Dependencies

If you need changes from another team:

1. Create ticket in `docs/sprint-coordination/`
2. Notify the owning team
3. Wait for approval before proceeding

**Your blockers for other teams:** None (you unblock them!)

**Teams waiting on you:** Teams B, C, D, E all need TypeScript to pass

---

## Questions?

Create a coordination ticket or ask Evan.

**Remember:** Your work enables all other teams. Quality over speed.
