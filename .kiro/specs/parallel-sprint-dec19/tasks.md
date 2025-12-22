# Implementation Plan

## Parallel Sprint - December 19, 2025

**Total Estimated Time:** ~18.5 hours
**Parallelization:** 2 agents can work simultaneously
**Module Isolation:** All tasks avoid MVP Sprint files (ordersDb.ts, optimisticLocking.ts, backup scripts)

---

## Wave 1: Quick Wins (Parallel - 2 agents, ~3h total)

- [x] 1. Remove debug routes from production (BUG-011)
  - [x] 1.1 Remove `/orders-debug` route from `client/src/App.tsx`
    - Wrap debug route in `import.meta.env.DEV` conditional
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Remove `testEndpoint` from `server/routers/orders.ts` if exists
    - Search for and remove any debug-only endpoints
    - _Requirements: 1.1, 1.2_
  - [x] 1.3 Write integration test for debug route removal
    - **Property 1: Debug routes not accessible in production**
    - **Validates: Requirements 1.1, 1.2**

- [-] 2. Fix Chart of Accounts edit button (UX-014)
  - [ ] 2.1 Add edit button to account rows in `ChartOfAccounts.tsx`
    - Add edit icon button to each row
    - Wire up onClick to open edit modal
    - _Requirements: 4.1, 4.2_
  - [ ] 2.2 Implement edit modal with form
    - Create or reuse AccountEditModal component
    - Pre-populate with account data
    - _Requirements: 4.2_
  - [ ] 2.3 Wire up save/cancel handlers
    - Connect to `accounting.updateAccount` mutation
    - Handle success/error states
    - _Requirements: 4.3, 4.4_
  - [ ] 2.4 Write property test for edit persistence
    - **Property 7: Account edit persistence**
    - **Validates: Requirements 4.3**

---

## Wave 2: Code Quality (Parallel - 2 agents, ~4h total)

- [ ] 3. Add TypeScript types to Comments router
  - [ ] 3.1 Add explicit return types to all functions in `comments.ts`
    - Add return type annotations to all procedures
    - _Requirements: 6.1, 6.2_
  - [ ] 3.2 Add Zod schemas for all inputs
    - Ensure all `.input()` calls have proper Zod schemas
    - _Requirements: 6.3_
  - [ ] 3.3 Type database query results
    - Add explicit types to all `db.query` results
    - _Requirements: 6.4_
  - [ ] 3.4 Verify zero TypeScript errors
    - Run `pnpm typecheck` and fix any remaining errors
    - _Requirements: 6.1_

- [ ] 4. Add TypeScript types to Todo Tasks router
  - [ ] 4.1 Add explicit return types to all functions in `todoTasks.ts`
    - Add return type annotations to all procedures
    - _Requirements: 7.1, 7.2_
  - [ ] 4.2 Add Zod schemas for all inputs
    - Ensure all `.input()` calls have proper Zod schemas
    - _Requirements: 7.3_
  - [ ] 4.3 Type database query results in `todoTasksDb.ts`
    - Add explicit types to all `db.query` results
    - _Requirements: 7.4_
  - [ ] 4.4 Verify zero TypeScript errors
    - Run `pnpm typecheck` and fix any remaining errors
    - _Requirements: 7.1_

- [ ] 5. Standardize error logging in VIP Portal
  - [ ] 5.1 Replace console.error with Pino logger in `vipPortal.ts`
    - Import logger from `../_core/logger`
    - Add structured context to all error logs
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.2 Replace console.error in `vipPortalAdmin.ts`
    - Same pattern as 5.1
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.3 Replace console.error in `vipPortalAuth.ts`
    - Same pattern as 5.1
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.4 Add PII masking utility for sensitive fields
    - Mask email, phone, address in log output
    - _Requirements: 5.4_
  - [ ] 5.5 Write property test for structured logging
    - **Property 9: Structured error logging with required fields and PII masking**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Wave 3: UX Improvements (Parallel - 2 agents, ~6h total)

