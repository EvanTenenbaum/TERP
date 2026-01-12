# TERP Prioritized Strategic Roadmap

## Frontend-First Execution with Parallel Agent QA

**Version:** 1.0
**Created:** 2026-01-12
**Status:** ACTIVE - Supersedes all other roadmaps
**Methodology:** Frontend-focused with required infrastructure, designed for parallel agent execution

---

# PART 1: SYSTEMIC ISSUES IDENTIFIED

## Critical Gaps Found in Current Roadmap System

### GAP-001: Missing Specifications for Wave 1 Critical Items

| MEET Item | Description | Impact | Status |
|-----------|-------------|--------|--------|
| MEET-001 to MEET-004 | Cash Audit System | **CRITICAL** - Weekly audit failures | NO SPEC EXISTS |
| MEET-064 to MEET-066 | Intake Verification | **CRITICAL** - "Off by 12 pounds" | NO SPEC EXISTS |
| MEET-010 | Simple Client Ledger | HIGH - Foundation for payment tracking | NO SPEC EXISTS |

**Resolution Required:** Create FEAT-007-CASH-AUDIT-SPEC.md, FEAT-008-INTAKE-VERIFICATION-SPEC.md before Wave 1 execution.

### GAP-002: Duplicate Bug Tracking

| Duplicate Bugs | Root Cause | Single Fix |
|----------------|------------|------------|
| BUG-084, BUG-086 | `pricing_defaults` table empty | Seed pricing defaults |
| BUG-078, BUG-088 | `orders.getAll` query failure | Fix orders database query |
| BUG-047, BUG-074, BUG-091 | Spreadsheet grid rendering | Fix grid data pipeline |
| BUG-045, BUG-046 | Order Creator form issues | Fix form state management |

**Resolution:** Consolidate to single bug IDs, fix root cause once.

### GAP-003: API Registration Blocking Features

The following API registration issues (API-001 to API-010) are marked "ready" but BLOCK frontend features:

| API Issue | Blocks | Impact |
|-----------|--------|--------|
| API-010 (accounting.*) | MEET-001-004 Cash Audit, BUG-092 AR/AP | **CRITICAL** |
| API-001-009 (various) | Multiple MEET items | HIGH |

**Resolution:** Elevate API registration to P0 priority.

### GAP-004: No QA Gates Between Phases

Current roadmap has no validation checkpoints. Agents implement features without verification before moving to next phase.

**Resolution:** Add mandatory QA gates after each phase (see Part 3).

### GAP-005: Completed Work Still Buggy

Cooper Rd Sprint marked "COMPLETE" but QA testing reveals:
- Live Shopping: BUG-094 (session creation fails)
- Order finalization: BUG-086, BUG-093
- Inventory loading: BUG-040

**Resolution:** Add regression testing gate before marking work complete.

### GAP-006: Missing Backend → Frontend Dependency Matrix

New specs (FEAT-001 to FEAT-006) are backend APIs that must complete BEFORE frontend (ENH-001 to ENH-008), but this dependency isn't tracked in execution plans.

**Resolution:** See explicit dependency matrix in Part 2.

### GAP-007: RBAC Issues Block Testing

Three RBAC issues prevent Sales Manager role testing:
- BLOCKED-001: samples:read
- BLOCKED-002: permission 10002 (Pick & Pack)
- BLOCKED-003: accounting:reports:view

**Resolution:** Fix RBAC before any QA validation phase.

---

# PART 2: PRIORITIZED TASK EXECUTION ORDER

## Execution Principles

1. **Fix Bugs Before Features** - Existing bugs block new work
2. **Backend Before Frontend** - APIs must exist before UI integration
3. **Infrastructure Before Application** - Database/RBAC before business logic
4. **Parallel Where Possible** - Independent tasks run concurrently
5. **QA Gates Are Mandatory** - No phase advancement without validation

---

## SPRINT 0: FOUNDATION (Must Complete First)

> **Goal:** Fix all blockers preventing any other work
> **Duration:** 1-2 days
> **Can Parallelize:** Yes (3 parallel tracks)

### Track A: Database & Seeding (Agent 1)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 0.A.1 | BUG-084 | Seed `pricing_defaults` table | 1h | None |
| 0.A.2 | BUG-078 | Fix `orders.getAll` database query | 3h | None |
| 0.A.3 | BUG-079 | Fix `quotes.list` database query | 2h | None |
| 0.A.4 | BUG-080 | Fix `invoices.getSummary` query | 2h | None |

**Track A Total:** 8h

