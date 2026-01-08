# TERP Master Roadmap

## Single Source of Truth for All Development

**Version:** 4.0
**Last Updated:** 2026-01-08
**Status:** Active

> **ROADMAP STRUCTURE (v4.0)**
>
> This roadmap is organized into two milestone sections:
> - **🎯 MVP** - All tasks required to reach Minimum Viable Product
> - **🚀 Beta** - Tasks for the Beta release (reliability, scalability, polish)
>
> Use this structure to understand what work is needed for each milestone.

---

## 🚨 MANDATORY: Gemini API for Code Generation

**ALL AI agents on Manus platform implementing tasks from this roadmap MUST use Google Gemini API for:**

- Code generation and refactoring
- Complex reasoning and analysis
- Bulk operations and batch processing

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
```

**Full instructions:** `docs/GEMINI_API_USAGE.md` | **This is non-negotiable.**

---

## 📋 MANDATORY: Review Specifications Before Implementation

**ALL AI agents implementing tasks from this roadmap MUST review the corresponding specification BEFORE writing any code.**

| Resource          | Location                                                   | Description                                              |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| **Specs Index**   | [`docs/specs/README.md`](../specs/README.md)               | Index of all 24 specifications with status and estimates |
| **Spec Template** | [`docs/specs/SPEC_TEMPLATE.md`](../specs/SPEC_TEMPLATE.md) | Template for creating new specifications                 |

---

# 🎯 MVP MILESTONE

> All tasks in this section must be completed to reach the Minimum Viable Product.
> These are the current open tasks from the existing roadmap.

---

## MVP: Critical Bugs (P0)

| Task | Description | Priority | Status |
|------|-------------|----------|--------|
| BUG-040 | Order Creator: Inventory loading fails | HIGH | 🔴 OPEN |
| BUG-041 | Batch Detail View crashes app | HIGH | 🔴 OPEN |
| BUG-042 | Global Search returns no results | HIGH | 🔴 OPEN |
| BUG-043 | Permission Service empty array SQL crash | HIGH | 🔴 OPEN |
| BUG-044 | VIP Portal empty batch IDs crash | HIGH | 🔴 OPEN |
| BUG-045 | Order Creator: Retry resets entire form | HIGH | 🟡 OPEN |
| BUG-046 | Settings Users tab misleading auth error | HIGH | 🟡 OPEN |
| BUG-047 | Spreadsheet View shows empty grid | HIGH | 🟡 OPEN |
| BUG-070 | Fix Client List Click Handlers Not Working | HIGH | ready |
| BUG-071 | Fix Create Client Form Submission Failure | HIGH | ready |
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | HIGH | ready |
| BUG-073 | Fix Live Shopping Feature Not Accessible | HIGH | ready |
| BUG-074 | Fix Spreadsheet View Empty Grid | HIGH | ready |
| BUG-075 | Fix Settings Users Tab Authentication Error | HIGH | ready |
| BUG-076 | Fix Search and Filter Functionality | HIGH | ready |
| BUG-077 | Fix Notification System Not Working | HIGH | ready |

---

## MVP: Security Tasks

### SEC-005: Protect Location Router Mutations

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/locations.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-005.md`

**Problem:**
Location router mutations lack proper permission protection.

**Objectives:**

1. Add permission middleware to all location mutations
2. Implement proper authorization checks
3. Add audit logging for location changes

**Deliverables:**

- [ ] Permission middleware added to location router
- [ ] Authorization checks implemented
- [ ] Audit logging for mutations
- [ ] Tests for permission enforcement
- [ ] Documentation updated

---

### SEC-006: Protect Warehouse Transfer Mutations

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/warehouse.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-006.md`

**Problem:**
Warehouse transfer mutations lack proper permission protection.

**Objectives:**

1. Add permission middleware to warehouse transfer mutations
2. Implement proper authorization checks
3. Add audit logging for transfers

**Deliverables:**

- [ ] Permission middleware added
- [ ] Authorization checks implemented
- [ ] Audit logging for transfers
- [ ] Tests for permission enforcement
- [ ] Documentation updated

---

### SEC-007: Protect Order Enhancement Mutations (11 Endpoints)

**Status:** ready
**Priority:** HIGH
**Estimate:** 8-16h
**Module:** `server/routers/orders.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-007.md`

**Problem:**
Order enhancement mutations lack proper permission protection across 11 endpoints.

**Objectives:**

1. Audit all 11 order enhancement endpoints
2. Add permission middleware to each endpoint
3. Implement proper authorization checks

**Deliverables:**

- [ ] All 11 endpoints audited
- [ ] Permission middleware added
- [ ] Authorization checks implemented
- [ ] Tests for each endpoint
- [ ] Documentation updated

---

### SEC-008: Protect Settings Router Mutations

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/settings.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-008.md`

