# TERP Golden Flows Beta - Roadmap

**Last Updated:** 2026-02-07  
**Source of Truth:** [Linear Project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)  
**Status:** This file is a backup. Linear is the primary source of truth for roadmap tasks.

---

## Current State Summary

| Phase                                | Status         | Progress |
| ------------------------------------ | -------------- | -------- |
| Phase 0.A: Golden Flow Specification | ✅ COMPLETE    | 8/8      |
| Phase 0: Critical Blockers           | ✅ COMPLETE    | 19/19    |
| Phase 1: Core Flow Restoration       | ✅ COMPLETE    | 27/27    |
| QA & Testing Infrastructure          | ✅ COMPLETE    | 4/4      |
| Post-QA Bug Fixes                    | 🟡 IN PROGRESS | 0/4      |

**Overall:** 58/62 TERP tasks complete. **4 open items remain.**

**Beta Assessment:** CONDITIONAL GO — 97.7% application health, 9/9 Golden Flows passing.

---

## Open Items (4 tickets)

| Ticket                                                                                                           | Priority  | Title                                                     | Status | Blocker?                                 |
| ---------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------- | ------ | ---------------------------------------- |
| [TER-92](https://linear.app/terpcorp/issue/TER-92/qa-create-rbac-qa-role-accounts-for-beta-verification)         | P1 Urgent | Create RBAC QA Role Accounts for Beta Verification        | Todo   | **YES** — sole beta blocker              |
| [TER-93](https://linear.app/terpcorp/issue/TER-93/devops-fix-deployment-health-check-failure-staging-stale)      | P2 High   | Fix Deployment Health Check Failure - Staging Stale       | Todo   | Likely fixed by CI merge, needs redeploy |
| [TER-94](https://linear.app/terpcorp/issue/TER-94/bug-direct-intake-returns-404-despite-sidebar-link)            | P3 Medium | /direct-intake returns 404 despite sidebar link           | Todo   | No — can ship as known issue             |
| [TER-95](https://linear.app/terpcorp/issue/TER-95/bug-client-detail-page-shows-infinite-loading-for-invalid-ids) | P3 Medium | Client detail page shows infinite loading for invalid IDs | Todo   | No — can ship as known issue             |

---

## Phase 0.A: Golden Flow Specification

**Status:** ✅ COMPLETE  
**Progress:** 8/8 tasks complete

### Done

- **[TER-25](https://linear.app/terpcorp/issue/TER-25):** GF-PHASE0A-008: Define GF-008 Sample Request Specification
- **[TER-24](https://linear.app/terpcorp/issue/TER-24):** GF-PHASE0A-007: Define GF-007 Inventory Management Specification
- **[TER-23](https://linear.app/terpcorp/issue/TER-23):** GF-PHASE0A-006: Define GF-006 Client Ledger Specification
- **[TER-22](https://linear.app/terpcorp/issue/TER-22):** GF-PHASE0A-005: Define GF-005 Pick & Pack Specification
- **[TER-21](https://linear.app/terpcorp/issue/TER-21):** GF-PHASE0A-004: Define GF-004 Invoice & Payment Specification
- **[TER-20](https://linear.app/terpcorp/issue/TER-20):** GF-PHASE0A-003: Define GF-003 Order-to-Cash Specification
- **[TER-19](https://linear.app/terpcorp/issue/TER-19):** GF-PHASE0A-002: Define GF-002 Procure-to-Pay Specification
- **[TER-18](https://linear.app/terpcorp/issue/TER-18):** GF-PHASE0A-001: Define GF-001 Direct Intake Specification

---

## Phase 0: Critical Blockers

**Status:** ✅ COMPLETE  
**Progress:** 19/19 tasks complete

### Done

- **[TER-5](https://linear.app/terpcorp/issue/TER-5):** GF-PHASE0-001a: Investigate Critical SQL Error on Inventory Load
- **[TER-6](https://linear.app/terpcorp/issue/TER-6):** GF-PHASE0-001b: Fix Critical SQL Error on Inventory Load
- **[TER-32](https://linear.app/terpcorp/issue/TER-32):** GF-PHASE0-008: Database Schema Audit Review & Prioritization
- **[TER-31](https://linear.app/terpcorp/issue/TER-31):** GF-PHASE0-007: Fix Migration System Infrastructure
- **[TER-30](https://linear.app/terpcorp/issue/TER-30):** GF-PHASE0-006: Create Missing product_images Table
- **[TER-29](https://linear.app/terpcorp/issue/TER-29):** GF-PHASE0-005: Fix Photography Module Schema Drift
- **[TER-28](https://linear.app/terpcorp/issue/TER-28):** GF-PHASE0-004: Fix Order State Machine Test Failures
- **[TER-27](https://linear.app/terpcorp/issue/TER-27):** GF-PHASE0-003: Fix Dashboard/Inventory Data Mismatch
- **[TER-26](https://linear.app/terpcorp/issue/TER-26):** GF-PHASE0-002: Fix Sales Rep RBAC Failure (VERIFIED - Working)

_Note: TER-7 through TER-17 are duplicate entries of the above tasks from an earlier import. All are marked Done._

---

## Phase 1: Core Flow Restoration

**Status:** ✅ COMPLETE  
**Progress:** 27/27 tasks complete

### Phase 1 — Implementation (Done)

- **[TER-33](https://linear.app/terpcorp/issue/TER-33):** GF-PHASE1-001: Restore Direct Intake Form (GF-001)
- **[TER-34](https://linear.app/terpcorp/issue/TER-34):** GF-PHASE1-002: Fix PO Product Dropdown (GF-002)
- **[TER-35](https://linear.app/terpcorp/issue/TER-35):** GF-PHASE1-003: Fix Sample Request Product Selector (GF-008)
- **[TER-36](https://linear.app/terpcorp/issue/TER-36):** GF-PHASE1-004: Fix Invoice PDF Generation (GF-004)
- **[TER-37](https://linear.app/terpcorp/issue/TER-37):** GF-PHASE1-005: Fix AR/AP Data Inconsistencies (GF-006)
- **[TER-38](https://linear.app/terpcorp/issue/TER-38):** GF-PHASE1-006: Fix Client Creation Silent Failure

### Phase 2 — Integration & Verification (Done)

- **[TER-39](https://linear.app/terpcorp/issue/TER-39):** GF-PHASE2-001: Wire Payment Recording Mutation
- **[TER-40](https://linear.app/terpcorp/issue/TER-40):** GF-PHASE2-002: Complete Pick & Pack Flow Testing
- **[TER-41](https://linear.app/terpcorp/issue/TER-41):** GF-PHASE2-003: Verify GL Entries on Invoice/Payment
- **[TER-42](https://linear.app/terpcorp/issue/TER-42):** GF-PHASE2-004: Complete Order-to-Cash Full Flow
- **[TER-43](https://linear.app/terpcorp/issue/TER-43):** GF-PHASE2-005: Integrate GL Reversal Visibility Components
- **[TER-44](https://linear.app/terpcorp/issue/TER-44):** GF-PHASE2-006: Integrate COGS Visibility Components

### Phase 3 — RBAC Verification (Done)

- **[TER-45](https://linear.app/terpcorp/issue/TER-45):** GF-PHASE3-001: Verify Sales Flows with Sales Rep Role
- **[TER-46](https://linear.app/terpcorp/issue/TER-46):** GF-PHASE3-002: Verify Inventory Flows with Inventory Role
- **[TER-47](https://linear.app/terpcorp/issue/TER-47):** GF-PHASE3-003: Verify Accounting Flows with Accounting Role
- **[TER-48](https://linear.app/terpcorp/issue/TER-48):** GF-PHASE3-004: Verify Fulfillment Flows with Fulfillment Role
- **[TER-49](https://linear.app/terpcorp/issue/TER-49):** GF-PHASE3-005: Verify Read-Only Auditor Access

### Phase 4 — E2E Testing (Done)

- **[TER-50](https://linear.app/terpcorp/issue/TER-50):** GF-PHASE4-001: E2E Test for GF-001 Direct Intake
- **[TER-51](https://linear.app/terpcorp/issue/TER-51):** GF-PHASE4-002: E2E Test for GF-003 Order-to-Cash
- **[TER-52](https://linear.app/terpcorp/issue/TER-52):** GF-PHASE4-003: E2E Tests for Remaining Flows
- **[TER-53](https://linear.app/terpcorp/issue/TER-53):** GF-PHASE4-004: CI Integration for Golden Flow Tests

### Phase 5 — Security, Docs & Beta Prep (Done)

- **[TER-54](https://linear.app/terpcorp/issue/TER-54):** GF-PHASE5-001: Fix Test Infrastructure Issues
- **[TER-55](https://linear.app/terpcorp/issue/TER-55):** GF-PHASE5-002: Update Golden Flow Documentation
- **[TER-56](https://linear.app/terpcorp/issue/TER-56):** GF-PHASE5-003: Security Review for Beta
- **[TER-57](https://linear.app/terpcorp/issue/TER-57):** GF-PHASE5-004: Beta Testing Checklist
- **[TER-58](https://linear.app/terpcorp/issue/TER-58):** GF-PHASE5-005: Fix QA Password Hint Exposure (Security)
- **[TER-59](https://linear.app/terpcorp/issue/TER-59):** GF-PHASE5-006: Fix Fallback User ID Pattern (Security)

---

## QA & Testing Infrastructure

**Status:** ✅ COMPLETE  
**Progress:** 4/4 tasks complete

- **[TER-87](https://linear.app/terpcorp/issue/TER-87):** Fix Testing Infrastructure - Entity ID Resolution
- **[TER-88](https://linear.app/terpcorp/issue/TER-88):** Fix Testing Infrastructure - Strengthen Validation Logic
- **[TER-89](https://linear.app/terpcorp/issue/TER-89):** Fix Testing Infrastructure - Enhanced Error Handling & Classification
- **[TER-90](https://linear.app/terpcorp/issue/TER-90):** Testing Infrastructure - Validation & Regression Testing
- **[TER-91](https://linear.app/terpcorp/issue/TER-91):** Execute Full P0 Suite with Fixed Testing Infrastructure

---

## Post-QA Bug Fixes

**Status:** 🟡 IN PROGRESS  
**Progress:** 0/4 tasks

These issues were discovered during the QA Runtime Testing on 2026-02-07:

- **[TER-92](https://linear.app/terpcorp/issue/TER-92):** [P1 Urgent] Create RBAC QA Role Accounts for Beta Verification — **BETA BLOCKER**
- **[TER-93](https://linear.app/terpcorp/issue/TER-93):** [P2 High] Fix Deployment Health Check Failure - Staging Stale — Likely fixed by CI merge (`60d808e9`), needs redeploy to confirm
- **[TER-94](https://linear.app/terpcorp/issue/TER-94):** [P3 Medium] /direct-intake returns 404 despite sidebar link
- **[TER-95](https://linear.app/terpcorp/issue/TER-95):** [P3 Medium] Client detail page shows infinite loading for invalid IDs

---

## CI Infrastructure (Merged 2026-02-07)

The following CI improvements were merged to `main` as commit `60d808e9`:

- Standardized all 6 CI workflows to Node 22, pnpm 10.4.1, action-setup v4
- Aligned Dockerfile with CI versions (Node 22, pnpm 10.4.1)
- Hardened MySQL wait loops with max attempts and timeout
- Set TypeScript error baseline to 0 (all 869 errors resolved)
- Fixed SampleManagement test failures (missing productOptions mock)
- Added scrollIntoView mock to test setup for cmdk combobox
- Enforced `--frozen-lockfile` consistently across all workflows

---

## Miscellaneous

- **[TER-60](https://linear.app/terpcorp/issue/TER-60):** QA Verification Report - Feb 3, 2026 Deployment (Backlog — historical reference)
- **TER-2, TER-3:** Linear onboarding tasks (can be archived)
- **TER-4:** Import your data (can be archived)
- **TER-15:** Duplicate of TER-30 (marked Duplicate)

---

## Notes

- **Linear is the primary source of truth** for all roadmap tasks
- This GitHub roadmap is a backup and may not be as up-to-date as Linear
- For the most current information, always refer to the [Linear project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)
- Last synced: 2026-02-07 17:45:00