### Track B: API Registration (Agent 2)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 0.B.1 | API-010 | Register accounting.* procedures (getARSummary, getARAging, getAPSummary, getTotalCashBalance) | 4h | None |
| 0.B.2 | API-001 | Register todoLists.list | 30m | None |
| 0.B.3 | API-002 | Register featureFlags.list | 30m | None |
| 0.B.4 | API-003 | Register vipPortal.listAppointmentTypes | 30m | None |
| 0.B.5 | API-004-009 | Register remaining procedures (batch) | 3h | None |

**Track B Total:** 8.5h

### Track C: RBAC & Permissions (Agent 3)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 0.C.1 | BLOCKED-001 | Add `samples:read` to Sales Manager | 30m | None |
| 0.C.2 | BLOCKED-002 | Add Pick & Pack permission (10002) to Sales Manager | 30m | None |
| 0.C.3 | BLOCKED-003 | Add `accounting:reports:view` to Sales Manager | 30m | None |
| 0.C.4 | ST-026 | Implement Concurrent Edit Detection | 4h | None |

**Track C Total:** 5.5h

### Sprint 0 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 1):
[ ] pnpm seed:pricing succeeds
[ ] orders.getAll returns data without error
[ ] quotes.list returns data without error
[ ] invoices.getSummary returns data without error
[ ] accounting.getARSummary registered and returns data
[ ] accounting.getARAging registered and returns data
[ ] Sales Manager can access /samples
[ ] Sales Manager can access Pick & Pack
[ ] Sales Manager can access Finance Reports
[ ] pnpm tsc --noEmit has 0 errors
```

**Sprint 0 Total:** 22h (parallel: ~8.5h elapsed)

---

## SPRINT 1: CRITICAL UI FIXES

> **Goal:** Fix all P0/P1 bugs that affect user-facing functionality
> **Duration:** 2-3 days
> **Prerequisites:** Sprint 0 complete

### Track A: Order & Sales Flow Fixes (Agent 1)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.A.1 | BUG-086 | Fix order finalization (pricing defaults fallback) | 2h | 0.A.1 |
| 1.A.2 | BUG-093 | Fix finalizeMutation never called | 3h | 1.A.1 |
| 1.A.3 | BUG-040 | Fix Order Creator inventory loading | 4h | 0.A.2 |
| 1.A.4 | BUG-045 | Fix Order Creator retry resets form | 2h | 1.A.3 |

**Track A Total:** 11h

### Track B: Grid & Data Display Fixes (Agent 2)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.B.1 | BUG-091 | Fix Spreadsheet View empty grid (consolidated BUG-047/074) | 4h | 0.A.2 |
| 1.B.2 | BUG-092 | Fix AR/AP dashboard widgets | 2h | 0.B.1 |
| 1.B.3 | BUG-087 | Fix Products pagination validation | 2h | None |
| 1.B.4 | BUG-088 | Fix Spreadsheet Clients detail query | 2h | 0.A.2 |

**Track B Total:** 10h

### Track C: UI Wiring & Interaction Fixes (Agent 3)

| Order | Task ID | Description | Est | Dependencies |
|-------|---------|-------------|-----|--------------|
| 1.C.1 | BUG-089 | Fix New Invoice button onClick | 3h | None |
| 1.C.2 | BUG-090 | Fix Client edit save persistence | 2h | None |
| 1.C.3 | BUG-094 | Fix Live Shopping session creation | 3h | None |
| 1.C.4 | BUG-095 | Fix Batches "New Purchase" button | 2h | None |
| 1.C.5 | BUG-046 | Fix Settings Users tab auth error | 2h | 0.C.1-3 |

**Track C Total:** 12h

### Sprint 1 QA Gate

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

**Sprint 1 Total:** 33h (parallel: ~12h elapsed)

---

## SPRINT 2: WAVE 1 - STOP THE BLEEDING

> **Goal:** Implement critical business features (Cash Audit, Intake Verification)
> **Duration:** 2-3 weeks
> **Prerequisites:** Sprint 1 complete + New specs created

### Pre-Sprint: Spec Creation Required

| Task | Description | Est | Assignee |
|------|-------------|-----|----------|
| SPEC-001 | Create FEAT-007-CASH-AUDIT-SPEC.md (MEET-001 to MEET-004) | 4h | Product |
| SPEC-002 | Create FEAT-008-INTAKE-VERIFICATION-SPEC.md (MEET-064 to MEET-066) | 4h | Product |
| SPEC-003 | Create FEAT-009-CLIENT-LEDGER-SPEC.md (MEET-010) | 2h | Product |

### Track A: Cash Audit System Backend (Agent 1)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.A.1 | MEET-001-BE | Dashboard Available Money API | 4h | API-010 | FEAT-007 |
| 2.A.2 | MEET-002-BE | Multi-Location Cash API (Z + Doc) | 8h | 2.A.1 | FEAT-007 |
| 2.A.3 | MEET-003-BE | In/Out Ledger API | 8h | 2.A.2 | FEAT-007 |
| 2.A.4 | MEET-004-BE | Shift Payment Tracking API | 4h | 2.A.1 | FEAT-007 |

**Track A Total:** 24h

### Track B: Cash Audit System Frontend (Agent 2)

> **Blocked by:** Track A (needs APIs)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.B.1 | MEET-001-FE | Dashboard Available Money Widget | 4h | 2.A.1 | FEAT-007 |
| 2.B.2 | MEET-002-FE | Multi-Location Cash UI | 8h | 2.A.2 | FEAT-007 |
| 2.B.3 | MEET-003-FE | In/Out Ledger UI | 8h | 2.A.3 | FEAT-007 |
| 2.B.4 | MEET-004-FE | Shift Payment UI with Reset | 4h | 2.A.4 | FEAT-007 |

**Track B Total:** 24h (serial after Track A)

### Track C: Intake Verification (Agent 3)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.C.1 | MEET-064-BE | Intake Receipt Tool API | 8h | None | FEAT-008 |
| 2.C.2 | MEET-065-BE | Verification Process API | 8h | 2.C.1 | FEAT-008 |
| 2.C.3 | MEET-066 | Intake Flow Terminology Update | 2h | None | FEAT-008 |
| 2.C.4 | MEET-064-FE | Intake Receipt Tool UI | 8h | 2.C.1 | FEAT-008 |
| 2.C.5 | MEET-065-FE | Verification Process UI | 8h | 2.C.2 | FEAT-008 |

**Track C Total:** 34h

### Track D: Client Ledger (Agent 4 or follows C)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.D.1 | MEET-010-BE | Client Ledger API | 8h | 0.A.2 | FEAT-009 |
| 2.D.2 | MEET-010-FE | Client Ledger UI | 8h | 2.D.1 | FEAT-009 |

**Track D Total:** 16h

### Sprint 2 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 3):
[ ] Dashboard shows Total Cash, Scheduled Payables, Available Cash
[ ] Z's Cash and Doc's Cash tracked separately
[ ] In/Out ledger records all transactions
[ ] Shift payments can be reset with audit trail
[ ] Intake Receipt can be generated and sent
[ ] Stacker verification screen works
[ ] Discrepancies flagged with admin notification
[ ] Client ledger shows all ins/outs with running balance
[ ] Zero audit variance simulation test passes
[ ] User acceptance: "Weekly audit no longer tips off"
```

