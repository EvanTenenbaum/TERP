# Kiro External Agent Prompt - Sprint 1

## Identity

You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

## Before ANY Work

1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md`
5. Register your session (mandatory)

## Critical Rules (NEVER BREAK)

- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

## Session Registration (MANDATORY)

Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

## Development Standards

### TypeScript
- Explicit return types on all functions
- Use type guards, not assertions
- Handle null/undefined explicitly

### React
- Use `React.memo` for reusable components
- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations

### Testing
- Write tests BEFORE implementation (TDD)
- 80%+ coverage for business logic
- Test behavior, not implementation

### Database
- snake_case for tables/columns
- Index ALL foreign keys
- Use soft deletes (`is_deleted`)

## Git Workflow

```bash
git pull origin main                    # Always pull first
git checkout -b feature/TASK-ID-desc    # Feature branch
git commit -m "feat(scope): description" # Conventional commits
git push origin main                    # Push after each phase
```

## Deployment

**Platform**: DigitalOcean App Platform
**URL**: https://terp-app-b9s35.ondigitalocean.app

```bash
git push origin main                    # Triggers deployment
bash scripts/watch-deploy.sh            # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

## Pre-Commit Checklist

- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `pnpm roadmap:validate` - If roadmap changed
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

## Completing Work

1. Archive session: `mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`
3. Update `docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md` status to `complete`
4. Run `pnpm roadmap:validate`
5. Commit and push
6. Verify deployment succeeded

## Essential Commands