**Problem:**
Settings router mutations lack proper permission protection.

**Objectives:**

1. Add permission middleware to settings mutations
2. Implement proper authorization checks
3. Add audit logging

**Deliverables:**

- [ ] Permission middleware added
- [ ] Authorization checks implemented
- [ ] Audit logging added
- [ ] Tests for permission enforcement
- [ ] Documentation updated

---

### SEC-009: Protect VIP Portal Needs Data Exposure

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/vipPortal.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-009.md`

**Problem:**
VIP Portal exposes sensitive data without proper protection.

**Objectives:**

1. Audit VIP Portal data exposure
2. Add proper data filtering
3. Implement authorization checks

**Deliverables:**

- [ ] Data exposure audited
- [ ] Data filtering implemented
- [ ] Authorization checks added
- [ ] Tests for data protection
- [ ] Documentation updated

---

### SEC-010: Protect Returns and Refunds Query Endpoints

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/returns.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-010.md`

**Problem:**
Returns and refunds query endpoints lack proper protection.

**Objectives:**

1. Add permission middleware to query endpoints
2. Implement proper authorization checks
3. Add audit logging

**Deliverables:**

- [ ] Permission middleware added
- [ ] Authorization checks implemented
- [ ] Audit logging added
- [ ] Tests for permission enforcement
- [ ] Documentation updated

---

### SEC-011: Reduce VIP Portal Session Duration

**Status:** ready
**Priority:** HIGH
**Estimate:** 2-4h
**Module:** `server/routers/vipPortal.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-011.md`

**Problem:**
VIP Portal session duration is too long, creating security risk.

**Objectives:**

1. Reduce session duration to appropriate length
2. Implement session refresh mechanism
3. Add session timeout warnings

**Deliverables:**

- [ ] Session duration reduced
- [ ] Refresh mechanism implemented
- [ ] Timeout warnings added
- [ ] Tests for session management
- [ ] Documentation updated

---

### SEC-012: Secure Admin Setup Endpoint

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `server/routers/admin.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/SEC-012.md`

**Problem:**
Admin setup endpoint needs additional security measures.

**Objectives:**

1. Add rate limiting to admin setup
2. Implement additional authentication checks
3. Add audit logging

**Deliverables:**

- [ ] Rate limiting added
- [ ] Authentication checks implemented
- [ ] Audit logging added
- [ ] Tests for security measures
- [ ] Documentation updated

---

## MVP: Stability Tasks

### ST-025: Add Error Boundaries to Critical Pages

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `client/src/pages/`
**Dependencies:** None
**Prompt:** `docs/prompts/ST-025.md`

**Problem:**
Critical pages lack error boundaries, causing full app crashes on errors.

**Objectives:**

1. Identify all critical pages
2. Add error boundaries with graceful fallbacks
3. Implement error reporting

**Deliverables:**

- [ ] Critical pages identified
- [ ] Error boundaries added
- [ ] Graceful fallbacks implemented
- [ ] Error reporting integrated
- [ ] Documentation updated

---