**Sprint 2 Total:** 98h (parallel: ~48h elapsed with 3 agents)

---

## SPRINT 3: WAVE 2 - CORE OPERATIONS

> **Goal:** Enable primary daily workflows (Live Shopping, Pricing, Vendor/Brand)
> **Duration:** 4-6 weeks
> **Prerequisites:** Sprint 2 complete

### Track A: Live Shopping System (Agent 1)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.A.1 | MEET-075-BE | Live Shopping Backend Enhancement | 20h | BUG-094 fixed | FEATURE-003 |
| 3.A.2 | MEET-075-FE | Live Shopping Frontend Polish | 20h | 3.A.1 | FEATURE-003 |

**Track A Total:** 40h

### Track B: Pricing Engine (Agent 2)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.B.1 | FEAT-004-BE | Pricing & Credit Logic Backend | 28h | BUG-084 fixed | FEAT-004-SPEC |
| 3.B.2 | ENH-004 | On-the-Fly Pricing UI | 20h | 3.B.1 | ENH-004-SPEC |
| 3.B.3 | MEET-014 | Variable Markups (Age/Quantity) | 8h | 3.B.2 | - |
| 3.B.4 | MEET-026 | Real-time Price Negotiation | 8h | 3.B.3 | - |

**Track B Total:** 64h

### Track C: Vendor/Brand Clarity (Agent 3)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.C.1 | FEAT-002-BE | Vendor Context API | 20h | None | FEAT-002-SPEC |
| 3.C.2 | MEET-027 | Vendor vs Brand Distinction | 12h | 3.C.1 | - |
| 3.C.3 | ENH-007 | Brand → Farmer Code Terminology | 8h | 3.C.2 | ENH-007-SPEC |
| 3.C.4 | MEET-029 | Vendor Tied to Farmer Name | 4h | 3.C.2 | - |
| 3.C.5 | MEET-030 | Vendor Search Shows Related Brands | 8h | 3.C.4 | - |

**Track C Total:** 52h

