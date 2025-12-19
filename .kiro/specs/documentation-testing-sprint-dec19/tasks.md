# Implementation Plan

## Documentation & Testing Sprint - December 19, 2025

**Total Estimated Time:** ~17 hours
**Parallelization:** 3 agents can work simultaneously
**Module Isolation:** All tasks avoid Parallel Sprint Dec 19 files AND data debugging files

---

## Wave 1: Quick Wins (Parallel - 3 agents, ~3h total)

- [ ] 1. Remove debug router from production (Security)
  - [ ] 1.1 Wrap debug router registration in NODE_ENV check
    - Edit `server/routers.ts` to conditionally include debug router
    - Only register in development mode
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 1.2 Write test verifying debug router not in production
    - Create `server/routers/debug.production.test.ts`
    - **Property: Debug router not accessible in production**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 2. Add TypeScript types to Analytics router
  - [ ] 2.1 Add explicit return types to all functions in `analytics.ts`
    - Add return type annotations to all procedures
    - _Requirements: 6.1, 6.2_
  - [ ] 2.2 Add Zod schemas for all inputs
    - Ensure all `.input()` calls have proper Zod schemas
    - _Requirements: 6.3_
  - [ ] 2.3 Type database query results
    - Add explicit types to all `db.query` results
    - _Requirements: 6.4_
  - [ ] 2.4 Verify zero TypeScript errors
    - Run `pnpm check` and fix any remaining errors
    - _Requirements: 6.1_

- [ ] 3. Add TypeScript types to Dashboard routers
  - [ ] 3.1 Add explicit return types to `dashboard.ts`
    - Add return type annotations to all procedures
    - _Requirements: 7.1, 7.2_
  - [ ] 3.2 Add explicit return types to `dashboardEnhanced.ts`
    - Add return type annotations to all procedures
    - _Requirements: 7.1, 7.2_
  - [ ] 3.3 Add Zod schemas for all inputs
    - Ensure all `.input()` calls have proper Zod schemas
    - _Requirements: 7.3_
  - [ ] 3.4 Verify zero TypeScript errors
    - Run `pnpm check` and fix any remaining errors
    - _Requirements: 7.1_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Wave 2: Property Testing (Parallel - 3 agents, ~8h total)

- [ ] 5. Add property tests to Calendar router
  - [ ] 5.1 Create `calendar.property.test.ts` file
    - Set up fast-check imports and test structure
    - _Requirements: 2.1_
  - [ ] 5.2 Write property test for date range validity
    - **Property 1: Calendar date range validity**
    - For any event, end >= start
    - **Validates: Requirements 2.1**
  - [ ] 5.3 Write property test for recurring event count
    - **Property 2: Recurring event occurrence count**
    - Generated occurrences == specified count
    - **Validates: Requirements 2.2**
  - [ ] 5.4 Write property test for overlap detection
    - **Property 3: Event overlap symmetry**
    - Overlap detection is symmetric
    - **Validates: Requirements 2.3**
  - [ ] 5.5 Write property test for timezone preservation
    - **Property 4: Timezone round-trip preservation**
    - UTC conversion round-trip preserves time
    - **Validates: Requirements 2.4**

- [ ] 6. Add property tests to Pricing router
  - [ ] 6.1 Create `pricing.property.test.ts` file
    - Set up fast-check imports and test structure
    - _Requirements: 3.1_
  - [ ] 6.2 Write property test for margin non-negativity
    - **Property 5: Margin non-negativity**
    - Margin >= 0 for valid inputs
    - **Validates: Requirements 3.1**
  - [ ] 6.3 Write property test for discount bounds
    - **Property 6: Discount upper bound**
    - Final price <= original price
    - **Validates: Requirements 3.2**
  - [ ] 6.4 Write property test for COGS adjustment
    - **Property 7: COGS adjustment idempotence**
    - Same adjustment applied twice == applied once
    - **Validates: Requirements 3.3**
  - [ ] 6.5 Write property test for tier selection
    - **Property 8: Tier selection uniqueness**
    - Exactly one tier matches any quantity
    - **Validates: Requirements 3.4**

