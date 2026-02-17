# TERP Golden Flows Beta - Roadmap

**Last Updated:** 2026-02-17
**Source of Truth:** [Linear Project](https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d)  
**Status:** This file is a backup. Linear is the primary source of truth for roadmap tasks.

---

## Current State Summary

| Phase                                 | Status         | Progress      |
| ------------------------------------- | -------------- | ------------- |
| Phase 0.A: Golden Flow Specification  | ✅ COMPLETE    | 8/8           |
| Phase 0: Critical Blockers            | ✅ COMPLETE    | 19/19         |
| Phase 1: Core Flow Restoration        | ✅ COMPLETE    | 27/27         |
| QA & Testing Infrastructure           | ✅ COMPLETE    | 5/5           |
| Post-QA Bug Fixes                     | ✅ COMPLETE    | 3/3           |
| Golden Flow Regression Remediation    | 🔄 IN REVIEW   | 8/8 (PR open) |
| Schema Hardening & Vendor Deprecation | 🟡 IN PROGRESS | 2/7           |
| DevOps & Infrastructure               | 🟡 TODO        | 0/1           |

**Overall:** 64/78 TERP tasks complete. 8 in review (PR #404). 6 todo/in-progress.

**Beta Assessment:** CONDITIONAL GO — PR #404 contains final regression fixes. Once merged, all golden flows are remediated. Schema hardening (Waves 2-5) underway to complete vendor deprecation and type cleanup.

---

## Open Items (14 tickets)

| Ticket                                               | Priority  | Title                                                | Status        | PR                                                     | Blocker?           |
| ---------------------------------------------------- | --------- | ---------------------------------------------------- | ------------- | ------------------------------------------------------ | ------------------ |
| [TER-96](https://linear.app/terpcorp/issue/TER-96)   | P1 Urgent | GF-001: Fix intake location site schema mismatch     | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | Yes                |
| [TER-97](https://linear.app/terpcorp/issue/TER-97)   | P1 Urgent | GF-002: Fix purchaseOrders.create 500 vendor mapping | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | Yes                |
| [TER-98](https://linear.app/terpcorp/issue/TER-98)   | P1 Urgent | GF-008: Fix samples.createRequest 500 on insert      | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | Yes                |
| [TER-99](https://linear.app/terpcorp/issue/TER-99)   | P2 High   | GF-006: Restore Clients list navigation affordances  | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | No                 |
| [TER-100](https://linear.app/terpcorp/issue/TER-100) | P2 High   | Orders routing: add /orders/new redirect             | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | No                 |
| [TER-101](https://linear.app/terpcorp/issue/TER-101) | P2 High   | Command palette contract: align Cmd+K behavior       | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | No                 |
| [TER-102](https://linear.app/terpcorp/issue/TER-102) | P2 High   | GF-005 test stabilization: pick-pack selectors       | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | No                 |
| [TER-103](https://linear.app/terpcorp/issue/TER-103) | P2 High   | Order creation e2e alignment                         | In Review     | [#404](https://github.com/EvanTenenbaum/TERP/pull/404) | No                 |
| [TER-93](https://linear.app/terpcorp/issue/TER-93)   | P2 High   | Fix Deployment Health Check Failure - Staging Stale  | Todo          | —                                                      | No                 |
| [TER-247](https://linear.app/terpcorp/issue/TER-247) | P2 High   | Rewrite vendor queries to use clients                | Todo (Wave 3) | —                                                      | No                 |
| [TER-235](https://linear.app/terpcorp/issue/TER-235) | P2 High   | Deprecate vendor table                               | Todo (Wave 3) | —                                                      | Depends on TER-247 |
| [TER-249](https://linear.app/terpcorp/issue/TER-249) | P2 High   | Oracle DB assertions                                 | Todo (Wave 4) | —                                                      | No                 |
| [TER-239](https://linear.app/terpcorp/issue/TER-239) | P2 High   | GF-002 procure-to-pay E2E flow                       | Todo (Wave 4) | —                                                      | No                 |
| [TER-250](https://linear.app/terpcorp/issue/TER-250) | P3 Medium | Type cleanup z.any()/as any                          | Todo (Wave 5) | —                                                      | No                 |

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
**Progress:** 5/5 tasks complete

- **[TER-87](https://linear.app/terpcorp/issue/TER-87):** Fix Testing Infrastructure - Entity ID Resolution (Done via PR #399)
- **[TER-88](https://linear.app/terpcorp/issue/TER-88):** Fix Testing Infrastructure - Strengthen Validation Logic (Done via PR #399)
- **[TER-89](https://linear.app/terpcorp/issue/TER-89):** Fix Testing Infrastructure - Enhanced Error Handling & Classification (Done via PR #399)
- **[TER-90](https://linear.app/terpcorp/issue/TER-90):** Testing Infrastructure - Validation & Regression Testing (Done)
- **[TER-91](https://linear.app/terpcorp/issue/TER-91):** Execute Full P0 Suite with Fixed Testing Infrastructure (Done)

---

## Post-QA Bug Fixes

**Status:** ✅ COMPLETE  
**Progress:** 3/3 tasks complete

These issues were discovered during the QA Runtime Testing on 2026-02-07 and resolved via PR #403 (merged 2026-02-08):

- **[TER-92](https://linear.app/terpcorp/issue/TER-92):** [P1 Urgent] Create RBAC QA Role Accounts for Beta Verification — Done (PR #403)
- **[TER-94](https://linear.app/terpcorp/issue/TER-94):** [P3 Medium] /direct-intake returns 404 despite sidebar link — Done (PR #403, route fix `c615d86c`)
- **[TER-95](https://linear.app/terpcorp/issue/TER-95):** [P3 Medium] Client detail page shows infinite loading for invalid IDs — Done (PR #403)

---

## Golden Flow Regression Remediation (PR #404)

**Status:** 🔄 IN REVIEW  
**Progress:** 8/8 tasks implemented, awaiting merge  
**PR:** [#404](https://github.com/EvanTenenbaum/TERP/pull/404) — Remediate golden-flow regressions and stabilize live e2e coverage  
**Branch:** `codex/golden-flow-remediation-20260208`  
**CI:** Golden Flows E2E ✅, Argos ✅, 4 checks fail (pre-existing workflow bugs)

These tasks address regressions discovered during live e2e testing after the initial golden flow fixes were deployed:

- **[TER-96](https://linear.app/terpcorp/issue/TER-96):** GF-001: Fix intake location site schema mismatch (UI label vs API regex)
- **[TER-97](https://linear.app/terpcorp/issue/TER-97):** GF-002: Fix purchaseOrders.create 500 vendor mapping failure
- **[TER-98](https://linear.app/terpcorp/issue/TER-98):** GF-008: Fix samples.createRequest 500 on insert
- **[TER-99](https://linear.app/terpcorp/issue/TER-99):** GF-006: Restore discoverable navigation from Clients list to Client Ledger
- **[TER-100](https://linear.app/terpcorp/issue/TER-100):** Orders routing: add /orders/new alias/redirect to /orders/create
- **[TER-101](https://linear.app/terpcorp/issue/TER-101):** Command palette contract: align Cmd+K behavior and tests
- **[TER-102](https://linear.app/terpcorp/issue/TER-102):** GF-005 test stabilization: pick-pack selectors, empty-state handling
- **[TER-103](https://linear.app/terpcorp/issue/TER-103):** Order creation e2e alignment: route/setup and totals/inspector assertions

---

## Schema Hardening & Vendor Deprecation (Waves 2-5)

**Status:** 🟡 IN PROGRESS
**Progress:** 2/7 tasks complete
**Branch:** `claude/plan-improvements-linear-5Tw9C`

This workstream hardens the database schema and completes the vendor-to-clients migration. Tasks are organized into implementation waves.

### Wave 2 — Schema Columns (Done)

Completed 2026-02-17. Code merged to branch, PR pending.

- **[TER-245](https://linear.app/terpcorp/issue/TER-245):** Add product_images soft delete column — Done (schema + autoMigrate + photography router hardening)
  - **Completed:** 2026-02-17
  - **Key Commits:** `b517d86`, `1871130`
- **[TER-248](https://linear.app/terpcorp/issue/TER-248):** Add strain/referral columns on products table — Done (schema + autoMigrate)
  - **Completed:** 2026-02-17
  - **Key Commits:** `b517d86`

### Wave 3 — Vendor Deprecation (Backlog, prompts ready)

- **[TER-247](https://linear.app/terpcorp/issue/TER-247):** Rewrite vendor queries to use clients
  - Prompt: `docs/prompts/WAVE3-TER-247-rewrite-vendor-queries.md`
- **[TER-235](https://linear.app/terpcorp/issue/TER-235):** Deprecate vendor table
  - Prompt: `docs/prompts/WAVE3-TER-235-deprecate-vendor-table.md`
  - Depends on TER-247

### Wave 4 — DB Assertions & E2E (Backlog, prompts ready)

- **[TER-249](https://linear.app/terpcorp/issue/TER-249):** Oracle DB assertions
  - Prompt: `docs/prompts/WAVE4-TER-249-oracle-db-assertions.md`
- **[TER-239](https://linear.app/terpcorp/issue/TER-239):** GF-002 procure-to-pay E2E flow
  - Prompt: `docs/prompts/WAVE4-TER-239-gf002-procure-to-pay.md`

### Wave 5 — Type Cleanup (Backlog, prompt ready)

- **[TER-250](https://linear.app/terpcorp/issue/TER-250):** Type cleanup z.any()/as any
  - Prompt: `docs/prompts/WAVE5-TER-250-type-cleanup.md`

---

## DevOps & Infrastructure

**Status:** 🟡 TODO
**Progress:** 0/1

- **[TER-93](https://linear.app/terpcorp/issue/TER-93):** [P2 High] Fix Deployment Health Check Failure - Staging Stale — Likely fixed by CI merge (`60d808e9`), needs redeploy to confirm

---

## CI Infrastructure (Merged 2026-02-07)

The following CI improvements were merged to `main` as commit `60d808e9` (PR #402):

- Standardized all 6 CI workflows to Node 22, pnpm 10.4.1, action-setup v4
- Aligned Dockerfile with CI versions (Node 22, pnpm 10.4.1)
- Hardened MySQL wait loops with max attempts and timeout
- Set TypeScript error baseline to 0 (all 869 errors resolved)
- Fixed SampleManagement test failures (missing productOptions mock)
- Added scrollIntoView mock to test setup for cmdk combobox
- Enforced `--frozen-lockfile` consistently across all workflows

Additional CI fixes merged 2026-02-08 (commit `9d823285`):

- Removed duplicate pnpm version declarations from all workflows

---

## Recent Merges (2026-02-05 through 2026-02-08)

| PR                                                     | Date       | Description                                                               |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------- |
| [#398](https://github.com/EvanTenenbaum/TERP/pull/398) | 2026-02-05 | Golden flows type-safety, tRPC queries, test updates                      |
| [#399](https://github.com/EvanTenenbaum/TERP/pull/399) | 2026-02-06 | Oracle QA infrastructure: entity resolver, validation, failure classifier |
| [#400](https://github.com/EvanTenenbaum/TERP/pull/400) | 2026-02-06 | QA follow-up: fix hardcoded vendor return ID                              |
| [#401](https://github.com/EvanTenenbaum/TERP/pull/401) | 2026-02-06 | Golden Flow batch fixes (TER-33 through TER-57)                           |
| [#402](https://github.com/EvanTenenbaum/TERP/pull/402) | 2026-02-07 | CI standardization: Node 22, pnpm 10.4.1, test fixes                      |
| [#403](https://github.com/EvanTenenbaum/TERP/pull/403) | 2026-02-08 | QA user seeder, direct intake route, client error handling                |

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
- Last synced: 2026-02-17 (manual update — no Linear API access)
