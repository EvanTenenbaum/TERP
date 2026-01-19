# MVP Strategic Execution Plan

## Single Source of Truth for MVP Execution

**Version:** 1.0
**Created:** 2026-01-19
**Status:** ACTIVE
**Scope:** Complete MVP Roadmap Execution (Foundation + Waves 1-4)

> **THIS DOCUMENT:** Consolidates and validates all MVP tasks from multiple roadmaps into a single, dependency-ordered execution plan with clear parallel tracks and QA gates.

---

# EXECUTIVE SUMMARY

## MVP Completion Status

| Milestone | Status | Tasks | Notes |
|-----------|--------|-------|-------|
| **Original MVP (Tech Debt)** | ✅ 100% COMPLETE | 183 tasks | Infrastructure, Security, Bugs, Features |
| **Beta Reliability** | 🔴 0% | 17 tasks | Deferred - not MVP critical |
| **2026 Strategic MVP** | 🟡 IN PROGRESS | 75 MEET items | Customer-driven features |

## 2026 MVP Status Overview

| Sprint | Focus | Total Hours | Status |
|--------|-------|-------------|--------|
| Sprint 0 | Foundation (Bugs, API, RBAC) | 22h | ✅ COMPLETE |
| Sprint 1 | Critical UI Fixes | 35h | ✅ COMPLETE |
| Sprint 2 | Wave 1: Stop the Bleeding | 98h | 🔴 TODO |
| Sprint 3 | Wave 2: Core Operations | 208h | 🔴 TODO |
| Sprint 4 | Wave 3: Enhanced Capability | 324h | 🔴 TODO |
| Sprint 5 | Wave 4: VIP & Polish | 292h | 🔴 TODO |
| **TOTAL** | | **979h** | **~36% Complete** |

---

# PART 1: DEPENDENCY GRAPH