- [ ] 7. Add property tests to Inventory router
  - [ ] 7.1 Create `inventory.property.test.ts` file
    - Set up fast-check imports and test structure
    - _Requirements: 4.1_
  - [ ] 7.2 Write property test for allocation bounds
    - **Property 9: Allocation bounds**
    - Allocated <= available
    - **Validates: Requirements 4.1**
  - [ ] 7.3 Write property test for status transitions
    - **Property 10: Batch status transition validity**
    - Only valid transitions succeed
    - **Validates: Requirements 4.2**
  - [ ] 7.4 Write property test for quantity invariants
    - **Property 11: Quantity invariant preservation**
    - onHand >= reserved + quarantine + hold
    - **Validates: Requirements 4.3**
  - [ ] 7.5 Write property test for transfer zero-sum
    - **Property 12: Transfer zero-sum**
    - Source decrease == destination increase
    - **Validates: Requirements 4.4**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Wave 3: Documentation & Infrastructure (Parallel - 2 agents, ~6h total)

- [ ] 9. Consolidate root documentation
  - [ ] 9.1 Create archive directory structure
    - Create `docs/archive/legacy-reports/`
    - Create `docs/archive/agent-prompts/`
    - _Requirements: 1.2_
  - [ ] 9.2 Move legacy reports to archive
    - Move `*_REPORT*.md`, `*_SUMMARY*.md`, `*_STATUS*.md` files
    - Preserve git history with `git mv`
    - _Requirements: 1.1, 1.2_
  - [ ] 9.3 Move agent prompts to archive
    - Move `AGENT_*.md`, `EXTERNAL_AGENT_*.md` files
    - _Requirements: 1.1, 1.2_
  - [ ] 9.4 Update README with documentation index
    - Add section pointing to key documentation locations
    - _Requirements: 1.4_
  - [ ] 9.5 Verify no broken internal links
    - Search for links to moved files and update
    - _Requirements: 1.3_

- [ ] 10. Standardize error logging in Calendar module
  - [ ] 10.1 Replace console.error in `calendar.ts`
    - Import logger from `../_core/logger`
    - Add structured context to all error logs
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 10.2 Replace console.error in `calendarFinancials.ts`
    - Same pattern as 10.1
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 10.3 Replace console.error in `calendarInvitations.ts`
    - Same pattern as 10.1
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 10.4 Replace console.error in remaining calendar files
    - calendarMeetings.ts, calendarParticipants.ts, calendarRecurrence.ts, calendarReminders.ts, calendarViews.ts
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 10.5 Add PII masking for calendar-related sensitive data
    - Mask participant emails in log output
    - _Requirements: 10.4_

- [ ] 11. Add health check endpoint tests
  - [ ] 11.1 Create `monitoring.test.ts` file
    - Set up test structure with mocks
    - _Requirements: 9.1_
  - [ ] 11.2 Write test for database connectivity status
    - Verify health endpoint returns db status
    - _Requirements: 9.1_
  - [ ] 11.3 Write test for response time metrics
    - Verify health endpoint returns timing info
    - _Requirements: 9.2_
  - [ ] 11.4 Write test for degraded status reporting
    - Verify correct status when dependency down
    - _Requirements: 9.3_
  - [ ] 11.5 Write test for healthy status
    - Verify 200 OK when all systems healthy
    - _Requirements: 9.4_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Parallelization Strategy

---

## Agent C Prompt (Security & Types Focus)

### Kiro External Agent Context

#### Identity
You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

#### Before ANY Work
1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)

#### Critical Rules (NEVER BREAK)
- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

#### Session Registration (MANDATORY)
Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-AGENT-C-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

#### Development Standards
- **TypeScript**: Explicit return types on all functions, use type guards, handle null/undefined explicitly
- **React**: Use `React.memo` for reusable components, `useCallback` for event handlers, `useMemo` for expensive computations
- **Testing**: Write tests BEFORE implementation (TDD), 80%+ coverage for business logic, use fast-check for property tests
- **Database**: snake_case for tables/columns, index ALL foreign keys, use soft deletes