### Track D: Payables Logic (Agent 4)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.D.1 | MEET-005 | Payables Due When SKU Hits Zero | 8h | 2.D.1 | - |
| 3.D.2 | MEET-006 | Office Owned Inventory Tracking | 4h | 3.D.1 | - |
| 3.D.3 | FEAT-007 | Add Payment Recording Against Invoices | 8h | BUG-089 fixed | - |

**Track D Total:** 20h

### Sprint 3 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 4):
[ ] Live Shopping session creation works
[ ] Live Shopping price negotiation works
[ ] Variable markups calculate correctly by age/quantity
[ ] Real-time price adjustment applies immediately
[ ] Vendor and Brand distinguished in UI
[ ] Brand renamed to "Farmer Code" throughout
[ ] Vendor search shows associated brands
[ ] Payables mark due when SKU hits zero
[ ] Office-owned inventory tracked separately
[ ] Payment recording against invoices works
[ ] E2E test: Complete sales flow with negotiated pricing
```

**Sprint 3 Total:** 176h (parallel: ~64h elapsed with 4 agents)

---

## SPRINT 4: WAVE 3 - ENHANCED CAPABILITY

> **Goal:** Add efficiency features (Client 360, Inventory Intelligence, Scheduling)
> **Duration:** 6-8 weeks
> **Prerequisites:** Sprint 3 complete

### Track A: Enhanced Inventory APIs & UI (Agent 1)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.A.1 | FEAT-001-BE | Enhanced Inventory Data API | 16h | None | FEAT-001-SPEC |
| 4.A.2 | ENH-001 | Update Inventory Browser Table | 16h | 4.A.1 | ENH-001-SPEC |
| 4.A.3 | MEET-024 | Aging Inventory Visual (Red >2 weeks) | 8h | 4.A.2 | - |
| 4.A.4 | MEET-025 | Dashboard Aging Quick View | 4h | 4.A.3 | - |
| 4.A.5 | ENH-008 | Image Toggle for Inventory Views | 16h | 4.A.2 | ENH-008-SPEC |

**Track A Total:** 60h

### Track B: Client 360 View (Agent 2)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.B.1 | ENH-002 | Build Client Info Pod | 12h | 3.C.1 | ENH-002-SPEC |
| 4.B.2 | MEET-007 | Clients as Buyers AND Suppliers | 8h | 4.B.1 | - |
| 4.B.3 | MEET-008 | Complex Tab (Jesse example) | 12h | 4.B.2 | - |
| 4.B.4 | MEET-012 | Client Tagging with Referrer | 4h | 4.B.1 | - |
| 4.B.5 | MEET-013 | Referrer Lookup | 8h | 4.B.4 | - |
| 4.B.6 | MEET-021 | Client Wants/Needs Tracking | 8h | 4.B.1 | - |

**Track B Total:** 52h

### Track C: In-line Product Creation (Agent 3)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.C.1 | FEAT-003-INLINE | In-line Product Creation API | 24h | None | FEAT-003-INLINE-PRODUCT-SPEC |
| 4.C.2 | ENH-003 | In-line Product Creation UI | 16h | 4.C.1 | ENH-003-SPEC |
| 4.C.3 | MEET-031 | Hide SKU Field | 2h | 4.C.2 | - |
| 4.C.4 | MEET-037 | Editable Product Names | 2h | 4.C.2 | - |
| 4.C.5 | MEET-033 | Searchable Supplier Dropdown | 4h | 4.C.2 | - |

**Track C Total:** 48h

### Track D: Scheduling System (Agent 4)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.D.1 | FEAT-005-BE | Scheduling & Referral APIs | 24h | None | FEAT-005-SPEC |
| 4.D.2 | ENH-005 | Scheduling Workflow UI | 16h | 4.D.1 | ENH-005-SPEC |
| 4.D.3 | MEET-046 | Live Appointments | 8h | 4.D.2 | - |
| 4.D.4 | MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 4h | 4.D.3 | - |
| 4.D.5 | MEET-072 | Notification System for Tagging | 8h | 4.D.2 | - |

**Track D Total:** 60h

### Sprint 4 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 5):
[ ] Inventory browser shows enhanced data columns
[ ] Aging indicator shows red for >2 week items
[ ] Dashboard aging widget displays correctly
[ ] Image toggle works in inventory views
[ ] Client Info Pod displays unified context
[ ] Clients work as both buyers AND suppliers
[ ] Client tagging with referrer works
[ ] Referrer lookup returns correct results
[ ] Client wants/needs tracked and searchable
[ ] In-line product creation works during order
[ ] SKU field hidden per user request
[ ] Product names are editable
[ ] Supplier dropdown is searchable (100+ suppliers)
[ ] Scheduling appointments work
[ ] Multiple rooms can be booked
[ ] Notifications fire for tagged users
```