## Critical Path Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPENDENCY CHAIN OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SPRINT 0-1 (COMPLETE) ──────────────────────────────────────────────────┐  │
│  ├── Database fixes (BUG-078, 079, 080, 084)                             │  │
│  ├── API registration (API-001 to API-010)                               │  │
│  ├── RBAC fixes (BLOCKED-001, 002, 003)                                  │  │
│  └── Critical UI fixes (BUG-040, 086, 091, 093, 094)                     │  │
│                                                                          │  │
│                                 ▼                                        │  │
│  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │                  SPRINT 2: WAVE 1 (NOW)                            │  │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │  │  │
│  │  │  FEAT-007       │ │  FEAT-008       │ │  FEAT-009       │       │  │  │
│  │  │  Cash Audit     │ │  Intake Verify  │ │  Client Ledger  │       │  │  │
│  │  │  (48h)          │ │  (34h)          │ │  (16h)          │       │  │  │
│  │  │  MEET-001-004   │ │  MEET-064-066   │ │  MEET-010       │       │  │  │
│  │  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘       │  │  │
│  │           │                   │                   │                │  │  │
│  │           └───────────────────┼───────────────────┘                │  │  │
│  │                               ▼                                    │  │  │
│  └───────────────────────────────────────────────────────────────────-┘  │  │
│                                  ▼                                       │  │
│  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │                  SPRINT 3: WAVE 2 (NEXT)                           │  │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │  │  │
│  │  │  Live Shopping  │ │  Pricing Engine │ │  Vendor/Brand   │       │  │  │
│  │  │  (40h)          │ │  (96h)          │ │  (52h)          │       │  │  │
│  │  │  MEET-075       │ │  MEET-014,026   │ │  MEET-027-030   │       │  │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │  │  │
│  │           │ Depends on: BUG-094 ✅                                  │  │  │
│  │           │ Depends on: BUG-084 ✅                                  │  │  │
│  └───────────────────────────────────────────────────────────────────-┘  │  │
│                                  ▼                                       │  │
│  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │                  SPRINT 4: WAVE 3 (LATER)                          │  │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │  │  │
│  │  │  Inventory      │ │  Client 360     │ │  Scheduling     │       │  │  │
│  │  │  Intelligence   │ │  View           │ │  System         │       │  │  │
│  │  │  (108h)         │ │  (80h)          │ │  (72h)          │       │  │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │  │  │
│  │           │ Depends on: Vendor Context (3.C.1)                     │  │  │
│  └───────────────────────────────────────────────────────────────────-┘  │  │
│                                  ▼                                       │  │
│  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │                  SPRINT 5: WAVE 4 (FINAL)                          │  │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │  │  │
│  │  │  VIP Portal     │ │  Gamification   │ │  UI Polish      │       │  │  │
│  │  │  Enhancement    │ │                 │ │                 │       │  │  │
│  │  │  (72h)          │ │  (48h)          │ │  (104h)         │       │  │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │  │  │
│  │           │ Depends on: Client 360 (4.B)                           │  │  │
│  └───────────────────────────────────────────────────────────────────-┘  │  │
│                                                                          │  │
└──────────────────────────────────────────────────────────────────────────┘  │
```

---

# PART 2: COMPLETED WORK VALIDATION

## Sprint 0: Foundation ✅ COMPLETE

All Sprint 0 tasks have been completed as verified in MASTER_ROADMAP.md:

| Track | Task ID | Description | Status | Verified |
|-------|---------|-------------|--------|----------|
| A | BUG-084 | Seed pricing_defaults table | ✅ COMPLETE | Jan 12, 2026 |
| A | BUG-078 | Fix orders.getAll database query | ✅ COMPLETE | Jan 12, 2026 |
| A | BUG-079 | Fix quotes.list database query | ✅ COMPLETE | Jan 12, 2026 |
| A | BUG-080 | Fix invoices.getSummary query | ✅ COMPLETE | Jan 12, 2026 |
| B | API-010 | Register accounting.* procedures | ✅ COMPLETE | Jan 12, 2026 |
| B | API-001-009 | Register remaining procedures | ✅ COMPLETE | Jan 12, 2026 |
| C | BLOCKED-001 | Add samples:read to Sales Manager | ✅ COMPLETE | Jan 10, 2026 |
| C | BLOCKED-002 | Add Pick & Pack permission | BY-DESIGN | Warehouse-only |
| C | BLOCKED-003 | Add accounting:reports:view | ✅ COMPLETE | Jan 10, 2026 |
| C | ST-026 | Implement Concurrent Edit Detection | ✅ COMPLETE | Jan 12-14, 2026 |

**Sprint 0 QA Gate: ✅ PASSED**

---

## Sprint 1: Critical UI Fixes ✅ COMPLETE

All Sprint 1 tasks have been completed as verified in MASTER_ROADMAP.md:

| Track | Task ID | Description | Status | Verified |
|-------|---------|-------------|--------|----------|
| A | BUG-086 | Order finalization (pricing defaults) | ✅ COMPLETE | Jan 10, 2026 |
| A | BUG-093 | finalizeMutation never called | ✅ COMPLETE | Jan 11, 2026 |
| A | BUG-040 | Order Creator inventory loading | ✅ COMPLETE | Jan 13, 2026 |
| A | BUG-045 | Order Creator retry resets form | ✅ COMPLETE | Jan 13, 2026 |
| B | BUG-091 | Spreadsheet View empty grid | ✅ COMPLETE | Jan 10-11, 2026 |
| B | BUG-092 | AR/AP dashboard widgets | ✅ COMPLETE | Jan 10, 2026 |
| B | BUG-087 | Products pagination validation | ✅ COMPLETE | Jan 10, 2026 |
| B | BUG-088 | Spreadsheet Clients detail query | ✅ COMPLETE | Jan 10, 2026 |
| C | BUG-089 | New Invoice button onClick | ✅ COMPLETE | Jan 10, 2026 |
| C | BUG-090 | Client edit save persistence | ✅ COMPLETE | Jan 10, 2026 |
| C | BUG-094 | Live Shopping session creation | ✅ COMPLETE | Jan 11, 2026 |
| C | BUG-095 | Batches "New Purchase" button | ✅ COMPLETE | Jan 11, 2026 |
| C | BUG-046 | Settings Users tab auth error | ✅ COMPLETE | Jan 13, 2026 |
| C | MEET-049 | Calendar Navigation Bug | ✅ COMPLETE | Jan 12-14, 2026 |

**Sprint 1 QA Gate: ✅ PASSED**

---

## Additional Completed Work (MVP Milestone)

### Security (17 tasks) ✅ COMPLETE
- SEC-001 to SEC-022: All security tasks completed

### Data Integrity (8 tasks) ✅ COMPLETE
- DI-001 to DI-008: All data integrity tasks completed

### Frontend Quality (3 tasks) ✅ COMPLETE
- FE-QA-001 to FE-QA-003: All frontend quality tasks completed

### Backend Quality (5 tasks) ✅ COMPLETE
- BE-QA-001 to BE-QA-005: All backend quality tasks completed

### E2E Testing Infrastructure (3 tasks) ✅ COMPLETE
- E2E-001 to E2E-003: All E2E testing tasks completed (88.5% pass rate)

---

# PART 3: REMAINING WORK - EXECUTION ORDER

## Sprint 2: Wave 1 - Stop the Bleeding (98h)

> **CRITICAL PRIORITY** - Addresses weekly audit failures and intake discrepancies
> **Prerequisites:** Sprint 0 & 1 ✅ COMPLETE
> **Specs:** FEAT-007 ✅, FEAT-008 ✅, FEAT-009 ✅ (All Approved)

### Track A: Cash Audit System Backend (Agent 1) - 24h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.A.1 | MEET-001-BE | Dashboard Available Money API | 4h | API-010 ✅ | FEAT-007 |
| 2.A.2 | MEET-002-BE | Multi-Location Cash API (Dynamic locations) | 8h | 2.A.1 | FEAT-007 |
| 2.A.3 | MEET-003-BE | In/Out Ledger API | 8h | 2.A.2 | FEAT-007 |
| 2.A.4 | MEET-004-BE | Shift Payment Tracking API | 4h | 2.A.1 | FEAT-007 |

### Track B: Cash Audit System Frontend (Agent 2) - 24h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.B.1 | MEET-001-FE | Dashboard Available Money Widget | 4h | 2.A.1 | FEAT-007 |
| 2.B.2 | MEET-002-FE | Multi-Location Cash UI | 8h | 2.A.2 | FEAT-007 |
| 2.B.3 | MEET-003-FE | In/Out Ledger UI | 8h | 2.A.3 | FEAT-007 |
| 2.B.4 | MEET-004-FE | Shift Payment UI with Reset | 4h | 2.A.4 | FEAT-007 |

### Track C: Intake Verification System (Agent 3) - 34h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.C.1 | MEET-064-BE | Intake Receipt Tool API | 8h | None | FEAT-008 |
| 2.C.2 | MEET-065-BE | Verification Process API | 8h | 2.C.1 | FEAT-008 |
| 2.C.3 | MEET-066 | Intake Flow Terminology Update | 2h | None | FEAT-008 |
| 2.C.4 | MEET-064-FE | Intake Receipt Tool UI | 8h | 2.C.1 | FEAT-008 |
| 2.C.5 | MEET-065-FE | Verification Process UI | 8h | 2.C.2 | FEAT-008 |

### Track D: Client Ledger System (Agent 4) - 16h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 2.D.1 | MEET-010-BE | Client Ledger API | 8h | BUG-078 ✅ | FEAT-009 |
| 2.D.2 | MEET-010-FE | Client Ledger UI | 8h | 2.D.1 | FEAT-009 |

### Sprint 2 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 3):
[ ] Dashboard shows Total Cash, Scheduled Payables, Available Cash
[ ] Dynamic location cash tracked separately (admin can add/rename)
[ ] In/Out ledger records all transactions
[ ] Shift payments can be reset with audit trail
[ ] Intake Receipt can be generated and sent
[ ] Stacker verification screen works
[ ] Discrepancies flagged with notification to responsible person
[ ] Client ledger shows all ins/outs with running balance
[ ] Zero audit variance simulation test passes
[ ] User acceptance: "Weekly audit no longer tips off"
```

