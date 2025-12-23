# Customer Credit System Improvement - Tasks

## Phase 1: Foundation (P0) - 8h estimated ✅ COMPLETE

### Task 1.1: Add Credit Fields to Clients Table
- [x] Add `creditLimit` decimal(15,2) column to `clients` table in `drizzle/schema.ts`
- [x] Add `creditLimitUpdatedAt` timestamp column
- [x] Add `creditLimitSource` enum ('CALCULATED', 'MANUAL') column
- [x] Add `creditLimitOverrideReason` text column (nullable)
- [x] Generate migration with `pnpm db:generate`
- [ ] Test migration locally

### Task 1.2: Create Credit Sync Mechanism
- [x] Add `syncCreditToClient` function in `server/creditEngine.ts`
- [x] Update `saveCreditLimit` to call sync after saving to `client_credit_limits`
- [x] Add `credit.syncToClient` endpoint in `server/routers/credit.ts`
- [ ] Write unit tests for sync mechanism

### Task 1.3: Fix CreditLimitBanner Component
- [x] Update `CreditLimitBanner.tsx` to read `client.creditLimit` (now exists)
- [x] Add fallback to fetch from `client_credit_limits` if `creditLimit` is 0
- [x] Add loading state while fetching credit data
- [x] Test banner displays correct values

### Task 1.4: Add Auto-Recalculation Trigger
- [x] Modify `updateClientStats` in `server/clientsDb.ts` to trigger credit recalc
- [x] Add `recalculateClientCredit` helper function
- [x] Ensure recalc happens after stats update completes
- [ ] Add performance logging (<500ms target)

## Phase 2: New UI Components (P1) - 16h estimated

### Task 2.1: Create CreditStatusCard Component
- [x] Create `client/src/components/credit/CreditStatusCard.tsx`
- [x] Implement collapsed view (available credit, utilization bar, percentage)
- [x] Implement expanded view (full breakdown, signals, explanation)
- [x] Add Collapsible from shadcn/ui for progressive disclosure
- [x] Style with Tailwind, match existing design system
- [x] Add React.memo for performance

### Task 2.2: Create CreditExplanation Component
- [x] Create `client/src/components/credit/CreditExplanation.tsx`
- [x] Display "show your work" calculation breakdown
- [x] Show base capacity formula
- [x] Show risk modifier calculation
- [x] Show each signal's contribution
- [x] Format numbers with proper currency/percentage formatting

### Task 2.3: Create CreditOverrideDialog Component
- [x] Create `client/src/components/credit/CreditOverrideDialog.tsx`
- [x] Add form with new limit input and required reason textarea
- [x] Add validation (reason min 10 chars)
- [x] Show current calculated limit for reference
- [x] Add warning about manual override persistence
- [x] Connect to `credit.manualOverride` endpoint

### Task 2.4: Add Manual Override Endpoint
- [x] Add `credit.manualOverride` mutation in `server/routers/credit.ts`
- [x] Update `clients.creditLimit` directly
- [x] Set `creditLimitSource` to 'MANUAL'
- [x] Store override reason
- [x] Log to `credit_audit_log` with 'MANUAL_OVERRIDE' event type
- [ ] Write integration tests

### Task 2.5: Add Credit Indicator to Client List
- [x] Modify `ClientsListPage.tsx` to add Credit column
- [x] Create `CreditIndicator` sub-component (colored dot + percentage)
- [x] Add color coding: green (<75%), yellow (75-90%), red (>90%)
- [x] Make indicator clickable to open credit details
- [ ] Add column visibility toggle
- [ ] Update mobile responsive view

### Task 2.6: Replace CreditLimitWidget Usage
- [x] Update `ClientProfilePage.tsx` to use new `CreditStatusCard`
- [x] Keep `CreditLimitWidget` for advanced users (settings page)
- [ ] Add feature flag for gradual rollout
- [ ] Test both components work correctly

## Phase 3: Settings & Control (P1) - 8h estimated

### Task 3.1: Create Credit Visibility Settings Table
- [x] Add `creditVisibilitySettings` table to `drizzle/schema.ts`
- [x] Include all visibility toggles per design
- [x] Include enforcement mode enum
- [x] Include threshold percentages
- [x] Generate and apply migration