**Sprint 4 Total:** 220h (parallel: ~60h elapsed with 4 agents)

---

## SPRINT 5: WAVE 4 - VIP & POLISH

> **Goal:** VIP Portal enhancement, gamification, UI polish
> **Duration:** 8-10 weeks
> **Prerequisites:** Sprint 4 complete

### Track A: VIP Portal Enhancement (Agent 1)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.A.1 | MEET-043 | VIP Status (Debt Cycling Tiers) | 12h | 4.B.6 | - |
| 5.A.2 | MEET-041 | VIP Debt Aging Notifications | 8h | 5.A.1 | - |
| 5.A.3 | MEET-042 | Credit Usage Display | 4h | 5.A.1 | - |
| 5.A.4 | MEET-052 | VIP Purchase History | 8h | 4.B.1 | - |
| 5.A.5 | MEET-054 | VIP Needs/Wants Entry | 8h | 4.B.6 | - |
| 5.A.6 | MEET-056 | Centralized VIP Requests | 8h | 5.A.5 | - |
| 5.A.7 | MEET-057 | Matchmaking (Needs ↔ Supplies) | 16h | 5.A.5 | - |
| 5.A.8 | MEET-071 | VIP Client Management (Admin) | 8h | 5.A.1 | - |

**Track A Total:** 72h

### Track B: Gamification (Agent 2)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.B.1 | MEET-044 | Anonymized Leaderboard | 12h | 5.A.1 | - |
| 5.B.2 | MEET-045 | Rewards System (Medals, Markup %) | 16h | 5.B.1 | - |
| 5.B.3 | FEAT-006 | Full Referral (Couch Tax) Workflow | 20h | 4.D.1 | FEAT-006-SPEC |

**Track B Total:** 48h

### Track C: UI Polish (Agent 3)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.C.1 | ENH-006 | Relocate Order Preview | 4h | None | ENH-006-SPEC |
| 5.C.2 | MEET-053 | User-Friendly Terminology | 4h | None | - |
| 5.C.3 | UX-010 | Clarify My Account vs User Settings | 2h | None | - |
| 5.C.4 | UX-011 | Fix Two Export Buttons Issue | 2h | None | - |
| 5.C.5 | UX-012 | Fix Period Display Formatting | 2h | None | - |
| 5.C.6 | UX-013 | Fix Mirrored Elements Issue | 2h | None | - |

**Track C Total:** 16h

### Track D: Transaction & Product Features (Agent 4)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.D.1 | MEET-017 | Invoice History (Debt Disputes) | 8h | 2.D.1 | - |
| 5.D.2 | MEET-018 | Transaction Fee Per Client | 8h | 4.B.1 | - |
| 5.D.3 | MEET-035 | Payment Terms (Consignment/Cash/COD) | 12h | 3.D.3 | - |
| 5.D.4 | MEET-032 | Customizable Categories | 8h | 4.C.1 | - |
| 5.D.5 | MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 4h | 5.D.4 | - |

**Track D Total:** 40h

### Track E: Storage & Location (Agent 5 or follows D)

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.E.1 | MEET-067 | Storage Zones (A, B, C, D) | 8h | None | - |
| 5.E.2 | MEET-068 | Three Sites (Samples, Storage, Shipping) | 4h | 5.E.1 | - |
| 5.E.3 | MEET-069 | Category/Subcategory Data Flow | 4h | 5.D.4 | - |

**Track E Total:** 16h

### Sprint 5 QA Gate

```
VALIDATION CHECKLIST (Must all pass for MVP Complete):
[ ] VIP status tiers (Diamond/Platinum/Gold/Bronze) work
[ ] VIP debt aging notifications fire correctly
[ ] Credit usage displayed on VIP profile
[ ] VIP purchase history accessible
[ ] VIP needs/wants entry works
[ ] Centralized VIP requests viewable
[ ] Matchmaking suggests products for needs
[ ] Anonymized leaderboard displays
[ ] Rewards system applies markup discounts
[ ] Referral (Couch Tax) workflow complete
[ ] Order preview relocated as requested
[ ] All terminology user-friendly
[ ] All UX polish items resolved
[ ] Invoice history searchable for disputes
[ ] Transaction fees configurable per client
[ ] Payment terms (consignment/cash/COD) work
[ ] Product grades selectable
[ ] Storage zones functional
[ ] Full E2E test suite: 0 FAIL, 0 BLOCKED
```

**Sprint 5 Total:** 192h (parallel: ~72h elapsed with 4 agents)

---

# PART 3: PARALLEL AGENT EXECUTION FRAMEWORK