**Sprint 2 Parallel Execution:** 4 agents, ~34h elapsed time

---

## Sprint 3: Wave 2 - Core Operations (208h)

> **HIGH PRIORITY** - Enable primary daily workflows
> **Prerequisites:** Sprint 2 complete
> **Dependencies:** Cash Audit for Payables, Client Ledger for Payment Recording

### Track A: Live Shopping System (Agent 1) - 40h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.A.1 | MEET-075-BE | Live Shopping Backend Enhancement | 20h | BUG-094 ✅ | FEATURE-003 |
| 3.A.2 | MEET-075-FE | Live Shopping Frontend Polish | 20h | 3.A.1 | FEATURE-003 |

### Track B: Pricing Engine (Agent 2) - 96h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.B.1 | FEAT-004-BE | Pricing & Credit Logic Backend | 28h | BUG-084 ✅ | FEAT-004 |
| 3.B.2 | ENH-004 | On-the-Fly Pricing UI | 20h | 3.B.1 | ENH-004 |
| 3.B.3 | MEET-014 | Variable Markups (Age/Quantity) | 8h | 3.B.2 | - |
| 3.B.4 | MEET-026 | Real-time Price Negotiation | 8h | 3.B.3 | - |
| 3.B.5 | MEET-038 | Notes on Product Pricing | 4h | 3.B.2 | - |
| 3.B.6 | MEET-039 | Quick Action Pricing Visibility | 4h | 3.B.2 | - |
| 3.B.7 | MEET-061 | Suggested Purchase Price (History) | 8h | 3.B.1 | - |
| 3.B.8 | MEET-062 | Last Sale Price Lookup | 4h | 3.B.7 | - |
| 3.B.9 | MEET-063 | Farmer Receipt History Link | 4h | 3.B.2 | - |

### Track C: Vendor/Brand Clarity (Agent 3) - 52h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.C.1 | FEAT-002-BE | Vendor Context API | 20h | None | FEAT-002 |
| 3.C.2 | MEET-027 | Vendor vs Brand Distinction | 12h | 3.C.1 | - |
| 3.C.3 | ENH-007 | Brand → Farmer Code Terminology | 8h | 3.C.2 | ENH-007 |
| 3.C.4 | MEET-029 | Vendor Tied to Farmer Name | 4h | 3.C.2 | - |
| 3.C.5 | MEET-030 | Vendor Search Shows Related Brands | 8h | 3.C.4 | - |