- [ ] 7. Implement searchable client dropdown (UX-013)
  - [ ] 7.1 Create `client-combobox.tsx` component
    - Use shadcn/ui Combobox pattern
    - Add debounced search (300ms)
    - _Requirements: 2.1, 2.2_
  - [ ] 7.2 Implement client filtering logic
    - Case-insensitive name matching
    - Limit to 10 visible results initially
    - _Requirements: 2.2, 2.3_
  - [ ] 7.3 Add "No clients found" empty state
    - Display message when search returns no results
    - _Requirements: 2.4_
  - [ ] 7.4 Integrate into order creation form
    - Replace existing client dropdown
    - _Requirements: 2.1_
  - [ ] 7.5 Write property tests for search filtering
    - **Property 1: Client search filtering returns matching results**
    - **Property 2: Search result pagination limits visible items**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 8. Add breadcrumb navigation (UX-009)
  - [ ] 8.1 Create breadcrumb configuration map
    - Define route-to-label mappings
    - Define parent relationships
    - _Requirements: 3.1_
  - [ ] 8.2 Create Breadcrumb component
    - Render path based on current route
    - Handle click navigation
    - _Requirements: 3.1, 3.2_
  - [ ] 8.3 Implement path collapsing for deep routes
    - Collapse middle items when > 4 levels
    - Show ellipsis for collapsed items
    - _Requirements: 3.3_
  - [ ] 8.4 Integrate into AppShell layout
    - Add breadcrumb below header
    - _Requirements: 3.1_
  - [ ] 8.5 Write property tests for breadcrumb behavior
    - **Property 3: Breadcrumb path reflects current route**
    - **Property 4: Breadcrumb navigation is functional**
    - **Property 5: Deep breadcrumb paths are collapsed**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Wave 4: Phase 1 Integration (Parallel - 2 agents, ~5h total)

- [ ] 10. Integrate Empty States into dashboard widgets
  - [ ] 10.1 Add EmptyState to revenue widget
    - Import EmptyState component
    - Render when data is empty
    - _Requirements: 8.1, 8.2_
  - [ ] 10.2 Add EmptyState to orders widget
    - Same pattern as 10.1
    - _Requirements: 8.1, 8.2_
  - [ ] 10.3 Add EmptyState to inventory widget
    - Same pattern as 10.1
    - _Requirements: 8.1, 8.2_
  - [ ] 10.4 Add EmptyState to clients widget
    - Same pattern as 10.1
    - _Requirements: 8.1, 8.2_
  - [ ] 10.5 Write property tests for empty state rendering
    - **Property 10: Empty state renders for empty data**
    - **Property 11: Empty state replaced when data loads**
    - **Validates: Requirements 8.1, 8.4**

- [ ] 11. Integrate Skeleton Loaders into list pages
  - [ ] 11.1 Add TableSkeleton to ClientsListPage
    - Import skeleton components
    - Render during loading state
    - _Requirements: 9.1, 9.2_
  - [ ] 11.2 Add TableSkeleton to Invoices page
    - Same pattern as 11.1
    - _Requirements: 9.1, 9.2_
  - [ ] 11.3 Add error state handling
    - Display error component on load failure
    - _Requirements: 9.3_
  - [ ] 11.4 Write property tests for loading states
    - **Property 12: Skeleton loaders during loading state**
    - **Property 13: Skeletons replaced after loading**
    - **Property 14: Error state replaces skeletons on failure**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 12. Add input validation to client creation form
  - [ ] 12.1 Create Zod validation schema for client form
    - Define schema with email, phone, required field rules
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 12.2 Integrate validation with form state
    - Use react-hook-form with Zod resolver
    - Display inline error messages
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 12.3 Implement submit button enable/disable logic
    - Enable only when all validations pass
    - _Requirements: 10.4_
  - [ ] 12.4 Write property tests for form validation
    - **Property 15: Email validation rejects invalid formats**
    - **Property 16: Required field validation**
    - **Property 17: Phone validation rejects invalid formats**
    - **Property 18: Submit enabled when all validations pass**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Parallelization Strategy