### ST-026: Implement Concurrent Edit Detection

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/`, `client/`
**Dependencies:** None
**Prompt:** `docs/prompts/ST-026.md`

**Problem:**
No detection for concurrent edits, leading to data overwrites.

**Objectives:**

1. Implement optimistic locking
2. Add conflict detection UI
3. Provide resolution options

**Deliverables:**

- [ ] Optimistic locking implemented
- [ ] Conflict detection UI added
- [ ] Resolution options provided
- [ ] Tests for concurrent scenarios
- [ ] Documentation updated

---

### ST-045: Complete User Flow Mapping and Documentation

**Status:** ready
**Priority:** HIGH
**Estimate:** 2-4d
**Module:** `docs/`, `server/`, `client/`
**Dependencies:** None
**Prompt:** `docs/prompts/ST-045.md`

**Problem:**
The ERP system lacks a complete, exhaustive map of all user flows including variants and edge cases.

**Objectives:**

1. Create a complete User Flow Matrix covering all entities and flow variants
2. Document all RBAC permission mismatches between code and database
3. Identify all dead/legacy flows and unreachable code paths
4. Create structured Flow Guide organized by Domain → Entity → Role → Task
5. Validate all state transitions against both code enums and database values

**Deliverables:**

- [ ] Phase 0: Domain, Entity, Role, and Key Workflows lists
- [ ] Phase 1: Flow archetype enumeration for all entities
- [ ] Phase 2: Variants and edge case expansion
- [ ] Phase 3: Consistency and dead flow analysis report
- [ ] Phase 4: User Flow Matrix (Markdown + CSV)
- [ ] Phase 5: Flow Guide (Markdown)
- [ ] Updated reference files in `docs/assets/ST-045/`
- [ ] RBAC mismatches summary document
- [ ] Final documentation

---

## MVP: UX Tasks

### UX-001: Implement Form Dirty State Protection

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/forms/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-001.md`

**Problem:**
Users can navigate away from forms with unsaved changes without warning.

**Objectives:**

1. Implement dirty state tracking
2. Add navigation guards
3. Show confirmation dialogs

**Deliverables:**

- [ ] Dirty state tracking implemented
- [ ] Navigation guards added
- [ ] Confirmation dialogs shown
- [ ] Tests for dirty state scenarios
- [ ] Documentation updated

---

### UX-003: Fix Mobile Kanban Overflow

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** `client/src/components/kanban/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-003.md`

**Problem:**
Kanban board overflows on mobile devices.

**Objectives:**

1. Fix horizontal overflow
2. Implement responsive design
3. Add touch-friendly interactions

**Deliverables:**

- [ ] Overflow fixed
- [ ] Responsive design implemented
- [ ] Touch interactions added
- [ ] Mobile testing completed
- [ ] Documentation updated

---

### UX-006: Add Error Recovery UI with Retry

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `client/src/components/`
**Dependencies:** None
**Prompt:** `docs/prompts/UX-006.md`

**Problem:**
Error states don't provide recovery options.

**Objectives:**

1. Add retry buttons to error states
2. Implement automatic retry logic
3. Show helpful error messages

**Deliverables:**

- [ ] Retry buttons added
- [ ] Automatic retry implemented
- [ ] Error messages improved
- [ ] Tests for error recovery
- [ ] Documentation updated

---

## MVP: Feature Tasks

### FEAT-001: Client Form Field Updates

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4-8h
**Module:** `client/src/components/clients/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-001.md`

**Problem:**
Client form fields need updates based on user feedback.

**Objectives:**

1. Update client form fields
2. Add validation rules
3. Improve UX

**Deliverables:**

- [ ] Form fields updated
- [ ] Validation rules added
- [ ] UX improvements made
- [ ] Tests updated
- [ ] Documentation updated

---

### FEAT-002: Tag System Revamp for Clients and Products

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 16h
**Module:** `client/src/`, `server/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-002.md`

**Problem:**
Tag system needs revamp for better organization.

**Objectives:**

1. Redesign tag system
2. Add tag categories
3. Improve tag management UI

**Deliverables:**

- [ ] Tag system redesigned
- [ ] Categories added
- [ ] Management UI improved
- [ ] Migration script created
- [ ] Documentation updated

---

### FEAT-003: Order Creator Quick Add Quantity Field

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** `client/src/pages/OrderCreatorPage.tsx`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-003.md`

**Problem:**
Order creator lacks quick add quantity field.

**Objectives:**

1. Add quick quantity input
2. Implement keyboard shortcuts
3. Add validation

**Deliverables:**

- [ ] Quick quantity input added
- [ ] Keyboard shortcuts implemented
- [ ] Validation added
- [ ] Tests added
- [ ] Documentation updated

---

### FEAT-007: Add Payment Recording Against Invoices

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `client/src/`, `server/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-007.md`

**Problem:**
Cannot record payments against specific invoices.

**Objectives:**

1. Add payment recording UI
2. Implement payment allocation
3. Update invoice balances

**Deliverables:**

- [ ] Payment recording UI added
- [ ] Allocation logic implemented
- [ ] Balance updates working
- [ ] Tests added
- [ ] Documentation updated

---

### FEAT-011: COGS Logic and Sales Flow Integration

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/`, `client/src/`
**Dependencies:** None
**Prompt:** `docs/prompts/FEAT-011.md`