### Track D: Payables Logic (Agent 4) - 20h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 3.D.1 | MEET-005 | Payables Due When SKU Hits Zero | 8h | 2.D.1 | - |
| 3.D.2 | MEET-006 | Office Owned Inventory Tracking | 4h | 3.D.1 | - |
| 3.D.3 | FEAT-007 | Add Payment Recording Against Invoices | 8h | BUG-089 ✅ | - |

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

**Sprint 3 Parallel Execution:** 4 agents, ~96h elapsed time

---

## Sprint 4: Wave 3 - Enhanced Capability (324h)

> **MEDIUM PRIORITY** - Efficiency features
> **Prerequisites:** Sprint 3 complete
> **Dependencies:** Vendor Context for Client 360

### Track A: Enhanced Inventory (Agent 1) - 108h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.A.1 | FEAT-001-BE | Enhanced Inventory Data API | 16h | None | FEAT-001 |
| 4.A.2 | ENH-001 | Update Inventory Browser Table | 16h | 4.A.1 | ENH-001 |
| 4.A.3 | MEET-024 | Aging Inventory Visual (Red >2 weeks) | 8h | 4.A.2 | - |
| 4.A.4 | MEET-025 | Dashboard Aging Quick View | 4h | 4.A.3 | - |
| 4.A.5 | ENH-008 | Image Toggle for Inventory Views | 16h | 4.A.2 | ENH-008 |
| 4.A.6 | MEET-023 | Batch Tracking for Inventory | 12h | 4.A.1 | - |
| 4.A.7 | WS-008 | Low Stock & Needs-Based Alerts | 16h | 4.A.1 | WS-008 |
| 4.A.8 | WS-009 | Inventory Movement & Shrinkage Tracking | 20h | 4.A.7 | WS-009 |

### Track B: Client 360 View (Agent 2) - 80h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.B.1 | ENH-002 | Build Client Info Pod | 12h | 3.C.1 | ENH-002 |
| 4.B.2 | MEET-007 | Clients as Buyers AND Suppliers | 8h | 4.B.1 | - |
| 4.B.3 | MEET-008 | Complex Tab (Jesse example) | 12h | 4.B.2 | - |
| 4.B.4 | MEET-012 | Client Tagging with Referrer | 4h | 4.B.1 | - |
| 4.B.5 | MEET-013 | Referrer Lookup | 8h | 4.B.4 | - |
| 4.B.6 | MEET-021 | Client Wants/Needs Tracking | 8h | 4.B.1 | - |
| 4.B.7 | MEET-020 | Suggested Buyer (Purchase History) | 8h | 4.B.1 | - |
| 4.B.8 | MEET-022 | Reverse Lookup (Product Connections) | 8h | 4.B.1 | - |
| 4.B.9 | MEET-055 | Office Needs Auto-Population | 8h | 4.B.6 | - |
| 4.B.10 | WS-011 | Quick Customer Creation | 4h | 4.B.1 | WS-011 |

### Track C: In-line Product Creation (Agent 3) - 64h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.C.1 | FEAT-003-INLINE | In-line Product Creation API | 24h | None | FEAT-003 |
| 4.C.2 | ENH-003 | In-line Product Creation UI | 16h | 4.C.1 | ENH-003 |
| 4.C.3 | MEET-031 | Hide SKU Field | 2h | 4.C.2 | - |
| 4.C.4 | MEET-037 | Editable Product Names | 2h | 4.C.2 | - |
| 4.C.5 | MEET-033 | Searchable Supplier Dropdown | 4h | 4.C.2 | - |
| 4.C.6 | MEET-040 | Product: Name, Category, Brand Fields | 4h | 4.C.2 | - |
| 4.C.7 | WS-006 | Immediate Tab Screenshot/Receipt | 12h | None | WS-006 |

### Track D: Scheduling System (Agent 4) - 72h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 4.D.1 | FEAT-005-BE | Scheduling & Referral APIs | 24h | None | FEAT-005 |
| 4.D.2 | ENH-005 | Scheduling Workflow UI | 16h | 4.D.1 | ENH-005 |
| 4.D.3 | MEET-046 | Live Appointments | 8h | 4.D.2 | - |
| 4.D.4 | MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 4h | 4.D.3 | - |
| 4.D.5 | MEET-072 | Notification System for Tagging | 8h | 4.D.2 | - |
| 4.D.6 | MEET-034 | Expected Delivery Date | 4h | 4.D.1 | - |
| 4.D.7 | MEET-050 | Shift/Vacation Tracking | 8h | 4.D.1 | - |

### Sprint 4 QA Gate