#### Git Workflow
```bash
git pull origin main                    # Always pull first
git checkout -b feature/TASK-ID-desc    # Feature branch
git commit -m "feat(scope): description" # Conventional commits
git push origin main                    # Push after each phase
```

#### Deployment
**Platform**: DigitalOcean App Platform | **URL**: https://terp-app-b9s35.ondigitalocean.app
```bash
git push origin main                    # Triggers deployment
bash scripts/watch-deploy.sh            # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

#### Pre-Commit Checklist
- [ ] `pnpm check` - No TypeScript errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

#### Essential Commands
```bash
pnpm roadmap:validate          # Validate roadmap
pnpm test                      # Run tests
pnpm check                     # Check types (use this, not typecheck)
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

### Agent C Tasks
```
Wave 1: Task 1 (Debug router) + Task 2 (Analytics types) → 1.5h
Wave 2: Task 5 (Calendar property tests) → 3h
Wave 3: Task 11 (Health check tests) → 1h
Total: ~5.5h
```

### Agent C File Ownership (EXCLUSIVE)
- `server/routers.ts` (debug router registration only)
- `server/routers/debug.ts`
- `server/routers/debug.production.test.ts` (new)
- `server/routers/analytics.ts`
- `server/routers/calendar.property.test.ts` (new)
- `server/routers/monitoring.test.ts` (new)

**DO NOT TOUCH**: Any files owned by Agent A, B, D, or E.

---

## Agent D Prompt (Types & Testing Focus)

### Kiro External Agent Context

#### Identity
You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

#### Before ANY Work
1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)

#### Critical Rules (NEVER BREAK)
- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

#### Session Registration (MANDATORY)
Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-AGENT-D-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

#### Development Standards
- **TypeScript**: Explicit return types on all functions, use type guards, handle null/undefined explicitly
- **React**: Use `React.memo` for reusable components, `useCallback` for event handlers, `useMemo` for expensive computations
- **Testing**: Write tests BEFORE implementation (TDD), 80%+ coverage for business logic, use fast-check for property tests
- **Database**: snake_case for tables/columns, index ALL foreign keys, use soft deletes

#### Git Workflow
```bash
git pull origin main                    # Always pull first
git checkout -b feature/TASK-ID-desc    # Feature branch
git commit -m "feat(scope): description" # Conventional commits
git push origin main                    # Push after each phase
```

#### Deployment
**Platform**: DigitalOcean App Platform | **URL**: https://terp-app-b9s35.ondigitalocean.app
```bash
git push origin main                    # Triggers deployment
bash scripts/watch-deploy.sh            # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

#### Pre-Commit Checklist
- [ ] `pnpm check` - No TypeScript errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

#### Essential Commands
```bash
pnpm roadmap:validate          # Validate roadmap
pnpm test                      # Run tests
pnpm check                     # Check types (use this, not typecheck)
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

### Agent D Tasks
```
Wave 1: Task 3 (Dashboard types) → 1.5h
Wave 2: Task 6 (Pricing property tests) → 2h
Wave 3: Task 10 (Calendar logging) → 1.5h
Total: ~5h
```

### Agent D File Ownership (EXCLUSIVE)
- `server/routers/dashboard.ts`
- `server/routers/dashboardEnhanced.ts`
- `server/routers/pricing.ts`
- `server/routers/pricing.property.test.ts` (new)
- `server/routers/calendar.ts`
- `server/routers/calendarFinancials.ts`
- `server/routers/calendarInvitations.ts`
- `server/routers/calendarMeetings.ts`
- `server/routers/calendarParticipants.ts`
- `server/routers/calendarRecurrence.ts`
- `server/routers/calendarReminders.ts`
- `server/routers/calendarViews.ts`

**DO NOT TOUCH**: Any files owned by Agent A, B, C, or E.

---

## Agent E Prompt (Documentation & Inventory Focus)