**Problem:**
COGS logic not integrated with sales flow.

**Objectives:**

1. Implement COGS calculation
2. Integrate with sales flow
3. Add reporting

**Deliverables:**

- [ ] COGS calculation implemented
- [ ] Sales flow integration complete
- [ ] Reporting added
- [ ] Tests added
- [ ] Documentation updated

---

## MVP: Infrastructure Tasks

### REL-002: Implement Automated Database Backups

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `scripts/`, deployment
**Dependencies:** None
**Prompt:** `docs/prompts/REL-002.md`

**Problem:**
No automated database backup system.

**Objectives:**

1. Implement automated backups
2. Set up retention policy
3. Add backup verification

**Deliverables:**

- [ ] Automated backups implemented
- [ ] Retention policy configured
- [ ] Verification added
- [ ] Monitoring set up
- [ ] Documentation updated

---

## MVP: Quality Tasks

### QUAL-007: Final TODO Audit & Documentation

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 8h
**Module:** `docs/`, all code
**Dependencies:** None
**Prompt:** `docs/prompts/QUAL-007.md`

**Problem:**
TODOs scattered throughout codebase need audit.

**Objectives:**

1. Audit all TODOs
2. Create tracking document
3. Prioritize and assign

**Deliverables:**

- [ ] All TODOs audited
- [ ] Tracking document created
- [ ] Priorities assigned
- [ ] Critical TODOs addressed
- [ ] Documentation updated

---

### QUAL-004: Review Referential Integrity (CASCADE Deletes)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `drizzle/`, `server/`
**Dependencies:** None
**Prompt:** `docs/prompts/QUAL-004.md`

**Problem:**
CASCADE deletes may cause unintended data loss.

**Objectives:**

1. Audit all CASCADE deletes
2. Implement soft deletes where needed
3. Add safeguards

**Deliverables:**

- [ ] CASCADE deletes audited
- [ ] Soft deletes implemented
- [ ] Safeguards added
- [ ] Tests added
- [ ] Documentation updated

---

# 🚀 BETA MILESTONE

> All tasks in this section are for the Beta release.
> Focus: Reliability, scalability, and polish for production readiness.

---

## 🛡️ Reliability Program (99.99): Inventory + Money + Ledger + AR/AP (Jan 2026)

**Goal:** Make "can't be wrong" business data (inventory quantities, money amounts, AR/AP balances, ledger postings) durable, reconstructable, and safe under retries + concurrency.

**Critical Code Anchors (already in repo):**
- Transactions + retries: `server/_core/dbTransaction.ts`
- Locking: `server/_core/dbLocking.ts`
- Optimistic locking helpers: `server/_core/optimisticLocking.ts`
- Inventory truth + movements: `server/inventoryDb.ts`, `server/inventoryMovementsDb.ts`, `server/inventoryUtils.ts`
- Accounting + ledger logic: `server/accountingDb.ts`, `server/services/orderAccountingService.ts`, `server/_core/fiscalPeriod.ts`
- RBAC: `server/_core/permissionMiddleware.ts`, `server/_core/permissionService.ts`, `server/services/rbacDefinitions.ts`, `server/services/seedRBAC.ts`
- Observability: `server/_core/logger.ts`, `server/_core/monitoring.ts`, `sentry.*.config.ts`

### Program Definition of Done (Non-Negotiable)
- Every "critical mutation" is **transactional**, **retry-safe**, and **idempotent** (replay-safe).
- Inventory and money systems are **reconstructable from immutable journals** (movements / ledger entries).
- Continuous reconciliation exists (report + optional controlled fix) with alerts.
- CI gates prevent merges that break invariants.

---