```
VALIDATION CHECKLIST (Must all pass before Sprint 5):
[ ] Inventory browser shows enhanced data columns
[ ] Aging indicator shows red for >2 week items
[ ] Dashboard aging widget displays correctly
[ ] Image toggle works in inventory views
[ ] Low stock alerts fire when threshold reached (WS-008)
[ ] Inventory movement tracked with shrinkage detection (WS-009)
[ ] Client Info Pod displays unified context
[ ] Clients work as both buyers AND suppliers
[ ] Client tagging with referrer works
[ ] Referrer lookup returns correct results
[ ] Client wants/needs tracked and searchable
[ ] Quick customer creation works (WS-011)
[ ] In-line product creation works during order
[ ] SKU field hidden per user request
[ ] Product names are editable
[ ] Supplier dropdown is searchable (100+ suppliers)
[ ] Tab screenshot/receipt generation works (WS-006)
[ ] Scheduling appointments work
[ ] Multiple rooms can be booked
[ ] Notifications fire for tagged users
```

**Sprint 4 Parallel Execution:** 4 agents, ~108h elapsed time

---

## Sprint 5: Wave 4 - VIP & Polish (292h)

> **LOWER PRIORITY** - Differentiation features
> **Prerequisites:** Sprint 4 complete
> **Dependencies:** Client 360 for VIP Portal

### Track A: VIP Portal Enhancement (Agent 1) - 72h

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

### Track B: Gamification (Agent 2) - 48h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.B.1 | MEET-044 | Anonymized Leaderboard | 12h | 5.A.1 | - |
| 5.B.2 | MEET-045 | Rewards System (Medals, Markup %) | 16h | 5.B.1 | - |
| 5.B.3 | FEAT-006 | Full Referral (Couch Tax) Workflow | 20h | 4.D.1 | FEAT-006 |

### Track C: UI Polish (Agent 3) - 44h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.C.1 | ENH-006 | Relocate Order Preview | 4h | None | ENH-006 |
| 5.C.2 | MEET-053 | User-Friendly Terminology | 4h | None | - |
| 5.C.3 | UX-010 | Clarify My Account vs User Settings | 2h | None | - |
| 5.C.4 | UX-011 | Fix Two Export Buttons Issue | 2h | None | - |
| 5.C.5 | UX-012 | Fix Period Display Formatting | 2h | None | - |
| 5.C.6 | UX-013 | Fix Mirrored Elements Issue | 2h | None | - |
| 5.C.7 | MEET-015 | Sales Sheet Creator | 12h | 3.B.1 | - |
| 5.C.8 | WS-010 | Photography Module | 16h | None | WS-010 |

### Track D: Transaction & Product Features (Agent 4) - 68h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.D.1 | MEET-017 | Invoice History (Debt Disputes) | 8h | 2.D.1 | - |
| 5.D.2 | MEET-018 | Transaction Fee Per Client | 8h | 4.B.1 | - |
| 5.D.3 | MEET-035 | Payment Terms (Consignment/Cash/COD) | 12h | 3.D.3 | - |
| 5.D.4 | MEET-032 | Customizable Categories | 8h | 4.C.1 | - |
| 5.D.5 | MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 4h | 5.D.4 | - |
| 5.D.6 | MEET-009 | Billing for Services (Shipping, Consulting) | 8h | 2.D.1 | - |
| 5.D.7 | MEET-019 | Crypto Payment Tracking | 8h | 3.D.3 | - |
| 5.D.8 | MEET-036 | Installment Payments | 12h | 5.D.3 | - |

### Track E: Storage & Location (Agent 5) - 60h