### Kiro External Agent Context

#### Identity
You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

#### Before ANY Work
1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)

#### Critical Rules (NEVER BREAK)
- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

#### Session Registration (MANDATORY)
Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-AGENT-E-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

#### Development Standards
- **TypeScript**: Explicit return types on all functions, use type guards, handle null/undefined explicitly
- **React**: Use `React.memo` for reusable components, `useCallback` for event handlers, `useMemo` for expensive computations
- **Testing**: Write tests BEFORE implementation (TDD), 80%+ coverage for business logic, use fast-check for property tests
- **Database**: snake_case for tables/columns, index ALL foreign keys, use soft deletes

#### Git Workflow
```bash
git pull origin main                    # Always pull first
git checkout -b feature/TASK-ID-desc    # Feature branch
git commit -m "feat(scope): description" # Conventional commits
git push origin main                    # Push after each phase
```

#### Deployment
**Platform**: DigitalOcean App Platform | **URL**: https://terp-app-b9s35.ondigitalocean.app
```bash
git push origin main                    # Triggers deployment
bash scripts/watch-deploy.sh            # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

#### Pre-Commit Checklist
- [ ] `pnpm check` - No TypeScript errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

#### Essential Commands
```bash
pnpm roadmap:validate          # Validate roadmap
pnpm test                      # Run tests
pnpm check                     # Check types (use this, not typecheck)
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

### Agent E Tasks
```
Wave 2: Task 7 (Inventory property tests) → 3h
Wave 3: Task 9 (Documentation consolidation) → 2h
Total: ~5h
```

### Agent E File Ownership (EXCLUSIVE)
- `server/routers/inventory.ts`
- `server/routers/inventory.property.test.ts` (new)
- Root `*.md` files (for archiving/moving only)
- `docs/archive/` directory (new)
- `docs/archive/legacy-reports/` (new)
- `docs/archive/agent-prompts/` (new)

**DO NOT TOUCH**: Any files owned by Agent A, B, C, or D.

### Conflict-Free Guarantee

| Agent C Files | Agent D Files | Agent E Files |
|--------------|---------------|---------------|
| `server/routers.ts` | `server/routers/dashboard.ts` | `server/routers/inventory.ts` |
| `server/routers/debug.ts` | `server/routers/dashboardEnhanced.ts` | `server/routers/inventory.property.test.ts` |
| `server/routers/analytics.ts` | `server/routers/pricing.ts` | Root `*.md` files |
| `server/routers/calendar.property.test.ts` | `server/routers/pricing.property.test.ts` | `docs/archive/` |
| `server/routers/monitoring.test.ts` | `server/routers/calendar*.ts` | |

**No file overlap between agents C, D, E.**
**No file overlap with Parallel Sprint Dec 19 (Agents A, B).**
**No file overlap with data debugging work.**

---

## Files Explicitly EXCLUDED (Active Work)

### Parallel Sprint Dec 19 - Agent A
- `server/routers/comments.ts`
- `server/routers/vipPortal.ts`
- `server/routers/vipPortalAdmin.ts`
- `server/routers/vipPortalAuth.ts`
- `client/src/components/ui/client-combobox.tsx`
- `client/src/components/widgets-v2/*`

### Parallel Sprint Dec 19 - Agent B
- `client/src/pages/accounting/ChartOfAccounts.tsx`
- `server/routers/todoTasks.ts`
- `server/todoTasksDb.ts`
- `client/src/components/layout/Breadcrumb.tsx`
- `client/src/components/layout/AppShell.tsx`
- `client/src/pages/ClientsListPage.tsx`
- `client/src/pages/accounting/Invoices.tsx`

### Data Debugging Work
- `server/ordersDb.ts`
- `server/routers/orders.ts`
- Any files related to order data flow

---

## Notes

- All tasks reference specific requirements from requirements.md
- All property tests use fast-check library
- Checkpoints ensure quality gates between waves
- Tasks can be reordered within waves if needed
- This sprint is completely isolated from all active work
