# Agent Team D: Code Quality (Lint/Test)

You are Agent Team D working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** SAFE (low-risk, high-volume)
**Branch:** `claude/team-d-code-quality-{SESSION_ID}`
**Estimate:** 28-36 hours
**Dependencies:** None - START IMMEDIATELY

---

## YOUR TASKS

| Task     | Description                           | Estimate | Module                                      |
| -------- | ------------------------------------- | -------- | ------------------------------------------- |
| LINT-001 | Fix React Hooks Violations            | 4h       | `client/src/components/accounting/*.tsx`    |
| LINT-002 | Fix 'React' is not defined Errors     | 2h       | Multiple client components                  |
| LINT-003 | Fix unused variable errors            | 4h       | Client + Server                             |
| LINT-004 | Fix array index key violations        | 4h       | Client components                           |
| LINT-005 | Replace `any` types (non-critical)    | 8h       | Client + Server                             |
| LINT-006 | Remove console.log statements         | 2h       | Server files                                |
| LINT-007 | Fix non-null assertions               | 2h       | Client components                           |
| LINT-008 | Fix NodeJS/HTMLTextAreaElement types  | 1h       | `server/_core/*.ts`                         |
| TEST-020 | Fix permissionMiddleware.test.ts mock | 2h       | `server/_core/permissionMiddleware.test.ts` |
| TEST-021 | Add ResizeObserver polyfill           | 1h       | `vitest.setup.ts`                           |
| TEST-022 | Fix EventFormDialog test environment  | 2h       | `EventFormDialog.test.tsx`                  |
| TEST-023 | Fix ResizeObserver mock constructor   | 0.5h     | `tests/setup.ts`                            |
| TEST-024 | Add tRPC mock `isPending` property    | 1h       | `tests/setup.ts`                            |
| TEST-025 | Fix tRPC proxy memory leak            | 1h       | `tests/setup.ts`                            |
| TEST-026 | Add vi.clearAllMocks() to setup       | 0.5h     | `tests/setup.ts`                            |
| PERF-003 | Add mounted ref guard                 | 0.5h     | `usePerformanceMonitor.ts`                  |
| PERF-004 | Fix PerformanceObserver memory leak   | 0.5h     | `usePerformanceMonitor.ts`                  |
| PERF-005 | Fix useWebVitals mutable ref          | 1h       | `usePerformanceMonitor.ts`                  |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (10 minutes)

```bash
# Clone, setup, read protocols
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md

# Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-D-QUALITY-$(openssl rand -hex 4)"
git pull --rebase origin main
```

### PHASE 2: Session Registration (5 minutes)

```bash
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team D: Code Quality

**Session ID:** ${SESSION_ID}
**Agent:** Team D
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** SAFE

## Tasks
[List all 18 tasks]

## Progress Notes
Starting code quality improvements...
EOF

echo "- Team-D: ${SESSION_ID} - Code Quality" >> docs/ACTIVE_SESSIONS.md
git checkout -b "claude/team-d-code-quality-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team D Code Quality session"
git push -u origin "claude/team-d-code-quality-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order (Batch for efficiency)

```
Batch 1: Test Infrastructure (enables other tests) - 2h
├── TEST-020: Fix mock hoisting with vi.hoisted()
├── TEST-021: Add ResizeObserver polyfill
├── TEST-023: Fix ResizeObserver constructor
└── TEST-024: Add isPending to tRPC mock

Batch 2: More Test Infrastructure - 2h
├── TEST-022: EventFormDialog environment
├── TEST-025: tRPC proxy memoization
└── TEST-026: vi.clearAllMocks()

Batch 3: High-Priority Lint - 4h
├── LINT-001: React Hooks violations
│   - Move conditional hooks to top level
│   - Fix exhaustive-deps
└── LINT-002: 'React' not defined
    - Add import React from 'react'

Batch 4: Medium-Priority Lint - 4h
├── LINT-003: Unused variables
│   - Remove or prefix with _
├── LINT-004: Array index keys
│   - Use stable keys
└── LINT-008: Type definitions
    - Fix NodeJS namespace

Batch 5: Large Lint Batch - 8h
└── LINT-005: Replace `any` types
    - Start with client components
    - Then server files
    - Can split across sessions

Batch 6: Low-Priority - 2h
├── LINT-006: Remove console.log
└── LINT-007: Non-null assertions
    - Replace with optional chaining or guards

Batch 7: Performance Hooks - 2h
├── PERF-003: Mounted ref guard
├── PERF-004: Observer memory leak
└── PERF-005: Mutable ref fix
```

### SAFE Mode: Frequent Commits

**Commit after every batch (every 30-60 minutes):**

```bash
# After each batch
pnpm check && pnpm lint && pnpm test

git add [files]
git commit -m "[LINT/TEST/PERF]-XXX: [Description]

Verified: check, lint, test all pass"
git push
```

### Specific Fix Patterns

#### LINT-001: React Hooks

```typescript
// BEFORE - BROKEN
function Component({ condition }) {
  if (condition) {
    const memoized = useMemo(() => {}, []); // Hook in conditional!
  }
}

// AFTER - FIXED
function Component({ condition }) {
  const memoized = useMemo(() => {
    if (!condition) return null;
    return computedValue;
  }, [condition]);
}
```

#### TEST-020: Mock Hoisting

```typescript
// BEFORE - BROKEN
const mockGetDb = vi.fn();
vi.mock("../db", () => ({ getDb: mockGetDb }));

// AFTER - FIXED
const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));
vi.mock("../db", () => ({ getDb: mockGetDb }));
```

#### TEST-021: ResizeObserver Polyfill

```typescript
// vitest.setup.ts
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  callback: ResizeObserverCallback;
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

### PHASE 4: Validation

```bash
# After each batch
pnpm check   # ZERO errors
pnpm lint    # ZERO errors (for touched files)
pnpm test    # ALL pass

# Final verification
pnpm build   # SUCCESS
```

### PHASE 5: Completion

```bash
git commit -m "complete: Team D Code Quality

Batches completed:
- Test infrastructure: TEST-020-026
- Lint high-priority: LINT-001, LINT-002
- Lint medium-priority: LINT-003, LINT-004, LINT-008
- Lint large batch: LINT-005
- Lint low-priority: LINT-006, LINT-007
- Performance: PERF-003, PERF-004, PERF-005

ESLint errors: 0
TypeScript errors: 0
Test pass rate: 100%"
```

---

## Required Output Format

```markdown
## Team D Verification Results

✅ **Verified:**

- pnpm check: PASS (0 errors)
- pnpm lint: PASS (0 errors in touched files)
- pnpm test: PASS (X/Y tests)
- pnpm build: PASS

🧪 **Tests Fixed:**

- permissionMiddleware.test.ts: mock hoisting
- EventFormDialog.test.tsx: ResizeObserver polyfill
- vitest.setup.ts: global mocks added

📊 **Lint Progress:**

- Errors fixed: ~200
- Warnings fixed: ~150
- Remaining: document if any

⚠️ **Risk Notes:**

- Some `any` types may require larger refactors
- List any deferred to future sessions

🔁 **Rollback Plan:**

- Revert commits by batch
- Each batch is independently revertible
```

---

## SAFE Mode Guidelines

1. **Small, frequent commits** - Every 30-60 minutes
2. **Batch similar fixes** - All unused vars in one commit
3. **Run verification after each batch** - Don't accumulate errors
4. **Document any skipped items** - Why and what's needed
5. **No behavior changes** - Lint/type fixes only