| Order | Task ID | Description | Est | Dependencies | Spec |
|-------|---------|-------------|-----|--------------|------|
| 5.E.1 | MEET-067 | Storage Zones (A, B, C, D) | 8h | None | - |
| 5.E.2 | MEET-068 | Three Sites (Samples, Storage, Shipping) | 4h | 5.E.1 | - |
| 5.E.3 | MEET-069 | Category/Subcategory Data Flow | 4h | 5.D.4 | - |
| 5.E.4 | MEET-048 | Hour Tracking | 8h | 4.D.7 | - |
| 5.E.5 | MEET-051 | User Roles & Permissions Enhancement | 8h | None | - |
| 5.E.6 | MEET-058 | Copy-Paste Office Needs | 4h | 4.B.9 | - |
| 5.E.7 | WS-013 | Simple Task Management | 12h | None | WS-013 |
| 5.E.8 | WS-014 | Vendor Harvest Reminders | 8h | None | WS-014 |

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
[ ] Photography module captures/displays images (WS-010)
[ ] All UX polish items resolved
[ ] Invoice history searchable for disputes
[ ] Transaction fees configurable per client
[ ] Payment terms (consignment/cash/COD) work
[ ] Product grades selectable
[ ] Simple task management works (WS-013)
[ ] Vendor harvest reminders fire correctly (WS-014)
[ ] Storage zones functional
[ ] Full E2E test suite: 0 FAIL, 0 BLOCKED
```

**Sprint 5 Parallel Execution:** 5 agents, ~72h elapsed time

---

# PART 4: TRACEABILITY MATRIX

## All 75 MEET Items Tracked

| MEET ID | Description | Sprint | Track | Status |
|---------|-------------|--------|-------|--------|
| MEET-001 | Dashboard: Available Money Display | 2 | A | 🔴 TODO |
| MEET-002 | Multi-Location Cash (Z + Doc) | 2 | A | 🔴 TODO |
| MEET-003 | Z's Cash Audit - In/Out Ledger | 2 | A | 🔴 TODO |
| MEET-004 | Shift Payment Tracking with Reset | 2 | A | 🔴 TODO |
| MEET-005 | Payables Due When SKU Hits Zero | 3 | D | 🔴 TODO |
| MEET-006 | Office Owned Inventory Tracking | 3 | D | 🔴 TODO |
| MEET-007 | Clients as Buyers AND Suppliers | 4 | B | 🔴 TODO |
| MEET-008 | Complex Tab (Jesse example) | 4 | B | 🔴 TODO |
| MEET-009 | Billing for Services | 5 | D | 🔴 TODO |
| MEET-010 | Simple Client Ledger | 2 | D | 🔴 TODO |
| MEET-011 | New Clients Added Infrequently | - | - | 📝 CONTEXT |
| MEET-012 | Client Tagging with Referrer | 4 | B | 🔴 TODO |
| MEET-013 | Referrer Lookup | 4 | B | 🔴 TODO |
| MEET-014 | Variable Markups (Age/Quantity) | 3 | B | 🔴 TODO |
| MEET-015 | Sales Sheet Creator | 5 | C | 🔴 TODO |
| MEET-016 | Live Sales Now Primary Method | - | - | 📝 CONTEXT |
| MEET-017 | Invoice History (Debt Disputes) | 5 | D | 🔴 TODO |
| MEET-018 | Transaction Fee Per Client | 5 | D | 🔴 TODO |
| MEET-019 | Crypto Payment Tracking | 5 | D | 🔴 TODO |
| MEET-020 | Suggested Buyer (Purchase History) | 4 | B | 🔴 TODO |
| MEET-021 | Client Wants/Needs Tracking | 4 | B | 🔴 TODO |
| MEET-022 | Reverse Lookup (Product Connections) | 4 | B | 🔴 TODO |
| MEET-023 | Batch Tracking for Inventory | 4 | A | 🔴 TODO |
| MEET-024 | Aging Inventory Visual | 4 | A | 🔴 TODO |
| MEET-025 | Dashboard Aging Quick View | 4 | A | 🔴 TODO |
| MEET-026 | Real-time Price Negotiation | 3 | B | 🔴 TODO |
| MEET-027 | Vendor vs Brand Distinction | 3 | C | 🔴 TODO |
| MEET-028 | Brand → Farmer Code Terminology | 3 | C | 🔴 TODO |
| MEET-029 | Vendor Tied to Farmer Name | 3 | C | 🔴 TODO |
| MEET-030 | Vendor Search Shows Related Brands | 3 | C | 🔴 TODO |
| MEET-031 | Hide SKU Field | 4 | C | 🔴 TODO |
| MEET-032 | Customizable Categories | 5 | D | 🔴 TODO |
| MEET-033 | Searchable Supplier Dropdown | 4 | C | 🔴 TODO |
| MEET-034 | Expected Delivery Date | 4 | D | 🔴 TODO |
| MEET-035 | Payment Terms (Consignment/Cash/COD) | 5 | D | 🔴 TODO |
| MEET-036 | Installment Payments | 5 | D | 🔴 TODO |
| MEET-037 | Editable Product Names | 4 | C | 🔴 TODO |
| MEET-038 | Notes on Product Pricing | 3 | B | 🔴 TODO |
| MEET-039 | Quick Action Pricing Visibility | 3 | B | 🔴 TODO |
| MEET-040 | Product: Name, Category, Brand | 4 | C | 🔴 TODO |
| MEET-041 | VIP Debt Aging Notifications | 5 | A | 🔴 TODO |
| MEET-042 | Credit Usage Display | 5 | A | 🔴 TODO |
| MEET-043 | VIP Status (Debt Cycling Tiers) | 5 | A | 🔴 TODO |
| MEET-044 | Anonymized Leaderboard | 5 | B | 🔴 TODO |
| MEET-045 | Rewards System (Medals, Markup %) | 5 | B | 🔴 TODO |
| MEET-046 | Live Appointments | 4 | D | 🔴 TODO |
| MEET-047 | Multiple Rooms (2 meeting + 2 loading) | 4 | D | 🔴 TODO |
| MEET-048 | Hour Tracking | 5 | E | 🔴 TODO |
| MEET-049 | Calendar Navigation Bug | 1 | C | ✅ COMPLETE |
| MEET-050 | Shift/Vacation Tracking | 4 | D | 🔴 TODO |
| MEET-051 | User Roles & Permissions | 5 | E | 🔴 TODO |
| MEET-052 | VIP Purchase History | 5 | A | 🔴 TODO |
| MEET-053 | User-Friendly Terminology | 5 | C | 🔴 TODO |
| MEET-054 | VIP Needs/Wants Entry | 5 | A | 🔴 TODO |
| MEET-055 | Office Needs Auto-Population | 4 | B | 🔴 TODO |
| MEET-056 | Centralized VIP Requests | 5 | A | 🔴 TODO |
| MEET-057 | Matchmaking (Needs ↔ Supplies) | 5 | A | 🔴 TODO |
| MEET-058 | Copy-Paste Office Needs | 5 | E | 🔴 TODO |
| MEET-059 | No AI Integration (Constraint) | - | - | 🔒 CONSTRAINT |
| MEET-060 | AI: Suggested Quantities | BACKLOG | - | ⏸️ DEFERRED |
| MEET-061 | Suggested Purchase Price (History) | 3 | B | 🔴 TODO |
| MEET-062 | Last Sale Price Lookup | 3 | B | 🔴 TODO |
| MEET-063 | Farmer Receipt History Link | 3 | B | 🔴 TODO |
| MEET-064 | Intake Receipt Tool | 2 | C | 🔴 TODO |
| MEET-065 | Verification Process (stacker confirms) | 2 | C | 🔴 TODO |
| MEET-066 | Intake Flow Terminology | 2 | C | 🔴 TODO |
| MEET-067 | Storage Zones (A, B, C, D) | 5 | E | 🔴 TODO |
| MEET-068 | Three Sites (Samples, Storage, Shipping) | 5 | E | 🔴 TODO |
| MEET-069 | Category/Subcategory Data Flow | 5 | E | 🔴 TODO |
| MEET-070 | Product Grades (AAAA/AAA/AA/B/C) | 5 | D | 🔴 TODO |
| MEET-071 | VIP Client Management (Admin) | 5 | A | 🔴 TODO |
| MEET-072 | Notification System for Tagging | 4 | D | 🔴 TODO |
| MEET-073 | Large Distributor Pricing | BACKLOG | - | ⏸️ DEFERRED |
| MEET-074 | Modular Sales Options | BACKLOG | - | ⏸️ DEFERRED |
| MEET-075 | Live Shopping Feature | 3 | A | 🔴 TODO |

## Summary by Status

| Status | Count |
|--------|-------|
| ✅ COMPLETE | 1 (MEET-049) |
| 🔴 TODO | 69 |
| 📝 CONTEXT | 2 (MEET-011, MEET-016) |
| 🔒 CONSTRAINT | 1 (MEET-059) |
| ⏸️ DEFERRED | 3 (MEET-060, 073, 074) |
| **TOTAL** | **75** |

---

# PART 5: EXECUTION TIMELINE

## Parallel Execution Summary

| Sprint | Total Hours | Parallel Hours | Agents | Focus |
|--------|-------------|----------------|--------|-------|
| 0 | 22h | 9h | 3 | ✅ Foundation |
| 1 | 35h | 14h | 3 | ✅ Critical UI Fixes |
| 2 | 98h | 34h | 4 | Wave 1: Stop Bleeding |
| 3 | 208h | 96h | 4 | Wave 2: Core Ops |
| 4 | 324h | 108h | 4 | Wave 3: Enhanced |
| 5 | 292h | 72h | 5 | Wave 4: VIP & Polish |
| **TOTAL** | **979h** | **333h** | - | - |

## Recommended Execution Order

```
IMMEDIATE (Sprint 2):
├── Start all 4 tracks in parallel
├── Cash Audit (Track A/B) - Backend first, then Frontend
├── Intake Verification (Track C) - Can run in parallel
├── Client Ledger (Track D) - Can run in parallel
└── QA Gate before Sprint 3

