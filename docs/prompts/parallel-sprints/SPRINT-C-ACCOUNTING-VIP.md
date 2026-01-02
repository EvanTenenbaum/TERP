# 🟠 Sprint C: Accounting & VIP Portal Modules

---

## Agent Identity & Context

You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

You are assigned to execute **Sprint C** of the TERP ERP parallel sprint plan. This sprint focuses on Accounting and VIP Portal modules. You will work in parallel with two other agents (Sprint B and Sprint D) who are working on different file domains.

---

## Before ANY Work

1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)
6. **Verify Sprint A is complete** - Schema must be stable

---

## Critical Rules (NEVER BREAK)

- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO editing files outside your Sprint C domain** - See File Ownership below
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

---

## Session Registration (MANDATORY)

Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-SPRINT-C-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

---

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

---

## Git Workflow

```bash
git pull origin main                         # Always pull first
git checkout -b sprint-c/accounting-vip      # Your sprint branch
git commit -m "feat(scope): description"     # Conventional commits
git push origin sprint-c/accounting-vip      # Push after each phase
```

---

## Deployment

**Platform**: DigitalOcean App Platform
**URL**: https://terp-app-b9s35.ondigitalocean.app

```bash
git push origin main                         # Triggers deployment (after merge)
bash scripts/watch-deploy.sh                 # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

---

## Pre-Commit Checklist

- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `pnpm roadmap:validate` - If roadmap changed
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions
- [ ] No files modified outside Sprint C domain

---

## Essential Commands

```bash
pnpm roadmap:validate          # Validate roadmap
pnpm roadmap:capacity          # Check capacity
pnpm test                      # Run tests
pnpm typecheck                 # Check types
pnpm lint                      # Check linting
pnpm generate                  # Regenerate types after schema changes
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

## Essential Files

- `docs/roadmaps/MASTER_ROADMAP.md` - Task tracking
- `docs/roadmaps/PARALLEL_SPRINT_PLAN.md` - Sprint coordination
- `docs/roadmaps/ATOMIC_RESOLUTION_ROADMAP_V1_2.md` - Schema sync tasks
- `docs/ACTIVE_SESSIONS.md` - Who's working on what
- `UNIVERSAL_AGENT_RULES.md` - Complete protocols

---

## When Stuck

1. Read `UNIVERSAL_AGENT_RULES.md`
2. Check existing code for patterns
3. Search: `grep -r "pattern" src/`
4. Check related router files for examples
5. Ask user for clarification

---

**Follow these rules precisely. Your work affects other agents and production.**

**#Terp-Dev #Sprint-C**

---
---

## 🚨 SPRINT C SPECIFIC INSTRUCTIONS

### Prerequisites
1. **Sprint A must be complete** - Verify schema is stable before starting
2. **Pull latest code** - `git pull origin main` to get Sprint A changes
3. **Regenerate types** - `pnpm generate` to update TypeScript types
4. **Create your branch** - `git checkout -b sprint-c/accounting-vip`

### File Ownership Rules (STRICTLY ENFORCED)
You have **EXCLUSIVE WRITE ACCESS** to these files only:
```
# Backend Routers
server/routers/accounting.ts
server/routers/vipPortal.ts
server/routers/vipPortalAdmin.ts
server/routers/credit.ts
server/routers/liveShopping.ts
server/routers/quotes.ts
server/routers/returns.ts

# Frontend Pages
client/src/pages/accounting/
client/src/pages/vip-portal/
client/src/pages/ClientProfilePage.tsx

# Frontend Components
client/src/components/accounting/
client/src/components/vip-portal/
client/src/components/clients/
```

**DO NOT MODIFY** any files outside this list. Other agents are working on:
- Sprint B owns: `client/src/components/ui/`, `client/src/components/dashboard/`, `client/src/pages/Orders.tsx`, `client/src/pages/ClientsListPage.tsx`
- Sprint D owns: `server/routers/salesSheets.ts`, `server/routers/inventory.ts`, `client/src/pages/SalesSheetCreatorPage.tsx`

---

## 📋 Sprint Tasks

### Phase 1: Critical Bug Fixes (12h)

#### ATOMIC-2.1: Fix Live Shopping Router (1h)
**Source:** Atomic Resolution Roadmap v1.2

**Problem:** `sessionCartItems` foreign key constraints causing failures