## Agent Deployment Strategy

### Recommended Agent Configuration

| Sprint | Agents | Parallel Tracks | Elapsed Time |
|--------|--------|-----------------|--------------|
| 0 | 3 | A, B, C | ~9h |
| 1 | 3 | A, B, C | ~12h |
| 2 | 3-4 | A→B sequential, C, D | ~48h |
| 3 | 4 | A, B, C, D | ~64h |
| 4 | 4 | A, B, C, D | ~60h |
| 5 | 4-5 | A, B, C, D, E | ~72h |

### Agent Assignment Rules

1. **Track A/B often sequential** - Backend (A) must complete before Frontend (B)
2. **Tracks C/D typically parallel** - Independent feature areas
3. **Never assign same file to multiple agents** - Prevents merge conflicts
4. **Each agent runs tests after each task** - Prevents regression

### QA Agent (Dedicated)

A dedicated QA agent should:
1. Run after each sprint
2. Execute validation checklist
3. File bugs for any failures
4. Block sprint advancement until gate passes

---

## QA Validation Process

### Per-Task QA

After EACH task:
```bash
# Developer runs before marking complete
pnpm tsc --noEmit                    # No TypeScript errors
pnpm test:unit -- --related          # Related unit tests pass
pnpm lint                            # No lint errors
```

### Per-Sprint QA Gate

After EACH sprint:
```bash
# QA agent runs full validation
pnpm tsc --noEmit                    # No TypeScript errors
pnpm test:unit                       # All unit tests pass
pnpm test:e2e                        # E2E suite passes
pnpm validate:schema                 # Schema validation passes

# Manual testing
# Run through sprint validation checklist
# Document any failures as bugs
# Sprint cannot advance until 0 FAIL items
```

### Bug Triage During QA

| Severity | Action | Sprint Impact |
|----------|--------|---------------|
| P0 (Critical) | Fix immediately | Blocks sprint completion |
| P1 (High) | Add to current sprint | Extends sprint duration |
| P2 (Medium) | Add to next sprint | No current impact |
| P3 (Low) | Add to backlog | No current impact |

---

# PART 4: COMPLETE DEPENDENCY MATRIX

## Visual Dependency Graph

```
SPRINT 0 (Foundation)
├─ Track A: Database ────────────────────────────────────────────────────────┐
│  ├─ BUG-084 (pricing_defaults) ──────────────────────────────────────────┐ │
│  ├─ BUG-078 (orders.getAll) ─────────────────────────────────────────┐   │ │
│  └─ BUG-079, BUG-080 ───────────────────────────────────────────┐    │   │ │
├─ Track B: API Registration ─────────────────────────────────────│────│───│─┤
│  └─ API-010 (accounting.*) ─────────────────────────────────────│────│───│─┤
└─ Track C: RBAC ─────────────────────────────────────────────────│────│───│─┤
                                                                  │    │   │ │
SPRINT 1 (Critical UI Fixes)                                      │    │   │ │
├─ Track A: Order Flow ◄──────────────────────────────────────────│────│───┘ │
│  ├─ BUG-086 (order finalization) ◄──────────────────────────────│────┴─────┘
│  └─ BUG-040 (inventory loading) ◄───────────────────────────────┘
├─ Track B: Grid Fixes ◄──────────────────────────────────────────┘
│  └─ BUG-091 (spreadsheet grid) ◄────────────────────────────────┘
└─ Track C: UI Wiring (independent)

SPRINT 2 (Wave 1 - Stop the Bleeding)
├─ Track A: Cash Audit Backend ◄─ API-010 complete
├─ Track B: Cash Audit Frontend ◄─ Track A complete
├─ Track C: Intake Verification (independent)
└─ Track D: Client Ledger ◄─ BUG-078 complete

SPRINT 3 (Wave 2 - Core Operations)
├─ Track A: Live Shopping ◄─ BUG-094 fixed
├─ Track B: Pricing Engine ◄─ BUG-084 fixed
├─ Track C: Vendor/Brand (independent)
└─ Track D: Payables ◄─ Client Ledger (2.D) complete

SPRINT 4 (Wave 3 - Enhanced Capability)
├─ Track A: Enhanced Inventory (independent)
├─ Track B: Client 360 ◄─ Vendor Context (3.C.1) complete
├─ Track C: In-line Product (independent)
└─ Track D: Scheduling (independent)

SPRINT 5 (Wave 4 - VIP & Polish)
├─ Track A: VIP Portal ◄─ Client 360 (4.B) complete
├─ Track B: Gamification ◄─ VIP Status (5.A.1) complete
├─ Track C: UI Polish (independent)
├─ Track D: Transaction Features ◄─ Client Ledger complete
└─ Track E: Storage (independent)
```

