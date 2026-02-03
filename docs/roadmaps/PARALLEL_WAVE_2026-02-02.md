# Parallel Wave Execution Plan: WAVE-2026-02-02-A

**Created:** 2026-02-02
**Status:** 🔄 IN PROGRESS
**Mode:** SAFE (No inventory/DB overlap with in-flight work)
**Orchestrator:** Manus PM
**Execution Strategy:** Parallel subagents using Codex API

---

## Executive Summary

This wave executes tasks that are **completely independent** of the current S0-CRITICAL Inventory Filter Chain work (INV-FILTER-001 through INV-FILTER-004). All tasks in this wave touch different modules and have no risk of merge conflicts or interference.

### Current In-Flight Work (DO NOT TOUCH)

- PR #368: INV-FILTER-001 - `server/routers/inventory.ts`
- Queued: INV-FILTER-002 - `server/inventoryDb.ts`
- Queued: INV-PARTY-001 - `server/routers/inventory.ts`
- Queued: INV-FILTER-003/004 - Inventory frontend

### Wave Tasks (Independent Modules)

| Task ID       | Description                                     | Priority | Est | Module                                                    | Subagent |
| ------------- | ----------------------------------------------- | -------- | --- | --------------------------------------------------------- | -------- |
| PERF-001      | Fix empty catch blocks in usePerformanceMonitor | P0       | 15m | `client/src/hooks/work-surface/usePerformanceMonitor.ts`  | Agent-1  |
| TEST-INFRA-07 | Fix tRPC mock missing `useUtils` method         | P2       | 2h  | `client/src/pages/MatchmakingServicePage.test.tsx`        | Agent-2  |
| TEST-INFRA-08 | Fix Radix UI React 19 render loop               | P2       | 2h  | `client/src/components/calendar/EventFormDialog.test.tsx` | Agent-3  |
| ST-054        | Fix `any` types in core infrastructure          | P2       | 4h  | `server/_core/*.ts`                                       | Agent-4  |

**Total Estimate:** 8h 15m
**Parallel Execution Time:** ~4h (longest task)

---

## Task Details

### PERF-001: Fix Empty Catch Blocks in usePerformanceMonitor.ts

**Status:** [ ] Not Started
**Priority:** P0 CRITICAL
**Estimate:** 15 minutes
**Module:** `client/src/hooks/work-surface/usePerformanceMonitor.ts`
**Lines:** 375, 387, 403

**Problem:**
Three empty catch blocks silently swallow Performance Observer errors:

```typescript
} catch (e) {}  // LCP observer - SILENT FAILURE (line 375)
} catch (e) {}  // FID observer - SILENT FAILURE (line 387)
} catch (e) {}  // CLS observer - SILENT FAILURE (line 403)
```

**Fix:**
Add debug logging to each catch block:

```typescript
} catch (e) {
  console.debug('[WebVitals] LCP observer not supported:', e);
}
```

**Acceptance Criteria:**

- [ ] All 3 catch blocks have debug logging
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] No runtime behavior changes

---

### TEST-INFRA-07: Fix tRPC Mock Missing `useUtils` Method

**Status:** [ ] Not Started
**Priority:** P2
**Estimate:** 2 hours
**Module:** `client/src/pages/MatchmakingServicePage.test.tsx`
**Error:** `TypeError: trpc.useUtils is not a function`
**Affected Tests:** 4 tests in MatchmakingServicePage test suite

**Problem:**
The tRPC mock in the test setup doesn't properly mock the `useUtils` hook, causing 4 test failures.

**Fix:**
Update the tRPC mock to include `useUtils`:

```typescript
vi.mock("~/utils/trpc", () => ({
  trpc: {
    // ... existing mocks
    useUtils: vi.fn().mockReturnValue({
      invalidate: vi.fn(),
      refetch: vi.fn(),
      // Add other utils methods as needed
    }),
  },
}));
```

**Acceptance Criteria:**