**Deliverables:**
- [ ] Audit `liveShopping.ts` router logic
- [ ] Fix FK constraint issues
- [ ] Add proper error handling

**🔴 REDHAT QA GATE 1.1:**
```
Before marking ATOMIC-2.1 complete:
□ Test Live Shopping session creation
□ Test adding items to cart
□ Test checkout flow
□ Verify no FK constraint errors in logs
□ Test with various product types
```

#### ATOMIC-2.2: Fix Quotes Finalize (1h)
**Source:** Atomic Resolution Roadmap v1.2

**Problem:** `referred_by_client_id` not handled correctly in Finalize Quote action

**Deliverables:**
- [ ] Audit `quotes.ts` router logic
- [ ] Fix `referred_by_client_id` handling
- [ ] Ensure referral credits applied correctly

**🔴 REDHAT QA GATE 1.2:**
```
Before marking ATOMIC-2.2 complete:
□ Test quote creation with referral
□ Test quote finalization
□ Verify referral credit is applied
□ Test quote without referral
□ Check database records are correct
```

#### ATOMIC-2.3: Fix Returns Processing (2h)
**Source:** Atomic Resolution Roadmap v1.2

**Problem:** `returnItems` table relationships causing issues

**Deliverables:**
- [ ] Audit `returns.ts` router logic
- [ ] Verify `returnItems` table relationships
- [ ] Fix any FK or relationship issues

**🔴 REDHAT QA GATE 1.3:**
```
Before marking ATOMIC-2.3 complete:
□ Test creating a return
□ Test adding items to return
□ Test processing return
□ Verify inventory is updated
□ Verify financial records created
```

#### BUG-038: Fix Generate Credit Limit Button (4h)
**Spec:** `docs/prompts/BUG-038.md`

**Problem:** "Generate Credit Limit" button in client profile does nothing

**Deliverables:**
- [ ] Implement credit limit calculation algorithm
- [ ] Connect button to backend endpoint
- [ ] Add loading state during calculation
- [ ] Display suggested credit limit with explanation
- [ ] Allow user to accept/modify/reject suggestion

**🔴 REDHAT QA GATE 1.4:**
```
Before marking BUG-038 complete:
□ Test button click triggers calculation
□ Verify loading state appears
□ Verify suggestion is displayed
□ Test accept action
□ Test modify action
□ Test reject action
□ Verify credit limit is saved correctly
```

#### BUG-039: Fix Client Profile COGS Duplication (4h)
**Spec:** `docs/prompts/BUG-039.md`

**Problem:** Duplicate COGS configuration section; pricing rules table doesn't auto-refresh

**Deliverables:**
- [ ] Remove or consolidate duplicate COGS section
- [ ] Fix pricing rules table auto-refresh after adding rule
- [ ] Add loading state while rule is created
- [ ] Show success toast when rule is added

**🔴 REDHAT QA GATE 1.5 (PHASE 1 COMPLETE):**
```
Before proceeding to Phase 2:
□ All Phase 1 bugs fixed and verified
□ Live Shopping flow works end-to-end
□ Quotes finalization works
□ Returns processing works
□ Credit limit generation works
□ Client profile COGS section clean
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "fix(sprint-c): Phase 1 - Critical Bug Fixes [REDHAT QA PASSED]"
□ Push to sprint-c/accounting-vip branch
```

---

### Phase 2: VIP Portal Enhancements (18h)

#### DEPLOY-012-003: Disable Old Impersonation Button (2h)
**Source:** FEATURE-012 Post-Deployment Tasks

**Problem:** Old impersonation button still visible, should use new audited API

**Deliverables:**
- [ ] Hide or disable old impersonation button
- [ ] Add feature flag check
- [ ] Ensure new impersonation flow is used

**🔴 REDHAT QA GATE 2.1:**
```
Before marking DEPLOY-012-003 complete:
□ Verify old button is hidden/disabled
□ Verify new impersonation flow works
□ Test with feature flag enabled
□ Test with feature flag disabled
```

#### FIX-012-001: Add Feature Flag for Old Impersonation (2h)
**Source:** FEATURE-012 Short-Term Tasks

**Problem:** Need feature flag to control old impersonation path during transition

**Deliverables:**
- [ ] Create `legacy-impersonation` feature flag
- [ ] Gate old impersonation code behind flag
- [ ] Default flag to disabled