---

# PART 5: TRACEABILITY MATRIX

## MEET Item to Sprint Mapping

| MEET ID | Description | Sprint | Track | Status |
|---------|-------------|--------|-------|--------|
| MEET-001 | Dashboard: Available Money Display | 2 | A | TODO |
| MEET-002 | Multi-Location Cash (Z + Doc) | 2 | A | TODO |
| MEET-003 | Z's Cash Audit - In/Out Ledger | 2 | A | TODO |
| MEET-004 | Shift Payment Tracking with Reset | 2 | A | TODO |
| MEET-005 | Payables Due When SKU Hits Zero | 3 | D | TODO |
| MEET-006 | Office Owned Inventory Tracking | 3 | D | TODO |
| MEET-007 | Clients as Buyers AND Suppliers | 4 | B | TODO |
| MEET-008 | Complex Tab (Jesse example) | 4 | B | TODO |
| MEET-009 | Billing for Services | 5 | D | TODO |
| MEET-010 | Simple Client Ledger | 2 | D | TODO |
| MEET-011 | New Clients Added Infrequently | - | - | CONTEXT |
| MEET-012 | Client Tagging with Referrer | 4 | B | TODO |
| MEET-013 | Referrer Lookup | 4 | B | TODO |
| MEET-014 | Variable Markups (Age/Quantity) | 3 | B | TODO |
| MEET-015 | Sales Sheet Creator | BACKLOG | - | LOW |
| MEET-016 | Live Sales Now Primary Method | - | - | CONTEXT |
| MEET-017 | Invoice History (Debt Disputes) | 5 | D | TODO |
| MEET-018 | Transaction Fee Per Client | 5 | D | TODO |
| MEET-019 | Crypto Payment Tracking | BACKLOG | - | FUTURE |
| MEET-020 | Suggested Buyer (Purchase History) | 4 | B | TODO |
| MEET-021 | Client Wants/Needs Tracking | 4 | B | TODO |
| MEET-022 | Reverse Lookup (Product Connections) | BACKLOG | - | FUTURE |
| MEET-023 | Batch Tracking for Inventory | 4 | A | TODO |
| MEET-024 | Aging Inventory Visual | 4 | A | TODO |
| MEET-025 | Dashboard Aging Quick View | 4 | A | TODO |
| MEET-026 | Real-time Price Negotiation | 3 | B | TODO |
| MEET-027 | Vendor vs Brand Distinction | 3 | C | TODO |
| MEET-028 | Brand → Farmer Code Terminology | 3 | C | TODO |
| MEET-029 | Vendor Tied to Farmer Name | 3 | C | TODO |
| MEET-030 | Vendor Search Shows Related Brands | 3 | C | TODO |
| MEET-031 | Hide SKU Field | 4 | C | TODO |
| MEET-032 | Customizable Categories | 5 | D | TODO |
| MEET-033 | Searchable Supplier Dropdown | 4 | C | TODO |
| MEET-034 | Expected Delivery Date | BACKLOG | - | LOW |
| MEET-035 | Payment Terms (Consignment/Cash/COD) | 5 | D | TODO |
| MEET-036 | Installment Payments | BACKLOG | - | FUTURE |
| MEET-037 | Editable Product Names | 4 | C | TODO |
| MEET-038 | Notes on Product Pricing | 3 | B | TODO |
| MEET-039 | Quick Action Pricing Visibility | 3 | B | TODO |
| MEET-040 | Product: Name, Category, Brand | 4 | C | TODO |
| MEET-041 | VIP Debt Aging Notifications | 5 | A | TODO |
| MEET-042 | Credit Usage Display | 5 | A | TODO |
| MEET-043 | VIP Status (Debt Cycling Tiers) | 5 | A | TODO |
| MEET-044 | Anonymized Leaderboard | 5 | B | TODO |
| MEET-045 | Rewards System (Medals, Markup %) | 5 | B | TODO |
| MEET-046 | Live Appointments | 4 | D | TODO |
| MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 4 | D | TODO |
| MEET-048 | Hour Tracking | BACKLOG | - | LOW |
| MEET-049 | Calendar Navigation Bug | 1 | - | TODO |
| MEET-050 | Shift/Vacation Tracking | 4 | D | TODO |
| MEET-051 | User Roles & Permissions | 5 | - | TODO |
| MEET-052 | VIP Purchase History | 5 | A | TODO |
| MEET-053 | User-Friendly Terminology | 5 | C | TODO |
| MEET-054 | VIP Needs/Wants Entry | 5 | A | TODO |
| MEET-055 | Office Needs Auto-Population | 4 | B | TODO |
| MEET-056 | Centralized VIP Requests | 5 | A | TODO |
| MEET-057 | Matchmaking (Needs ↔ Supplies) | 5 | A | TODO |
| MEET-058 | Copy-Paste Office Needs | 5 | A | TODO |
| MEET-059 | No AI Integration (Constraint) | - | - | CONSTRAINT |
| MEET-060 | AI: Suggested Quantities | BACKLOG | - | FUTURE |
| MEET-061 | Suggested Purchase Price (History) | 3 | B | TODO |
| MEET-062 | Last Sale Price Lookup | 3 | B | TODO |
| MEET-063 | Farmer Receipt History Link | 3 | B | TODO |
| MEET-064 | Intake Receipt Tool | 2 | C | TODO |
| MEET-065 | Verification Process (stacker confirms) | 2 | C | TODO |
| MEET-066 | Intake Flow Terminology | 2 | C | TODO |
| MEET-067 | Storage Zones (A, B, C, D) | 5 | E | TODO |
| MEET-068 | Three Sites (Samples, Storage, Shipping) | 5 | E | TODO |
| MEET-069 | Category/Subcategory Data Flow | 5 | E | TODO |
| MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 5 | D | TODO |
| MEET-071 | VIP Client Management (Admin) | 5 | A | TODO |
| MEET-072 | Notification System for Tagging | 4 | D | TODO |
| MEET-073 | Large Distributor Pricing | BACKLOG | - | FUTURE |
| MEET-074 | Modular Sales Options | BACKLOG | - | FUTURE |
| MEET-075 | Live Shopping Feature | 3 | A | TODO |