NEXT (Sprint 3):
├── Live Shopping (Track A) - Standalone
├── Pricing Engine (Track B) - Most complex, start early
├── Vendor/Brand (Track C) - Foundation for Sprint 4
├── Payables (Track D) - Depends on Client Ledger
└── QA Gate before Sprint 4

THEN (Sprint 4):
├── Enhanced Inventory (Track A) - Standalone
├── Client 360 (Track B) - Depends on Vendor Context
├── In-line Product (Track C) - Standalone
├── Scheduling (Track D) - Standalone
└── QA Gate before Sprint 5

FINALLY (Sprint 5):
├── VIP Portal (Track A) - Depends on Client 360
├── Gamification (Track B) - Depends on VIP Status
├── UI Polish (Track C) - Standalone
├── Transactions (Track D) - Various dependencies
├── Storage (Track E) - Standalone
└── Final MVP QA Gate
```

---

# PART 6: RISK REGISTER

| Risk ID | Description | Severity | Mitigation | Status |
|---------|-------------|----------|------------|--------|
| RISK-001 | Missing Wave 1 specs | ~~CRITICAL~~ | FEAT-007, 008, 009 created | ✅ RESOLVED |
| RISK-002 | Database fixes incomplete | ~~HIGH~~ | Sprint 0 complete | ✅ RESOLVED |
| RISK-003 | RBAC blocks QA testing | ~~HIGH~~ | Sprint 0 Track C fixed | ✅ RESOLVED |
| RISK-004 | Parallel agents cause merge conflicts | MEDIUM | Each track owns different files | 🔶 MITIGATED |
| RISK-005 | QA gates slow execution | LOW | Necessary for quality | 🔶 ACCEPTED |
| RISK-006 | Bug count increases during sprints | MEDIUM | P0/P1 to current sprint | 🔶 MITIGATED |
| RISK-007 | Vendor Context blocks Client 360 | MEDIUM | Prioritize 3.C.1 early | ⚠️ ACTIVE |

---

# APPENDIX A: APPROVED SPECIFICATIONS

## Wave 1 Critical Specs (All Approved)

| Spec | Title | Location | Status |
|------|-------|----------|--------|
| FEAT-007 | Cash Audit System | `docs/specs/FEAT-007-CASH-AUDIT-SPEC.md` | ✅ APPROVED |
| FEAT-008 | Intake Verification | `docs/specs/FEAT-008-INTAKE-VERIFICATION-SPEC.md` | ✅ APPROVED |
| FEAT-009 | Client Ledger | `docs/specs/FEAT-009-CLIENT-LEDGER-SPEC.md` | ✅ APPROVED |

## Backend API Specs

| Spec | Title | Location | Status |
|------|-------|----------|--------|
| FEAT-001 | Enhanced Inventory Data API | `docs/specs/FEAT-001-SPEC.md` | Draft |
| FEAT-002 | Vendor Context API | `docs/specs/FEAT-002-SPEC.md` | Draft |
| FEAT-003 | In-line Product Creation API | `docs/specs/FEAT-003-INLINE-PRODUCT-SPEC.md` | Draft |
| FEAT-004 | Pricing & Credit Logic | `docs/specs/FEAT-004-SPEC.md` | Draft |
| FEAT-005 | Scheduling & Referral APIs | `docs/specs/FEAT-005-SPEC.md` | Draft |
| FEAT-006 | Referral Workflow | `docs/specs/FEAT-006-SPEC.md` | Draft |

## Frontend Integration Specs

| Spec | Title | Location | Status |
|------|-------|----------|--------|
| ENH-001 | Inventory Browser Table | `docs/specs/ENH-001-SPEC.md` | Draft |
| ENH-002 | Client Info Pod | `docs/specs/ENH-002-SPEC.md` | Draft |
| ENH-003 | In-line Product Creation UI | `docs/specs/ENH-003-SPEC.md` | Draft |
| ENH-004 | On-the-Fly Pricing UI | `docs/specs/ENH-004-SPEC.md` | Draft |
| ENH-005 | Scheduling Workflow UI | `docs/specs/ENH-005-SPEC.md` | Draft |
| ENH-006 | Relocate Order Preview | `docs/specs/ENH-006-SPEC.md` | Draft |
| ENH-007 | Nomenclature Changes | `docs/specs/ENH-007-SPEC.md` | Draft |
| ENH-008 | Image Toggle | `docs/specs/ENH-008-SPEC.md` | Draft |

## Cooper Rd Sprint Specs

| Spec | Title | Location | Status |
|------|-------|----------|--------|
| WS-001 to WS-014 | Cooper Rd Working Session | `docs/specs/WS-*-SPEC.md` | Approved |
| FEATURE-003 | Live Shopping | `docs/specs/FEATURE-003-SPEC.md` | Approved |

---

# APPENDIX B: COMMANDS REFERENCE

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm tsc --noEmit          # TypeScript check

# Testing
pnpm test:unit             # Run unit tests
pnpm test:e2e              # Run E2E tests
pnpm validate:schema       # Schema validation

# QA
pnpm seed:qa-accounts      # Seed QA test accounts
pnpm lint                  # Run linter

# Database
pnpm db:push               # Push schema changes
pnpm db:studio             # Open Drizzle Studio
```

---

**Document Status:** ACTIVE
**Version:** 1.0
**Created:** 2026-01-19
**Author:** Claude AI Strategic Analysis
**Next Review:** After Sprint 2 completion

---

*This document is the authoritative source for MVP execution. It supersedes all previous execution plans for implementation purposes.*