### REL-001: Define Truth Model + Invariants for Inventory and Money

**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Module:** `docs/reliability/`, `drizzle/`, `server/`
**Dependencies:** None
**Prompt:** `docs/prompts/REL-001.md`

**Problem:** "Truth sources" and invariants are implicit in code; drift and partial implementations are hard to detect and prevent.

**Objectives:**

1. Explicitly define canonical sources of truth (journals vs projections) for inventory and money.
2. Define invariant queries that detect drift and impossible states.
3. Create a shared reference that all future critical flows must follow.

**Deliverables:**

- [ ] Add `docs/reliability/TRUTH_MODEL.md` (inventory + money canonical models)
- [ ] Add `docs/reliability/INVARIANTS.md` with SQL/drizzle query definitions
- [ ] Add an "Invariants checklist" section to `docs/protocols/INITIATIVE_TO_ROADMAP_WORKFLOW.md`
- [ ] Add reference comments in `server/inventoryMovementsDb.ts` and `server/accountingDb.ts` pointing to TRUTH_MODEL
- [ ] Add a `scripts/reliability/README.md` scaffold for reconciliation tooling

---

### REL-002: Migrate Inventory Quantities to DECIMAL (Dual-Write + Backfill + Cutover)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `drizzle/`, `server/inventory*.ts`
**Dependencies:** REL-001
**Prompt:** `docs/prompts/REL-002.md`

**Problem:** Inventory quantities include string-backed fields (e.g., migrations show `batches.onHandQty` as `varchar(20)`), increasing drift/parse/rounding risk and making constraints harder.

**Objectives:**

1. Identify all quantity-like fields stored as strings and migrate them safely to DECIMAL.
2. Implement dual-write, backfill, and safe read cutover (feature-flagged).
3. Add DB constraints to prevent negative and invalid quantities where applicable.

**Deliverables:**

- [ ] Schema audit doc added under `docs/reliability/`
- [ ] New DECIMAL columns added + migrations committed
- [ ] Dual-write implemented in all inventory write paths
- [ ] Backfill script added + verified on seeded dataset
- [ ] Cutover flag and mismatch logging (old vs new) implemented

---

### REL-003: Migrate Money Amounts to DECIMAL (Dual-Write + Backfill + Cutover)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `drizzle/`, `server/accountingDb.ts`, `server/services/orderAccountingService.ts`
**Dependencies:** REL-001
**Prompt:** `docs/prompts/REL-003.md`

**Problem:** Money fields stored as strings (and mixed representations across operational tables vs ledger) can cause rounding drift, incorrect AR/AP, and hard-to-debug discrepancies.

**Objectives:**

1. Identify all money fields stored as strings and migrate safely to DECIMAL.
2. Define canonical money truth (ledger vs operational balances) and enforce it in code.
3. Add invariant checks ensuring AR/AP and ledger remain consistent.

**Deliverables:**

- [ ] Money schema audit added under `docs/reliability/`
- [ ] DECIMAL columns added + migrations committed
- [ ] Dual-write implemented for all money mutations
- [ ] Backfill + reconciliation report confirms parity
- [ ] Cutover flag + mismatch alerting implemented

---

### REL-004: Critical Mutation Wrapper (Transactional + Retry + Standardized Errors)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/_core/`, `server/inventory*.ts`, `server/accounting*.ts`
**Dependencies:** REL-001
**Prompt:** `docs/prompts/REL-004.md`

**Problem:** Critical multi-table writes risk partial completion, inconsistent error handling, and non-uniform retry safety.

**Objectives:**

1. Create a single "critical mutation" wrapper built on `withRetryableTransaction`.
2. Standardize error shaping for business-rule failures vs transient DB failures.
3. Ensure all P0 inventory/money mutations route through this wrapper.

**Deliverables:**

- [ ] Add `server/_core/criticalMutation.ts`
- [ ] Refactor inventory movement writes to use wrapper
- [ ] Refactor ledger posting / invoice/payment flows to use wrapper
- [ ] Add structured logs with mutationId + correlationId
- [ ] Add integration tests asserting atomicity (no partial write)

---

### REL-005: Idempotency Keys for Critical Mutations (Replay-Safe Money + Inventory)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `drizzle/`, `server/_core/`, `server/routers/`
**Dependencies:** REL-004
**Prompt:** `docs/prompts/REL-005.md`