## Validation Summary

| Category | Count | Status |
|----------|-------|--------|
| Sprint 0 (Foundation) | 0 MEET | Bugs/API only |
| Sprint 1 (UI Fixes) | 1 MEET | BUG-049 = MEET-049 |
| Sprint 2 (Wave 1) | 7 MEET | MEET-001-004, 010, 064-066 |
| Sprint 3 (Wave 2) | 17 MEET | MEET-005-006, 014, 026-030, etc |
| Sprint 4 (Wave 3) | 21 MEET | MEET-007-008, 012-013, 020-021, etc |
| Sprint 5 (Wave 4) | 23 MEET | MEET-017-018, 035, 041-058, etc |
| Backlog | 6 MEET | MEET-015, 019, 022, 034, 036, 048, 060, 073, 074 |
| Context/Constraint | 3 MEET | MEET-011, 016, 059 |
| **TOTAL** | **75** | **✅ 100% Accounted** |

---

# PART 6: TOTAL EFFORT SUMMARY

| Sprint | Total Hours | Parallel Hours | Agents | Focus |
|--------|-------------|----------------|--------|-------|
| 0 | 22h | 9h | 3 | Foundation |
| 1 | 33h | 12h | 3 | Critical UI Fixes |
| 2 | 98h | 48h | 3-4 | Wave 1: Stop Bleeding |
| 3 | 176h | 64h | 4 | Wave 2: Core Ops |
| 4 | 220h | 60h | 4 | Wave 3: Enhanced |
| 5 | 192h | 72h | 4-5 | Wave 4: VIP & Polish |
| **TOTAL** | **741h** | **265h** | - | - |

**Note:** 265h elapsed time assumes optimal parallel execution with 4 agents average.

---

# PART 7: RISK REGISTER

| Risk ID | Description | Severity | Mitigation |
|---------|-------------|----------|------------|
| RISK-001 | Missing specs for Wave 1 | CRITICAL | Create FEAT-007, FEAT-008, FEAT-009 before Sprint 2 |
| RISK-002 | Database fixes incomplete | HIGH | Sprint 0 has QA gate - cannot proceed if fails |
| RISK-003 | RBAC blocks QA testing | HIGH | Sprint 0 Track C fixes all RBAC |
| RISK-004 | Parallel agents cause merge conflicts | MEDIUM | Each track owns different files |
| RISK-005 | QA gates slow execution | LOW | Necessary for quality - factor into timeline |
| RISK-006 | Bug count increases during sprints | MEDIUM | P0/P1 added to current sprint, P2+ to next |

---

**Document Status:** ACTIVE
**Created:** 2026-01-12
**Author:** Claude AI Strategic Analysis
**Next Review:** After Sprint 0 completion

---

*This document supersedes MASTER_ROADMAP.md, TERP_STRATEGIC_ROADMAP_2026.md, and UNIFIED_STRATEGIC_ROADMAP_2026-01-12.md for execution purposes. Those documents remain as reference for historical context and detailed specifications.*