- [ ] All 4 MatchmakingServicePage tests pass
- [ ] `pnpm check` passes
- [ ] `pnpm test --grep "MatchmakingServicePage"` passes

---

### TEST-INFRA-08: Fix Radix UI React 19 Render Loop

**Status:** [ ] Not Started
**Priority:** P2
**Estimate:** 2 hours
**Module:** `client/src/components/calendar/EventFormDialog.test.tsx`
**Error:** `Maximum update depth exceeded`
**Affected Tests:** 5 tests in EventFormDialog test suite

**Problem:**
Radix UI `react-presence` component triggers infinite update loop in test environment with React 19.

**Fix Options:**

1. Update Radix UI packages to React 19 compatible versions
2. Mock the problematic Radix components in tests
3. Add test-specific handling for presence animations

**Acceptance Criteria:**

- [ ] All 5 EventFormDialog tests pass
- [ ] `pnpm check` passes
- [ ] `pnpm test --grep "EventFormDialog"` passes
- [ ] No changes to production component behavior

---

### ST-054: Fix `any` Types in Core Infrastructure

**Status:** [ ] Not Started
**Priority:** P2
**Estimate:** 4 hours
**Modules:**

- `server/_core/featureFlagMiddleware.ts` - Multiple `any` types
- `server/_core/monitoring.ts:134` - `app: any` parameter
- `server/_core/connectionPool.ts:96` - `any` in typeCast function
- `server/_core/rateLimiter.ts` - `as any` casts on rate limiter configs

**Problem:**
Type safety gaps in infrastructure code due to `any` type usage.

**Fix:**
Replace `any` with proper typed interfaces:

```typescript
// Example for monitoring.ts
interface ExpressApp {
  use: (middleware: RequestHandler) => void;
  // ... other methods
}
export function setupMonitoring(app: ExpressApp) { ... }
```

**Acceptance Criteria:**

- [ ] All `any` types replaced with proper interfaces
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] No runtime behavior changes

---

## Execution Strategy

### Parallel Subagent Assignment

```
┌─────────────────────────────────────────────────────────────┐
│                    WAVE-2026-02-02-A                        │
├─────────────────────────────────────────────────────────────┤
│  Agent-1: PERF-001 (15m)                                    │
│  Agent-2: TEST-INFRA-07 (2h)                                │
│  Agent-3: TEST-INFRA-08 (2h)                                │
│  Agent-4: ST-054 (4h)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Integration Order

1. PERF-001 (smallest, fastest merge)
2. TEST-INFRA-07 (test-only changes)
3. TEST-INFRA-08 (test-only changes)
4. ST-054 (infrastructure types)

### Branch Strategy

- Each task gets its own branch: `fix/{task-id}-{short-desc}`
- PRs created with full verification checklist
- Merge in integration order above

---

## Verification Gates

### Pre-Merge (Per Task)

```bash
pnpm check    # TypeScript compilation
pnpm lint     # ESLint
pnpm test     # Full test suite
pnpm build    # Production build
```

### Post-Wave

```bash
# Verify no regressions
pnpm test --run
# Verify no conflicts with inventory work
git diff main..hotfix/INV-FILTER-001-reconnect-db-filters --name-only
```

---

## Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                              |
| ------------------------------------ | ---------- | ------ | --------------------------------------- |
| Merge conflict with inventory work   | LOW        | LOW    | Tasks touch completely different files  |
| Test infrastructure changes break CI | MEDIUM     | MEDIUM | Run full test suite before merge        |
| Type changes cause runtime issues    | LOW        | MEDIUM | No runtime behavior changes, types only |

---

## Completion Criteria

- [ ] All 4 tasks have merged PRs
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` passes
- [ ] No regressions in existing functionality
- [ ] Roadmap updated with completion status
- [ ] No interference with INV-FILTER work verified

---

## Session Log

| Timestamp  | Action             | Result |
| ---------- | ------------------ | ------ |
| 2026-02-02 | Wave plan created  | ✅     |
| 2026-02-02 | Subagents launched | ⏳     |
|            |                    |        |