**Problem:** Retries/timeouts can cause double-apply (double payment, double adjustment, double fulfillment) without a universal idempotency layer.

**Objectives:**

1. Add a DB-backed idempotency key store.
2. Add middleware/helper to enforce idempotency for critical procedures.
3. Require idempotency keys for high-risk money and inventory mutations.

**Deliverables:**

- [ ] New `idempotency_keys` table + migration
- [ ] Middleware/helper for tRPC procedures (or service-level helper)
- [ ] Applied to: record payment, apply credit, receive inventory, fulfill/ship, generate invoice, reverse/void
- [ ] Integration test proving repeated calls do not double-apply
- [ ] Docs: `docs/reliability/IDEMPOTENCY.md`

---

### REL-006: Inventory Concurrency Hardening (Row Locks + Optimistic Locking Enforcement)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/_core/`, `server/inventoryDb.ts`, `server/inventoryMovementsDb.ts`
**Dependencies:** REL-004
**Prompt:** `docs/prompts/REL-006.md`

**Problem:** Concurrent inventory writes can cause negative on-hand, lost updates, or mismatched movements vs projections if not locked/checked consistently.

**Objectives:**

1. Ensure row-level locks are taken on the correct batch/location projection rows before mutation.
2. Enforce optimistic locking where `version` exists (or add where missing for key inventory entities).
3. Add concurrency tests that simulate parallel receive/fulfill/adjust.

**Deliverables:**

- [ ] Locking added/verified in inventory adjustment + fulfillment + intake paths
- [ ] Optimistic lock checks added where missing
- [ ] Concurrency integration test suite added
- [ ] Invariant: sum(movements) equals projection after concurrent operations
- [ ] Clear conflict errors (`CONFLICT`) surfaced for stale updates

---

### REL-007: Inventory Movements Immutability + Reversal-Only Corrections

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/inventoryMovementsDb.ts`, `drizzle/`
**Dependencies:** REL-004
**Prompt:** `docs/prompts/REL-007.md`

**Problem:** If movements can be edited/deleted in-place, auditability breaks and reconstruction becomes unreliable.

**Objectives:**

1. Make inventory movements append-only.
2. Implement reversal flow (reversal movement references original).
3. Ensure projections are derived and corrected by movements, not silent overwrites.

**Deliverables:**

- [ ] Schema supports `reversalOfMovementId` (or equivalent linkage) + indexes
- [ ] Reverse movement function implemented + tested
- [ ] Block/guard any update/delete of posted movements (except strict admin audited soft-delete)
- [ ] Reconciliation query proves reconstructability
- [ ] Docs: `docs/reliability/INVENTORY_JOURNAL.md`

---

### REL-008: Ledger Immutability + Reversal + Fiscal Period Lock Enforcement

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/accountingDb.ts`, `server/_core/fiscalPeriod.ts`, `drizzle/`
**Dependencies:** REL-004, REL-001
**Prompt:** `docs/prompts/REL-008.md`

**Problem:** Ledger mutations without immutability, balance enforcement, and period locks lead to un-auditable financial statements and incorrect history.

**Objectives:**

1. Ensure posted ledger entries/journals are immutable.
2. Implement reversal-only corrections (no in-place edits) for posted entries.
3. Enforce fiscal period locks in all posting paths.

**Deliverables:**

- [ ] Balance enforcement (debits == credits) validated on write
- [ ] Reversal entry flow implemented + tested
- [ ] Period lock blocks postings into locked periods
- [ ] Audit events for posting/reversal include actor + reason
- [ ] Docs: `docs/reliability/LEDGER_JOURNAL.md`

---

### REL-009: Reconciliation Framework (Report Mode + Controlled Fix Hooks)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/_core/`, `scripts/`, `docs/reliability/`
**Dependencies:** REL-001
**Prompt:** `docs/prompts/REL-009.md`

**Problem:** No unified reconciliation engine for detecting drift across inventory/money/ledger; issues surface only via user reports.

**Objectives:**