### Task 3.2: Create Visibility Settings Endpoints
- [x] Add `credit.getVisibilitySettings` query
- [x] Add `credit.updateVisibilitySettings` mutation
- [x] Add permission check for admin-only access
- [x] Return merged settings (global + location override)

### Task 3.3: Create Credit Settings Admin Page
- [ ] Create `client/src/pages/settings/CreditSettingsPage.tsx`
- [ ] Add visibility toggles section
- [ ] Add enforcement mode selector
- [ ] Add threshold configuration
- [ ] Add signal weight adjustment (link to existing)
- [ ] Add save/reset buttons

### Task 3.4: Apply Visibility Settings Throughout App
- [x] Create `useCreditVisibility` hook
- [ ] Wrap credit components with visibility checks
- [ ] Conditionally render based on settings
- [ ] Test all visibility combinations

## Phase 4: Auto-Recalculation & Order Integration (P2) - 8h estimated

### Task 4.1: Add Order Credit Check Endpoint
- [x] Add `credit.checkOrderCredit` mutation
- [x] Return `{ allowed, warning, requiresOverride }`
- [x] Support override reason parameter
- [x] Log overrides to audit trail

### Task 4.2: Integrate Credit Check in Order Creation
- [ ] Modify `OrderCreatorPage.tsx` to call credit check
- [ ] Show warning dialog when credit exceeded
- [ ] Allow proceed with override reason
- [ ] Block if enforcement mode is 'HARD_BLOCK'
- [ ] Update `CreditLimitBanner` to show override option

### Task 4.3: Add Transaction Triggers
- [ ] Add credit recalc trigger to invoice creation flow
- [ ] Add credit recalc trigger to payment recording flow
- [ ] Add credit recalc trigger to order finalization
- [ ] Ensure triggers are async (don't block main flow)

### Task 4.4: Create Daily Batch Job
- [ ] Create `scripts/jobs/recalculate-all-credit.ts`
- [ ] Skip clients with manual overrides
- [ ] Add progress logging
- [ ] Add error handling and retry logic
- [ ] Document cron setup for production

### Task 4.5: Performance Optimization
- [ ] Profile credit calculation performance
- [ ] Add caching for frequently accessed data
- [ ] Optimize database queries
- [ ] Ensure <500ms per client target met
- [ ] Add performance monitoring

## Phase 5: VIP Portal (P3) - 8h estimated (Future)

### Task 5.1: Customer Credit Display
- [ ] Create VIP Portal credit status component
- [ ] Show available credit, utilization
- [ ] Hide internal signals (customer-facing only)

### Task 5.2: Credit History View
- [ ] Show payment history impact on credit
- [ ] Show credit limit changes over time
- [ ] Explain how to improve credit

### Task 5.3: Payment Impact Preview
- [ ] Show how pending payment would affect credit
- [ ] Encourage timely payments

---

## Implementation Order

```
Phase 1 (Foundation) ──────────────────────────────────────────────►
  Task 1.1 → Task 1.2 → Task 1.3 → Task 1.4
  
Phase 2 (UI Components) ───────────────────────────────────────────►
  Task 2.1 ─┬─► Task 2.6
  Task 2.2 ─┤
  Task 2.3 ─┤
  Task 2.4 ─┤
  Task 2.5 ─┘
  
Phase 3 (Settings) ────────────────────────────────────────────────►
  Task 3.1 → Task 3.2 → Task 3.3 → Task 3.4
  
Phase 4 (Integration) ─────────────────────────────────────────────►
  Task 4.1 → Task 4.2 → Task 4.3 → Task 4.4 → Task 4.5
  
Phase 5 (VIP Portal) ──────────────────────────────────────────────►
  Task 5.1 → Task 5.2 → Task 5.3
```

## Dependencies

- Phase 2 depends on Phase 1 completion
- Phase 3 can run in parallel with Phase 2
- Phase 4 depends on Phase 1 and Phase 2
- Phase 5 depends on all previous phases

## Estimated Total: 48h

| Phase | Estimate | Priority |
|-------|----------|----------|
| Phase 1: Foundation | 8h | P0 |
| Phase 2: UI Components | 16h | P1 |
| Phase 3: Settings | 8h | P1 |
| Phase 4: Integration | 8h | P2 |
| Phase 5: VIP Portal | 8h | P3 |