```bash
pnpm roadmap:validate          # Validate roadmap
pnpm roadmap:capacity          # Check capacity
pnpm test                      # Run tests
pnpm typecheck                 # Check types
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

## Essential Files

- `docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md` - Task tracking
- `docs/ACTIVE_SESSIONS.md` - Who's working on what
- `docs/archive/agent-prompts/UNIVERSAL_AGENT_RULES.md` - Complete protocols

## When Stuck

1. Read `UNIVERSAL_AGENT_RULES.md`
2. Check existing code for patterns
3. Search: `grep -r "pattern" src/`
4. Ask user for clarification

---

**Follow these rules precisely. Your work affects other agents and production.**

---

# TERP-Dev

Execute the TERP MVP implementation following the Prioritized Strategic Roadmap.

**Primary Reference:** /home/user/TERP/docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md

## Execution Instructions

### 1. Sprint Structure
Execute sprints in order (0 → 1 → 2 → 3 → 4 → 5). Each sprint has parallel tracks (A, B, C). Within a sprint, execute independent tracks in parallel when possible.

### 2. Current Sprint: SPRINT 1 - CRITICAL UI FIXES

> **Goal:** Fix all P0/P1 bugs that affect user-facing functionality
> **Duration:** 2-3 days
> **Prerequisites:** Sprint 0 complete

**Track A (Order & Sales Flow Fixes):**
| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.A.1 | BUG-086 | Fix order finalization (pricing defaults fallback) | 2h | 0.A.1 (BUG-084) |
| 1.A.2 | BUG-093 | Fix finalizeMutation never called | 3h | 1.A.1 |
| 1.A.3 | BUG-040 | Fix Order Creator inventory loading | 4h | 0.A.2 (BUG-078) |
| 1.A.4 | BUG-045 | Fix Order Creator retry resets form | 2h | 1.A.3 |

**Track A Total:** 11h

**Track B (Grid & Data Display Fixes):**
| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.B.1 | BUG-091 | Fix Spreadsheet View empty grid (consolidated BUG-047/074) | 4h | 0.A.2 (BUG-078) |
| 1.B.2 | BUG-092 | Fix AR/AP dashboard widgets | 2h | 0.B.1 (API-010) |
| 1.B.3 | BUG-087 | Fix Products pagination validation | 2h | None |
| 1.B.4 | BUG-088 | Fix Spreadsheet Clients detail query | 2h | 0.A.2 (BUG-078) |

**Track B Total:** 10h

**Track C (UI Wiring & Interaction Fixes):**
| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.C.1 | BUG-089 | Fix New Invoice button onClick | 3h | None |
| 1.C.2 | BUG-090 | Fix Client edit save persistence | 2h | None |
| 1.C.3 | BUG-094 | Fix Live Shopping session creation | 3h | None |
| 1.C.4 | BUG-095 | Fix Batches "New Purchase" button | 2h | None |
| 1.C.5 | BUG-046 | Fix Settings Users tab auth error | 2h | 0.C.1-3 (RBAC fixes) |
| 1.C.6 | MEET-049 | Fix Calendar Navigation Bug | 2h | None |

**Track C Total:** 14h

**Sprint 1 Total:** 35h (parallel: ~14h elapsed with 3 agents)

### 3. QA Gate Protocol
After completing ALL tasks in Sprint 1, run validation:
```bash
pnpm tsc --noEmit        # No TypeScript errors
pnpm test:unit           # All unit tests pass
pnpm lint                # No lint errors
```

### Sprint 1 QA Gate Checklist

```
VALIDATION CHECKLIST (Must all pass before Sprint 2):
[ ] Create and finalize a sales order successfully
[ ] Order Creator loads inventory without error
[ ] Spreadsheet View displays data in all tabs
[ ] AR/AP widgets load with data
[ ] Products page loads with pagination
[ ] New Invoice button opens creation flow
[ ] Client edits persist after save
[ ] Live Shopping session can be created
[ ] New Purchase button works in Batches
[ ] Run full E2E test suite: 0 FAIL, <5 BLOCKED
```

### 4. Dependency Rules
- Never start a task until its dependencies are complete
- Sprint 0 MUST be complete before starting Sprint 1
- Check the dependency matrix in Part 4 of the roadmap
- Dependencies from Sprint 0:
  - 0.A.1 (BUG-084) → 1.A.1 (BUG-086)
  - 0.A.2 (BUG-078) → 1.A.3, 1.B.1, 1.B.4
  - 0.B.1 (API-010) → 1.B.2
  - 0.C.1-3 (RBAC) → 1.C.5

### 5. Progress Tracking
Use the Master Tracking Checklist (Part 9) to mark tasks complete. Update status from ☐ to ✅ as you finish each item.

### Sprint 1 Task Tracking
| Task ID | Description | Status | Verified |
|---------|-------------|--------|----------|
| BUG-086 | Order finalization | ☐ | ☐ |
| BUG-093 | finalizeMutation | ☐ | ☐ |
| BUG-040 | Order Creator inventory | ☐ | ☐ |
| BUG-045 | Order Creator form reset | ☐ | ☐ |
| BUG-091 | Spreadsheet View grid | ☐ | ☐ |
| BUG-092 | AR/AP widgets | ☐ | ☐ |
| BUG-087 | Products pagination | ☐ | ☐ |
| BUG-088 | Spreadsheet Clients | ☐ | ☐ |
| BUG-089 | New Invoice button | ☐ | ☐ |
| BUG-090 | Client edit save | ☐ | ☐ |
| BUG-094 | Live Shopping session | ☐ | ☐ |
| BUG-095 | Batches New Purchase | ☐ | ☐ |
| BUG-046 | Settings Users tab | ☐ | ☐ |
| MEET-049 | Calendar Navigation Bug | ☐ | ☐ |

### 6. Commit Protocol
Commit after completing each task with message format:
`"[S1.TRACK.#] Task description - TASK-ID"`

Examples:
- `"[S1.A.1] Fix order finalization pricing defaults fallback - BUG-086"`
- `"[S1.B.1] Fix Spreadsheet View empty grid - BUG-091"`
- `"[S1.C.6] Fix Calendar Navigation Bug - MEET-049"`

### 7. Bug Investigation Strategy

For each bug, follow this investigation pattern:

1. **Locate the affected component/route**
   ```bash
   grep -r "ComponentName" src/
   grep -r "routeName" server/
   ```

2. **Check existing error handling**
   ```bash
   grep -r "TRPCError" server/routers/
   ```

3. **Review related tests**
   ```bash
   find . -name "*.test.ts" -exec grep -l "featureName" {} \;
   ```

4. **Write failing test first (TDD)**
5. **Implement fix**
6. **Verify test passes**
7. **Run full validation suite**

### 8. Track-Specific Context

#### Track A: Order & Sales Flow
Key files to investigate:
- `server/routers/orders.ts` - Order API endpoints
- `client/src/pages/OrderCreator.tsx` - Order creation UI
- `server/db/schema/orders.ts` - Order database schema
- `client/src/hooks/useOrderMutation.ts` - Order mutations

#### Track B: Grid & Data Display
Key files to investigate:
- `client/src/pages/SpreadsheetView.tsx` - Spreadsheet UI
- `client/src/components/DataGrid/` - Grid components
- `server/routers/accounting.ts` - AR/AP endpoints
- `server/routers/products.ts` - Products endpoint

#### Track C: UI Wiring & Interactions
Key files to investigate:
- `client/src/pages/Invoices.tsx` - Invoice UI
- `client/src/pages/Clients.tsx` - Client edit UI
- `client/src/pages/LiveShopping.tsx` - Live Shopping UI
- `client/src/pages/Batches.tsx` - Batches UI
- `client/src/pages/Settings/Users.tsx` - Users settings
- `client/src/pages/Calendar.tsx` - Calendar navigation

## Start Execution

**Prerequisites Check:**
Before starting Sprint 1, verify Sprint 0 is complete:
```bash
# Check Sprint 0 completion status
grep -A 20 "Sprint 0: Foundation" docs/roadmaps/PRIORITIZED_STRATEGIC_ROADMAP_2026-01-12.md
```

**Begin with Sprint 1, Track A, Task 1.A.1 (BUG-086: Fix order finalization)**

Read the relevant code, implement the fix, test, and commit before moving to the next task.

---

## Visual Dependency Graph for Sprint 1

```
SPRINT 0 (Complete) ─────────────────────────────────────────────────────────┐
├─ 0.A.1 BUG-084 (pricing_defaults) ──────────────────────────────────────┐  │
├─ 0.A.2 BUG-078 (orders.getAll) ───────────────────────────────────────┐ │  │
├─ 0.B.1 API-010 (accounting.*) ──────────────────────────────────────┐ │ │  │
└─ 0.C.1-3 (RBAC fixes) ────────────────────────────────────────────┐ │ │ │  │
                                                                    │ │ │ │  │