1. Implement a common reconciliation runner with modules (inventory, AR/AP, ledger, RBAC).
2. Provide CLI report output (JSON) suitable for CI and scheduled jobs.
3. Provide a *controlled* fix mode for limited, auditable repairs.

**Deliverables:**

- [ ] Add `server/_core/reconciliationService.ts`
- [ ] Add `scripts/reconcile.ts --mode=report|fix --scope=inventory|ar|ap|ledger|rbac`
- [ ] Integrate with logging + Sentry breadcrumbs
- [ ] Add docs + runbook for interpreting reports
- [ ] Tests for report generation

---

### REL-010: Inventory Reconciliation Pack (Drift + Impossible State Detection + Fix via Adjustment Movements)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/_core/reconciliationService.ts`, `server/inventory*.ts`
**Dependencies:** REL-009, REL-007
**Prompt:** `docs/prompts/REL-010.md`

**Problem:** Inventory drift and impossible states (negative on-hand, orphan movements, inconsistent reserved vs onhand) can silently corrupt availability and fulfillment.

**Objectives:**

1. Detect inventory drift between movements and projections.
2. Detect impossible states and orphan references.
3. Implement fix mode that ONLY creates explicit adjustment movements (no silent edits).

**Deliverables:**

- [ ] Inventory reconciliation module added
- [ ] Report includes causality pointers (which batch/location/movement)
- [ ] Fix mode generates explicit adjustment movements (audited)
- [ ] Safety rails: fix requires `--confirm` and logs every change
- [ ] Tests cover drift detection and safe repair behavior

---

### REL-011: AR/AP Reconciliation Pack (Invoice/Payment/Credit Integrity)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/_core/reconciliationService.ts`, `server/accountingDb.ts`, `server/routers/`
**Dependencies:** REL-009, REL-005
**Prompt:** `docs/prompts/REL-011.md`

**Problem:** Misapplied payments/credits and mismatched invoice balances cause incorrect "amount due" and break collections + cash forecasting.

**Objectives:**

1. Detect mismatches between invoice totals and applied payments/credits.
2. Detect unallocated or over-allocated payments/credits.
3. Provide repair guidance and limited safe repairs (where provable).

**Deliverables:**

- [ ] AR/AP reconciliation module added
- [ ] Invariants: amountDue matches computed balance
- [ ] Idempotency replay checks for payment application paths
- [ ] Report lists specific broken references and how to fix
- [ ] Integration tests for partial payments + overpayment + credit memo scenarios

---

### REL-012: Ledger Reconciliation Pack (Balance, Duplicates, Orphans, Locked Period Violations)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/_core/reconciliationService.ts`, `server/accountingDb.ts`
**Dependencies:** REL-009, REL-008
**Prompt:** `docs/prompts/REL-012.md`

**Problem:** A single unbalanced or duplicate journal can corrupt financial reporting, and violations may not be visible in UI.

**Objectives:**

1. Detect unbalanced journals and duplicate postings.
2. Detect ledger entries referencing missing operational records (orphans).
3. Detect postings into locked periods.

**Deliverables:**

- [ ] Ledger reconciliation module added
- [ ] Unbalanced/double-post/orphan checks implemented
- [ ] Report includes remediation steps (reversal vs re-post)
- [ ] Fix mode: limited to safe reversals with strict guardrails
- [ ] Tests covering each violation class

---

### REL-013: RBAC Drift Detector (Code vs DB Permissions + Audit Trail)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/services/`, `server/_core/`, `scripts/`
**Dependencies:** REL-009
**Prompt:** `docs/prompts/REL-013.md`

**Problem:** Permission strings used in guards can drift from seeded/DB permissions, leading to unauthorized access or broken functionality.

**Objectives:**

1. Extract permission strings referenced in code guards/middleware.
2. Compare against seeded RBAC definitions and DB permissions.
3. Emit reconciliation report and optionally generate safe migration suggestions.

**Deliverables:**

- [ ] Script to extract `requirePermission(...)` usages
- [ ] Compare output vs `server/services/rbacDefinitions.ts` and DB
- [ ] Reconciliation scope `rbac` added to `scripts/reconcile.ts`
- [ ] Audit log for permission changes retained and queryable
- [ ] Tests for extraction + mismatch detection

---

