# Intent Source Register

**Purpose:** Ranked catalog of all documents that define intended system behavior
**Created:** 2026-01-29
**Authority Rules:** Higher rank wins when sources conflict

---

## Authority Ranking

| Rank | Source Type | Resolution Rule |
|------|-------------|-----------------|
| 1 (HIGHEST) | Golden Flow Specs | Explicit, versioned specifications |
| 2 | Feature Specs | Formal feature requirements |
| 3 | Kiro Requirements | Design requirements documents |
| 4 | Master Roadmap | Approved task definitions |
| 5 | Protocol Docs | Standards and conventions |
| 6 | QA Playbook | Process expectations (not intent) |
| 7 (LOWEST) | UI Copy | Only if consistent and explicit |

When sources conflict at the same rank: Mark as **UNRESOLVED** and create Spec Decision Needed item.

---

## Rank 1: Golden Flow Specifications (HIGHEST)

**Location:** `docs/golden-flows/specs/`
**Authority:** Defines the 8 critical user journeys

| Source | Version | Scope | Status | Notes |
|--------|---------|-------|--------|-------|
| `GF-001-DIRECT-INTAKE.md` | 3.0 | Inventory intake without PO | Draft | Includes FEAT-008 verification dependency |
| `GF-002-PROCURE-TO-PAY.md` | 1.1 | PO creation to vendor payment | Draft | PO Receiving UI not implemented |
| `GF-003-ORDER-TO-CASH.md` | 1.2 | Sales order to fulfillment | Draft | Most critical flow |
| `GF-004-INVOICE-PAYMENT.md` | 2.0 | AR invoicing and payment | Implemented | Substantially complete |
| `GF-005-PICK-PACK.md` | 2.0 | Warehouse fulfillment | Active | Two parallel systems |
| `GF-006-CLIENT-LEDGER.md` | 1.2 | AR/AP visibility | Active | A+ verification level |
| `GF-007-INVENTORY-MGMT.md` | 1.1 | Batch inventory operations | Verified | Code-verified spec |
| `GF-008-SAMPLE-REQUEST.md` | 1.1 | Sample distribution | Verified | Fulfillment UI gap noted |

**Critical Content:**
- User journeys with numbered steps
- UI state definitions
- API endpoint specifications
- Data model requirements
- Business rules and invariants
- Error states and recovery paths

---

## Rank 2: Feature Specifications

**Location:** `docs/specs/`
**Authority:** Individual feature requirements

### Cooper Rd Sprint Specs (WS-001 to WS-015)
| Source | Scope | Status |
|--------|-------|--------|
| `WS-001-SPEC.md` | Receive Client Payment | Complete |
| `WS-002-SPEC.md` | Pay Vendor | Complete |
| `WS-003-SPEC.md` | Pick & Pack Module | Complete |
| `WS-004-SPEC.md` | Multi-Order & Referral Credit | Complete |
| `WS-005-SPEC.md` | Audit Trail | Complete |
| `WS-006-SPEC.md` | Screenshot/Receipt | Complete |
| `WS-007-SPEC.md` | Complex Flower Intake | Complete |
| `WS-008-SPEC.md` | Low Stock Alerts | Complete |
| `WS-009-SPEC.md` | Inventory Movement SOP | Complete |
| `WS-010-SPEC.md` | Photography Module | Complete |
| `WS-011-SPEC.md` | Quick Customer Creation | Complete |
| `WS-012-SPEC.md` | Customer Preferences | Complete |
| `WS-013-SPEC.md` | Task Management | Complete |
| `WS-014-SPEC.md` | Vendor Harvest Reminder | Complete |

### Core Feature Specs
| Source | Scope | Status |
|--------|-------|--------|
| `FEAT-001-SPEC.md` | Feature 001 | Reference |
| `FEAT-008-INTAKE-VERIFICATION-SPEC.md` | Two-step intake verification | Active |
| `FEAT-009-CLIENT-LEDGER-SPEC.md` | Client ledger details | Active |
| `FEATURE-011-SPEC.md` | Unified Product Catalogue | Complete |
| `FEATURE-012-SPEC.md` | VIP Portal Impersonation | Complete |
| `FEATURE-FLAG-SYSTEM-SPEC.md` | Feature flag system | Complete |
| `NOTIF-001-SPEC.md` | Notification triggers | Complete |

---

## Rank 3: Kiro Requirements

**Location:** `.kiro/specs/*/requirements.md`
**Authority:** Design-level requirements

| Source | Scope | Status |
|--------|-------|--------|
| `canonical-model-unification/requirements.md` | Party model consolidation | Complete |
| `customer-credit-system-improvement/requirements.md` | Credit system | Complete |
| `unified-sales-live-shopping/requirements.md` | Live shopping | In Progress |
| `database-seeding-system/requirements.md` | Test data seeding | Complete |
| `vendor-to-supplier-frontend-unification/requirements.md` | Terminology migration | Complete |

---

## Rank 4: Master Roadmap

**Location:** `docs/roadmaps/MASTER_ROADMAP.md`
**Authority:** Approved task definitions and status

**Version:** 7.2 (2026-01-27)

**Key Sections:**
- MVP Milestone tasks
- Beta Milestone tasks
- Completed work (verified)
- In-progress tasks

**Usage:** Reference for task status, NOT for behavior specification.
Behavior is defined in Golden Flow specs; roadmap tracks implementation progress.

---

## Rank 5: Protocol Documents

**Location:** `docs/protocols/`
**Authority:** Standards and conventions

| Source | Scope | Notes |
|--------|-------|-------|
| `CANONICAL_DICTIONARY.md` | Terminology, party model | v1.0, 2025-12-16 |
| `CODE_STANDARDS.md` | Development conventions | Standards doc |
| `DATABASE_STANDARDS.md` | DB naming, indexes | Standards doc |
| `NAMING_CONVENTIONS.md` | Naming rules | Standards doc |
| `TESTING_QUALITY.md` | QA standards | Standards doc |

---

## Rank 6: QA Documentation

**Location:** `docs/qa/`
**Authority:** Process expectations (NOT intent)

| Source | Scope | Notes |
|--------|-------|-------|
| `QA_PLAYBOOK.md` | Test process, role definitions | Defines test accounts |
| `QA_PROTOCOL_V3.md` | 5-lens QA methodology | Process doc |
| `TEST_DATA_STRATEGY.md` | Test data approach | Process doc |

**Important:** QA docs define how to test, not what behavior should be.
Use for RBAC role definitions but not for feature intent.

---

## Rank 7: UI Copy (Lowest)

**Authority:** Only when explicit and consistent

UI labels and copy MAY indicate intent when:
1. Consistent across the application
2. Explicitly documented in specs
3. No conflicting higher-authority source

**Example:** Button labeled "New Intake" (not "New Purchase") per MEET-066 terminology change.

---

## Conflict Resolution Process

When intent sources conflict:

1. **Check authority rank** - Higher rank wins
2. **Check recency** - More recent version wins (if same rank)
3. **Check explicitness** - Explicit statement wins over implicit
4. **If still unclear** - Mark as UNRESOLVED

### UNRESOLVED Items Require:
- Citation of conflicting sources
- Summary of conflict
- Proposed resolution
- Escalation to Evan for decision

---

## Intent Source Statistics

| Category | Document Count | Coverage |
|----------|---------------|----------|
| Golden Flow Specs | 8 | 8 critical flows |
| Feature Specs | 50+ | Individual features |
| Kiro Requirements | 17 | Design specs |
| Protocol Docs | 10 | Standards |
| QA Docs | 40+ | Test process |
| **Total Intent Documents** | ~125+ | Full system |