SPRINT 1 (Current)                                                  │ │ │ │  │
├─ Track A: Order & Sales Flow                                      │ │ │ │  │
│  ├─ 1.A.1 BUG-086 (order finalization) ◄──────────────────────────│─│─┘ │  │
│  ├─ 1.A.2 BUG-093 (finalizeMutation) ◄─ 1.A.1                     │ │   │  │
│  ├─ 1.A.3 BUG-040 (inventory loading) ◄───────────────────────────│─┘   │  │
│  └─ 1.A.4 BUG-045 (form reset) ◄─ 1.A.3                           │     │  │
│                                                                    │     │  │
├─ Track B: Grid & Data Display                                      │     │  │
│  ├─ 1.B.1 BUG-091 (spreadsheet grid) ◄────────────────────────────┤     │  │
│  ├─ 1.B.2 BUG-092 (AR/AP widgets) ◄───────────────────────────────┘     │  │
│  ├─ 1.B.3 BUG-087 (pagination) [independent]                            │  │
│  └─ 1.B.4 BUG-088 (clients detail) ◄────────────────────────────────────┘  │
│                                                                             │
└─ Track C: UI Wiring (mostly independent)                                    │
   ├─ 1.C.1 BUG-089 (invoice button) [independent]                            │
   ├─ 1.C.2 BUG-090 (client save) [independent]                               │
   ├─ 1.C.3 BUG-094 (live shopping) [independent]                             │
   ├─ 1.C.4 BUG-095 (new purchase) [independent]                              │
   ├─ 1.C.5 BUG-046 (users tab) ◄─────────────────────────────────────────────┘
   └─ 1.C.6 MEET-049 (calendar nav) [independent]
```

---

## Success Criteria for Sprint 1

Sprint 1 is complete when:
- ✅ All 14 tasks marked complete with verification
- ✅ All QA Gate checklist items pass
- ✅ `pnpm typecheck` returns 0 errors
- ✅ `pnpm lint` returns 0 errors
- ✅ `pnpm test` all tests pass
- ✅ E2E test suite: 0 FAIL, <5 BLOCKED
- ✅ Deployment successful and verified
- ✅ Session archived

---

**After Sprint 1 completion, proceed to Sprint 2: Wave 1 - Stop the Bleeding**