### REL-014: Critical Correctness Test Harness (Seed + Invariant Suite + Concurrency Scenarios)

**Status:** ready
**Priority:** HIGH
**Estimate:** 2d
**Module:** `server/*integration.test.ts`, `scripts/`, `drizzle/`
**Dependencies:** REL-001, REL-004, REL-009
**Prompt:** `docs/prompts/REL-014.md`

**Problem:** We do not currently have a single "accounting-grade" suite that proves invariants after sequences of real mutations and under concurrency.

**Objectives:**

1. Define deterministic seed fixtures for inventory + accounting scenarios.
2. Execute critical flows step-by-step and assert invariants after each step.
3. Add concurrency simulations that validate locking/idempotency.

**Deliverables:**

- [ ] Deterministic seed fixture(s) for reliability tests
- [ ] "critical correctness suite" test command documented
- [ ] Property-style/randomized edge-case generation for amounts/qty within constraints
- [ ] Concurrency test scenarios added
- [ ] CI job runs the suite for PRs touching critical domains

---

### REL-015: Observability for Critical Mutations (Correlation IDs + Structured Logging + Sentry Tagging)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** `server/_core/logger.ts`, `server/_core/requestLogger.ts`, `server/_core/monitoring.ts`
**Dependencies:** REL-004
**Prompt:** `docs/prompts/REL-015.md`

**Problem:** When drift or failure occurs, root-cause is slow without consistent correlation IDs and structured mutation logs.

**Objectives:**

1. Implement correlation ID propagation request → service → DB write.
2. Log structured mutation events (actor, permission, entity, idempotencyKey, before/after summary).
3. Add Sentry breadcrumbs/tags for critical mutation events.

**Deliverables:**

- [ ] correlationId/mutationId added to request context
- [ ] Structured log schema documented and enforced
- [ ] Critical mutations emit standardized log events
- [ ] Sentry tags set for inventory/money critical events
- [ ] Troubleshooting runbook added under `docs/reliability/`

---

### REL-016: Backup/Restore Reliability Runbook + Automated Restore Validation (Staging)

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 2d
**Module:** `docs/`, `scripts/`, deployment docs
**Dependencies:** REL-009
**Prompt:** `docs/prompts/REL-016.md`

**Problem:** 99.99 reliability requires proven recovery. Backups without restore drills are an unknown risk.

**Objectives:**

1. Document backup policy, retention, and restore procedures (RPO/RTO targets).
2. Implement an automated staging restore validation workflow.
3. Validate post-restore invariants using reconciliation report mode.

**Deliverables:**

- [ ] `docs/reliability/DR_RUNBOOK.md` (backup/restore procedures)
- [ ] Automated staging restore validation script/workflow
- [ ] Post-restore reconciliation must pass (or produce actionable report)
- [ ] Record of drill results and timestamps
- [ ] Backout/rollback checklist included

---

### REL-017: CI/PR Gates for Critical Domains (Block Merge on Invariant Failures)

**Status:** ready
**Priority:** HIGH
**Estimate:** 16h
**Module:** CI config, `scripts/`, `server/`
**Dependencies:** REL-009, REL-014
**Prompt:** `docs/prompts/REL-017.md`

**Problem:** Without automated merge gates, regressions in money/inventory logic can ship.

**Objectives:**

1. Detect when a PR touches critical files and enforce the reliability suite.
2. Run reconciliation report mode in CI and fail on critical violations.
3. Require migrations + tests for schema-affecting changes.

**Deliverables:**

- [ ] CI rule detects changes under critical paths (inventory/accounting/ledger/schema)
- [ ] Runs critical correctness suite and reconciliation report
- [ ] Fails build on invariant violations
- [ ] PR checklist updated to reflect reliability gates
- [ ] Docs: `docs/reliability/CI_GATES.md`

---

## Beta: Additional Tasks

> Additional tasks for Beta milestone will be added here as they are identified.
> These may include performance optimizations, additional features, and polish items.

---

## 📊 Milestone Summary

| Milestone | Total Tasks | Status |
|-----------|-------------|--------|
| MVP | ~50+ tasks | In Progress |
| Beta | 17 tasks (Reliability Program) | Ready |

---

## 📞 Questions?

Contact the project maintainer or open an issue in the repository.