**🔴 REDHAT QA GATE 2.2:**
```
Before marking FIX-012-001 complete:
□ Feature flag exists in database
□ Old code only runs when flag enabled
□ New code runs when flag disabled
□ Test both paths
```

#### FIX-012-002: Update VIPPortalSettings to Use New Audited API (2h)
**Source:** FEATURE-012 Short-Term Tasks

**Problem:** VIPPortalSettings still using old non-audited impersonation

**Deliverables:**
- [ ] Update VIPPortalSettings component
- [ ] Use new audited impersonation API
- [ ] Ensure audit logs are created

**🔴 REDHAT QA GATE 2.3:**
```
Before marking FIX-012-002 complete:
□ VIPPortalSettings uses new API
□ Impersonation creates audit log entry
□ Audit log contains correct data
□ Test impersonation flow from settings
```

#### QUAL-006: VIP Portal Supply CRUD & Dashboard Real Metrics (12h)
**Spec:** Referenced in MASTER_ROADMAP.md

**Problem:** VIP Portal supply CRUD has placeholder implementations; dashboard shows fake metrics

**Deliverables:**
- [ ] Implement VIP Portal supply Create operation
- [ ] Implement VIP Portal supply Read operation
- [ ] Implement VIP Portal supply Update operation
- [ ] Implement VIP Portal supply Delete operation
- [ ] Replace dashboard placeholder metrics with real data
- [ ] Connect dashboard widgets to actual queries

**🔴 REDHAT QA GATE 2.4 (PHASE 2 COMPLETE):**
```
Before proceeding to Phase 3:
□ VIP Portal supply CRUD fully functional
□ Can create new supply entries
□ Can view supply list
□ Can edit existing supplies
□ Can delete supplies
□ Dashboard metrics show real data
□ Metrics match database records
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "feat(sprint-c): Phase 2 - VIP Portal Enhancements [REDHAT QA PASSED]"
□ Push to sprint-c/accounting-vip branch
```

---

### Phase 3: Accounting Features (24h)

#### QA-070: Implement Missing Accounting Reports (16h)
**Spec:** Referenced in MASTER_ROADMAP.md

**Problem:** Missing Fiscal Periods page, Trial Balance report, Order Audit Log, Import Bank Transactions

**Deliverables:**
- [ ] Create Fiscal Periods management page
- [ ] Implement Trial Balance report
- [ ] Create Order Audit Log page
- [ ] Add Import Bank Transactions feature

**🔴 REDHAT QA GATE 3.1:**
```
Before marking QA-070 complete:
□ Fiscal Periods page accessible
□ Can create/edit/close fiscal periods
□ Trial Balance report generates correctly
□ Trial Balance balances (debits = credits)
□ Order Audit Log shows all order changes
□ Bank transactions can be imported (CSV)
□ Imported transactions appear in ledger
```

#### QUAL-005: COGS Module & Calendar Financials Integration (8h)
**Spec:** Referenced in MASTER_ROADMAP.md

**Problem:** COGS module has incomplete TODO implementations; Calendar financials not integrated

**Deliverables:**
- [ ] Complete COGS calculation integration
- [ ] Add financial tracking to calendar events
- [ ] Remove or document remaining TODOs
- [ ] Ensure COGS reflects in reports

**🔴 REDHAT QA GATE 3.2 (PHASE 3 COMPLETE):**
```
Before marking sprint complete:
□ COGS calculations work correctly
□ Calendar events show financial impact
□ All TODOs resolved or documented
□ Accounting reports include COGS
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Full manual regression test
□ Commit with message: "feat(sprint-c): Phase 3 - Accounting Features [REDHAT QA PASSED]"
□ Push to sprint-c/accounting-vip branch
```

---

## 🔴 FINAL REDHAT QA GATE (SPRINT COMPLETE)

Before submitting your branch for merge:

### Code Quality
- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm build` - Zero TypeScript errors
- [ ] No `console.log` statements left in code
- [ ] No commented-out code blocks
- [ ] All new endpoints have proper TypeScript types
- [ ] All new endpoints have error handling
- [ ] No `any` types introduced

### Functional Verification
- [ ] Live Shopping works end-to-end
- [ ] Quotes can be created and finalized
- [ ] Returns can be processed
- [ ] Credit limit generation works
- [ ] VIP Portal impersonation uses audited API
- [ ] VIP Portal supply CRUD works
- [ ] All accounting reports functional
- [ ] COGS calculations accurate

### Security Verification
- [ ] All new endpoints have proper authorization
- [ ] Audit logs created for sensitive operations
- [ ] No sensitive data exposed in responses
- [ ] Input validation on all endpoints

### Documentation
- [ ] Update task status in MASTER_ROADMAP.md
- [ ] Document any deviations from spec
- [ ] Note any technical debt created
- [ ] Update API documentation if needed
- [ ] Update session file

### Git Hygiene
- [ ] All commits have descriptive messages (conventional commits)
- [ ] No merge conflicts with main
- [ ] Branch is rebased on latest main

### Final Commit
```bash
git add .
git commit -m "feat(sprint-c): Complete - Accounting & VIP Portal Modules [REDHAT QA PASSED]

Phase 1: Critical Bug Fixes (ATOMIC-2.1-2.3, BUG-038, BUG-039)
Phase 2: VIP Portal Enhancements (DEPLOY-012-003, FIX-012-001/002, QUAL-006)
Phase 3: Accounting Features (QA-070, QUAL-005)

All Redhat QA gates passed.
Ready for integration."

git push origin sprint-c/accounting-vip
```

---

## Completing Work

1. Archive session: `mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`
3. Update `docs/roadmaps/MASTER_ROADMAP.md` - Mark Sprint C tasks as `complete`
4. Run `pnpm roadmap:validate`
5. Commit and push
6. Create Pull Request to main
7. Verify deployment succeeded after merge

---

## 🚫 ROLLBACK PROCEDURES

If you introduce a regression or break existing functionality:

### Level 1: Revert Last Commit
```bash
git revert HEAD
```

### Level 2: Revert to Phase Checkpoint
```bash
git log --oneline  # Find checkpoint commit
git revert <commit_hash>..HEAD
```

### Level 3: Abandon Branch
```bash
git checkout main
git branch -D sprint-c/accounting-vip
git checkout -b sprint-c/accounting-vip  # Start fresh
```

### Database Rollback (If Schema Changed)
```bash
# Only if you modified schema (you shouldn't in Sprint C)
# Contact Sprint A owner for rollback procedure
```

---

## 📞 ESCALATION

If you encounter:
- **File conflicts with other sprints** → STOP and report immediately
- **Schema/type errors after Sprint A** → Run `pnpm generate` and retry
- **Blocking bugs in Sprint A code** → Document and escalate
- **Need to modify files outside your domain** → Request coordination
- **Unclear requirements** → Check spec files first, then escalate

---

## ⏱️ TIME ESTIMATES

| Phase | Tasks | Estimate | Checkpoint |
|-------|-------|----------|------------|
| Phase 1 | ATOMIC-2.1-2.3, BUG-038, BUG-039 | 12h | QA Gate 1.5 |
| Phase 2 | DEPLOY-012-003, FIX-012-001/002, QUAL-006 | 18h | QA Gate 2.4 |
| Phase 3 | QA-070, QUAL-005 | 24h | QA Gate 3.2 |
| **Total** | | **54h** | Final QA Gate |

---

## 🎯 SUCCESS CRITERIA

Sprint C is successful when:
1. All 11 tasks completed and verified
2. All Redhat QA gates passed
3. Zero regressions in existing functionality
4. All accounting calculations accurate
5. VIP Portal fully functional
6. Branch ready for merge (no conflicts)
7. Documentation updated
8. Session properly closed

**DO NOT submit your branch until ALL criteria are met.**

---

## 📊 TESTING CHECKLIST

### Live Shopping Flow
- [ ] Create session
- [ ] Add products to cart
- [ ] Apply discounts
- [ ] Checkout
- [ ] Payment processing
- [ ] Order creation

### Quote Flow
- [ ] Create quote
- [ ] Add line items
- [ ] Apply referral
- [ ] Finalize quote
- [ ] Convert to order

### Returns Flow
- [ ] Create return request
- [ ] Add return items
- [ ] Process return
- [ ] Update inventory
- [ ] Create credit/refund

### VIP Portal Flow
- [ ] Admin impersonation
- [ ] Supply CRUD
- [ ] Dashboard metrics
- [ ] Client view

### Accounting Flow
- [ ] Fiscal period management
- [ ] Trial balance generation
- [ ] Audit log viewing
- [ ] Bank import
- [ ] COGS calculation
