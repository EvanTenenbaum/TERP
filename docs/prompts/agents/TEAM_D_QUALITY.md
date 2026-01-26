# Team D: Code Quality Agent Prompt

**Role:** Code Quality Lead
**Branch:** `claude/team-d-quality`
**Priority:** MEDIUM - Unblocks CI/CD stability

---

## Mission

Fix linting errors and test infrastructure issues that cause CI failures. These are independent fixes that improve codebase health.

**No dependencies - start immediately. All tasks can run in parallel.**

---

## Task List

### Task 1: LINT-001 - Fix React Hooks Violations

**Estimate:** 4h
**Module:** `client/src/components/accounting/*.tsx`
**Risk Level:** SAFE

**Problem:**
ESLint reports `rules-of-hooks` and `exhaustive-deps` violations in accounting components.

**Common violations:**
1. Hooks called conditionally
2. Hooks called inside loops
3. Missing dependencies in useEffect/useCallback/useMemo

**Approach:**

```typescript
// BEFORE: Conditional hook (VIOLATION)
if (isLoading) {
  const data = useMemo(() => compute(), [])  // ❌
}

// AFTER: Always call hooks, conditionally use result
const data = useMemo(() => compute(), [])
if (!isLoading) {
  return <Loading />
}

// BEFORE: Missing dependency (VIOLATION)
useEffect(() => {
  fetchData(clientId)
}, [])  // ❌ Missing clientId

// AFTER: Include all dependencies
useEffect(() => {
  fetchData(clientId)
}, [clientId])  // ✓
```

**Files to check:**
- `client/src/components/accounting/PaymentForm.tsx`
- `client/src/components/accounting/InvoiceList.tsx`
- `client/src/components/accounting/CreditMemoForm.tsx`
- All files in `client/src/components/accounting/`

**Deliverables:**
- [ ] All rules-of-hooks violations fixed
- [ ] All exhaustive-deps violations fixed
- [ ] No new ESLint errors
- [ ] Components still function correctly

---

### Task 2: LINT-002 - Fix 'React' is not defined Errors

**Estimate:** 2h
**Module:** Multiple client components
**Risk Level:** SAFE

**Problem:**
12 files have `'React' is not defined` errors. This happens in files using JSX without importing React (pre-React 17 behavior).

**Solution:**
With React 17+ and proper babel/vite config, explicit React import is not needed. Fix the ESLint config OR add imports.

**Option A: Fix ESLint (preferred)**
```javascript
// .eslintrc.js
module.exports = {
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',  // Not needed in React 17+
  },
}
```

**Option B: Add imports**
```typescript
// Add to each file
import React from 'react'
```

**Affected files:**
Run to find: `pnpm lint 2>&1 | grep "React.*not defined"`

**Deliverables:**
- [ ] All 12 files fixed
- [ ] ESLint config updated if Option A
- [ ] No 'React' is not defined errors

---

### Task 3: LINT-005 - Replace `any` Types with Proper Types

**Estimate:** 8h
**Module:** Client + Server
**Risk Level:** SAFE

**Problem:**
~200 instances of `any` type usage defeat TypeScript's type safety.

**Prioritized approach:**

1. **Public API boundaries** (HIGH priority)
```typescript
// BEFORE
export function processOrder(data: any) { ... }

// AFTER
export function processOrder(data: OrderInput) { ... }
```

2. **Event handlers** (MEDIUM priority)
```typescript
// BEFORE
const handleChange = (e: any) => { ... }

// AFTER
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
```

3. **Internal utilities** (LOW priority)
```typescript
// BEFORE
function debounce(fn: any, delay: number) { ... }

// AFTER
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void { ... }
```

**Find all instances:**
```bash
grep -rn ": any" --include="*.ts" --include="*.tsx" client/ server/
```

**Deliverables:**
- [ ] Public API any types replaced (100%)
- [ ] Event handler any types replaced (100%)
- [ ] Internal utility any types reduced (80%+)
- [ ] No new any types introduced
- [ ] TypeScript strict mode still passes

---

### Task 4: TEST-020 - Fix permissionMiddleware.test.ts Mock Hoisting

**Estimate:** 2h
**Module:** `server/_core/permissionMiddleware.test.ts`
**Risk Level:** SAFE

**Problem:**
Vitest mock hoisting doesn't work correctly with the permission middleware tests. Mocks are not being applied before module initialization.

**Solution:**
Use `vi.mock()` at the top level with factory functions:

```typescript
// BEFORE (broken)
describe('permissionMiddleware', () => {
  beforeEach(() => {
    vi.mock('../services/rbac', () => ({
      checkPermission: vi.fn()
    }))
  })
})

// AFTER (correct)
vi.mock('../services/rbac', () => ({
  checkPermission: vi.fn()
}))

import { checkPermission } from '../services/rbac'

describe('permissionMiddleware', () => {
  beforeEach(() => {
    vi.mocked(checkPermission).mockReset()
  })

  it('allows access with permission', async () => {
    vi.mocked(checkPermission).mockResolvedValue(true)
    // ...
  })
})
```

**Key changes:**
1. Move `vi.mock()` to top of file (before imports)
2. Use `vi.mocked()` for type-safe mock access
3. Reset mocks in `beforeEach`

**Deliverables:**
- [ ] Mock hoisting fixed
- [ ] All 8 tests pass
- [ ] No test skips needed

---

### Task 5: TEST-021 - Add ResizeObserver Polyfill for jsdom Tests

**Estimate:** 1h
**Module:** `vitest.setup.ts`
**Risk Level:** SAFE

**Problem:**
Tests using components with ResizeObserver fail in jsdom environment because ResizeObserver is not implemented.

**Solution:**
Add polyfill in test setup:

```typescript
// vitest.setup.ts

// ResizeObserver polyfill for jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock

// Or use resize-observer-polyfill package
// import ResizeObserver from 'resize-observer-polyfill'
// global.ResizeObserver = ResizeObserver
```

**Also add IntersectionObserver if needed:**
```typescript
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = IntersectionObserverMock
```

**Deliverables:**
- [ ] ResizeObserver polyfill added
- [ ] IntersectionObserver polyfill added (if needed)
- [ ] Component tests pass
- [ ] No observer-related test failures

---

## Verification Checklist

```bash
# Run all linting
pnpm lint

# Run tests
pnpm test

# TypeScript check
pnpm check

# Verify specific fixes
pnpm lint client/src/components/accounting/
pnpm test server/_core/permissionMiddleware.test.ts
```

---

## PR Template

```markdown
## Team D: Code Quality

### Tasks Completed
- [x] LINT-001: Fix React Hooks Violations
- [x] LINT-002: Fix 'React' is not defined Errors
- [x] LINT-005: Replace `any` Types with Proper Types
- [x] TEST-020: Fix permissionMiddleware.test.ts Mock Hoisting
- [x] TEST-021: Add ResizeObserver Polyfill for jsdom Tests

### Key Changes
- Fixed all React hooks rule violations in accounting components
- Updated ESLint config for React 17+ JSX transform
- Replaced ~200 `any` types with proper TypeScript types
- Fixed Vitest mock hoisting for permission middleware tests
- Added browser API polyfills to test setup

### Quality Metrics
- ESLint errors: 0
- TypeScript errors: 0
- Test pass rate: 95%+

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
```

---

## Communication

**Update session file:** `docs/sessions/active/team-d-quality.md`