---

## Agent A Prompt (Code Quality Focus)

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
SESSION_ID="Session-$(date +%Y%m%d)-AGENT-A-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

#### Development Standards
- **TypeScript**: Explicit return types on all functions, use type guards, handle null/undefined explicitly
- **React**: Use `React.memo` for reusable components, `useCallback` for event handlers, `useMemo` for expensive computations
- **Testing**: Write tests BEFORE implementation (TDD), 80%+ coverage for business logic
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
- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

#### Essential Commands
```bash
pnpm roadmap:validate          # Validate roadmap
pnpm test                      # Run tests
pnpm typecheck                 # Check types
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

### Agent A Tasks
```
Wave 2: Task 3 (Comments types) + Task 5 (VIP logging) → 3h
Wave 3: Task 7 (Searchable dropdown) → 2h
Wave 4: Task 10 (Empty states) → 2h
Total: ~7h
```

### Agent A File Ownership (EXCLUSIVE)
- `server/routers/comments.ts`
- `server/routers/vipPortal.ts`
- `server/routers/vipPortalAdmin.ts`
- `server/routers/vipPortalAuth.ts`
- `client/src/components/ui/client-combobox.tsx` (new)
- `client/src/components/widgets-v2/*.tsx`

**DO NOT TOUCH**: Any files owned by Agent B, C, D, or E.

---

## Agent B Prompt (UX Focus)

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
SESSION_ID="Session-$(date +%Y%m%d)-AGENT-B-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

#### Development Standards
- **TypeScript**: Explicit return types on all functions, use type guards, handle null/undefined explicitly
- **React**: Use `React.memo` for reusable components, `useCallback` for event handlers, `useMemo` for expensive computations
- **Testing**: Write tests BEFORE implementation (TDD), 80%+ coverage for business logic
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
- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions

#### Essential Commands
```bash
pnpm roadmap:validate          # Validate roadmap
pnpm test                      # Run tests
pnpm typecheck                 # Check types
pnpm lint                      # Check linting
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

### Agent B Tasks
```
Wave 1: Task 2 (Chart of Accounts) → 1h
Wave 2: Task 4 (Todo Tasks types) → 1h
Wave 3: Task 8 (Breadcrumbs) → 4h
Wave 4: Task 11 (Skeletons) + Task 12 (Validation) → 5h
Total: ~11h
```

### Agent B File Ownership (EXCLUSIVE)
- `client/src/pages/accounting/ChartOfAccounts.tsx`
- `server/routers/todoTasks.ts`
- `server/todoTasksDb.ts`
- `client/src/components/layout/Breadcrumb.tsx` (new)
- `client/src/pages/ClientsListPage.tsx`
- `client/src/pages/accounting/Invoices.tsx`

**DO NOT TOUCH**: Any files owned by Agent A, C, D, or E.

### Conflict-Free Guarantee

| Agent A Files | Agent B Files |
|--------------|---------------|
| `client/src/App.tsx` | `ChartOfAccounts.tsx` |
| `server/routers/comments.ts` | `server/routers/todoTasks.ts` |
| `server/routers/vipPortal*.ts` | `server/todoTasksDb.ts` |
| `client-combobox.tsx` (new) | `Breadcrumb.tsx` (new) |
| `widgets-v2/*.tsx` | `ClientsListPage.tsx` |
| | `Invoices.tsx` |

**No file overlap between agents.**

---

## Notes

- All tasks reference specific requirements from requirements.md
- All property tests are required for comprehensive coverage
- Checkpoints ensure quality gates between waves
- Tasks can be reordered within waves if needed
- MVP Sprint files are explicitly excluded from all tasks
